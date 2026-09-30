-- Migration 066: Include Contact Person Email & Phone in Vendor Allocation Emails

CREATE OR REPLACE FUNCTION public.publish_audit(p_audit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id uuid;
  v_project_name text;
  v_contact_person text;
  v_contact_email text;
  v_contact_phone text;
  v_audit_date date;
  v_end_date date;
  v_current_date date;
  
  v_member record;
  v_vendor_name text;
  v_resource_name text;
  v_resource_email text;
  v_vendor_email text;
  v_target_email text;
  
  v_html text;
  v_payload jsonb;
  v_api_key text := current_setting('app.settings.resend_api_key', true);
  v_from text := 'KGAC System <system@kgac.in>';
  v_date_display text;
BEGIN
  -- Fallback if no setting
  IF v_api_key IS NULL OR v_api_key = '' THEN
    v_api_key := 're_xxxxxxxxxxxxxxxxx';
  END IF;

  -- Get audit details, including contact person's name, email, and phone
  SELECT 
    a.project_id, 
    COALESCE(p.name, a.store_name), 
    pr.full_name, 
    COALESCE(NULLIF(pr.personal_email, ''), NULLIF(pr.email, '')),
    pr.phone_number,
    a.audit_date, 
    COALESCE(a.end_date, a.audit_date) 
  INTO 
    v_project_id, 
    v_project_name, 
    v_contact_person, 
    v_contact_email,
    v_contact_phone,
    v_audit_date, 
    v_end_date
  FROM public.audits a
  LEFT JOIN public.projects p ON p.id = a.project_id
  LEFT JOIN public.profiles pr ON a.contact_person_id = pr.id
  WHERE a.id = p_audit_id;

  IF v_project_id IS NULL THEN
    INSERT INTO public.projects (name, code, is_active, is_billable)
    VALUES (
      v_project_name, 
      UPPER(LEFT(regexp_replace(v_project_name, '[^a-zA-Z0-9]', '', 'g'), 3)) || '-' || substr(md5(random()::text), 1, 4), 
      true, true
    )
    RETURNING id INTO v_project_id;
    
    UPDATE public.audits SET project_id = v_project_id WHERE id = p_audit_id;
  END IF;

  IF v_audit_date = v_end_date THEN
    v_date_display := to_char(v_audit_date, 'DD-Mon-YYYY');
  ELSE
    v_date_display := to_char(v_audit_date, 'DD-Mon-YYYY') || ' to ' || to_char(v_end_date, 'DD-Mon-YYYY');
  END IF;

  UPDATE public.audits SET status = 'scheduled' WHERE id = p_audit_id;
  DELETE FROM public.allocations WHERE audit_id = p_audit_id;

  FOR v_member IN SELECT * FROM public.audit_teams WHERE audit_id = p_audit_id LOOP
    
    IF v_member.user_id IS NOT NULL AND v_member.vendor_resource_id IS NULL AND v_member.vendor_id IS NULL THEN
       INSERT INTO public.project_assignments (project_id, user_id)
       VALUES (v_project_id, v_member.user_id)
       ON CONFLICT (project_id, user_id) DO NOTHING;

       v_current_date := v_audit_date;
       WHILE v_current_date <= v_end_date LOOP
         INSERT INTO public.allocations (user_id, allocation_date, audit_id, project_id, hours, status, notes, is_approved)
         VALUES (v_member.user_id, v_current_date, p_audit_id, v_project_id, 8, 'billable', 'Auto-assigned from Audit Planner', true);
         v_current_date := v_current_date + 1;
       END LOOP;
       
       -- In-app notification for internal employee
       INSERT INTO public.notifications (user_id, title, message)
       VALUES (v_member.user_id, 'New Audit Assigned', 'You have been assigned to ' || v_project_name || ' on ' || v_date_display);
    END IF;

    IF v_member.vendor_id IS NOT NULL OR v_member.vendor_resource_id IS NOT NULL THEN
      v_vendor_name := NULL; v_vendor_email := NULL; v_resource_name := NULL; v_resource_email := NULL; v_target_email := NULL;

      IF v_member.vendor_id IS NOT NULL THEN
        SELECT name, contact_email INTO v_vendor_name, v_vendor_email FROM public.vendors WHERE id = v_member.vendor_id;
      ELSIF v_member.user_id IS NOT NULL THEN
        SELECT full_name, email INTO v_vendor_name, v_vendor_email FROM public.profiles WHERE id = v_member.user_id;
      END IF;

      IF v_member.vendor_resource_id IS NOT NULL THEN
        SELECT name, contact_email INTO v_resource_name, v_resource_email FROM public.vendor_resources WHERE id = v_member.vendor_resource_id;
      ELSE
        v_resource_name := v_vendor_name; v_resource_email := v_vendor_email;
      END IF;

      v_target_email := COALESCE(v_resource_email, v_vendor_email);

      IF v_target_email IS NOT NULL AND v_target_email != '' THEN
        v_html := '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>KGAC Audit Assignment</title><style>body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; } .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; } .header { background-color: #0f172a; padding: 30px 40px; text-align: center; } .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; } .content { padding: 40px; color: #334155; line-height: 1.6; } .content h2 { color: #0f172a; font-size: 20px; margin-top: 0; } .credentials-box { background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 6px 6px 0; } .cred-row { margin-bottom: 12px; } .cred-label { font-weight: 600; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; } .cred-value { font-size: 16px; color: #0f172a; font-weight: 600; display: block; } .footer { padding: 20px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 13px; }</style></head><body><div class="container"><div class="header"><h1>KGAC Audit Allocation</h1></div><div class="content"><h2>Audit Assignment Details</h2><p>Hello ' || v_resource_name || ',</p><p>You have been scheduled for an upcoming audit assignment. Please review the details below:</p><div class="credentials-box"><div class="cred-row"><span class="cred-label">Project / Client</span><span class="cred-value">' || COALESCE(v_project_name, 'Unknown Project') || '</span></div><div class="cred-row"><span class="cred-label">Date(s)</span><span class="cred-value">' || v_date_display || '</span></div><div class="cred-row"><span class="cred-label">Assigned Role</span><span class="cred-value" style="text-transform: capitalize;">' || v_member.role || '</span></div><div class="cred-row"><span class="cred-label">Contact Person</span><span class="cred-value">' || COALESCE(v_contact_person, 'Project Manager') || '</span></div>' || 
        CASE 
          WHEN v_contact_email IS NOT NULL AND v_contact_email != '' AND v_contact_email NOT LIKE '%@kgac-users.com' 
          THEN '<div class="cred-row"><span class="cred-label">Contact Email</span><span class="cred-value"><a href="mailto:' || v_contact_email || '" style="color: #2563eb; text-decoration: none;">' || v_contact_email || '</a></span></div>' 
          ELSE '' 
        END || 
        CASE 
          WHEN v_contact_phone IS NOT NULL AND v_contact_phone != '' 
          THEN '<div class="cred-row" style="margin-bottom: 0;"><span class="cred-label">Contact Phone</span><span class="cred-value"><a href="tel:' || v_contact_phone || '" style="color: #2563eb; text-decoration: none;">' || v_contact_phone || '</a></span></div>' 
          ELSE '' 
        END || 
        '</div><p>If you have any questions or conflicts regarding this schedule, please reach out to ' || COALESCE(v_contact_person, 'the project manager') || ' directly.</p></div><div class="footer">This is an automated message from Kumar Aggarwal Gaurav and Co.<br>Please do not reply directly to this email.</div></div></body></html>';
        
        v_payload := jsonb_build_object(
          'from', v_from,
          'to', jsonb_build_array(v_target_email),
          'subject', 'New Audit Assignment: ' || COALESCE(v_project_name, 'Unknown Project'),
          'html', v_html
        );
        
        PERFORM net.http_post(
            url := 'https://api.resend.com/emails',
            headers := jsonb_build_object(
              'Authorization', 'Bearer ' || v_api_key,
              'Content-Type', 'application/json'
            ),
            body := v_payload
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Migration 070: Backend Employee Role, Internal Assets (Unusable status, Asset ID, Bulk/Single Delete), and Publish Audit update

-- 1. Expand audit_teams role constraint to include 'backend'
ALTER TABLE public.audit_teams DROP CONSTRAINT IF EXISTS audit_teams_role_check;
ALTER TABLE public.audit_teams ADD CONSTRAINT audit_teams_role_check CHECK (role IN ('lead', 'executive', 'asset', 'backend'));

-- 2. Expand internal_assets status constraint to include 'unusable' and add asset_id column
ALTER TABLE public.internal_assets DROP CONSTRAINT IF EXISTS internal_assets_status_check;
ALTER TABLE public.internal_assets ADD CONSTRAINT internal_assets_status_check CHECK (status IN ('available', 'in_use', 'maintenance', 'unusable'));

ALTER TABLE public.internal_assets ADD COLUMN IF NOT EXISTS asset_id text;

-- 3. Delete RPC & RLS for internal assets
DROP POLICY IF EXISTS "Allow admins to delete internal assets" ON public.internal_assets;
DROP POLICY IF EXISTS "Allow admins and managers to delete internal assets" ON public.internal_assets;

CREATE POLICY "Allow admins and managers to delete internal assets" 
ON public.internal_assets FOR DELETE 
USING (auth.role() = 'authenticated' AND has_any_role(ARRAY['admin', 'super_admin', 'manager']));

CREATE OR REPLACE FUNCTION public.delete_internal_assets(p_asset_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT has_any_role(ARRAY['admin', 'super_admin', 'manager']) THEN
    RAISE EXCEPTION 'Access denied. Manager or Admin role required.';
  END IF;

  DELETE FROM public.asset_requests WHERE asset_id = ANY(p_asset_ids);
  DELETE FROM public.internal_assets WHERE id = ANY(p_asset_ids);
END;
$$;

-- 4. Update publish_audit to skip 8h auto-allocation for backend role while keeping project assignment
CREATE OR REPLACE FUNCTION public.publish_audit(p_audit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member record;
  v_vendor_name text;
  v_vendor_email text;
  v_resource_name text;
  v_resource_email text;
  v_target_email text;
  v_project_name text;
  v_project_id uuid;
  v_audit_date date;
  v_end_date date;
  v_date_display text;
  v_html text;
  v_payload jsonb;
  v_api_key text;
  v_from text;
  v_current_date date;
  v_contact_person text;
  v_contact_email text;
  v_contact_phone text;
  v_req_leads integer;
  v_req_execs integer;
  v_assigned_leads integer;
  v_assigned_execs integer;
BEGIN
  -- 1. Fetch Audit Details, Project, and Contact Person info
  SELECT 
    a.store_name, 
    a.audit_date, 
    COALESCE(a.end_date, a.audit_date),
    a.project_id,
    COALESCE(a.required_leads, 0),
    COALESCE(a.required_executives, 0),
    p.full_name,
    p.email,
    p.phone_number
  INTO 
    v_project_name, 
    v_audit_date, 
    v_end_date, 
    v_project_id,
    v_req_leads,
    v_req_execs,
    v_contact_person,
    v_contact_email,
    v_contact_phone
  FROM public.audits a
  LEFT JOIN public.profiles p ON a.contact_person_id = p.id
  WHERE a.id = p_audit_id;

  IF v_audit_date IS NULL THEN
    RAISE EXCEPTION 'Audit not found';
  END IF;

  -- 2. Validate Lead & Executive Quotas
  SELECT COUNT(*) INTO v_assigned_leads FROM public.audit_teams WHERE audit_id = p_audit_id AND role = 'lead';
  SELECT COUNT(*) INTO v_assigned_execs FROM public.audit_teams WHERE audit_id = p_audit_id AND role = 'executive';

  IF v_assigned_leads < v_req_leads THEN
    RAISE EXCEPTION 'Cannot publish audit: Missing required leads (assigned: %, required: %)', v_assigned_leads, v_req_leads;
  END IF;

  IF v_assigned_execs < v_req_execs THEN
    RAISE EXCEPTION 'Cannot publish audit: Missing required executives (assigned: %, required: %)', v_assigned_execs, v_req_execs;
  END IF;

  -- 3. Ensure Project Exists and is Active
  IF v_project_id IS NULL THEN
    INSERT INTO public.projects (name, code, is_billable, is_active)
    VALUES (v_project_name, 'AUD-' || substring(p_audit_id::text from 1 for 8), true, true)
    RETURNING id INTO v_project_id;

    UPDATE public.audits SET project_id = v_project_id WHERE id = p_audit_id;
  ELSE
    UPDATE public.projects SET is_active = true WHERE id = v_project_id;
  END IF;

  IF v_end_date IS NOT NULL AND v_end_date != v_audit_date THEN
    v_date_display := to_char(v_audit_date, 'Mon DD, YYYY') || ' to ' || to_char(v_end_date, 'Mon DD, YYYY');
  ELSE
    v_date_display := to_char(v_audit_date, 'Mon DD, YYYY');
  END IF;

  -- Resend credentials
  SELECT decrypted_secret INTO v_api_key FROM vault.decrypted_secrets WHERE name = 'RESEND_API_KEY' LIMIT 1;
  IF v_api_key IS NULL THEN
    v_api_key := current_setting('app.settings.resend_api_key', true);
  END IF;
  v_from := 'KGAC Audit Notifications <notifications@thekgac.in>';

  -- 4. Mark Audit as Scheduled
  UPDATE public.audits 
  SET status = 'scheduled',
      scheduled_by = auth.uid(),
      scheduled_at = now()
  WHERE id = p_audit_id;

  -- Reset existing allocations for this audit
  DELETE FROM public.allocations WHERE audit_id = p_audit_id;

  -- 5. Loop through all team members
  FOR v_member IN SELECT * FROM public.audit_teams WHERE audit_id = p_audit_id LOOP
    
    -- Internal Employees
    IF v_member.user_id IS NOT NULL AND v_member.vendor_resource_id IS NULL AND v_member.vendor_id IS NULL THEN
       -- Assign employee to project regardless of role
       INSERT INTO public.project_assignments (project_id, user_id)
       VALUES (v_project_id, v_member.user_id)
       ON CONFLICT (project_id, user_id) DO NOTHING;

       -- If role is NOT 'backend', auto-assign 8h per day for on-site execution
       -- Backend employees only log actual hours worked in calendar grid cell
       IF v_member.role != 'backend' THEN
         v_current_date := v_audit_date;
         WHILE v_current_date <= v_end_date LOOP
           INSERT INTO public.allocations (user_id, allocation_date, audit_id, project_id, hours, status, notes, is_approved)
           VALUES (v_member.user_id, v_current_date, p_audit_id, v_project_id, 8, 'billable', 'Auto-assigned from Audit Planner', true);
           v_current_date := v_current_date + 1;
         END LOOP;
       END IF;
       
       -- In-app notification for internal employee
       INSERT INTO public.notifications (user_id, title, message)
       VALUES (
         v_member.user_id, 
         'New Audit Assigned', 
         'You have been assigned to ' || v_project_name || ' on ' || v_date_display || 
         CASE WHEN v_member.role = 'backend' THEN ' (Backend Supervision)' ELSE '' END
       );
    END IF;

    -- External Vendors & Resources
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

  -- 6. Log action in audit_logs for Superadmin
  INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, metadata)
  VALUES (
    auth.uid(),
    'APPROVAL',
    'audits',
    p_audit_id,
    jsonb_build_object('event', 'audit_published', 'project_name', v_project_name, 'date', v_date_display)
  );
END;
$$;

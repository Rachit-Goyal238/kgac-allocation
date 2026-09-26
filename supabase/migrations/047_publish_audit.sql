-- Add ON DELETE CASCADE to vendor foreign keys so vendors can be deleted cleanly
ALTER TABLE public.vendor_resources DROP CONSTRAINT IF EXISTS vendor_resources_vendor_id_fkey;
ALTER TABLE public.vendor_rates DROP CONSTRAINT IF EXISTS vendor_rates_vendor_id_fkey;
ALTER TABLE public.audit_teams DROP CONSTRAINT IF EXISTS audit_teams_vendor_id_fkey;
ALTER TABLE public.audit_teams DROP CONSTRAINT IF EXISTS audit_teams_vendor_resource_id_fkey;

ALTER TABLE public.vendor_resources
  ADD CONSTRAINT vendor_resources_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

ALTER TABLE public.vendor_rates
  ADD CONSTRAINT vendor_rates_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

ALTER TABLE public.audit_teams
  ADD CONSTRAINT audit_teams_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

ALTER TABLE public.audit_teams
  ADD CONSTRAINT audit_teams_vendor_resource_id_fkey
  FOREIGN KEY (vendor_resource_id) REFERENCES public.vendor_resources(id) ON DELETE CASCADE;

-- Drop the old manual notify function
DROP FUNCTION IF EXISTS public.notify_audit_vendors(uuid);

-- Create the new publish function
CREATE OR REPLACE FUNCTION public.publish_audit(p_audit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id uuid;
  v_project_name text;
  v_contact_person text;
  v_audit_date date;
  
  v_member record;
  v_vendor_name text;
  v_resource_name text;
  v_resource_email text;
  v_vendor_email text;
  v_target_email text;
  
  v_html text;
  v_payload jsonb;
  v_api_key text := 're_xxxxxxxxxxxxxxxxxxxxx'; -- Update this in your DB
  v_from text := 'KGAC System <system@kgac.in>';
BEGIN
  -- Get audit details
  SELECT p.id, p.name, pr.full_name, a.audit_date INTO v_project_id, v_project_name, v_contact_person, v_audit_date
  FROM public.audits a
  JOIN public.projects p ON p.id = a.project_id
  LEFT JOIN public.profiles pr ON a.contact_person_id = pr.id
  WHERE a.id = p_audit_id;

  -- Update audit status
  UPDATE public.audits SET status = 'scheduled' WHERE id = p_audit_id;

  -- 1. Reset existing allocations for this audit
  DELETE FROM public.allocations WHERE audit_id = p_audit_id;

  -- Loop through all team members
  FOR v_member IN 
    SELECT * FROM public.audit_teams WHERE audit_id = p_audit_id
  LOOP
    
    -- If it's an internal employee (not acting as an agency sub-resource)
    IF v_member.user_id IS NOT NULL AND v_member.vendor_resource_id IS NULL AND v_member.vendor_id IS NULL THEN
       -- Grant them project access
       INSERT INTO public.project_assignments (project_id, user_id)
       VALUES (v_project_id, v_member.user_id)
       ON CONFLICT (project_id, user_id) DO NOTHING;

       -- Create the allocation
       INSERT INTO public.allocations (user_id, allocation_date, audit_id, project_id, hours, status, notes)
       VALUES (v_member.user_id, v_audit_date, p_audit_id, v_project_id, 0, 'billable', 'Auto-assigned from Audit Planner');
    END IF;

    -- If it's a vendor (master or sub-resource)
    IF v_member.vendor_id IS NOT NULL OR v_member.vendor_resource_id IS NOT NULL THEN
      -- Reset vars
      v_vendor_name := NULL;
      v_vendor_email := NULL;
      v_resource_name := NULL;
      v_resource_email := NULL;
      v_target_email := NULL;

      -- Master Vendor details
      IF v_member.vendor_id IS NOT NULL THEN
        SELECT name, contact_email INTO v_vendor_name, v_vendor_email
        FROM public.vendors WHERE id = v_member.vendor_id;
      ELSIF v_member.user_id IS NOT NULL THEN
        SELECT full_name, email INTO v_vendor_name, v_vendor_email
        FROM public.profiles WHERE id = v_member.user_id;
      END IF;

      -- Sub-resource details
      IF v_member.vendor_resource_id IS NOT NULL THEN
        SELECT name, contact_email INTO v_resource_name, v_resource_email
        FROM public.vendor_resources WHERE id = v_member.vendor_resource_id;
      ELSE
        v_resource_name := v_vendor_name;
        v_resource_email := v_vendor_email;
      END IF;

      v_target_email := COALESCE(v_resource_email, v_vendor_email);

      IF v_target_email IS NOT NULL AND v_target_email != '' THEN
        -- Build simple HTML template
        v_html := '<p>Hello ' || v_resource_name || ',</p><p>You have been assigned to the upcoming audit for <strong>' || v_project_name || '</strong>.</p><p>Date: ' || v_audit_date || '<br>Role: ' || v_member.role || '<br>Contact Person: ' || COALESCE(v_contact_person, 'Project Manager') || '</p><p>Please contact us for more details.</p>';
        
        v_payload := jsonb_build_object(
          'from', v_from,
          'to', jsonb_build_array(v_target_email),
          'subject', 'New Audit Assignment: ' || v_project_name,
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

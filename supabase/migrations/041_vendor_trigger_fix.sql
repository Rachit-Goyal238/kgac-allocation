DROP TRIGGER IF EXISTS trigger_notify_vendor_on_assignment ON public.audit_teams;
DROP FUNCTION IF EXISTS public.notify_vendor_on_assignment();

CREATE OR REPLACE FUNCTION public.notify_vendor_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_name text;
  v_vendor_name text;
  v_resource_name text;
  v_resource_email text;
  v_vendor_email text;
  v_target_email text;
  v_contact_person text;
  v_audit_date date;
BEGIN
  IF NEW.vendor_id IS NOT NULL THEN
    
    SELECT p.name, pr.full_name, a.audit_date INTO v_project_name, v_contact_person, v_audit_date
    FROM public.audits a
    JOIN public.projects p ON p.id = a.project_id
    LEFT JOIN public.profiles pr ON a.contact_person_id = pr.id
    WHERE a.id = NEW.audit_id;
    
    -- Get Master Vendor details
    SELECT name, contact_email INTO v_vendor_name, v_vendor_email
    FROM public.vendors
    WHERE id = NEW.vendor_id;

    -- If there's a specific resource, get those details
    IF NEW.vendor_resource_id IS NOT NULL THEN
      SELECT name, contact_email INTO v_resource_name, v_resource_email
      FROM public.vendor_resources
      WHERE id = NEW.vendor_resource_id;
    ELSE
      v_resource_name := v_vendor_name;
      v_resource_email := v_vendor_email;
    END IF;

    v_target_email := COALESCE(v_resource_email, v_vendor_email);

    IF v_target_email IS NOT NULL AND v_target_email != '' THEN
      perform net.http_post(
        url := current_setting('app.settings.edge_function_url') || '/send-vendor-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
          'to', v_target_email,
          'project_name', v_project_name,
          'vendor_name', v_vendor_name,
          'resource_name', v_resource_name,
          'start_date', v_audit_date,
          'end_date', v_audit_date,
          'role', NEW.role,
          'contact_person', COALESCE(v_contact_person, 'The Project Manager')
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_vendor_on_assignment
  AFTER INSERT ON public.audit_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_vendor_on_assignment();

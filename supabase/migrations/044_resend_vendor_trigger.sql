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
  v_html text;
  v_payload jsonb;
  v_api_key text := 're_xxxxxxxxxxxxxxxxxxxxx'; -- Update this in your DB later
  v_from text := 'KGAC System <system@kgac.in>';
BEGIN
  IF NEW.vendor_id IS NOT NULL OR NEW.vendor_resource_id IS NOT NULL THEN
    
    SELECT p.name, pr.full_name, a.audit_date INTO v_project_name, v_contact_person, v_audit_date
    FROM public.audits a
    JOIN public.projects p ON p.id = a.project_id
    LEFT JOIN public.profiles pr ON a.contact_person_id = pr.id
    WHERE a.id = NEW.audit_id;
    
    IF NEW.vendor_id IS NOT NULL THEN
      SELECT name, contact_email INTO v_vendor_name, v_vendor_email
      FROM public.vendors
      WHERE id = NEW.vendor_id;
    ELSIF NEW.user_id IS NOT NULL THEN
      SELECT full_name, email INTO v_vendor_name, v_vendor_email
      FROM public.profiles
      WHERE id = NEW.user_id;
    END IF;

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
      
      -- Build simple HTML template
      v_html := '<p>Hello ' || v_resource_name || ',</p><p>You have been assigned to the upcoming audit for <strong>' || v_project_name || '</strong>.</p><p>Date: ' || v_audit_date || '<br>Role: ' || NEW.role || '<br>Contact Person: ' || COALESCE(v_contact_person, 'Project Manager') || '</p><p>Please contact us for more details.</p>';
      
      -- Build the exact JSON payload Resend expects
      v_payload := jsonb_build_object(
        'from', v_from,
        'to', jsonb_build_array(v_target_email),
        'subject', 'New Audit Assignment: ' || v_project_name,
        'html', v_html
      );
      
      -- Send the HTTP POST request to Resend automatically!
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
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_vendor_on_assignment
  AFTER INSERT ON public.audit_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_vendor_on_assignment();

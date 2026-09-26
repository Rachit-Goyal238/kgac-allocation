-- 039_vendor_resources_updates.sql
ALTER TABLE public.vendor_resources ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.vendor_resources DROP CONSTRAINT IF EXISTS vendor_resources_vendor_id_name_key;
ALTER TABLE public.vendor_resources ADD CONSTRAINT vendor_resources_vendor_id_name_key UNIQUE (vendor_id, name);

-- Drop the old trigger and function, we will rewrite the function to send to the specific resource email if available
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
BEGIN
  -- We only care about external vendors assigned
  IF NEW.vendor_id IS NOT NULL AND NEW.vendor_resource_id IS NOT NULL THEN
    
    -- Get project details and contact person
    SELECT p.name, pr.full_name INTO v_project_name, v_contact_person
    FROM public.projects p
    LEFT JOIN public.profiles pr ON p.contact_person_id = pr.id
    WHERE p.id = NEW.project_id;
    
    -- Get resource details
    SELECT vr.name, vr.contact_email, v.name, v.contact_email INTO v_resource_name, v_resource_email, v_vendor_name, v_vendor_email
    FROM public.vendor_resources vr
    JOIN public.vendors v ON v.id = vr.vendor_id
    WHERE vr.id = NEW.vendor_resource_id;

    -- Determine email (prefer resource email, fallback to master vendor email)
    v_target_email := COALESCE(v_resource_email, v_vendor_email);

    -- Only send if we have a valid email
    IF v_target_email IS NOT NULL AND v_target_email != '' THEN
      -- Send via Edge Function
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
          'start_date', NEW.start_date,
          'end_date', NEW.end_date,
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


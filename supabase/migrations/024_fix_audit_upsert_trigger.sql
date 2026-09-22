-- Update the create_project_for_audit trigger to handle UPSERTS gracefully
-- When an UPSERT happens, PostgreSQL still fires the BEFORE INSERT trigger.
-- If the project already exists for that audit ID, it was throwing a unique_violation.

CREATE OR REPLACE FUNCTION public.create_project_for_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id uuid;
  v_store_name text;
  v_code text;
BEGIN
  v_store_name := COALESCE(NEW.store_name, 'Unknown Audit');
  v_code := 'AUD-' || upper(substring(NEW.id::text from 1 for 6));
  
  -- Attempt to insert the project. If a project with this code already exists
  -- (which happens during UPSERTs when the BEFORE INSERT trigger fires),
  -- we gracefully catch the unique violation and just reuse the existing project.
  BEGIN
    INSERT INTO public.projects (name, code, is_billable, is_active, color)
    VALUES (
      v_store_name || ' (' || to_char(NEW.audit_date, 'DD/MM') || ')',
      v_code,
      true,
      true,
      '#10B981' -- Emerald color for audits
    ) RETURNING id INTO v_project_id;
  EXCEPTION WHEN unique_violation THEN
    -- Project already exists, just fetch its ID
    SELECT id INTO v_project_id FROM public.projects WHERE code = v_code;
  END;
  
  NEW.project_id := v_project_id;
  RETURN NEW;
END;
$$;

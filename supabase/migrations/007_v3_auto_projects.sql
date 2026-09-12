-- 1. Add project_id to audits
ALTER TABLE audits ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

-- 2. Trigger function to auto-create a project when an audit is created
CREATE OR REPLACE FUNCTION public.create_project_for_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id uuid;
  v_store_name text;
BEGIN
  v_store_name := COALESCE(NEW.store_name, 'Unknown Audit');
  
  INSERT INTO public.projects (name, code, is_billable, is_active, color)
  VALUES (
    v_store_name || ' (' || to_char(NEW.audit_date, 'DD/MM') || ')',
    'AUD-' || upper(substring(NEW.id::text from 1 for 6)),
    true,
    true,
    '#10B981' -- Emerald color for audits
  ) RETURNING id INTO v_project_id;
  
  NEW.project_id := v_project_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_audit_created_create_project ON audits;
CREATE TRIGGER on_audit_created_create_project
BEFORE INSERT ON audits
FOR EACH ROW
EXECUTE FUNCTION public.create_project_for_audit();

-- 3. We should also retroactively create projects for existing audits that don't have one
DO $$
DECLARE
  r record;
  v_pid uuid;
BEGIN
  FOR r IN SELECT * FROM audits WHERE project_id IS NULL LOOP
    INSERT INTO projects (name, code, is_billable, is_active, color)
    VALUES (
      COALESCE(r.store_name, 'Unknown Audit') || ' (' || to_char(r.audit_date, 'DD/MM') || ')',
      'AUD-' || upper(substring(r.id::text from 1 for 6)),
      true,
      true,
      '#10B981'
    ) RETURNING id INTO v_pid;
    
    UPDATE audits SET project_id = v_pid WHERE id = r.id;
  END LOOP;
END;
$$;

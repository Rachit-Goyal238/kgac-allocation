-- ==============================================================================
-- MIGRATION: 002_v2_expansion.sql
-- DESCRIPTION: Expands the team-allocation-calendar schema for v2 features.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Expand profiles.role CHECK constraint
-- ------------------------------------------------------------------------------
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check1;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('employee', 'external', 'manager', 'finance', 'admin', 'super_admin', 'pending'));

-- ------------------------------------------------------------------------------
-- 2. Add new columns to profiles
-- ------------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS resource_type text NOT NULL DEFAULT 'internal' CHECK (resource_type IN ('internal', 'external')),
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS agreed_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS rate_basis text CHECK (rate_basis IN ('hourly', 'daily'));

-- ------------------------------------------------------------------------------
-- 3. Add task_status column to allocations
-- ------------------------------------------------------------------------------
ALTER TABLE allocations
  ADD COLUMN IF NOT EXISTS task_status text NOT NULL DEFAULT 'not_started' CHECK (task_status IN ('not_started', 'in_progress', 'completed', 'pending_review', 'blocked'));

CREATE INDEX IF NOT EXISTS idx_allocations_task_status ON allocations(task_status);

-- ------------------------------------------------------------------------------
-- 4. Create clients table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  contact_email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 16. Add projects.client_id column (Requires clients table)
-- ------------------------------------------------------------------------------
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 8. Create client_field_mappings table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  mapping_json jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (client_id, template_name)
);
ALTER TABLE client_field_mappings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 7. Create client_uploads table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  file_name text NOT NULL,
  row_count integer,
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'errors', 'approved', 'rejected')),
  mapping_template_id uuid REFERENCES client_field_mappings(id) ON DELETE SET NULL,
  error_details jsonb,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE client_uploads ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 9. Create client_allocation_rows table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_allocation_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES client_uploads(id) ON DELETE CASCADE,
  resource_email text,
  project_name text,
  client_name text,
  allocated_days numeric(6,2),
  period_start date,
  period_end date,
  matched_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  internal_logged_hours numeric(8,2),
  variance_hours numeric(8,2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'unmatched', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE client_allocation_rows ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5. Create rate_cards table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rate_amount numeric(10,2) NOT NULL,
  rate_basis text NOT NULL CHECK (rate_basis IN ('hourly', 'daily')),
  effective_from date NOT NULL,
  effective_to date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_cards_profile_date ON rate_cards(profile_id, effective_from);
ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6. Create audit_logs table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'ROLE_CHANGE', 'STATUS_CHANGE', 'LOGIN', 'APPROVAL')),
  table_name text NOT NULL,
  record_id uuid,
  before_values jsonb,
  after_values jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 10. Create archived_allocations table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS archived_allocations (
  id uuid PRIMARY KEY,
  user_id uuid,
  allocation_date date,
  project_id uuid,
  hours numeric,
  status text,
  notes text,
  last_edited_by uuid,
  updated_at timestamptz,
  created_at timestamptz,
  task_status text,
  archived_at timestamptz DEFAULT now()
);
ALTER TABLE archived_allocations ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 14. Update get_auth_role() helper function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'pending');
END;
$$;

-- ------------------------------------------------------------------------------
-- 15. Update existing & create new RLS policies
-- ------------------------------------------------------------------------------

-- Drop existing policies first (assuming standard names, but we'll drop commonly named ones or just create new names and suggest manual cleanup if necessary. We use IF EXISTS to be safe)
DO $$ 
DECLARE
  table_names text[] := ARRAY['departments', 'projects', 'profiles', 'allocations', 'holidays'];
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY table_names
  LOOP
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t)
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- Policies: departments
CREATE POLICY "departments_select_all" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_admin_all" ON departments FOR ALL TO authenticated USING (get_auth_role() IN ('admin', 'super_admin'));

-- Policies: projects
CREATE POLICY "projects_select_all" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_admin_all" ON projects FOR ALL TO authenticated USING (get_auth_role() IN ('admin', 'super_admin'));

-- Policies: holidays
CREATE POLICY "holidays_select_all" ON holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "holidays_admin_all" ON holidays FOR ALL TO authenticated USING (get_auth_role() IN ('admin', 'super_admin'));

-- Policies: profiles
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (get_auth_role() IN ('employee', 'manager', 'finance', 'admin', 'super_admin'));
CREATE POLICY "profiles_external_select_own" ON profiles FOR SELECT TO authenticated USING (get_auth_role() = 'external' AND id = auth.uid());
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL TO authenticated USING (get_auth_role() IN ('admin', 'super_admin'));

-- Policies: allocations
CREATE POLICY "allocations_admin_super_admin_all" ON allocations FOR ALL TO authenticated USING (get_auth_role() IN ('admin', 'super_admin'));
CREATE POLICY "allocations_finance_select" ON allocations FOR SELECT TO authenticated USING (get_auth_role() = 'finance');
CREATE POLICY "allocations_manager_department" ON allocations FOR ALL TO authenticated USING (
  get_auth_role() = 'manager' AND 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = allocations.user_id AND profiles.department_id = get_auth_department_id())
);
CREATE POLICY "allocations_employee_external_self" ON allocations FOR ALL TO authenticated USING (
  get_auth_role() IN ('employee', 'external') AND user_id = auth.uid()
);

-- Policies: clients
CREATE POLICY "clients_select_all" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_admin_all" ON clients FOR ALL TO authenticated USING (get_auth_role() IN ('admin', 'super_admin'));

-- Policies: rate_cards
CREATE POLICY "rate_cards_admin_finance_select" ON rate_cards FOR SELECT TO authenticated USING (get_auth_role() IN ('admin', 'super_admin', 'finance'));
CREATE POLICY "rate_cards_external_select_own" ON rate_cards FOR SELECT TO authenticated USING (get_auth_role() = 'external' AND profile_id = auth.uid());
CREATE POLICY "rate_cards_admin_all" ON rate_cards FOR ALL TO authenticated USING (get_auth_role() IN ('admin', 'super_admin'));

-- Policies: audit_logs
CREATE POLICY "audit_logs_admin_select" ON audit_logs FOR SELECT TO authenticated USING (get_auth_role() IN ('admin', 'super_admin'));

-- Policies: client_field_mappings
CREATE POLICY "client_mappings_access" ON client_field_mappings FOR ALL TO authenticated USING (get_auth_role() IN ('manager', 'admin', 'super_admin'));

-- Policies: client_uploads
CREATE POLICY "client_uploads_access" ON client_uploads FOR ALL TO authenticated USING (get_auth_role() IN ('manager', 'admin', 'super_admin'));

-- Policies: client_allocation_rows
CREATE POLICY "client_allocation_rows_access" ON client_allocation_rows FOR ALL TO authenticated USING (get_auth_role() IN ('manager', 'admin', 'super_admin'));

-- Policies: archived_allocations
CREATE POLICY "archived_allocations_admin_select" ON archived_allocations FOR SELECT TO authenticated USING (get_auth_role() IN ('admin', 'super_admin'));

-- ------------------------------------------------------------------------------
-- 11. Audit logging trigger function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (actor_id, action, table_name, record_id, after_values)
    VALUES (v_actor_id, 'CREATE', TG_TABLE_NAME, NEW.id, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (actor_id, action, table_name, record_id, before_values, after_values)
    VALUES (v_actor_id, 'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (actor_id, action, table_name, record_id, before_values)
    VALUES (v_actor_id, 'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD)::jsonb);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_allocations_trigger ON allocations;
CREATE TRIGGER audit_allocations_trigger AFTER INSERT OR UPDATE OR DELETE ON allocations FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_profiles_trigger ON profiles;
CREATE TRIGGER audit_profiles_trigger AFTER INSERT OR UPDATE OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_rate_cards_trigger ON rate_cards;
CREATE TRIGGER audit_rate_cards_trigger AFTER INSERT OR UPDATE OR DELETE ON rate_cards FOR EACH ROW EXECUTE FUNCTION log_audit_event();


-- ------------------------------------------------------------------------------
-- 12. Create archive_old_allocations() function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION archive_old_allocations()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived_count integer;
BEGIN
  IF get_auth_role() != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super_admin can archive allocations';
  END IF;

  WITH moved AS (
    DELETE FROM allocations
    WHERE allocation_date < CURRENT_DATE - INTERVAL '12 months'
    RETURNING *
  )
  INSERT INTO archived_allocations (id, user_id, allocation_date, project_id, hours, status, notes, last_edited_by, updated_at, created_at, task_status)
  SELECT id, user_id, allocation_date, project_id, hours, status, notes, last_edited_by, updated_at, created_at, task_status
  FROM moved;
  
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  
  RETURN json_build_object('archived_records', v_archived_count);
END;
$$;


-- ------------------------------------------------------------------------------
-- 13. Create enforce_super_admin_cap() trigger function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_super_admin_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_super_admin_count integer;
BEGIN
  IF NEW.role = 'super_admin' AND (TG_OP = 'INSERT' OR OLD.role != 'super_admin') THEN
    SELECT count(*) INTO v_super_admin_count FROM profiles WHERE role = 'super_admin';
    IF v_super_admin_count >= 3 THEN
      RAISE EXCEPTION 'Maximum number of super_admins (3) reached.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_super_admin_cap_trigger ON profiles;
CREATE TRIGGER check_super_admin_cap_trigger BEFORE INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION enforce_super_admin_cap();


-- ------------------------------------------------------------------------------
-- 17. Add realtime publication for new tables
-- ------------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE rate_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

ALTER TABLE rate_cards REPLICA IDENTITY FULL;

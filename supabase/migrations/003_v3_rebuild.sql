-- 1. Alter profiles table to add new columns
ALTER TABLE profiles 
ADD COLUMN roles text[] DEFAULT '{}'::text[],
ADD COLUMN entity text CHECK (entity IN ('KGAC', 'KPL'));

-- 2. Migrate existing data
UPDATE profiles 
SET 
  roles = ARRAY[role],
  entity = CASE 
    WHEN email LIKE '%@kgac.in' THEN 'KGAC'
    WHEN email LIKE '%@thekgac.in' THEN 'KPL'
    ELSE 'KGAC' 
  END;

-- 3. Create helper functions
CREATE OR REPLACE FUNCTION has_role(role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role_name = ANY(roles)
  );
$$;

CREATE OR REPLACE FUNCTION has_any_role(role_names text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND roles && role_names
  );
$$;

-- 4. Drop all existing RLS policies safely
DO $$
DECLARE
    row record;
    tables text[] := ARRAY[
        'profiles', 'allocations', 'departments', 'projects', 'holidays', 
        'clients', 'rate_cards', 'audit_logs', 'client_field_mappings', 
        'client_uploads', 'client_allocation_rows', 'archived_allocations'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        FOR row IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', row.policyname, t);
        END LOOP;
    END LOOP;
END
$$;

-- 6. Drop old role column and get_auth_role
ALTER TABLE profiles DROP COLUMN IF EXISTS role;
DROP FUNCTION IF EXISTS get_auth_role();

-- 7. Drop holidays table
DROP TABLE IF EXISTS holidays;

-- 8. Create leave_requests table
CREATE TABLE leave_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    type text CHECK (type IN ('sick', 'pto')) NOT NULL,
    status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending' NOT NULL,
    manager_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- 9. Create blanket_holidays table
CREATE TABLE blanket_holidays (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date NOT NULL UNIQUE,
    reason text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE blanket_holidays ENABLE ROW LEVEL SECURITY;

-- 5. Recreate RLS policies with new role functions

-- Profiles
CREATE POLICY "Enable read access for all users" ON profiles FOR SELECT USING (true);
CREATE POLICY "Enable update for users based on id or admin" ON profiles FOR UPDATE USING (auth.uid() = id OR has_any_role(ARRAY['admin', 'super_admin']));

-- Allocations
CREATE POLICY "Enable read for all" ON allocations FOR SELECT USING (true);
CREATE POLICY "Enable all for admin" ON allocations FOR ALL USING (has_any_role(ARRAY['admin', 'super_admin']));

-- Projects
CREATE POLICY "Enable read for all" ON projects FOR SELECT USING (true);
CREATE POLICY "Enable all for admin" ON projects FOR ALL USING (has_any_role(ARRAY['admin', 'super_admin']));

-- Departments
CREATE POLICY "Enable read for all" ON departments FOR SELECT USING (true);
CREATE POLICY "Enable all for admin" ON departments FOR ALL USING (has_any_role(ARRAY['admin', 'super_admin']));

-- Clients
CREATE POLICY "Enable read for all" ON clients FOR SELECT USING (true);
CREATE POLICY "Enable all for admin" ON clients FOR ALL USING (has_any_role(ARRAY['admin', 'super_admin']));

-- Rate Cards
CREATE POLICY "Enable read for all" ON rate_cards FOR SELECT USING (true);
CREATE POLICY "Enable all for admin" ON rate_cards FOR ALL USING (has_any_role(ARRAY['admin', 'super_admin']));

-- Audit Logs
CREATE POLICY "Enable read for admin" ON audit_logs FOR SELECT USING (has_any_role(ARRAY['admin', 'super_admin']));
CREATE POLICY "Enable insert for all" ON audit_logs FOR INSERT WITH CHECK (true);

-- Data Import Tables
CREATE POLICY "Enable all for admin" ON client_uploads FOR ALL USING (has_any_role(ARRAY['admin', 'super_admin']));
CREATE POLICY "Enable all for admin" ON client_field_mappings FOR ALL USING (has_any_role(ARRAY['admin', 'super_admin']));
CREATE POLICY "Enable all for admin" ON client_allocation_rows FOR ALL USING (has_any_role(ARRAY['admin', 'super_admin']));
CREATE POLICY "Enable read for all" ON archived_allocations FOR SELECT USING (true);
CREATE POLICY "Enable all for admin" ON archived_allocations FOR ALL USING (has_any_role(ARRAY['admin', 'super_admin']));

-- Leave Requests
CREATE POLICY "Enable read for self or manager or admin" ON leave_requests FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = manager_id OR has_any_role(ARRAY['admin', 'super_admin', 'manager'])
);
CREATE POLICY "Enable insert for self" ON leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable update for manager or admin" ON leave_requests FOR UPDATE USING (
  auth.uid() = manager_id OR has_any_role(ARRAY['admin', 'super_admin', 'manager'])
);

-- Blanket Holidays
CREATE POLICY "Enable read for all" ON blanket_holidays FOR SELECT USING (true);
CREATE POLICY "Enable all for managers and above" ON blanket_holidays FOR ALL USING (has_any_role(ARRAY['admin', 'super_admin', 'manager', 'planner', 'client_head']));


-- 10. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  default_roles text[];
  new_entity text;
BEGIN
  default_roles := ARRAY['user']::text[];
  
  IF new.email LIKE '%@kgac.in' THEN
    new_entity := 'KGAC';
  ELSIF new.email LIKE '%@thekgac.in' THEN
    new_entity := 'KPL';
  ELSE
    new_entity := 'KGAC';
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, roles, entity)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    default_roles,
    new_entity
  );
  RETURN new;
END;
$$;

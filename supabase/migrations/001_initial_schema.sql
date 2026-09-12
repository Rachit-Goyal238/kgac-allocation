-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- a) departments
CREATE TABLE public.departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    manager_id uuid, -- Reference added after auth.users constraint
    created_at timestamptz DEFAULT now()
);

-- b) projects
CREATE TABLE public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    color text NOT NULL DEFAULT '#3B82F6',
    is_active boolean DEFAULT true,
    is_billable boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- c) profiles
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    full_name text NOT NULL,
    avatar_url text,
    role text NOT NULL DEFAULT 'pending' CHECK (role IN ('employee','manager','admin','pending')),
    department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active','pending','inactive')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add manager_id foreign key constraint now that auth.users is assumed
ALTER TABLE public.departments ADD CONSTRAINT departments_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX profiles_email_idx ON public.profiles(email);
CREATE INDEX profiles_department_id_idx ON public.profiles(department_id);
CREATE INDEX profiles_role_idx ON public.profiles(role);
CREATE INDEX profiles_status_idx ON public.profiles(status);

-- d) allocations
CREATE TABLE public.allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    allocation_date date NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
    hours numeric(4,2) NOT NULL DEFAULT 0 CHECK (hours >= 0 AND hours <= 24),
    status text NOT NULL DEFAULT 'billable' CHECK (status IN ('billable','internal','pto','sick','public_holiday')),
    notes text,
    last_edited_by uuid REFERENCES auth.users(id),
    updated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    CONSTRAINT allocations_user_date_key UNIQUE (user_id, allocation_date)
);

CREATE INDEX allocations_user_date_idx ON public.allocations(user_id, allocation_date);
CREATE INDEX allocations_date_idx ON public.allocations(allocation_date);
CREATE INDEX allocations_project_id_idx ON public.allocations(project_id);

-- e) holidays
CREATE TABLE public.holidays (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date date NOT NULL,
    name text NOT NULL,
    year integer,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT holidays_date_name_key UNIQUE (holiday_date, name)
);

-- 3. ROW LEVEL SECURITY

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_auth_role() RETURNS text AS $$
    SELECT COALESCE(
        (SELECT role FROM public.profiles WHERE id = auth.uid()),
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'),
        'pending'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_department_id() RETURNS uuid AS $$
    SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Policies: profiles
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (
    (SELECT public.get_auth_role()) = 'admin' OR
    ((SELECT public.get_auth_role()) = 'manager' AND department_id = (SELECT public.get_auth_department_id())) OR
    id = auth.uid()
);

CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (
    (SELECT public.get_auth_role()) = 'admin' OR id = auth.uid()
);

-- Policies: departments
CREATE POLICY "departments_select" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_insert" ON public.departments FOR INSERT WITH CHECK ((SELECT public.get_auth_role()) = 'admin');
CREATE POLICY "departments_update" ON public.departments FOR UPDATE USING ((SELECT public.get_auth_role()) = 'admin');
CREATE POLICY "departments_delete" ON public.departments FOR DELETE USING ((SELECT public.get_auth_role()) = 'admin');

-- Policies: projects
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT WITH CHECK ((SELECT public.get_auth_role()) = 'admin');
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING ((SELECT public.get_auth_role()) = 'admin');
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING ((SELECT public.get_auth_role()) = 'admin');

-- Policies: allocations
CREATE POLICY "allocations_select" ON public.allocations FOR SELECT USING (
    (SELECT public.get_auth_role()) = 'admin' OR
    ((SELECT public.get_auth_role()) = 'manager' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = allocations.user_id AND department_id = (SELECT public.get_auth_department_id()))) OR
    user_id = auth.uid()
);

CREATE POLICY "allocations_insert" ON public.allocations FOR INSERT WITH CHECK (
    (SELECT public.get_auth_role()) = 'admin' OR
    ((SELECT public.get_auth_role()) = 'manager' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = allocations.user_id AND department_id = (SELECT public.get_auth_department_id()))) OR
    user_id = auth.uid()
);

CREATE POLICY "allocations_update" ON public.allocations FOR UPDATE USING (
    (SELECT public.get_auth_role()) = 'admin' OR
    ((SELECT public.get_auth_role()) = 'manager' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = allocations.user_id AND department_id = (SELECT public.get_auth_department_id()))) OR
    user_id = auth.uid()
);

CREATE POLICY "allocations_delete" ON public.allocations FOR DELETE USING (
    (SELECT public.get_auth_role()) = 'admin' OR
    ((SELECT public.get_auth_role()) = 'manager' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = allocations.user_id AND department_id = (SELECT public.get_auth_department_id()))) OR
    user_id = auth.uid()
);

-- Policies: holidays
CREATE POLICY "holidays_select" ON public.holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "holidays_insert" ON public.holidays FOR INSERT WITH CHECK ((SELECT public.get_auth_role()) = 'admin');
CREATE POLICY "holidays_update" ON public.holidays FOR UPDATE USING ((SELECT public.get_auth_role()) = 'admin');
CREATE POLICY "holidays_delete" ON public.holidays FOR DELETE USING ((SELECT public.get_auth_role()) = 'admin');

-- 4. TRIGGERS

-- a) handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
    v_email text := NEW.email;
    v_full_name text := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    v_avatar_url text := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL);
    v_role text := 'pending';
    v_status text := 'pending';
BEGIN
    IF v_email LIKE '%@kgac.in' THEN
        v_role := 'employee';
        v_status := 'active';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, avatar_url, role, status)
    VALUES (NEW.id, v_email, v_full_name, v_avatar_url, v_role, v_status)
    ON CONFLICT (email) DO UPDATE SET
        id = EXCLUDED.id,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- b) update_updated_at()
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_allocations_updated_at
    BEFORE UPDATE ON public.allocations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. CUSTOM ACCESS TOKEN HOOK
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    claims jsonb;
    user_role text;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = (event->>'user_id')::uuid;
    claims := event->'claims';
    IF user_role IS NOT NULL THEN
        claims := jsonb_set(claims, '{app_metadata, role}', to_jsonb(user_role));
    ELSE
        claims := jsonb_set(claims, '{app_metadata, role}', '"pending"');
    END IF;
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- 6. REALTIME
BEGIN;
    DROP PUBLICATION IF EXISTS supabase_realtime;
    CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE allocations, profiles, holidays;
ALTER TABLE public.allocations REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.holidays REPLICA IDENTITY FULL;

-- 7. RPC FUNCTIONS

-- a) seed_demo_data()
CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dept_ids uuid[];
    v_proj_ids uuid[];
    v_first_names text[] := ARRAY['Rahul', 'Priya', 'Amit', 'Neha', 'Sanjay', 'Pooja', 'Vikram', 'Anjali', 'Karan', 'Sneha'];
    v_last_names text[] := ARRAY['Sharma', 'Patel', 'Singh', 'Kumar', 'Das', 'Gupta', 'Verma', 'Reddy', 'Rao', 'Joshi'];
    v_role text;
    v_dept_id uuid;
    v_uid uuid;
    v_fname text;
    v_lname text;
    v_email text;
    v_date date;
    v_rand_pct int;
    v_proj_id uuid;
    v_hours numeric;
    v_status text;
    v_emp_count int := 0;
    v_alloc_count int := 0;
BEGIN
    SELECT array_agg(id) INTO v_dept_ids FROM public.departments;
    SELECT array_agg(id) INTO v_proj_ids FROM public.projects;

    FOR i IN 1..100 LOOP
        v_uid := gen_random_uuid();
        v_fname := v_first_names[1 + mod((random() * 10)::int, 10)];
        v_lname := v_last_names[1 + mod((random() * 10)::int, 10)];
        v_email := lower(v_fname || '.' || v_lname || '.' || i || '.demo@kgac.in');
        
        IF i <= 5 THEN
            v_role := 'admin';
        ELSIF i <= 15 THEN
            v_role := 'manager';
        ELSE
            v_role := 'employee';
        END IF;

        v_dept_id := v_dept_ids[1 + mod((random() * array_length(v_dept_ids, 1))::int, array_length(v_dept_ids, 1))];

        INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) 
        VALUES ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email, 'fake_hash', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, ('{"full_name":"' || v_fname || ' ' || v_lname || '"}')::jsonb, now(), now(), '', '', '', '');
        
        UPDATE public.profiles SET department_id = v_dept_id, role = v_role, status = 'active' WHERE id = v_uid;
        v_emp_count := v_emp_count + 1;

        FOR j IN 1..30 LOOP
            v_date := current_date - j;
            IF extract(isodow from v_date) < 6 THEN
                v_rand_pct := (random() * 100)::int;
                v_proj_id := v_proj_ids[1 + mod((random() * array_length(v_proj_ids, 1))::int, array_length(v_proj_ids, 1))];
                
                IF v_rand_pct < 80 THEN
                    v_hours := 8; v_status := 'billable';
                ELSIF v_rand_pct < 90 THEN
                    v_hours := (random() * 2 + 4)::numeric; v_status := 'internal';
                ELSIF v_rand_pct < 95 THEN
                    v_hours := 0; v_status := 'billable';
                ELSE
                    v_hours := 8; v_status := 'pto';
                END IF;

                INSERT INTO public.allocations (user_id, allocation_date, project_id, hours, status, notes)
                VALUES (v_uid, v_date, v_proj_id, v_hours, v_status, '[DEMO] Generated record');
                v_alloc_count := v_alloc_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN json_build_object('employees_created', v_emp_count, 'allocations_created', v_alloc_count);
END;
$$;

-- b) clear_demo_data()
CREATE OR REPLACE FUNCTION public.clear_demo_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_emp_count int := 0;
    v_alloc_count int := 0;
BEGIN
    WITH del_allocs AS (
        DELETE FROM public.allocations WHERE notes LIKE '[DEMO]%' RETURNING 1
    ) SELECT count(*) INTO v_alloc_count FROM del_allocs;

    WITH del_users AS (
        DELETE FROM auth.users WHERE email LIKE '%.demo@kgac.in' RETURNING 1
    ) SELECT count(*) INTO v_emp_count FROM del_users;

    RETURN json_build_object('employees_deleted', v_emp_count, 'allocations_deleted', v_alloc_count);
END;
$$;

-- 8. SEED DATA

INSERT INTO public.departments (name) VALUES
    ('Engineering'), ('Design'), ('Marketing'), ('Operations'), ('Finance'), ('Human Resources'), ('Sales')
ON CONFLICT DO NOTHING;

INSERT INTO public.projects (name, code, color, is_active, is_billable) VALUES
    ('Project Alpha', 'ALPHA', '#EF4444', true, true),
    ('Project Beta', 'BETA', '#F59E0B', true, true),
    ('Project Gamma', 'GAMMA', '#10B981', true, true),
    ('Internal Ops', 'INT-OPS', '#6B7280', true, false),
    ('Training', 'TRAIN', '#8B5CF6', true, false),
    ('Bench', 'BENCH', '#9CA3AF', true, false)
ON CONFLICT DO NOTHING;

INSERT INTO public.holidays (holiday_date, name, year) VALUES
    ('2026-01-26', 'Republic Day', 2026),
    ('2026-03-17', 'Holi', 2026),
    ('2026-03-31', 'Eid ul-Fitr', 2026),
    ('2026-04-03', 'Good Friday', 2026),
    ('2026-08-15', 'Independence Day', 2026),
    ('2026-10-02', 'Gandhi Jayanti', 2026),
    ('2026-10-12', 'Dussehra', 2026),
    ('2026-10-31', 'Diwali', 2026),
    ('2026-11-19', 'Guru Nanak Jayanti', 2026),
    ('2026-12-25', 'Christmas', 2026)
ON CONFLICT DO NOTHING;

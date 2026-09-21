-- 020_update_demo_data.sql

DROP FUNCTION IF EXISTS public.seed_demo_data();
DROP FUNCTION IF EXISTS public.clear_demo_data();

CREATE OR REPLACE FUNCTION public.clear_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete allocations for demo users
    DELETE FROM public.allocations WHERE notes LIKE '%[DEMO]%' OR user_id IN (
        SELECT id FROM auth.users WHERE email LIKE '%.demo@kgac.in'
    );
    
    -- Delete audit_teams for demo users or demo vendors
    DELETE FROM public.audit_teams WHERE user_id IN (
        SELECT id FROM auth.users WHERE email LIKE '%.demo@kgac.in'
    ) OR vendor_id IN (
        SELECT id FROM public.vendors WHERE name LIKE '%(Demo)%'
    );
    
    -- Delete audits for demo clients
    DELETE FROM public.audits WHERE client_id IN (
        SELECT id FROM public.clients WHERE name LIKE '%(Demo)%'
    );
    
    -- Delete projects that were generated for these demo audits or standalone demo projects
    DELETE FROM public.projects WHERE name LIKE '%(Demo)%';
    
    -- Delete vendors
    DELETE FROM public.vendors WHERE name LIKE '%(Demo)%';
    
    -- Delete clients
    DELETE FROM public.clients WHERE name LIKE '%(Demo)%';
    
    -- Delete demo users from profiles and auth
    DELETE FROM public.profiles WHERE id IN (
        SELECT id FROM auth.users WHERE email LIKE '%.demo@kgac.in'
    );
    DELETE FROM auth.users WHERE email LIKE '%.demo@kgac.in';
    
    -- Delete departments
    DELETE FROM public.departments WHERE name LIKE '%(Demo)%';
END;
$$;


CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dept_ids uuid[];
    v_client_ids uuid[];
    v_vendor_ids uuid[];
    v_user_ids uuid[];
    v_proj_ids uuid[];
    
    v_first_names text[] := ARRAY['Rahul', 'Priya', 'Amit', 'Neha', 'Sanjay', 'Pooja', 'Vikram', 'Anjali', 'Karan', 'Sneha'];
    v_last_names text[] := ARRAY['Sharma', 'Patel', 'Singh', 'Kumar', 'Das', 'Gupta', 'Verma', 'Reddy', 'Rao', 'Joshi'];
    v_zones text[] := ARRAY['North', 'South', 'East', 'West', 'Central'];
    v_entities text[] := ARRAY['KGAC', 'KPL'];
    
    v_dept_id uuid;
    v_client_id uuid;
    v_vendor_id uuid;
    v_user_id uuid;
    v_audit_id uuid;
    v_proj_id uuid;
    
    v_fname text;
    v_lname text;
    v_email text;
    v_role text;
    v_entity text;
    v_zone text;
    
    v_emp_count int := 0;
    v_audit_count int := 0;
    v_alloc_count int := 0;
    
    v_date date;
    v_resource_count int;
    v_is_vendor boolean;
    v_member_role text;
    v_req_leads int;
    v_req_execs int;
BEGIN
    -- 0. Clear existing demo data first to avoid duplicates
    PERFORM public.clear_demo_data();

    -- 1. Create Departments
    INSERT INTO public.departments (name) VALUES
    ('Audit & Assurance (Demo)'),
    ('Taxation (Demo)'),
    ('Advisory (Demo)');
    
    SELECT array_agg(id) INTO v_dept_ids FROM public.departments WHERE name LIKE '%(Demo)%';
    
    -- 2. Create Clients
    INSERT INTO public.clients (name, code) VALUES
    ('Retail Corp (Demo)', 'RC-DEMO'),
    ('Tech Solutions (Demo)', 'TS-DEMO'),
    ('Mega Mart (Demo)', 'MM-DEMO');
    
    SELECT array_agg(id) INTO v_client_ids FROM public.clients WHERE name LIKE '%(Demo)%';
    
    -- 3. Create Vendors
    INSERT INTO public.vendors (name, type, default_human_rate, default_asset_rate) VALUES
    ('Vendor Agency 1 (Demo)', 'agency', 1000, 500),
    ('Individual 1 (Demo)', 'individual', 800, 0);
    
    SELECT array_agg(id) INTO v_vendor_ids FROM public.vendors WHERE name LIKE '%(Demo)%';
    
    -- 4. Create Standalone Projects
    INSERT INTO public.projects (name, code, color, is_billable) VALUES
    ('Internal Training (Demo)', 'TRN-DEMO', '#F59E0B', false),
    ('Admin Work (Demo)', 'ADM-DEMO', '#6B7280', false);
    
    -- 5. Create Employees (30 employees)
    FOR i IN 1..30 LOOP
        v_user_id := gen_random_uuid();
        v_fname := v_first_names[1 + mod((random() * 1000)::int, 10)];
        v_lname := v_last_names[1 + mod((random() * 1000)::int, 10)];
        v_email := lower(v_fname || '.' || v_lname || '.' || i || '.demo@kgac.in');
        
        IF i <= 2 THEN
            v_role := 'super_admin';
        ELSIF i <= 5 THEN
            v_role := 'manager';
        ELSIF i <= 8 THEN
            v_role := 'planner';
        ELSIF i <= 15 THEN
            v_role := 'audit_manager';
        ELSE
            v_role := 'employee';
        END IF;

        v_dept_id := v_dept_ids[1 + mod((random() * 1000)::int, array_length(v_dept_ids, 1))];
        v_zone := v_zones[1 + mod((random() * 1000)::int, array_length(v_zones, 1))];
        v_entity := v_entities[1 + mod((random() * 1000)::int, array_length(v_entities, 1))];

        INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) 
        VALUES ('00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_email, 'fake_hash', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, ('{"full_name":"' || v_fname || ' ' || v_lname || '"}')::jsonb, now(), now(), '', '', '', '');
        
        -- The auth.users trigger creates the profile, we just update it
        UPDATE public.profiles 
        SET department_id = v_dept_id, 
            roles = ARRAY[v_role], 
            status = 'active',
            zone = v_zone,
            entity = v_entity,
            is_internal_vendor = (random() > 0.8)
        WHERE id = v_user_id;
        
        v_emp_count := v_emp_count + 1;
    END LOOP;
    
    SELECT array_agg(id) INTO v_user_ids FROM auth.users WHERE email LIKE '%.demo@kgac.in';
    SELECT array_agg(id) INTO v_proj_ids FROM public.projects WHERE name LIKE '%(Demo)%';
    
    -- 6. Create 30 Audits
    FOR i IN 1..30 LOOP
        v_client_id := v_client_ids[1 + mod((random() * 1000)::int, array_length(v_client_ids, 1))];
        -- Spread audits between 15 days ago and 15 days in the future
        v_date := current_date - 15 + mod((random() * 30)::int, 30); 
        v_req_leads := 1 + mod((random() * 1000)::int, 2);
        v_req_execs := 2 + mod((random() * 1000)::int, 3);
        
        INSERT INTO public.audits (client_id, store_name, audit_date, audit_type, billing_amount, status, required_leads, required_executives)
        VALUES (
            v_client_id, 
            'Store ' || i || ' (Demo)', 
            v_date, 
            CASE WHEN i % 2 = 0 THEN 'Internal Audit' ELSE 'Statutory Audit' END, 
            (random() * 50000 + 10000)::numeric(10,2),
            CASE WHEN v_date < current_date THEN 'completed' ELSE 'scheduled' END,
            v_req_leads,
            v_req_execs
        ) RETURNING id, project_id INTO v_audit_id, v_proj_id;
        
        v_audit_count := v_audit_count + 1;
        
        -- Assign resources to the audit
        FOR j IN 1..(v_req_leads + v_req_execs) LOOP
            v_is_vendor := (random() > 0.8); 
            v_member_role := CASE WHEN j <= v_req_leads THEN 'lead' ELSE 'executive' END;
            
            IF v_is_vendor THEN
                v_vendor_id := v_vendor_ids[1 + mod((random() * 1000)::int, array_length(v_vendor_ids, 1))];
                INSERT INTO public.audit_teams (audit_id, vendor_id, role) VALUES (v_audit_id, v_vendor_id, v_member_role);
            ELSE
                v_user_id := v_user_ids[1 + mod((random() * 1000)::int, array_length(v_user_ids, 1))];
                INSERT INTO public.audit_teams (audit_id, user_id, role) VALUES (v_audit_id, v_user_id, v_member_role);
                
                -- Add allocation (8h block)
                INSERT INTO public.allocations (user_id, allocation_date, project_id, hours, status, notes)
                VALUES (v_user_id, v_date, v_proj_id, 8, 'billable', '[DEMO] Assigned to Audit');
                
                v_alloc_count := v_alloc_count + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    -- 7. Add some split allocations (multiple projects in a day) for the first 5 users
    FOR i IN 1..5 LOOP
        v_user_id := v_user_ids[i];
        v_date := current_date; -- today
        
        -- clear anything on today for them to avoid 8h + 4h + 4h = 16h
        DELETE FROM public.allocations WHERE user_id = v_user_id AND allocation_date = v_date;
        
        -- insert two 4-hour blocks
        INSERT INTO public.allocations (user_id, allocation_date, project_id, hours, status, notes)
        VALUES 
        (v_user_id, v_date, v_proj_ids[1], 4, 'internal', '[DEMO] Morning Training'),
        (v_user_id, v_date, v_proj_ids[2], 4, 'internal', '[DEMO] Afternoon Admin');
        
        v_alloc_count := v_alloc_count + 2;
    END LOOP;

    RETURN json_build_object(
        'departments', array_length(v_dept_ids, 1), 
        'clients', array_length(v_client_ids, 1), 
        'vendors', array_length(v_vendor_ids, 1), 
        'employees_created', v_emp_count, 
        'audits_created', v_audit_count, 
        'allocations_created', v_alloc_count
    );
END;
$$;

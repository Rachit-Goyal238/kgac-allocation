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

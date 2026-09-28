CREATE OR REPLACE FUNCTION public.bulk_import_employees_v2(employees jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  emp record;
  new_uid uuid;
  v_username text;
  v_password text;
  v_results jsonb := '[]'::jsonb;
BEGIN
  FOR emp IN SELECT * FROM jsonb_to_recordset(employees) AS x(
    employee_id text, first_name text, last_name text, personal_email text, phone_number text, department_id uuid, role text, entity text, zone text, monthly_salary numeric(10,2)
  ) LOOP
    -- skip if employee already exists in profiles
    IF EXISTS (SELECT 1 FROM profiles WHERE employee_id = emp.employee_id) THEN
      CONTINUE;
    END IF;

    -- generate unique username and temp password
    v_username := public.generate_unique_username(emp.first_name, emp.last_name);
    v_password := public.generate_random_password();
    new_uid := gen_random_uuid();

    -- Prevent duplicate personal emails from crashing auth.users
    -- Supabase Auth requires unique email if provided. If email exists, we null it out or skip.
    IF emp.personal_email IS NOT NULL AND emp.personal_email != '' THEN
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = emp.personal_email) THEN
        -- Fallback to a fake unique email to ensure insertion doesn't fail
        emp.personal_email := v_username || '@kgac-placeholder.in';
      END IF;
    ELSE
      emp.personal_email := v_username || '@kgac-placeholder.in';
    END IF;

    -- 1. Insert into auth.users (simulate signup)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
    VALUES (
      new_uid, 
      emp.personal_email, 
      crypt(v_password, gen_salt('bf')),
      now(),
      jsonb_build_object('full_name', emp.first_name || ' ' || emp.last_name)
    );

    -- 2. Insert into profiles
    -- Make sure roles is formatted as a jsonb array
    INSERT INTO public.profiles (
      id, email, full_name, personal_email, employee_id, phone_number,
      department_id, roles, entity, zone, monthly_salary, status
    ) VALUES (
      new_uid,
      emp.personal_email, -- We use the personal_email as the primary identifier here too
      emp.first_name || ' ' || emp.last_name,
      emp.personal_email,
      emp.employee_id,
      emp.phone_number,
      emp.department_id,
      jsonb_build_array(emp.role),
      CAST(emp.entity AS public."UserEntity"),
      emp.zone,
      emp.monthly_salary,
      'active'
    );
    
    -- 3. If a real personal email was provided, trigger the email notification
    IF emp.personal_email NOT LIKE '%@kgac-placeholder.in' THEN
        -- Fire off the Resend HTTP request asynchronously
        PERFORM public.send_welcome_email(
            emp.personal_email,
            emp.first_name,
            v_username,
            v_password
        );
    END IF;

    -- Append to results for the CSV download
    v_results := v_results || jsonb_build_object(
      'employee_id', emp.employee_id,
      'name', emp.first_name || ' ' || emp.last_name,
      'username', v_username,
      'password', v_password,
      'personal_email', CASE WHEN emp.personal_email LIKE '%@kgac-placeholder.in' THEN 'None (used placeholder)' ELSE emp.personal_email END
    );
  END LOOP;

  RETURN v_results;
END;
$$;

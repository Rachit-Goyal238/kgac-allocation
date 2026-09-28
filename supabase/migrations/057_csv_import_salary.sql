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
    DECLARE
      v_auth_email text;
    BEGIN
      v_auth_email := COALESCE(emp.personal_email, v_username || '@kgac-users.com');
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_auth_email) THEN
        v_auth_email := v_username || '@kgac-users.com';
      END IF;

      -- Create the auth.users record (this triggers handle_new_user which creates the profile)
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
        created_at, updated_at, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_uid,
        'authenticated',
        'authenticated',
        v_auth_email,
        crypt(v_password, gen_salt('bf')),
        now(),
        now(),
        now(),
        jsonb_build_object('full_name', emp.first_name || ' ' || emp.last_name, 'employee_id', emp.employee_id, 'username', v_username),
        '', '', '', ''
      );

      -- Wait for the trigger to create the profile, then UPDATE it with all our custom CSV fields
      UPDATE public.profiles
      SET 
        personal_email = emp.personal_email,
        phone_number = emp.phone_number,
        department_id = COALESCE(emp.department_id, (SELECT id FROM departments WHERE name = 'Unassigned' LIMIT 1)),
        entity = COALESCE(emp.entity, 'KGAC'),
        roles = ARRAY[COALESCE(emp.role, 'employee')],
        status = 'active',
        employee_id = emp.employee_id,
        zone = emp.zone,
        monthly_salary = emp.monthly_salary,
        username = v_username
      WHERE id = new_uid;

      -- If a real personal email was provided, trigger the email notification
      IF emp.personal_email IS NOT NULL AND emp.personal_email NOT LIKE '%@kgac-users.com' THEN
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
        'personal_email', CASE WHEN emp.personal_email LIKE '%@kgac-users.com' THEN 'None (used placeholder)' ELSE emp.personal_email END
      );
    END;
  END LOOP;

  RETURN v_results;
END;
$$;

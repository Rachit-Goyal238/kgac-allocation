CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Function to generate a random 8 char password
CREATE OR REPLACE FUNCTION public.generate_random_password()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to generate a unique username
CREATE OR REPLACE FUNCTION public.generate_unique_username(p_first text, p_last text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_username text;
  final_username text;
  counter integer := 1;
BEGIN
  -- first 3 letters of first name + first 3 letters of last name
  base_username := upper(substring(regexp_replace(p_first, '[^a-zA-Z]', '', 'g') from 1 for 3)) || 
                   upper(substring(regexp_replace(p_last, '[^a-zA-Z]', '', 'g') from 1 for 3));
                   
  -- append 3 random numbers (100-999)
  final_username := base_username || floor(random() * (999-100+1) + 100)::int::text;
  
  -- ensure uniqueness just in case
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    final_username := base_username || floor(random() * (999-100+1) + 100)::int::text;
  END LOOP;
  
  RETURN final_username;
END;
$$;

-- RPC for Admin Bulk Import (Auto Provisioning)
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
    employee_id text, first_name text, last_name text, personal_email text, department_id uuid, role text, entity text
  ) LOOP
    -- skip if employee already exists in profiles
    IF EXISTS (SELECT 1 FROM profiles WHERE employee_id = emp.employee_id) THEN
      CONTINUE;
    END IF;

    -- generate unique username and temp password
    v_username := public.generate_unique_username(emp.first_name, emp.last_name);
    v_password := public.generate_random_password();
    new_uid := gen_random_uuid();

    -- Create the auth.users record
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
      created_at, updated_at, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_uid,
      'authenticated',
      'authenticated',
      COALESCE(emp.personal_email, v_username || '@kgac-users.com'),
      crypt(v_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      jsonb_build_object('full_name', emp.first_name || ' ' || emp.last_name, 'employee_id', emp.employee_id, 'username', v_username),
      '', '', '', ''
    );

    -- the insert above triggers handle_new_user, which creates a row in profiles.
    -- update that row with the imported data.
    UPDATE public.profiles 
    SET employee_id = emp.employee_id,
        username = v_username,
        personal_email = emp.personal_email,
        roles = ARRAY[COALESCE(emp.role, 'employee')],
        department_id = emp.department_id,
        entity = COALESCE(emp.entity, 'KGAC'),
        entity_selected = true,
        status = 'active'
    WHERE id = new_uid;

    -- Add to results
    v_results := v_results || jsonb_build_object(
      'employee_id', emp.employee_id,
      'name', emp.first_name || ' ' || emp.last_name,
      'username', v_username,
      'password', v_password
    );

  END LOOP;
  
  RETURN v_results;
END;
$$;

-- RPC for Admin Resetting a Password
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ensure the caller is an admin or super_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND ('admin' = ANY(roles) OR 'super_admin' = ANY(roles))
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reset passwords.';
  END IF;

  UPDATE auth.users 
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

-- RPC for Getting Email by Username during Login
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT personal_email INTO v_email FROM profiles WHERE username = p_username;
  IF v_email IS NULL THEN
    -- Fallback to the generated dummy email if personal email is missing
    v_email := p_username || '@kgac-users.com';
  END IF;
  RETURN v_email;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_import_employees_v2(jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';



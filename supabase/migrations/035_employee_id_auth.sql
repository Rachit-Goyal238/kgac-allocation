CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_id text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personal_email text;

-- RPC for Admin Bulk Import
CREATE OR REPLACE FUNCTION public.bulk_import_employees(employees jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  emp record;
  new_uid uuid;
BEGIN
  FOR emp IN SELECT * FROM jsonb_to_recordset(employees) AS x(
    employee_id text, full_name text, department_id uuid, role text, entity text
  ) LOOP
    -- check if employee already exists in profiles
    IF EXISTS (SELECT 1 FROM profiles WHERE employee_id = emp.employee_id) THEN
      CONTINUE;
    END IF;

    -- generate a dummy email for auth
    new_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
      created_at, updated_at, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_uid,
      'authenticated',
      'authenticated',
      lower(emp.employee_id) || '@kgac-users.com',
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(),
      now(),
      now(),
      jsonb_build_object('full_name', emp.full_name, 'employee_id', emp.employee_id)
    );

    -- the insert above will trigger handle_new_user, which creates a row in profiles.
    -- we update that row with the imported data.
    UPDATE public.profiles 
    SET employee_id = emp.employee_id,
        role = COALESCE(emp.role, 'employee'),
        department_id = emp.department_id,
        entity = COALESCE(emp.entity, 'KGAC')
    WHERE id = new_uid;
  END LOOP;
END;
$$;

-- RPC for Employee Claiming Account
CREATE OR REPLACE FUNCTION public.claim_employee_account(
  p_employee_id text,
  p_personal_email text,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid;
BEGIN
  -- find the profile
  SELECT id INTO v_uid FROM profiles WHERE employee_id = p_employee_id;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Employee ID not found. Please contact HR.';
  END IF;

  -- check if already claimed
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND personal_email IS NOT NULL) THEN
    RAISE EXCEPTION 'Account already claimed. Please use the login screen.';
  END IF;

  -- ensure email isnt taken by another auth user
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_personal_email) THEN
    RAISE EXCEPTION 'This email is already registered to another account.';
  END IF;

  -- update auth.users with the real email and the new password
  UPDATE auth.users 
  SET email = p_personal_email,
      encrypted_password = crypt(p_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = v_uid;

  -- update profile
  UPDATE public.profiles
  SET personal_email = p_personal_email,
      status = 'active'
  WHERE id = v_uid;

  RETURN true;
END;
$$;

-- RPC for Getting Email by Employee ID during Login
CREATE OR REPLACE FUNCTION public.get_email_by_employee_id(p_employee_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT personal_email INTO v_email FROM profiles WHERE employee_id = p_employee_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Employee ID not found or not claimed yet.';
  END IF;
  RETURN v_email;
END;
$$;

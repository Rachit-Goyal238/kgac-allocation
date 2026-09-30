-- Migration 067: Resend-powered Password Reset with matching KGAC branded email template

-- 1. Table to track custom password reset tokens
CREATE TABLE IF NOT EXISTS public.password_resets (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_resets_token_idx ON public.password_resets(token);
CREATE INDEX IF NOT EXISTS password_resets_user_id_idx ON public.password_resets(user_id);

ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- 2. RPC to request password reset via Resend
CREATE OR REPLACE FUNCTION public.request_password_reset(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_full_name text;
  v_first_name text;
  v_personal_email text;
  v_auth_email text;
  v_target_email text;
  v_token text;
  v_html text;
  v_payload jsonb;
  v_api_key text := current_setting('app.settings.resend_api_key', true);
  v_from text := 'KGAC System <system@kgac.in>';
BEGIN
  IF v_api_key IS NULL OR v_api_key = '' THEN
    v_api_key := 're_xxxxxxxxxxxxxxxxx';
  END IF;

  -- Look up user by username (case-insensitive)
  SELECT p.id, p.full_name, p.personal_email, au.email
  INTO v_user_id, v_full_name, v_personal_email, v_auth_email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE upper(p.username) = upper(trim(p_username));

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Username not found. Please verify your username.');
  END IF;

  -- Extract first name
  v_first_name := split_part(v_full_name, ' ', 1);
  IF v_first_name IS NULL OR v_first_name = '' THEN
    v_first_name := 'there';
  END IF;

  -- Determine target email (personal email preferred, fallback to auth email)
  IF v_personal_email IS NOT NULL AND v_personal_email != '' AND v_personal_email NOT LIKE '%@kgac-users.com' THEN
    v_target_email := v_personal_email;
  ELSIF v_auth_email IS NOT NULL AND v_auth_email != '' AND v_auth_email NOT LIKE '%@kgac-users.com' THEN
    v_target_email := v_auth_email;
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'No valid email address on file for this account. Please contact HR or your administrator.');
  END IF;

  -- Invalidate any existing unused reset tokens for this user
  UPDATE public.password_resets 
  SET used = true 
  WHERE user_id = v_user_id AND used = false;

  -- Generate secure random 64-character token
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Store token with 1 hour expiration
  INSERT INTO public.password_resets (token, user_id, expires_at, used)
  VALUES (v_token, v_user_id, now() + interval '1 hour', false);

  -- Build matching branded HTML template
  v_html := '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reset Your Password - KGAC</title><style>body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; } .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; } .header { background-color: #0f172a; padding: 30px 40px; text-align: center; } .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; } .content { padding: 40px; color: #334155; line-height: 1.6; } .content h2 { color: #0f172a; font-size: 20px; margin-top: 0; } .button-container { text-align: center; margin: 35px 0 25px; } .button { background-color: #3b82f6; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; display: inline-block; } .note { font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 25px; } .footer { padding: 20px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 13px; }</style></head><body><div class="container"><div class="header"><h1>KGAC Audit Allocation</h1></div><div class="content"><h2>Password Reset Request</h2><p>Hello ' || v_first_name || ',</p><p>We received a request to reset the password for your KGAC Allocation account (Username: <strong>' || upper(trim(p_username)) || '</strong>).</p><p>Click the button below to choose a new password. For security, this link is valid for <strong>1 hour</strong>.</p><div class="button-container"><a href="https://kgac-allocation.vercel.app/auth/reset-password?token=' || v_token || '" class="button">Reset Password</a></div><p class="note">If you did not request a password reset, you can safely ignore this email. Your account remains secure and your password will not be changed.</p></div><div class="footer">This is an automated message from Kumar Aggarwal Gaurav and Co.<br>Please do not reply directly to this email.</div></div></body></html>';

  -- Send email via Resend
  v_payload := jsonb_build_object(
    'from', v_from,
    'to', jsonb_build_array(v_target_email),
    'subject', 'Reset Your Password - KGAC Allocation',
    'html', v_html
  );

  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_api_key,
      'Content-Type', 'application/json'
    ),
    body := v_payload
  );

  RETURN jsonb_build_object('success', true, 'message', 'Password reset link sent to your registered email.');
END;
$$;

-- 3. RPC to verify a reset token
CREATE OR REPLACE FUNCTION public.verify_reset_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_expires_at timestamptz;
  v_used boolean;
  v_full_name text;
BEGIN
  SELECT pr.user_id, pr.expires_at, pr.used, p.full_name
  INTO v_user_id, v_expires_at, v_used, v_full_name
  FROM public.password_resets pr
  JOIN public.profiles p ON p.id = pr.user_id
  WHERE pr.token = trim(p_token);

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid password reset link.');
  END IF;

  IF v_used THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This reset link has already been used.');
  END IF;

  IF v_expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This password reset link has expired (valid for 1 hour). Please request a new one.');
  END IF;

  RETURN jsonb_build_object('valid', true, 'full_name', v_full_name);
END;
$$;

-- 4. RPC to complete the password reset
CREATE OR REPLACE FUNCTION public.complete_password_reset(p_token text, p_new_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_expires_at timestamptz;
  v_used boolean;
BEGIN
  IF length(p_new_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters long.');
  END IF;

  SELECT pr.user_id, pr.expires_at, pr.used
  INTO v_user_id, v_expires_at, v_used
  FROM public.password_resets pr
  WHERE pr.token = trim(p_token);

  IF v_user_id IS NULL OR v_used OR v_expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reset link is invalid or has expired.');
  END IF;

  -- Update password in auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = v_user_id;

  -- Mark token as used
  UPDATE public.password_resets
  SET used = true
  WHERE token = trim(p_token);

  RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_password_reset(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_reset_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_password_reset(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

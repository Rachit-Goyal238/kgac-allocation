-- Enable the pg_net extension to allow Postgres to make HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the secure email sender function
CREATE OR REPLACE FUNCTION public.send_welcome_email(
  p_personal_email text, 
  p_first_name text, 
  p_username text, 
  p_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_html text;
  v_payload jsonb;
  v_api_key text := 're_xxxxxxxxxxxxxxxxxxxxx';
  v_from text := 'KGAC System <system@kgac.in>';
BEGIN
  -- Build the HTML template (Injecting the dynamic variables)
  v_html := '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to KGAC Allocation</title><style>body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; } .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; } .header { background-color: #0f172a; padding: 30px 40px; text-align: center; } .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; } .content { padding: 40px; color: #334155; line-height: 1.6; } .content h2 { color: #0f172a; font-size: 20px; margin-top: 0; } .credentials-box { background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 6px 6px 0; } .cred-row { margin-bottom: 10px; } .cred-label { font-weight: 600; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; } .cred-value { font-family: monospace; font-size: 16px; color: #0f172a; font-weight: 700; display: block; margin-top: 4px; } .button-container { text-align: center; margin: 35px 0 15px; } .button { background-color: #3b82f6; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; display: inline-block; } .footer { padding: 20px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 13px; }</style></head><body><div class="container"><div class="header"><h1>KGAC Audit Allocation</h1></div><div class="content"><h2>Welcome to the team, ' || p_first_name || '!</h2><p>Your account has been successfully provisioned by the HR team. You can now access the internal portal to view your upcoming client audit schedules, request time off, and log your hours.</p><div class="credentials-box"><div class="cred-row"><span class="cred-label">Your Username:</span><span class="cred-value">' || p_username || '</span></div><div class="cred-row" style="margin-bottom: 0;"><span class="cred-label">Temporary Password:</span><span class="cred-value">' || p_password || '</span></div></div><p><strong>Important:</strong> For security purposes, please log in immediately and change your temporary password by clicking on your Profile in the top right corner.</p><div class="button-container"><a href="https://kgac.in" class="button">Log In to Your Account</a></div></div><div class="footer">This is an automated message from Kumar Aggarwal Gaurav and Co.<br>Please do not reply directly to this email.</div></div></body></html>';
  
  -- Build the exact JSON payload Resend expects
  v_payload := jsonb_build_object(
    'from', v_from,
    'to', jsonb_build_array(p_personal_email),
    'subject', 'Welcome to the KGAC Allocation Portal',
    'html', v_html
  );
  
  -- Send the HTTP POST request to Resend automatically!
  PERFORM net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_api_key,
        'Content-Type', 'application/json'
      ),
      body := v_payload
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_welcome_email(text, text, text, text) TO authenticated;


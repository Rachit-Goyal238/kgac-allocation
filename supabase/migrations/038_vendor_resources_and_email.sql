-- 1. Create vendor_resources table
CREATE TABLE IF NOT EXISTS public.vendor_resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text CHECK (type IN ('man', 'asset')) NOT NULL,
  default_rate numeric(10, 2),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Add vendor_resource_id to audit_teams
ALTER TABLE public.audit_teams ADD COLUMN IF NOT EXISTS vendor_resource_id uuid REFERENCES public.vendor_resources(id) ON DELETE CASCADE;

-- 3. Add contact_person_id to audits
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS contact_person_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Enable RLS on vendor_resources
ALTER TABLE public.vendor_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for authenticated users" ON public.vendor_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all for admins on vendor_resources" ON public.vendor_resources FOR ALL TO authenticated USING (has_any_role(ARRAY['admin', 'super_admin'])) WITH CHECK (has_any_role(ARRAY['admin', 'super_admin']));

-- 5. The Trigger for Email Dispatch
CREATE OR REPLACE FUNCTION public.notify_vendor_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vendor_email text;
  v_vendor_name text;
  v_resource_name text;
  v_audit_name text;
  v_audit_date date;
  v_contact_name text;
  v_contact_email text;
  v_payload jsonb;
  v_request_id bigint;
BEGIN
  -- ONLY process if it's a vendor assignment (vendor_id is not null)
  IF NEW.vendor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get vendor details
  SELECT contact_email, name INTO v_vendor_email, v_vendor_name
  FROM public.vendors
  WHERE id = NEW.vendor_id;

  -- Do not send if they don't have an email
  IF v_vendor_email IS NULL OR v_vendor_email = '' THEN
    RETURN NEW;
  END IF;

  -- Get resource name if applicable
  IF NEW.vendor_resource_id IS NOT NULL THEN
    SELECT name INTO v_resource_name
    FROM public.vendor_resources
    WHERE id = NEW.vendor_resource_id;
  ELSE
    v_resource_name := 'General Resource';
  END IF;

  -- Get audit details and contact person
  SELECT a.store_name, a.audit_date, p.full_name, p.email
  INTO v_audit_name, v_audit_date, v_contact_name, v_contact_email
  FROM public.audits a
  LEFT JOIN public.profiles p ON p.id = a.contact_person_id
  WHERE a.id = NEW.audit_id;

  v_contact_name := COALESCE(v_contact_name, 'the KGAC Team');
  v_contact_email := COALESCE(v_contact_email, 'system@kgac.in');

  -- Build the Resend Payload
  v_payload := jsonb_build_object(
    'from', 'KGAC Allocation <system@kgac.in>',
    'to', v_vendor_email,
    'subject', 'Audit Allocation: ' || v_audit_name,
    'html', 
    '<html><body style="font-family: sans-serif; color: #333;">' ||
    '<h2>Audit Assignment Notification</h2>' ||
    '<p>Hello ' || v_vendor_name || ',</p>' ||
    '<p>KGAC has formally assigned you to provide resources for an upcoming audit.</p>' ||
    '<ul>' ||
    '<li><strong>Audit Name:</strong> ' || v_audit_name || '</li>' ||
    '<li><strong>Date:</strong> ' || v_audit_date || '</li>' ||
    '<li><strong>Resource Requested:</strong> ' || v_resource_name || ' (' || NEW.role || ')</li>' ||
    '</ul>' ||
    '<p>If you have any questions regarding this audit or need to confirm details, please reach out to your designated contact person: <strong>' || v_contact_name || '</strong> (' || v_contact_email || ').</p>' ||
    '<br><p>Thank you,<br>KGAC Allocation System</p>' ||
    '</body></html>'
  );

  -- Send via pg_net (Remember to replace with your actual API key)
  SELECT net.http_post(
      url:='https://api.resend.com/emails',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer re_xxxxxxxxxxxxxxxxxxxxx"}'::jsonb,
      body:=v_payload
  ) INTO v_request_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_vendor_on_assignment ON public.audit_teams;
CREATE TRIGGER trigger_notify_vendor_on_assignment
  AFTER INSERT ON public.audit_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_vendor_on_assignment();

-- Allow ALL authenticated users to read ALL audits (for the All Audits page)
-- The existing team-member-only policy is too restrictive for a company-wide audit view

DROP POLICY IF EXISTS "Enable read for audit team members" ON public.audits;

-- Replace with open read for all authenticated users
CREATE POLICY "Enable read for all authenticated on audits" ON public.audits
  FOR SELECT
  USING (auth.role() = 'authenticated');

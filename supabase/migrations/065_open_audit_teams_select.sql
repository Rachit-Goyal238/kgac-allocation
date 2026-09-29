-- Allow all authenticated users to read audit team assignments
-- (so everyone can see who is allocated to each audit)
DROP POLICY IF EXISTS "Enable read for self on audit_teams" ON public.audit_teams;

CREATE POLICY "Enable read for all authenticated on audit_teams" ON public.audit_teams
  FOR SELECT
  USING (auth.role() = 'authenticated');

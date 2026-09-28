-- Fix Invoice RLS: restrict mutations to finance/admin/super_admin only
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete" ON public.invoices;

-- Anyone can view invoices (finance, admin, manager can all see)
CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT USING (true);

-- Only finance and admins can create invoices (plus the auto-trigger runs as SECURITY DEFINER)
CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT WITH CHECK (
    (SELECT roles FROM public.profiles WHERE id = auth.uid()) && ARRAY['finance', 'admin', 'super_admin']::text[]
  );

-- Only finance and admins can update (mark paid, etc.)
CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE USING (
    (SELECT roles FROM public.profiles WHERE id = auth.uid()) && ARRAY['finance', 'admin', 'super_admin']::text[]
  );

-- Only admins can delete
CREATE POLICY "invoices_delete" ON public.invoices
  FOR DELETE USING (
    (SELECT roles FROM public.profiles WHERE id = auth.uid()) && ARRAY['admin', 'super_admin']::text[]
  );

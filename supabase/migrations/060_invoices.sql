-- 1. Create Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  audit_id uuid REFERENCES public.audits(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete" ON public.invoices;

CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE USING (true);
CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE USING (true);

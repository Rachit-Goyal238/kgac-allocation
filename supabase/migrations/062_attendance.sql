CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert" ON public.attendance;
DROP POLICY IF EXISTS "attendance_update" ON public.attendance;
DROP POLICY IF EXISTS "attendance_delete" ON public.attendance;

CREATE POLICY "attendance_select" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "attendance_insert" ON public.attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "attendance_update" ON public.attendance FOR UPDATE USING (auth.uid() = user_id OR (SELECT roles FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin', 'manager', 'finance', 'hr'));
CREATE POLICY "attendance_delete" ON public.attendance FOR DELETE USING ((SELECT roles FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

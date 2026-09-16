-- 1. Drop allocations unique constraint
ALTER TABLE public.allocations DROP CONSTRAINT IF EXISTS allocations_user_date_key;

-- 2. Update profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_internal_vendor boolean DEFAULT false;

-- 3. Create project_assignments table
CREATE TABLE IF NOT EXISTS public.project_assignments (
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all" ON public.project_assignments FOR SELECT USING (true);
CREATE POLICY "Enable insert for admins and managers" ON public.project_assignments FOR INSERT WITH CHECK (has_any_role(ARRAY['admin', 'super_admin', 'manager', 'planner']));
CREATE POLICY "Enable delete for admins and managers" ON public.project_assignments FOR DELETE USING (has_any_role(ARRAY['admin', 'super_admin', 'manager', 'planner']));

-- 4. Create vendor_rates table
CREATE TABLE IF NOT EXISTS public.vendor_rates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
    zone_or_reason text NOT NULL,
    human_rate numeric(10,2),
    asset_rate numeric(10,2),
    created_at timestamptz DEFAULT now(),
    UNIQUE (vendor_id, zone_or_reason)
);

ALTER TABLE public.vendor_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for all authenticated users" ON public.vendor_rates FOR ALL USING (auth.role() = 'authenticated');

-- 5. Create internal_assets and asset_requests tables
CREATE TABLE IF NOT EXISTS public.internal_assets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    type text NOT NULL,
    status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance')),
    assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id uuid REFERENCES public.internal_assets(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.internal_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for all authenticated users on internal_assets" ON public.internal_assets FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.asset_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for all authenticated users on asset_requests" ON public.asset_requests FOR ALL USING (auth.role() = 'authenticated');


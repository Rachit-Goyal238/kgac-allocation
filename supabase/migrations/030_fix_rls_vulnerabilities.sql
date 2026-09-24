-- Fix severe RLS vulnerabilities on vendor_rates, internal_assets, and asset_requests
-- Previously, they allowed ANY authenticated user to insert, update, or delete records.

-- vendor_rates: Only admins/super_admins can modify, anyone can select
DROP POLICY IF EXISTS "Allow authenticated users to insert vendor rates" ON public.vendor_rates;
DROP POLICY IF EXISTS "Allow authenticated users to update vendor rates" ON public.vendor_rates;
DROP POLICY IF EXISTS "Allow authenticated users to delete vendor rates" ON public.vendor_rates;

CREATE POLICY "Allow admins to insert vendor rates" 
ON public.vendor_rates FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND (get_auth_role() = 'admin' OR get_auth_role() = 'super_admin'));

CREATE POLICY "Allow admins to update vendor rates" 
ON public.vendor_rates FOR UPDATE 
USING (auth.role() = 'authenticated' AND (get_auth_role() = 'admin' OR get_auth_role() = 'super_admin'));

CREATE POLICY "Allow admins to delete vendor rates" 
ON public.vendor_rates FOR DELETE 
USING (auth.role() = 'authenticated' AND (get_auth_role() = 'admin' OR get_auth_role() = 'super_admin'));

-- internal_assets: Only admins/super_admins can modify, anyone can select
DROP POLICY IF EXISTS "Allow authenticated users to insert internal assets" ON public.internal_assets;
DROP POLICY IF EXISTS "Allow authenticated users to update internal assets" ON public.internal_assets;
DROP POLICY IF EXISTS "Allow authenticated users to delete internal assets" ON public.internal_assets;

CREATE POLICY "Allow admins to insert internal assets" 
ON public.internal_assets FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND (get_auth_role() = 'admin' OR get_auth_role() = 'super_admin'));

CREATE POLICY "Allow admins to update internal assets" 
ON public.internal_assets FOR UPDATE 
USING (auth.role() = 'authenticated' AND (get_auth_role() = 'admin' OR get_auth_role() = 'super_admin'));

CREATE POLICY "Allow admins to delete internal assets" 
ON public.internal_assets FOR DELETE 
USING (auth.role() = 'authenticated' AND (get_auth_role() = 'admin' OR get_auth_role() = 'super_admin'));

-- asset_requests: Users can insert their own, managers/admins can update/delete
DROP POLICY IF EXISTS "Allow authenticated users to insert asset requests" ON public.asset_requests;
DROP POLICY IF EXISTS "Allow authenticated users to update asset requests" ON public.asset_requests;
DROP POLICY IF EXISTS "Allow authenticated users to delete asset requests" ON public.asset_requests;

CREATE POLICY "Allow users to insert their own asset requests" 
ON public.asset_requests FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Allow admins to update asset requests" 
ON public.asset_requests FOR UPDATE 
USING (auth.role() = 'authenticated' AND (get_auth_role() = 'admin' OR get_auth_role() = 'super_admin'));

CREATE POLICY "Allow users to delete their own pending asset requests" 
ON public.asset_requests FOR DELETE 
USING (auth.role() = 'authenticated' AND (user_id = auth.uid() AND status = 'pending') OR (get_auth_role() = 'admin' OR get_auth_role() = 'super_admin'));

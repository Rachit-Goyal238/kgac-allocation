-- 032_asset_return_workflow.sql
-- Allow 'return_pending' status in asset_requests and configure RLS and columns for the return confirmation workflow

-- 1. Drop existing check constraint on asset_requests status if exists
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.asset_requests'::regclass
      AND contype = 'c'
      AND pg_get_expr(conbin, conrelid) LIKE '%status%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.asset_requests DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- 2. Add the updated check constraint allowing 'return_pending'
ALTER TABLE public.asset_requests ADD CONSTRAINT asset_requests_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'returned', 'return_pending'));

-- 3. Add return tracking columns
ALTER TABLE public.asset_requests ADD COLUMN IF NOT EXISTS return_notes text;
ALTER TABLE public.asset_requests ADD COLUMN IF NOT EXISTS return_requested_at timestamptz;

-- 4. RLS policies on public.asset_requests
-- Users can update their own asset requests (e.g. to mark return_pending)
DROP POLICY IF EXISTS "Allow users to update own asset requests" ON public.asset_requests;
CREATE POLICY "Allow users to update own asset requests"
ON public.asset_requests FOR UPDATE
USING (auth.role() = 'authenticated' AND user_id = auth.uid())
WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Managers and admins can update asset requests (to approve borrows and confirm/decline returns)
DROP POLICY IF EXISTS "Allow admins to update asset requests" ON public.asset_requests;
DROP POLICY IF EXISTS "Allow managers and admins to update asset requests" ON public.asset_requests;
CREATE POLICY "Allow managers and admins to update asset requests"
ON public.asset_requests FOR UPDATE
USING (auth.role() = 'authenticated' AND has_any_role(ARRAY['admin', 'super_admin', 'manager', 'hr']));

-- 5. RLS policies on public.internal_assets
-- Managers, HR, and admins can update internal assets (to set in_use on borrow and available on return)
DROP POLICY IF EXISTS "Allow admins to update internal assets" ON public.internal_assets;
DROP POLICY IF EXISTS "Allow managers and admins to update internal assets" ON public.internal_assets;
CREATE POLICY "Allow managers and admins to update internal assets"
ON public.internal_assets FOR UPDATE
USING (auth.role() = 'authenticated' AND has_any_role(ARRAY['admin', 'super_admin', 'manager', 'hr']));

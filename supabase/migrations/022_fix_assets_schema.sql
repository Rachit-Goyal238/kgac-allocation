-- Add missing serial_number column to internal_assets
ALTER TABLE public.internal_assets ADD COLUMN IF NOT EXISTS serial_number text;

-- Update the status check constraint on asset_requests to allow 'returned'
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the system-generated check constraint name for the 'status' column
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.asset_requests'::regclass
      AND contype = 'c'
      AND pg_get_expr(conbin, conrelid) LIKE '%status%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.asset_requests DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Add the new constraint explicitly named
ALTER TABLE public.asset_requests ADD CONSTRAINT asset_requests_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'returned'));

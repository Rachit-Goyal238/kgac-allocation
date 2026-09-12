-- 1. Drop completely unused legacy timesheet tables
DROP TABLE IF EXISTS client_allocation_rows CASCADE;
DROP TABLE IF EXISTS client_allocations CASCADE;

-- 2. Drop the unused rate_cards table (since rates are now fixed per audit/vendor)
DROP TABLE IF EXISTS rate_cards CASCADE;

-- 3. Remove unused vendor pricing fields from the internal profiles table
-- (Vendors are now tracked in the 'vendors' table, not 'profiles')
ALTER TABLE profiles DROP COLUMN IF EXISTS agreed_rate;
ALTER TABLE profiles DROP COLUMN IF EXISTS rate_basis;
ALTER TABLE profiles DROP COLUMN IF EXISTS resource_type; -- (Everyone in profiles is now internal)
ALTER TABLE profiles DROP COLUMN IF EXISTS vendor_name;

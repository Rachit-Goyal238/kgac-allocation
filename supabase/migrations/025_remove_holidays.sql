-- 1. Delete any allocations that were tagged as public_holiday
DELETE FROM allocations WHERE status = 'public_holiday';

-- 2. Update the allocations status CHECK constraint to remove public_holiday
ALTER TABLE allocations DROP CONSTRAINT IF EXISTS allocations_status_check;
ALTER TABLE allocations ADD CONSTRAINT allocations_status_check CHECK (status IN ('billable', 'internal', 'pto', 'sick'));

-- 3. Drop the blanket_holidays table completely
DROP TABLE IF EXISTS blanket_holidays CASCADE;

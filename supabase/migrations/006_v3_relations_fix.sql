-- 1. Drop the legacy super_admin cap trigger that crashes on the deleted 'role' column
DROP TRIGGER IF EXISTS check_super_admin_cap_trigger ON profiles;
DROP FUNCTION IF EXISTS enforce_super_admin_cap();

-- 2. Fix the foreign key for PostgREST joins
ALTER TABLE audit_teams DROP CONSTRAINT audit_teams_user_id_fkey;
ALTER TABLE audit_teams ADD CONSTRAINT audit_teams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Add audit link to calendar allocations
ALTER TABLE allocations ADD COLUMN audit_id uuid REFERENCES audits(id) ON DELETE SET NULL;

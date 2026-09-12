-- 1. Reset ALL allocations policies to ensure clean state
DROP POLICY IF EXISTS "Enable read for all allocations" ON allocations;
DROP POLICY IF EXISTS "Enable insert for allocations" ON allocations;
DROP POLICY IF EXISTS "Enable update for allocations" ON allocations;
DROP POLICY IF EXISTS "Enable delete for allocations" ON allocations;

DROP POLICY IF EXISTS "Enable all for admin" ON allocations;
DROP POLICY IF EXISTS "Enable read for all" ON allocations;
DROP POLICY IF EXISTS "Enable all for users based on user_id" ON allocations;
DROP POLICY IF EXISTS "Users can insert own allocations" ON allocations;
DROP POLICY IF EXISTS "Users can update own allocations" ON allocations;

-- 2. Create comprehensive policies
-- Select: Everyone can see allocations (needed for grid)
CREATE POLICY "Enable read for all allocations" ON allocations 
FOR SELECT USING (true);

-- Insert: Users can insert their own, or managers/admins can insert for anyone
CREATE POLICY "Enable insert for allocations" ON allocations 
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR 
  has_any_role(ARRAY['admin', 'super_admin', 'manager', 'planner', 'client_head'])
);

-- Update: Users can update their own, or managers/admins can update anyone's
CREATE POLICY "Enable update for allocations" ON allocations 
FOR UPDATE USING (
  auth.uid() = user_id OR 
  has_any_role(ARRAY['admin', 'super_admin', 'manager', 'planner', 'client_head'])
);

-- Delete: Users can delete their own, or managers/admins can delete anyone's
CREATE POLICY "Enable delete for allocations" ON allocations 
FOR DELETE USING (
  auth.uid() = user_id OR 
  has_any_role(ARRAY['admin', 'super_admin', 'manager', 'planner', 'client_head'])
);

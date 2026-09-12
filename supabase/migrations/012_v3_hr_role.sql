-- Update RLS policies to include the HR role

-- Leave Requests (Add hr)
DROP POLICY IF EXISTS "Enable read for self or manager or admin" ON leave_requests;
CREATE POLICY "Enable read for self or manager or admin" ON leave_requests FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = manager_id OR has_any_role(ARRAY['admin', 'super_admin', 'manager', 'hr'])
);

DROP POLICY IF EXISTS "Enable update for manager or admin" ON leave_requests;
CREATE POLICY "Enable update for manager or admin" ON leave_requests FOR UPDATE USING (
  auth.uid() = manager_id OR has_any_role(ARRAY['admin', 'super_admin', 'manager', 'hr'])
);

-- Profiles (Add hr to update policy so HR can manage roles)
DROP POLICY IF EXISTS "Enable update for users based on id or admin" ON profiles;
CREATE POLICY "Enable update for users based on id or admin" ON profiles FOR UPDATE USING (
  auth.uid() = id OR has_any_role(ARRAY['admin', 'super_admin', 'hr'])
);

-- Departments (Add hr to all policy)
DROP POLICY IF EXISTS "Enable all for admin" ON departments;
CREATE POLICY "Enable all for admin" ON departments FOR ALL USING (
  has_any_role(ARRAY['admin', 'super_admin', 'hr'])
);

-- Blanket Holidays (Add hr)
DROP POLICY IF EXISTS "Enable all for managers and above" ON blanket_holidays;
CREATE POLICY "Enable all for managers and above" ON blanket_holidays FOR ALL USING (has_any_role(ARRAY['admin', 'super_admin', 'manager', 'planner', 'client_head', 'hr']));

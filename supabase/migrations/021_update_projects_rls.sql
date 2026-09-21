-- Update projects RLS to allow managers to manage projects

DROP POLICY IF EXISTS "Enable all for admin" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;

-- Select is already true for authenticated users, but let's ensure it
DROP POLICY IF EXISTS "projects_select" ON projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (true);

-- Insert, Update, Delete for admin, super_admin, and manager
CREATE POLICY "projects_insert" ON public.projects 
FOR INSERT WITH CHECK (has_any_role(ARRAY['admin', 'super_admin', 'manager']));

CREATE POLICY "projects_update" ON public.projects 
FOR UPDATE USING (has_any_role(ARRAY['admin', 'super_admin', 'manager']));

CREATE POLICY "projects_delete" ON public.projects 
FOR DELETE USING (has_any_role(ARRAY['admin', 'super_admin', 'manager']));

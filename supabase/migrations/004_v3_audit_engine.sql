-- Phase 3: The Audit Core Engine

-- 1. Create Audits Table
CREATE TABLE audits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  store_code text,
  location text,
  audit_date date NOT NULL,
  audit_type text NOT NULL,
  status text CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Create Vendors Table
CREATE TABLE vendors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  contact_email text,
  type text CHECK (type IN ('agency', 'individual')) NOT NULL,
  default_human_rate numeric(10, 2),
  default_asset_rate numeric(10, 2),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Create Audit Teams (Assignments)
CREATE TABLE audit_teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id uuid REFERENCES audits(id) ON DELETE CASCADE,
  
  -- Can be an internal user OR a vendor resource
  user_id uuid REFERENCES auth.users(id),
  vendor_id uuid REFERENCES vendors(id),
  
  role text CHECK (role IN ('lead', 'executive', 'asset')) NOT NULL,
  
  -- Overrides for billing/payroll
  agreed_rate numeric(10, 2),
  
  -- Constraint: Must have either a user or a vendor, but not both
  CONSTRAINT chk_audit_team_member CHECK ((user_id IS NOT NULL AND vendor_id IS NULL) OR (user_id IS NULL AND vendor_id IS NOT NULL)),
  
  created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS Policies

ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_teams ENABLE ROW LEVEL SECURITY;

-- Audits: Planners and Admins can do all. Others can read if they are part of the team.
CREATE POLICY "Enable all for planners and admins on audits" ON audits FOR ALL USING (
  has_any_role(ARRAY['admin', 'super_admin', 'planner', 'manager'])
);

CREATE POLICY "Enable read for audit team members" ON audits FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM audit_teams WHERE audit_id = audits.id AND user_id = auth.uid()
  )
);

-- Vendors: Admins and Planners can do all.
CREATE POLICY "Enable all for planners and admins on vendors" ON vendors FOR ALL USING (
  has_any_role(ARRAY['admin', 'super_admin', 'planner', 'manager'])
);

-- Audit Teams: Planners and Admins can do all. Users can read their own.
CREATE POLICY "Enable all for planners and admins on audit_teams" ON audit_teams FOR ALL USING (
  has_any_role(ARRAY['admin', 'super_admin', 'planner', 'manager'])
);

CREATE POLICY "Enable read for self on audit_teams" ON audit_teams FOR SELECT USING (
  user_id = auth.uid()
);

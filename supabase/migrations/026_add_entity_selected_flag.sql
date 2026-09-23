ALTER TABLE profiles ADD COLUMN IF NOT EXISTS entity_selected boolean DEFAULT false;

-- Update existing profiles so they don't get blocked
UPDATE profiles SET entity_selected = true;

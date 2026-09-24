-- Fix the handle_new_user trigger to properly enforce the 'pending' status for external domains
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  default_roles text[];
  new_entity text;
  new_full_name text;
  is_entity_selected boolean;
  new_status text;
BEGIN
  -- Default to employee role (though pending will lock them out anyway)
  default_roles := ARRAY['employee']::text[];
  
  IF new.email LIKE '%@kgac.in' THEN
    new_entity := 'KGAC';
    is_entity_selected := true;
    new_status := 'active';
  ELSIF new.email LIKE '%@thekgac.in' THEN
    new_entity := 'KPL';
    is_entity_selected := true;
    new_status := 'active';
  ELSE
    -- Generic emails get dumped into the waiting room
    new_entity := 'KGAC';
    is_entity_selected := false;
    new_status := 'pending';
  END IF;

  -- Attempt to extract full_name from metadata
  new_full_name := new.raw_user_meta_data->>'full_name';
  IF new_full_name IS NULL THEN
    new_full_name := COALESCE(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)) || ' ' || COALESCE(new.raw_user_meta_data->>'last_name', '');
    new_full_name := trim(new_full_name);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, roles, entity, entity_selected, status)
  VALUES (
    new.id,
    new.email,
    new_full_name,
    default_roles,
    new_entity,
    is_entity_selected,
    new_status
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
    
  RETURN new;
END;
$$;

-- Fix handle_new_user trigger to leave entity as NULL when entity_selected is false
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
    -- Generic / external / username signups start with NO entity selected
    new_entity := NULL;
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

-- Fix any existing profiles where entity_selected is false to have entity = NULL
UPDATE public.profiles
SET entity = NULL
WHERE entity_selected = false OR entity_selected IS NULL;

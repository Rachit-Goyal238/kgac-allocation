-- Create a secure RPC function to completely delete a user from auth.users and all cascading tables
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the calling user is an admin or super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND ('admin' = ANY(roles) OR 'super_admin' = ANY(roles))
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only Admins can permanently delete users';
  END IF;

  -- Delete from auth.users. 
  -- Because profiles has an ON DELETE CASCADE constraint linked to auth.users,
  -- and all other tables have ON DELETE CASCADE linked to profiles,
  -- this single delete statement will wipe all data for this user across the entire app.
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

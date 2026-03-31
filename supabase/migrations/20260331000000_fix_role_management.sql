-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor
-- URL: https://supabase.com/dashboard/project/ygtlbwjerlhkxcgzezwr/sql
-- This fixes the role management issue caused by the composite
-- unique constraint on (user_id, role) in the user_roles table.
-- ============================================================

-- Function to safely promote a user to admin
-- It deletes any existing role rows for that user, then inserts 'admin'.
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id UUID, _new_role TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;

  -- Remove any existing role entries for this user
  DELETE FROM public.user_roles WHERE user_id = _user_id;

  -- Insert the new role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _new_role::public.app_role);
END;
$$;

-- Grant execute to authenticated users (admin check done inside the function)
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) TO authenticated;

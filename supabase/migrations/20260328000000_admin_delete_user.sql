-- ============================================================
-- Run this in Supabase SQL Editor to create a secure
-- delete function that removes users from auth + all tables.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all activity data
  DELETE FROM public.research_activities        WHERE user_id = _user_id;
  DELETE FROM public.teaching_learning_activities WHERE user_id = _user_id;
  DELETE FROM public.networking_contributions   WHERE user_id = _user_id;
  DELETE FROM public.performance_scores         WHERE user_id = _user_id;
  DELETE FROM public.user_roles                 WHERE user_id = _user_id;
  DELETE FROM public.profiles                   WHERE user_id = _user_id;

  -- Remove from auth.users (requires SECURITY DEFINER + service role context)
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;

-- Grant execute to authenticated users (admins will call it from frontend)
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

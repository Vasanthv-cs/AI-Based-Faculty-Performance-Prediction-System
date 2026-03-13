-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow role creation during signup" ON public.user_roles;

-- Keep only the safe policy that restricts to own user_id
-- The "Users can insert own role" policy is already secure
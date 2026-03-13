-- Allow users to insert their own role during signup
CREATE POLICY "Users can insert own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Also allow anon to insert during signup (before confirmed)
CREATE POLICY "Allow role creation during signup"
ON public.user_roles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
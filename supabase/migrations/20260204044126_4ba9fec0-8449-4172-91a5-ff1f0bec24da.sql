-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone authenticated can view departments" ON public.departments;

-- Create a new policy that allows anyone (including unauthenticated users) to view departments
CREATE POLICY "Anyone can view departments"
ON public.departments
FOR SELECT
TO anon, authenticated
USING (true);
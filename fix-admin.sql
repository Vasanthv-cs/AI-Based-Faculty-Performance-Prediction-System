-- ============================================================
-- Run this SQL in your Supabase Dashboard > SQL Editor
-- URL: https://supabase.com/dashboard/project/ygtlbwjerlhkxcgzezwr/sql
-- ============================================================

-- Step 1: Check if your account already exists in auth.users
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'vasanthvvt@gmail.com';

-- ============================================================
-- If the above returns a row, copy the 'id' value and use it below:
-- ============================================================

-- Step 2: Insert/update profile (replace YOUR_USER_ID_HERE with the actual UUID)
INSERT INTO public.profiles (user_id, email, full_name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'vasanthvvt@gmail.com'),
  'vasanthvvt@gmail.com',
  'Vasanth (Admin)'
)
ON CONFLICT (user_id) DO UPDATE
  SET full_name = 'Vasanth (Admin)',
      email = 'vasanthvvt@gmail.com';

-- Step 3: Insert/update admin role
INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'vasanthvvt@gmail.com'),
  'admin'
)
ON CONFLICT (user_id) DO UPDATE
  SET role = 'admin';

-- Step 4: Verify
SELECT 
  a.id,
  a.email,
  a.email_confirmed_at,
  p.full_name,
  r.role
FROM auth.users a
LEFT JOIN public.profiles p ON p.user_id = a.id
LEFT JOIN public.user_roles r ON r.user_id = a.id
WHERE a.email = 'vasanthvvt@gmail.com';

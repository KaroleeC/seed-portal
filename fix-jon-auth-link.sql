-- Fix: Link Jon's database user to Supabase Auth user
-- This connects your Supabase Auth account to your database user record

-- Step 1: Check current state
SELECT 
  id as user_id,
  email,
  auth_user_id,
  auth_provider,
  role,
  first_name,
  last_name
FROM users 
WHERE email = 'jon@seedfinancial.io';

-- Step 2: Update the database user with Supabase Auth user ID
-- From the screenshot: 9d5f2a08-8cb8-4a4e-a449-487456e55056
UPDATE users 
SET 
  auth_user_id = '9d5f2a08-8cb8-4a4e-a449-487456e55056',
  auth_provider = 'google',
  first_name = COALESCE(first_name, 'Jon'),
  last_name = COALESCE(last_name, 'Walls')
WHERE email = 'jon@seedfinancial.io';

-- Step 3: Verify the link is established
SELECT 
  id as user_id,
  email,
  auth_user_id,
  auth_provider,
  role,
  first_name,
  last_name
FROM users 
WHERE email = 'jon@seedfinancial.io';

-- Step 4: Verify admin permissions are still there
SELECT 
  u.email,
  u.auth_user_id,
  r.name as role_name,
  COUNT(DISTINCT p.id) as permission_count
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.email = 'jon@seedfinancial.io'
GROUP BY u.email, u.auth_user_id, r.name;

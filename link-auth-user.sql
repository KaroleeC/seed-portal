-- Link Supabase Auth user to database user
-- Run this AFTER creating the Supabase Auth user

-- Step 1: Get the auth user ID from Supabase Auth
-- Go to: Authentication → Users → Find jon@seedfinancial.io → Copy the ID

-- Step 2: Update the database user with the auth_user_id
UPDATE users 
SET 
  auth_user_id = 'YOUR_SUPABASE_AUTH_USER_ID_HERE', -- Paste the ID from Supabase Auth
  auth_provider = 'supabase'
WHERE email = 'jon@seedfinancial.io';

-- Step 3: Verify the link
SELECT 
  id,
  email,
  auth_user_id,
  auth_provider,
  role
FROM users 
WHERE email = 'jon@seedfinancial.io';

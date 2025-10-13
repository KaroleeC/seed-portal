-- Grant Admin Permissions to jon@seedfinancial.io
-- Run this in Supabase SQL Editor

-- Step 1: Find the user
DO $$
DECLARE
  v_user_id INTEGER;
  v_admin_role_id INTEGER;
  v_existing_role_count INTEGER;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE email = 'jon@seedfinancial.io';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: jon@seedfinancial.io';
  END IF;
  
  RAISE NOTICE 'Found user ID: %', v_user_id;
  
  -- Get admin role ID
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
  
  IF v_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Admin role not found in roles table';
  END IF;
  
  RAISE NOTICE 'Found admin role ID: %', v_admin_role_id;
  
  -- Check if user already has admin role
  SELECT COUNT(*) INTO v_existing_role_count 
  FROM user_roles 
  WHERE user_id = v_user_id AND role_id = v_admin_role_id;
  
  IF v_existing_role_count > 0 THEN
    RAISE NOTICE 'User already has admin role';
  ELSE
    -- Assign admin role
    INSERT INTO user_roles (user_id, role_id, created_at)
    VALUES (v_user_id, v_admin_role_id, NOW());
    
    RAISE NOTICE 'Admin role assigned successfully';
  END IF;
  
  -- Update user.role field (legacy field) to 'admin' if needed
  UPDATE users 
  SET role = 'admin' 
  WHERE id = v_user_id AND (role IS NULL OR role != 'admin');
  
  RAISE NOTICE 'User role field updated to admin';
  
END $$;

-- Step 2: Verify the permissions
SELECT 
  u.id,
  u.email,
  u.role as legacy_role,
  u.first_name,
  u.last_name,
  r.name as assigned_role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'jon@seedfinancial.io';

-- Step 3: Show all permissions the user now has
SELECT 
  u.email,
  r.name as role_name,
  p.key as permission_key,
  p.description as permission_description
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.email = 'jon@seedfinancial.io'
ORDER BY r.name, p.key;

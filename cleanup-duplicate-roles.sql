-- Cleanup Duplicate Role Assignments
-- This removes duplicate user_role entries while keeping one valid assignment

-- Step 1: Check for duplicates
SELECT 
  user_id,
  role_id,
  COUNT(*) as assignment_count
FROM user_roles
WHERE user_id = (SELECT id FROM users WHERE email = 'jon@seedfinancial.io')
GROUP BY user_id, role_id
HAVING COUNT(*) > 1;

-- Step 2: Remove duplicates (keep the oldest assignment)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id, role_id ORDER BY created_at ASC) as rn
  FROM user_roles
  WHERE user_id = (SELECT id FROM users WHERE email = 'jon@seedfinancial.io')
)
DELETE FROM user_roles
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 3: Verify cleanup - should now see each permission only once
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
ORDER BY p.key;

-- Step 4: Summary
SELECT 
  u.email,
  COUNT(DISTINCT ur.role_id) as unique_roles_assigned,
  COUNT(DISTINCT p.key) as unique_permissions
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.email = 'jon@seedfinancial.io'
GROUP BY u.email;

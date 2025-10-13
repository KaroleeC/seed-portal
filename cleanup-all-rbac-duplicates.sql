-- Comprehensive RBAC Duplicate Cleanup & Constraint Verification
-- Cleans duplicates across user_roles, user_departments, and role_permissions
-- Then verifies/adds unique constraints

-- ============================================
-- STEP 1: FIND ALL DUPLICATES
-- ============================================

\echo '🔍 Checking for duplicate user_roles...'
SELECT 
  user_id,
  role_id,
  COUNT(*) as duplicate_count
FROM user_roles
GROUP BY user_id, role_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

\echo '🔍 Checking for duplicate user_departments...'
SELECT 
  user_id,
  department_id,
  COUNT(*) as duplicate_count
FROM user_departments
GROUP BY user_id, department_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

\echo '🔍 Checking for duplicate role_permissions...'
SELECT 
  role_id,
  permission_id,
  COUNT(*) as duplicate_count
FROM role_permissions
GROUP BY role_id, permission_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ============================================
-- STEP 2: CLEAN UP user_roles DUPLICATES
-- ============================================

\echo '🧹 Cleaning user_roles duplicates (keeping oldest)...'
WITH duplicates AS (
  SELECT 
    id,
    user_id,
    role_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, role_id 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM user_roles
)
DELETE FROM user_roles
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
)
RETURNING id, user_id, role_id;

-- ============================================
-- STEP 3: CLEAN UP user_departments DUPLICATES
-- ============================================

\echo '🧹 Cleaning user_departments duplicates (keeping oldest)...'
WITH duplicates AS (
  SELECT 
    id,
    user_id,
    department_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, department_id 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM user_departments
)
DELETE FROM user_departments
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
)
RETURNING id, user_id, department_id;

-- ============================================
-- STEP 4: CLEAN UP role_permissions DUPLICATES
-- ============================================

\echo '🧹 Cleaning role_permissions duplicates (keeping oldest)...'
WITH duplicates AS (
  SELECT 
    id,
    role_id,
    permission_id,
    ROW_NUMBER() OVER (
      PARTITION BY role_id, permission_id 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM role_permissions
)
DELETE FROM role_permissions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
)
RETURNING id, role_id, permission_id;

-- ============================================
-- STEP 5: VERIFY/ADD UNIQUE CONSTRAINTS
-- ============================================

\echo '🔐 Verifying and adding unique constraints...'

-- Add user_roles constraint if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_role' 
        AND conrelid = 'user_roles'::regclass
    ) THEN
        ALTER TABLE user_roles 
        ADD CONSTRAINT unique_user_role 
        UNIQUE (user_id, role_id);
        RAISE NOTICE '✅ Added unique_user_role constraint';
    ELSE
        RAISE NOTICE '✓ unique_user_role constraint already exists';
    END IF;
END $$;

-- Add user_departments constraint if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_department' 
        AND conrelid = 'user_departments'::regclass
    ) THEN
        ALTER TABLE user_departments 
        ADD CONSTRAINT unique_user_department 
        UNIQUE (user_id, department_id);
        RAISE NOTICE '✅ Added unique_user_department constraint';
    ELSE
        RAISE NOTICE '✓ unique_user_department constraint already exists';
    END IF;
END $$;

-- Add role_permissions constraint if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_role_permission' 
        AND conrelid = 'role_permissions'::regclass
    ) THEN
        ALTER TABLE role_permissions 
        ADD CONSTRAINT unique_role_permission 
        UNIQUE (role_id, permission_id);
        RAISE NOTICE '✅ Added unique_role_permission constraint';
    ELSE
        RAISE NOTICE '✓ unique_role_permission constraint already exists';
    END IF;
END $$;

-- ============================================
-- STEP 6: FINAL VERIFICATION
-- ============================================

\echo '✅ Verification: Checking for any remaining duplicates...'

\echo 'user_roles duplicates (should be 0):'
SELECT COUNT(*) as duplicate_groups
FROM (
  SELECT user_id, role_id, COUNT(*) as cnt
  FROM user_roles
  GROUP BY user_id, role_id
  HAVING COUNT(*) > 1
) dups;

\echo 'user_departments duplicates (should be 0):'
SELECT COUNT(*) as duplicate_groups
FROM (
  SELECT user_id, department_id, COUNT(*) as cnt
  FROM user_departments
  GROUP BY user_id, department_id
  HAVING COUNT(*) > 1
) dups;

\echo 'role_permissions duplicates (should be 0):'
SELECT COUNT(*) as duplicate_groups
FROM (
  SELECT role_id, permission_id, COUNT(*) as cnt
  FROM role_permissions
  GROUP BY role_id, permission_id
  HAVING COUNT(*) > 1
) dups;

\echo '✅ Cleanup complete! Constraints verified.'

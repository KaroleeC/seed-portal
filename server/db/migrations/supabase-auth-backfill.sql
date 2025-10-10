-- Supabase Auth Migration - Phase 1 Backfill Script
-- This script adds the new Supabase Auth columns and backfills existing users
-- Run this after deploying the schema changes to production/preview

-- Step 1: Add new columns if they don't exist (additive-only)
DO $$ 
BEGIN
    -- Add auth_user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE users ADD COLUMN auth_user_id TEXT UNIQUE;
        RAISE NOTICE 'Added auth_user_id column to users table';
    ELSE
        RAISE NOTICE 'auth_user_id column already exists';
    END IF;

    -- Add last_login_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
        RAISE NOTICE 'Added last_login_at column to users table';
    ELSE
        RAISE NOTICE 'last_login_at column already exists';
    END IF;
END $$;

-- Step 2: Create index on auth_user_id for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_auth_user_id 
ON users (auth_user_id) 
WHERE auth_user_id IS NOT NULL;

-- Step 3: Backfill existing users by linking to Supabase Auth users
-- This query should be run after Supabase Auth is set up and users have been created there
-- 
-- IMPORTANT: This is a template query. In production, you'll need to:
-- 1. Ensure all @seedfinancial.io users exist in Supabase Auth first
-- 2. Replace this with actual Supabase Auth user IDs
-- 3. Run this carefully with proper testing
--
-- Example backfill (DO NOT RUN AS-IS):
-- UPDATE users 
-- SET auth_user_id = au.id 
-- FROM auth.users au 
-- WHERE LOWER(au.email) = LOWER(users.email) 
-- AND users.auth_user_id IS NULL
-- AND users.email LIKE '%@seedfinancial.io';

-- Step 4: Verification queries
-- Check how many users need backfilling
SELECT 
    COUNT(*) as total_users,
    COUNT(auth_user_id) as users_with_auth_id,
    COUNT(*) - COUNT(auth_user_id) as users_needing_backfill
FROM users 
WHERE email LIKE '%@seedfinancial.io';

-- List users that still need auth_user_id
SELECT id, email, role, created_at
FROM users 
WHERE email LIKE '%@seedfinancial.io' 
AND auth_user_id IS NULL
ORDER BY created_at DESC;

-- Step 5: Add constraints after backfill is complete
-- (Run this only after all users have been successfully backfilled)
-- 
-- -- Make auth_user_id NOT NULL for new users (optional, can be done later)
-- -- ALTER TABLE users ALTER COLUMN auth_user_id SET NOT NULL;
-- 
-- -- Add foreign key constraint to Supabase Auth (if using same database)
-- -- ALTER TABLE users ADD CONSTRAINT fk_users_auth_user_id 
-- -- FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

RAISE NOTICE 'Supabase Auth migration schema changes completed successfully';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Ensure all users exist in Supabase Auth';
RAISE NOTICE '2. Run the backfill UPDATE query with actual auth user IDs';
RAISE NOTICE '3. Verify all users have auth_user_id populated';
RAISE NOTICE '4. Enable Supabase Auth in the application (USE_SUPABASE_AUTH=true)';

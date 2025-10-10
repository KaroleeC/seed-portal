-- Add auth_user_id column to users table
-- Additive-only migration - safe for production
-- This adds the missing column needed for RBAC authentication

-- Add auth_user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'auth_user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "auth_user_id" text UNIQUE;
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS "idx_users_auth_user_id" ON "users" ("auth_user_id");
        
        -- Add comment for documentation
        COMMENT ON COLUMN "users"."auth_user_id" IS 'External authentication system user ID (Supabase Auth)';
        
        RAISE NOTICE 'Added auth_user_id column to users table';
    ELSE
        RAISE NOTICE 'auth_user_id column already exists in users table';
    END IF;
END $$;

-- Verification
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name = 'auth_user_id';

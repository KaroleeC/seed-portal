-- Add last_login_at column to users table
-- Additive-only migration - safe for production
-- This adds the missing column needed for user login tracking

-- Add last_login_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_login_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp;
        
        -- Add index for performance (login tracking queries)
        CREATE INDEX IF NOT EXISTS "idx_users_last_login_at" ON "users" ("last_login_at");
        
        -- Add comment for documentation
        COMMENT ON COLUMN "users"."last_login_at" IS 'Timestamp of user last login for activity tracking';
        
        RAISE NOTICE 'Added last_login_at column to users table';
    ELSE
        RAISE NOTICE 'last_login_at column already exists in users table';
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
AND column_name = 'last_login_at';

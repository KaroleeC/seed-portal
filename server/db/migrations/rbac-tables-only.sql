-- RBAC Tables Migration - Additive Only
-- This script creates only the RBAC tables without modifying existing data
-- Safe to run in production - follows additive-only policy

-- Create roles table
CREATE TABLE IF NOT EXISTS "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL UNIQUE,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL UNIQUE,
	"description" text,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_role_permission" UNIQUE("role_id", "permission_id")
);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"assigned_by" integer,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_role" UNIQUE("user_id", "role_id")
);

-- Create departments table (optional for Phase 3)
CREATE TABLE IF NOT EXISTS "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL UNIQUE,
	"description" text,
	"parent_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create user_departments junction table
CREATE TABLE IF NOT EXISTS "user_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"department_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_department" UNIQUE("user_id", "department_id")
);

-- Create manager_edges table for organizational hierarchy
CREATE TABLE IF NOT EXISTS "manager_edges" (
	"id" serial PRIMARY KEY NOT NULL,
	"manager_user_id" integer NOT NULL,
	"member_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_manager_member" UNIQUE("manager_user_id", "member_user_id")
);

-- Add foreign key constraints only if they don't exist
DO $$ 
BEGIN
    -- role_permissions foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_role_id_roles_id_fk') THEN
        ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" 
        FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_permission_id_permissions_id_fk') THEN
        ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" 
        FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE;
    END IF;
    
    -- user_roles foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_users_id_fk') THEN
        ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_role_id_roles_id_fk') THEN
        ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" 
        FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_assigned_by_users_id_fk') THEN
        ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" 
        FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL;
    END IF;
    
    -- departments foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_parent_id_departments_id_fk') THEN
        ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_departments_id_fk" 
        FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL;
    END IF;
    
    -- user_departments foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_departments_user_id_users_id_fk') THEN
        ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_departments_department_id_departments_id_fk') THEN
        ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_department_id_departments_id_fk" 
        FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE;
    END IF;
    
    -- manager_edges foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'manager_edges_manager_user_id_users_id_fk') THEN
        ALTER TABLE "manager_edges" ADD CONSTRAINT "manager_edges_manager_user_id_users_id_fk" 
        FOREIGN KEY ("manager_user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'manager_edges_member_user_id_users_id_fk') THEN
        ALTER TABLE "manager_edges" ADD CONSTRAINT "manager_edges_member_user_id_users_id_fk" 
        FOREIGN KEY ("member_user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for performance (without CONCURRENTLY for transaction compatibility)
CREATE INDEX IF NOT EXISTS "idx_role_permissions_role_id" ON "role_permissions" ("role_id");
CREATE INDEX IF NOT EXISTS "idx_role_permissions_permission_id" ON "role_permissions" ("permission_id");
CREATE INDEX IF NOT EXISTS "idx_user_roles_user_id" ON "user_roles" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_roles_role_id" ON "user_roles" ("role_id");
CREATE INDEX IF NOT EXISTS "idx_user_departments_user_id" ON "user_departments" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_manager_edges_manager_user_id" ON "manager_edges" ("manager_user_id");

-- Verification
SELECT 'RBAC tables created successfully' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('roles', 'permissions', 'role_permissions', 'user_roles', 'departments', 'user_departments', 'manager_edges')
ORDER BY table_name;

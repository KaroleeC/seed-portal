# RBAC Duplicate Cleanup Guide

## Problem

Users are seeing duplicate role/department/permission assignments in the database, causing React key warnings in the UI.

## Root Cause

Records were inserted into junction tables (`user_roles`, `user_departments`, `role_permissions`) before unique constraints were enforced, resulting in duplicate entries like:

```
user_id: 2, role_id: 3  ← first assignment
user_id: 2, role_id: 3  ← duplicate!
```

## Solution

Run the cleanup script to:

1. Find all duplicates across all RBAC tables
2. Delete duplicates (keeping the oldest record)
3. Verify/add unique constraints to prevent future duplicates

## How to Run

### Option 1: Using psql (Recommended)

```bash
# From seed-portal directory
psql $DATABASE_URL -f cleanup-all-rbac-duplicates.sql
```

### Option 2: Using Doppler + psql

```bash
# From seed-portal directory
doppler run --command "psql \$DATABASE_URL -f cleanup-all-rbac-duplicates.sql"
```

### Option 3: Copy/paste into DB client

Open the SQL file and run it in your preferred database client (TablePlus, pgAdmin, Supabase SQL Editor, etc.)

## What the Script Does

### 1. Finds Duplicates

Shows how many duplicate entries exist in each table

### 2. Cleans Up

- **user_roles**: Removes duplicate user ↔ role assignments
- **user_departments**: Removes duplicate user ↔ department assignments
- **role_permissions**: Removes duplicate role ↔ permission assignments

**Strategy**: Keeps the oldest record (earliest `created_at` + lowest `id`)

### 3. Adds Constraints

Ensures these unique constraints exist:

- `user_roles`: `UNIQUE(user_id, role_id)`
- `user_departments`: `UNIQUE(user_id, department_id)`
- `role_permissions`: `UNIQUE(role_id, permission_id)`

### 4. Verifies

Confirms no duplicates remain

## Expected Output

```
🔍 Checking for duplicate user_roles...
 user_id | role_id | duplicate_count
---------+---------+----------------
       2 |       3 |               2
...

🧹 Cleaning user_roles duplicates (keeping oldest)...
DELETE 1

🔐 Verifying and adding unique constraints...
✓ unique_user_role constraint already exists
✓ unique_user_department constraint already exists
✓ unique_role_permission constraint already exists

✅ Verification: Checking for any remaining duplicates...
user_roles duplicates (should be 0):
 duplicate_groups
-----------------
                0
...

✅ Cleanup complete! Constraints verified.
```

## After Running

1. Restart your dev server: `npm run dev:api:doppler`
2. Refresh the browser
3. React key warnings should be gone
4. The UI might show fewer role badges (because duplicates are removed)

## Prevention

The unique constraints will now prevent duplicates at the database level. Any attempt to insert a duplicate will fail with:

```
ERROR: duplicate key value violates unique constraint "unique_user_role"
```

This is **good** - it means your application code needs to handle this case (probably by updating instead of inserting, or ignoring if already exists).

## Rollback

If something goes wrong, the script only deletes duplicate records (keeping at least one). Original unique assignments are preserved. However, you should always have a backup before running database modifications.

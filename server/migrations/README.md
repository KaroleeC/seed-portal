# Database Migrations

This directory contains SQL migrations for the Seed Portal database.

## Structure

- `YYYYMMDD_description.sql` - Migration files (timestamped)
- `apply-migration.sh` - Helper script to apply migrations to dev/prod

## Applying Migrations

### Prerequisites

- Install `psql` (PostgreSQL client)
- Have Doppler CLI configured with access to `seed-portal-api` project

### Apply to Dev

```bash
cd server/migrations
./apply-migration.sh dev 20251002_phase1_crm_scheduling.sql
```

### Apply to Prod

```bash
cd server/migrations
./apply-migration.sh prod 20251002_phase1_crm_scheduling.sql
```

The script will:

1. Fetch the correct `DATABASE_URL` from Doppler
2. Prompt for confirmation (prod only)
3. Run the migration via `psql`
4. Report success/failure

## Alternative: Via Supabase Studio

1. Open Supabase Studio
2. Navigate to SQL Editor
3. Copy/paste the migration file contents
4. Run the query

This is useful if you want to review the changes in the UI first.

## Verification

After running a migration:

1. **Check tables exist**:

   ```sql
   \dt crm_*
   ```

2. **Verify columns**:

   ```sql
   \d crm_events
   \d crm_leads
   \d quotes
   ```

3. **Check indexes**:

   ```sql
   \di crm_*
   ```

4. **Test server startup**:

   ```bash
   npm run dev:api:doppler
   ```

   Should start without Drizzle type errors.

## Rollback

If you need to undo a migration, create a corresponding `down` migration that reverses the changes.

For Phase 1, a rollback would:

- Drop new tables (`crm_event_types`, `crm_availability`, etc.)
- Remove new columns from `crm_leads`, `crm_messages`, `quotes`

**Note**: Only create rollbacks if you've applied the migration and need to undo it. Don't create speculative rollbacks.

## Migration Workflow

1. **Create migration file** with idempotent SQL (`IF NOT EXISTS`, `DO $$` blocks)
2. **Update `shared/schema.ts`** to match the migration
3. **Apply to dev** and test
4. **Commit** both the migration and schema changes
5. **Apply to prod** when ready to deploy

## Current Migrations

### Production-Ready (Use This)

- `20251002_phase1_crm_complete.sql` - **Phase 1 COMPLETE**: Scheduling, messages, leads, quotes + RLS policies (all in one)

### Development History (Already Applied to Dev)

- `20251002_phase1_crm_scheduling.sql` - Phase 1: Scheduling, messages, leads, quotes signing (tables only)
- `20251002_phase1b_rls_policies.sql` - Phase 1b: RLS policies for security

**Note**: The `_complete.sql` migration combines both parts into a single atomic transaction. Use this for production to ensure tables are **never** exposed without RLS policies, even for a moment.

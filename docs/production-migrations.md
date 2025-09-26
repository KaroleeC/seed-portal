# Production SQL Migrations (CONCURRENTLY)

This guide explains how to run non-blocking, production-safe SQL migrations that add indexes and triggers using `CONCURRENTLY`.

## File

- `seed-portal/migrations/0002_deals_indexes_owner_trigger_prod.sql`
  - Creates indexes with `CONCURRENTLY` on hot tables (deals, commissions, hubspot\_\* tables, users)
  - Adds/ensures a trigger to keep `deals.owner_id` and `deals.hubspot_owner_id` in sync
  - Idempotent and safe to re-run
  - Intentionally not wrapped in a transaction

## When to run

- During a low-traffic window
- No downtime required
- Expect minimal metadata locks only

## How to run

Using Doppler to provide `DATABASE_URL` for the current environment:

```bash
# From the repository root
doppler run -- psql "$DATABASE_URL" -f seed-portal/migrations/0002_deals_indexes_owner_trigger_prod.sql
```

Or with a plain connection string:

```bash
psql "postgres://username:password@host:5432/dbname" \
  -f seed-portal/migrations/0002_deals_indexes_owner_trigger_prod.sql
```

## Verification checklist

- Confirm indexes exist:
  - `\d+ deals`, `\d+ commissions`, `\d+ hubspot_invoices`, `\d+ hubspot_subscriptions`, `\d+ users`
- Confirm trigger and function exist:
  - `sync_deals_owner_fields()`
  - `trg_sync_deals_owner_fields` on `deals`

## Rollback

Index creation with `IF NOT EXISTS` is safe. If you need to drop an index manually:

```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_deals_owner_id;
```

Dropping triggers/functions (if ever needed):

```sql
DROP TRIGGER IF EXISTS trg_sync_deals_owner_fields ON deals;
DROP FUNCTION IF EXISTS sync_deals_owner_fields();
```

# Database Migrations - Quick Start

## 🚀 First Time Setup

### 1. Configure Production Connection (Audit Only)

```bash
# This is SAFE - only used to compare schemas, not modify prod
doppler secrets set PRODUCTION_DATABASE_URL=<your_prod_db_url> \
  --project seed-portal-api --config dev
```

### 2. Run Your First Audit

```bash
doppler run --project seed-portal-api --config dev -- \
  tsx db/migrations/audit-schema-drift.ts
```

This will show you:

- ✅ Tables in dev but not in prod
- ✅ Column differences
- ✅ What needs syncing

---

## 📅 Weekly Workflow (Every Friday)

### Step 1: Check for Drift (5 min)

```bash
doppler run --project seed-portal-api --config dev -- \
  tsx db/migrations/audit-schema-drift.ts
```

### Step 2: Create Migration SQL (if needed)

```bash
# Create file
touch db/migrations/$(date +%Y%m%d%H%M%S)_description.sql

# Example: db/migrations/20251009120000_add_email_tables.sql
```

### Step 3: Test on Dev

```bash
doppler run --project seed-portal-api --config dev -- \
  psql $DATABASE_URL -f db/migrations/20251009120000_add_email_tables.sql
```

### Step 4: Apply to Prod (Low Traffic Time)

```bash
doppler run --project seed-portal-api --config prd -- \
  psql $DATABASE_URL -f db/migrations/20251009120000_add_email_tables.sql
```

### Step 5: Update Log

```bash
echo "20251009120000_add_email_tables.sql | $(date +%Y-%m-%d) | $USER | Added email tables" \
  >> db/migrations/applied_to_prod.log
```

---

## 📁 Files in This Directory

| File                    | Purpose                            |
| ----------------------- | ---------------------------------- |
| `README.md`             | This quick start guide             |
| `MIGRATION_STRATEGY.md` | Complete strategy & best practices |
| `audit-schema-drift.ts` | Compare dev vs prod schemas        |
| `applied_to_prod.log`   | Track what's in production         |
| `*.sql`                 | Your migration files               |

---

## 🎯 Migration Templates

### Safe Additive Migration (Always Safe)

```sql
-- Migration: Add new table
-- Date: 2025-10-09
-- Risk: Low (additive only)

CREATE TABLE IF NOT EXISTS my_table (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);

-- Rollback:
-- DROP TABLE IF EXISTS my_table;
```

### Add Column (Safe)

```sql
-- Migration: Add optional column
-- Date: 2025-10-09
-- Risk: Low (nullable column)

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Rollback:
-- ALTER TABLE users DROP COLUMN IF EXISTS bio;
```

### Data Migration (Medium Risk)

```sql
-- Migration: Backfill data
-- Date: 2025-10-09
-- Risk: Medium (modifies data)

BEGIN;

UPDATE users
SET status = 'active'
WHERE status IS NULL
  AND created_at > NOW() - INTERVAL '30 days';

-- Verify before commit
SELECT COUNT(*) FROM users WHERE status = 'active';

COMMIT;
-- Or ROLLBACK if count looks wrong
```

---

## ⚠️ Important Rules

1. **Always use `IF NOT EXISTS` / `IF EXISTS`** - Makes migrations idempotent
2. **Test on dev first** - Never run untested SQL on prod
3. **Small batches** - 2-3 tables per week max
4. **Document rollback** - Add rollback SQL in comments
5. **Low traffic times** - Apply during off-hours

---

## 🆘 Emergency Rollback

If a migration breaks production:

```bash
# 1. Immediately rollback the change
doppler run --project seed-portal-api --config prd -- \
  psql $DATABASE_URL -c "DROP TABLE IF EXISTS problematic_table;"

# 2. Check error logs
doppler run --project seed-portal-api --config prd -- \
  psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# 3. Notify team
# 4. Debug on dev/staging
# 5. Try again next week with fix
```

---

## 📊 Useful Commands

### Compare Schemas

```bash
# See what's different
tsx db/migrations/audit-schema-drift.ts
```

### List Pending Migrations

```bash
# Migrations not yet in prod
ls db/migrations/*.sql | while read f; do
  if ! grep -q "$(basename $f)" applied_to_prod.log; then
    echo "Pending: $f"
  fi
done
```

### Backup Production

```bash
# Before major migration
doppler run --project seed-portal-api --config prd -- \
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

## 🎯 Next Steps

1. Read `MIGRATION_STRATEGY.md` for full strategy
2. Run your first audit today
3. Schedule weekly migration time (Friday 5pm recommended)
4. Create your first migration SQL files

**The key:** Start syncing NOW, don't wait until launch!

---

**Questions?** See `MIGRATION_STRATEGY.md` for detailed guidance.

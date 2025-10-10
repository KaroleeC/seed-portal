# Database Migration Strategy & Production Readiness

**Goal:** Keep dev and production databases in sync without massive last-minute work

---

## 🎯 Current State Assessment

Run this to see what needs syncing:

```bash
# Set production DB connection (one-time)
doppler secrets set PRODUCTION_DATABASE_URL=<prod_url> \
  --project seed-portal-api --config dev

# Run audit
doppler run --project seed-portal-api --config dev -- \
  tsx db/migrations/audit-schema-drift.ts
```

---

## 📅 Migration Schedule (Recommended)

### **Option 1: Weekly Syncs (Safest)**

**Best for:** 2-6 months until launch

**Every Friday 5pm:**

1. Run audit script (5 min)
2. Review any new migrations (10 min)
3. Apply to prod if clean (15 min)
4. Smoke test critical features (10 min)

**Total time:** 40 min/week  
**Launch day work:** ~1 hour (data migration only)

---

### **Option 2: Monthly Syncs (Moderate Risk)**

**Best for:** 6-12 months until launch

**Last Friday of month:**

1. Bundle all migrations from the month
2. Test on staging first
3. Apply to prod during maintenance window
4. Full regression test

**Total time:** 2 hours/month  
**Launch day work:** 2-4 hours (catching up + data migration)

---

### **Option 3: Launch Day Only (High Risk - Not Recommended)**

**Best for:** Never (but if you must)

**Launch week:**

1. Export full dev schema
2. Apply 50+ migrations at once
3. Debug for 6-12 hours when things break
4. Delay launch by days

**Total time:** 12+ hours of stress  
**Risk:** High chance of breaking production

---

## ✅ Recommended Approach: Weekly Syncs

**Why this works:**

- Small batches = easy to debug
- Production stays "warm" (no shock migrations)
- Team stays familiar with migration process
- Launch day is boring (good thing!)

**Example Timeline:**

```
Week 1:  Add email_accounts table to prod        ✅
Week 2:  Add email_messages, email_threads       ✅
Week 3:  Add indexes for performance             ✅
...
Week 12: Run encryption migration on prod data   ✅
Launch:  Deploy code, verify, celebrate! 🎉      ✅
```

---

## 🛠️ Migration Workflow (Step-by-Step)

### 1. Create Migration (During Development)

```bash
# Create new migration file
touch db/migrations/$(date +%Y%m%d%H%M%S)_add_feature.sql
```

**Template:**

```sql
-- Migration: Add feature table
-- Date: 2025-10-09
-- Safe to run: YES (additive only)

CREATE TABLE IF NOT EXISTS feature (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rollback (if needed):
-- DROP TABLE IF EXISTS feature;
```

---

### 2. Test Migration (Dev First)

```bash
# Apply to dev
doppler run --project seed-portal-api --config dev -- \
  psql $DATABASE_URL -f db/migrations/20251009_add_feature.sql

# Verify
doppler run --project seed-portal-api --config dev -- \
  psql $DATABASE_URL -c "\dt feature"
```

---

### 3. Apply to Production (Weekly)

```bash
# 1. Audit first
doppler run --project seed-portal-api --config dev -- \
  tsx db/migrations/audit-schema-drift.ts

# 2. Review migrations to apply
ls db/migrations/*.sql | grep -A5 "last_applied_to_prod"

# 3. Apply each migration
doppler run --project seed-portal-api --config prd -- \
  psql $DATABASE_URL -f db/migrations/20251009_add_feature.sql

# 4. Verify
doppler run --project seed-portal-api --config prd -- \
  psql $DATABASE_URL -c "\dt feature"

# 5. Update tracking
echo "20251009_add_feature.sql" >> db/migrations/applied_to_prod.log
```

---

### 4. Track Applied Migrations

Create `db/migrations/applied_to_prod.log`:

```
# Production Migration Log
# Format: YYYYMMDD_name.sql | Applied Date | Applied By

20251009_initial_schema.sql | 2025-10-09 | jon
20251010_add_email_accounts.sql | 2025-10-16 | jon
20251017_add_email_messages.sql | 2025-10-16 | jon
```

---

## 🚦 Migration Safety Checklist

Before applying to production:

- [ ] ✅ Tested on dev database
- [ ] ✅ Tested on staging (if available)
- [ ] ✅ Uses `IF NOT EXISTS` / `IF EXISTS` (idempotent)
- [ ] ✅ Has rollback plan documented
- [ ] ✅ Scheduled during low-traffic period
- [ ] ✅ Team member available to help if needed
- [ ] ✅ Database backup taken (automatic or manual)
- [ ] ✅ Smoke tests ready to verify

---

## 📊 Migration Types & Risk Levels

### 🟢 Low Risk (Can Do Anytime)

- Adding new tables
- Adding nullable columns
- Adding indexes (with `CONCURRENTLY` on large tables)
- Creating views

```sql
-- Example: Safe additive migration
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

---

### 🟡 Medium Risk (Schedule During Low Traffic)

- Renaming columns (requires code deploy coordination)
- Changing column types (use multi-step approach)
- Adding NOT NULL columns (requires default value)

```sql
-- Example: Multi-step type change
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN email_new TEXT;

-- Step 2: Backfill data (code does this)
-- UPDATE users SET email_new = email;

-- Step 3 (next week): Drop old column
-- ALTER TABLE users DROP COLUMN email;
```

---

### 🔴 High Risk (Maintenance Window Required)

- Dropping tables with foreign keys
- Major schema refactors
- Large data migrations
- Removing NOT NULL constraints (might expose bugs)

```sql
-- Example: High-risk migration (maintenance window)
-- 1. Announce downtime
-- 2. Take database backup
-- 3. Run migration
-- 4. Verify with smoke tests
-- 5. Rollback plan ready
```

---

## 🎯 Pre-Launch Checklist (2-4 Weeks Before)

### Week -4: Schema Freeze

- [ ] No new migrations unless critical
- [ ] Run audit script daily
- [ ] Document all pending migrations

### Week -3: Final Sync

- [ ] Apply all pending migrations to prod
- [ ] Run encryption migration (existing tokens)
- [ ] Verify schema parity (dev === prod)

### Week -2: Data Migration

- [ ] Run `encrypt-existing-tokens.ts` on prod
- [ ] Verify all encrypted data readable
- [ ] Test critical user flows

### Week -1: Final Verification

- [ ] Full smoke test on production
- [ ] Load test with production-like data
- [ ] Rollback plan documented and tested

### Launch Day

- [ ] Deploy code
- [ ] Monitor error rates
- [ ] Celebrate! 🎉

---

## 🔧 Useful Commands

### Check Migration Status

```bash
# List migrations not yet in prod
comm -23 \
  <(ls db/migrations/*.sql | sort) \
  <(cat db/migrations/applied_to_prod.log | sort)
```

### Backup Before Migration

```bash
# Manual backup (good practice)
doppler run --project seed-portal-api --config prd -- \
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Compare Table Counts

```bash
# Dev
doppler run --project seed-portal-api --config dev -- \
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM email_accounts"

# Prod
doppler run --project seed-portal-api --config prd -- \
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM email_accounts"
```

---

## 💡 Pro Tips

1. **Always Use Transactions**

   ```sql
   BEGIN;
   -- Your migration here
   COMMIT; -- or ROLLBACK if testing
   ```

2. **Make Migrations Idempotent**

   ```sql
   -- Good
   CREATE TABLE IF NOT EXISTS users (...);

   -- Bad
   CREATE TABLE users (...); -- Fails if run twice
   ```

3. **Document Rollback Steps**

   ```sql
   -- Migration: Add user_roles table
   CREATE TABLE user_roles (...);

   -- Rollback (run if migration fails):
   -- DROP TABLE IF EXISTS user_roles;
   ```

4. **Use Drizzle for Schema Definition**
   - Keep `shared/schema.ts` as source of truth
   - Generate migrations with `drizzle-kit`
   - Review SQL before applying

---

## 🎯 Your Action Plan This Week

### Day 1 (Today)

1. Set `PRODUCTION_DATABASE_URL` in Doppler (dev config, for audit only)
2. Run audit script to see current drift
3. Create `db/migrations/applied_to_prod.log` file

### Day 2

1. Create SQL migrations for missing tables
2. Test on dev
3. Document in migration log

### Day 3

1. Apply first batch to prod (2-3 tables max)
2. Verify with smoke tests
3. Update applied_to_prod.log

### Day 4-5

1. Monitor for issues
2. Plan next week's migrations

---

## 📁 Migration File Structure

```
db/migrations/
├── audit-schema-drift.ts          # Audit tool (you have this)
├── applied_to_prod.log            # Track what's in prod
├── MIGRATION_STRATEGY.md          # This file
├── 20251009120000_initial.sql     # Migrations (timestamped)
├── 20251010130000_add_email.sql
└── ...
```

---

## ❓ Common Questions

**Q: Can I skip weeks if nothing changed?**  
A: Yes! Only migrate when there are changes. The audit script will show "no drift".

**Q: What if a migration fails on prod?**  
A: Rollback immediately, debug on dev/staging, try again next week.

**Q: Should I use an ORM migration tool?**  
A: You can! Drizzle Kit is good. But raw SQL gives you full control for complex migrations.

**Q: How do I handle data migrations vs schema migrations?**  
A: Separate them:

- Schema first (create tables/columns)
- Deploy code that handles both old + new schema
- Data migration (backfill)
- Clean up old schema (next week)

---

## 🎉 Summary

**Best Strategy for You:**

- Run audit script weekly starting NOW
- Apply migrations to prod every Friday
- Keep batches small (2-3 tables per week)
- Launch day will be smooth and boring

**Time Investment:**

- 40 min/week × 12 weeks = 8 hours total
- vs. 12+ hours of panic on launch day

**The boring launch is the successful launch!** 🚀

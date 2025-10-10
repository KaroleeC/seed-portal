# Production Readiness - Your Action Plan

**TL;DR:** Start syncing to production **NOW** (weekly), not at launch. 40 min/week will save you 12+ hours of panic later.

---

## 🎯 Answer to Your Question

> "When should we worry about keeping things in sync?"

**Start NOW!** Here's why:

### ❌ Bad Approach (Wait Until Launch)

```
Today → Dev only for 3 months → Launch week panic
Result: 12+ hours of debugging, possible launch delay
```

### ✅ Good Approach (Weekly Syncs)

```
Today → Weekly 40-min syncs → Launch day is boring
Result: 8 hours total spread over 12 weeks, smooth launch
```

---

## 📅 Recommended Timeline

### **This Week (Get Started)**

**Time:** 1 hour one-time setup

```bash
# 1. Set prod connection for audit (SAFE - read-only)
doppler secrets set PRODUCTION_DATABASE_URL=<prod_url> \
  --project seed-portal-api --config dev

# 2. Run first audit
doppler run --project seed-portal-api --config dev -- \
  tsx db/migrations/audit-schema-drift.ts

# 3. Review what needs syncing
```

**You'll see:**

- Tables in dev but not in prod (e.g., `email_accounts`)
- Column differences
- Exactly what needs to be synced

---

### **Every Friday 5pm (Ongoing)**

**Time:** 40 minutes/week

**Week 1:** Sync 2-3 core tables  
**Week 2:** Sync next 2-3 tables  
**Week 3:** Sync indexes and constraints  
...  
**Week 12:** Everything in sync!

**Total time:** 8 hours spread over 12 weeks vs. 12+ hours in one panic session

---

### **2 Weeks Before Launch (Final Push)**

**Time:** 2 hours

1. Run encryption migration on prod data
2. Full smoke test on production
3. Verify schema parity (dev === prod)
4. Document rollback plan

---

### **Launch Day**

**Time:** 1 hour

1. Deploy code
2. Monitor error rates
3. Celebrate! 🎉

**No database surprises because you've been syncing weekly!**

---

## 🛠️ What You Have Now

I created these tools for you:

### 1. **Audit Script**

`db/migrations/audit-schema-drift.ts`

Shows exactly what's different between dev and prod:

```bash
doppler run --project seed-portal-api --config dev -- \
  tsx db/migrations/audit-schema-drift.ts
```

### 2. **Migration Strategy Guide**

`db/migrations/MIGRATION_STRATEGY.md`

Complete playbook:

- Weekly workflow
- Migration templates
- Safety checklist
- Rollback procedures

### 3. **Quick Start Guide**

`db/migrations/README.md`

Fast reference for common tasks.

### 4. **Tracking Log**

`db/migrations/applied_to_prod.log`

Track which migrations are in production.

---

## 🎯 Your Next Steps

### Today (30 minutes)

1. ✅ Set `PRODUCTION_DATABASE_URL` in Doppler (dev config, for audit)
2. ✅ Run audit script
3. ✅ Review output - see what needs syncing

### This Week (1 hour)

4. ✅ Create SQL migration files for 2-3 most critical tables
5. ✅ Test on dev
6. ✅ Apply to prod

### Every Week (40 minutes)

7. ✅ Run audit (Fridays)
8. ✅ Sync 2-3 tables/week
9. ✅ Update tracking log

### 2 Weeks Before Launch

10. ✅ Final schema sync
11. ✅ Run encryption migration
12. ✅ Full smoke test

---

## 💡 Why This Approach Works

### **Small Batches = Low Risk**

- Easy to debug (2-3 tables vs. 50 tables)
- Easy to rollback
- Team stays familiar with process

### **Continuous Integration**

- Production stays "warm"
- No shock migrations
- Catches issues early

### **Boring Launch = Good Launch**

- No last-minute surprises
- No 12-hour debug sessions
- No launch delays

---

## 📊 Time Investment Comparison

| Approach            | Weekly Time | Total Time      | Stress Level | Risk   |
| ------------------- | ----------- | --------------- | ------------ | ------ |
| **Weekly Syncs**    | 40 min      | 8 hours         | Low          | Low    |
| **Monthly Syncs**   | 0 min       | 2-4 hours/month | Medium       | Medium |
| **Launch Day Only** | 0 min       | 12+ hours       | High         | High   |

**Recommendation:** Weekly syncs for smoothest launch

---

## ⚠️ What If You Skip This?

**Scenario:** You wait 3 months, then sync everything at launch

**What happens:**

1. You have 50+ migrations to run
2. Some will fail due to dependency order
3. Some will have subtle bugs you didn't catch in dev
4. Production data might not be compatible
5. You spend 12+ hours debugging
6. Launch gets delayed
7. Team is stressed

**Better approach:** 40 min/week starting now!

---

## 🎯 Specific to Your Situation

You mentioned:

- ✅ Already did encryption key and migration (good!)
- ⚠️ Don't have some tables in production yet

**This means:**

- You have ~5-10 tables to sync (email_accounts, email_messages, etc.)
- At 2-3 tables/week, you'll be caught up in 2-4 weeks
- Then just maintain sync going forward

**Your timeline:**

```
Week 1: Sync email_accounts, email_threads
Week 2: Sync email_messages, email_attachments
Week 3: Add indexes, run encryption migration
Week 4: Verify everything works
Weeks 5-12: Maintain sync (probably no changes most weeks)
Launch: Deploy and celebrate!
```

---

## 🚦 Migration Safety Rules

Follow these and you'll be fine:

1. **Always use `IF NOT EXISTS`** - Makes migrations safe to run twice
2. **Test on dev first** - Never skip this
3. **Small batches** - 2-3 tables max per week
4. **Low traffic times** - Friday evenings are good
5. **Document rollback** - Know how to undo

---

## 🆘 Emergency Contacts

If a migration goes wrong:

1. **Don't panic** - Most things are reversible
2. **Rollback immediately** - Drop the problematic table
3. **Check logs** - See what failed
4. **Debug on dev** - Reproduce the issue
5. **Try again next week** - With the fix

**Remember:** This is why we do small batches!

---

## 📁 Quick Reference

### Run Audit

```bash
doppler run --project seed-portal-api --config dev -- \
  tsx db/migrations/audit-schema-drift.ts
```

### Apply Migration to Prod

```bash
# 1. Test on dev first!
doppler run --project seed-portal-api --config dev -- \
  psql $DATABASE_URL -f db/migrations/20251009_my_migration.sql

# 2. Apply to prod
doppler run --project seed-portal-api --config prd -- \
  psql $DATABASE_URL -f db/migrations/20251009_my_migration.sql

# 3. Log it
echo "20251009_my_migration.sql | $(date +%Y-%m-%d) | $USER | Description" \
  >> db/migrations/applied_to_prod.log
```

---

## 🎉 Bottom Line

**Question:** "When should we worry about syncing?"  
**Answer:** **Start this week!**

**Why?**

- 40 min/week now > 12+ hours of panic later
- Small batches are easier to manage
- Launch day will be smooth and boring (good!)

**First step:** Run the audit script today to see what needs syncing.

**Your launch will thank you!** 🚀

---

**Need Help?**

- See `db/migrations/README.md` - Quick commands
- See `db/migrations/MIGRATION_STRATEGY.md` - Full strategy
- Run `tsx db/migrations/audit-schema-drift.ts` - See current state

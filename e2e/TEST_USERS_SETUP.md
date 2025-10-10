# E2E Test Users Setup Guide

This guide walks you through creating test users in Supabase and configuring environment variables.

---

## 🎯 Quick Setup (5 minutes)

### Step 1: Create Test Users in Supabase

Open your Supabase Dashboard → Authentication → Users → Add User

Create **3 test users:**

| Email                   | Password          | Role     | Default Dashboard |
| ----------------------- | ----------------- | -------- | ----------------- |
| `test-admin@seed.com`   | (secure password) | admin    | /admin            |
| `test-sales@seed.com`   | (secure password) | employee | /sales            |
| `test-service@seed.com` | (secure password) | employee | /service          |

**Notes:**

- Use strong passwords (min 8 chars)
- Save passwords securely (you'll need them for Step 2)
- Email verification: Disable for test users or use confirmed=true

---

### Step 2: Set User Roles in Database

After creating users in Supabase Auth, you need to set their roles in your `users` table:

```sql
-- Connect to your dev database
-- Get user IDs from Supabase Auth or users table

-- Set test-admin as admin
UPDATE users
SET default_dashboard = 'admin',
    permission_level = 'admin'
WHERE email = 'test-admin@seed.com';

-- Set test-sales as sales
UPDATE users
SET default_dashboard = 'sales',
    permission_level = 'employee'
WHERE email = 'test-sales@seed.com';

-- Set test-service as service
UPDATE users
SET default_dashboard = 'service',
    permission_level = 'employee'
WHERE email = 'test-service@seed.com';
```

**Alternative:** Use Supabase Dashboard → SQL Editor to run these queries.

---

### Step 3: Add Credentials to Doppler

Store test passwords in Doppler for E2E tests:

```bash
# Set admin credentials
doppler secrets set TEST_ADMIN_EMAIL=test-admin@seed.com \
  --project seed-portal-web --config dev

doppler secrets set TEST_ADMIN_PASSWORD='YourSecurePassword123!' \
  --project seed-portal-web --config dev

# Set sales credentials
doppler secrets set TEST_SALES_EMAIL=test-sales@seed.com \
  --project seed-portal-web --config dev

doppler secrets set TEST_SALES_PASSWORD='YourSecurePassword123!' \
  --project seed-portal-web --config dev

# Set service credentials
doppler secrets set TEST_SERVICE_EMAIL=test-service@seed.com \
  --project seed-portal-web --config dev

doppler secrets set TEST_SERVICE_PASSWORD='YourSecurePassword123!' \
  --project seed-portal-web --config dev
```

**Important:** Use **seed-portal-web** project (not seed-portal-api) because Playwright runs in browser context.

---

### Step 4: Verify Setup

Test that auth helper works:

```bash
# Start servers
doppler run --project seed-portal-api --config dev -- npm run dev:api
doppler run --project seed-portal-web --config dev -- npm run dev:web

# Run smoke test with auth
npm run test:e2e:ui
```

---

## 🔐 Security Best Practices

### Password Requirements

- **Minimum 8 characters**
- Mix of letters, numbers, symbols
- Different from production passwords
- Store in Doppler (never commit)

### Environment Isolation

- **Dev test users:** Use in local development
- **Staging test users:** Create separate users for staging
- **Production:** Never use test users in production

---

## 📝 Complete Setup Checklist

### Supabase Setup ✅

- [ ] Created `test-admin@seed.com` in Supabase Auth
- [ ] Created `test-sales@seed.com` in Supabase Auth
- [ ] Created `test-service@seed.com` in Supabase Auth
- [ ] Confirmed all users can log in manually
- [ ] Set `default_dashboard` for all test users
- [ ] Set `permission_level` for all test users

### Doppler Setup ✅

- [ ] Added `TEST_ADMIN_EMAIL` to seed-portal-web dev config
- [ ] Added `TEST_ADMIN_PASSWORD` to seed-portal-web dev config
- [ ] Added `TEST_SALES_EMAIL` to seed-portal-web dev config
- [ ] Added `TEST_SALES_PASSWORD` to seed-portal-web dev config
- [ ] Added `TEST_SERVICE_EMAIL` to seed-portal-web dev config
- [ ] Added `TEST_SERVICE_PASSWORD` to seed-portal-web dev config

### Verification ✅

- [ ] Can login as admin via UI manually
- [ ] Can login as sales via UI manually
- [ ] Can login as service via UI manually
- [ ] E2E smoke tests pass with auth helper
- [ ] All test users have correct dashboard access

---

## 🛠️ Troubleshooting

### Issue: "User not found"

**Cause:** User exists in Supabase Auth but not in `users` table.

**Fix:**

```sql
-- Check if user exists
SELECT * FROM users WHERE email = 'test-admin@seed.com';

-- If missing, insert (get auth_user_id from Supabase Auth)
INSERT INTO users (auth_user_id, email, first_name, last_name, default_dashboard, permission_level)
VALUES ('uuid-from-supabase-auth', 'test-admin@seed.com', 'Test', 'Admin', 'admin', 'admin');
```

### Issue: "Wrong password"

**Cause:** Password mismatch or not set in Doppler.

**Fix:**

```bash
# Verify Doppler has the password
doppler secrets get TEST_ADMIN_PASSWORD --project seed-portal-web --config dev --plain

# If missing or wrong, reset in Supabase and update Doppler
```

### Issue: "Redirected to wrong dashboard"

**Cause:** `default_dashboard` not set correctly.

**Fix:**

```sql
-- Update default dashboard
UPDATE users
SET default_dashboard = 'admin'
WHERE email = 'test-admin@seed.com';
```

### Issue: "Permission denied"

**Cause:** `permission_level` not set or incorrect roles.

**Fix:**

```sql
-- Check current permission
SELECT email, permission_level, default_dashboard FROM users
WHERE email LIKE 'test-%@seed.com';

-- Update if needed
UPDATE users SET permission_level = 'admin' WHERE email = 'test-admin@seed.com';
```

---

## 🔄 Reset Test Users

If test data becomes corrupted:

```sql
-- Reset test user data (be careful!)
BEGIN;

-- Delete test user data (not the users themselves)
DELETE FROM email_accounts WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test-%@seed.com'
);

DELETE FROM quotes WHERE sales_rep_email LIKE 'test-%@seed.com';

-- Add other cleanup as needed...

COMMIT;
```

---

## 📚 Usage in Tests

```typescript
import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsSales, logout } from "./helpers/auth";

test("admin can access settings", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/admin/settings");
  await expect(page.locator("h1")).toContainText("Settings");
});

test("sales can create quote", async ({ page }) => {
  await loginAsSales(page);

  await page.goto("/calculator");
  // ... test quote creation
});
```

---

## 🎯 Next Steps

Once setup is complete:

1. ✅ Run smoke tests: `npm run test:e2e:ui`
2. ✅ Un-skip auth-required tests in test files
3. ✅ Write new E2E tests for critical flows

---

**Questions?** See `e2e/README.md` or `e2e/helpers/auth.ts`

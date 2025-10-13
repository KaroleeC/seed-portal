# Testing Session Migration - Complete Guide

## 🧪 Test Suite Overview

I've created comprehensive tests to verify the Redis → Postgres migration works correctly.

---

## 📋 Test Files Created

### 1. **Integration Tests** (`test/integration/postgres-sessions.test.ts`)

Tests the Postgres session store at the service level.

**Coverage:**

- ✅ Session table schema verification
- ✅ Session CRUD operations (create, read, update, delete)
- ✅ Session expiration handling
- ✅ Concurrent session operations
- ✅ Impersonation data storage
- ✅ Session cleanup/pruning
- ✅ Migration verification (no Redis dependencies)

### 2. **E2E Tests** (`test/e2e/impersonation.spec.ts`)

Tests the full impersonation flow in a browser.

**Coverage:**

- ✅ Admin can impersonate users
- ✅ Impersonation persists across reloads
- ✅ Admin can stop impersonation
- ✅ Session data stored in Postgres (not Redis)
- ✅ Non-admin users blocked from impersonation
- ✅ Session cookies have correct security attributes

---

## 🚀 Running the Tests

### **1. Integration Tests (Vitest)**

```bash
# Run all integration tests
npm test test/integration/postgres-sessions.test.ts

# Run with coverage
npm run test:coverage test/integration/postgres-sessions.test.ts

# Run in watch mode
npm run test:watch test/integration/postgres-sessions.test.ts
```

**Prerequisites:**

- Database connection (`DATABASE_URL` set)
- Postgres running locally or via Supabase

### **2. E2E Tests (Playwright)**

```bash
# Run impersonation E2E tests
npm run test:e2e test/e2e/impersonation.spec.ts

# Run with UI
npm run test:e2e:ui test/e2e/impersonation.spec.ts

# Run headed (see browser)
npm run test:e2e:headed test/e2e/impersonation.spec.ts
```

**Prerequisites:**

- Server running (`npm run dev`)
- Test users in database (admin + regular user)
- Doppler config loaded

---

## ✅ What Each Test Verifies

### **Session Table Tests**

```typescript
✓ Should have user_sessions table created
✓ Should have correct schema (sid, sess, expire)
✓ Should have index on expire column
```

### **Session Operations Tests**

```typescript
✓ Should create sessionMiddleware correctly
✓ Should use Postgres pool for storage
✓ Should set cookies with correct options
```

### **Session Persistence Tests**

```typescript
✓ Should persist session data to Postgres
✓ Should handle session expiration
✓ Should handle concurrent operations
```

### **Impersonation Tests**

```typescript
✓ Should store impersonation data correctly
✓ Should handle stop impersonation
✓ Admin can impersonate users (E2E)
✓ Impersonation persists across reloads (E2E)
```

---

## 🔍 Manual Verification

### **1. Check Session Table**

```sql
-- Connect to your database
psql $DATABASE_URL

-- Verify table exists
\dt user_sessions

-- Check structure
\d user_sessions

-- View sessions
SELECT sid, expire, sess::jsonb->'isImpersonating' as impersonating
FROM user_sessions
ORDER BY expire DESC
LIMIT 10;
```

### **2. Test Impersonation Flow**

1. **Login as admin:**
   - Navigate to `/login`
   - Login with admin credentials

2. **Start impersonation:**
   - Go to `/admin/users`
   - Click "Sign In As" on any user
   - Verify banner shows "Impersonating..."

3. **Check session in database:**

   ```sql
   SELECT sess FROM user_sessions
   WHERE sess::text LIKE '%isImpersonating%';
   ```

4. **Reload page:**
   - Hit refresh
   - Verify still impersonating

5. **Stop impersonation:**
   - Click "Stop Impersonation"
   - Verify back to admin account

### **3. Verify No Redis Dependencies**

```bash
# Search for Redis imports
grep -r "from.*redis" server/

# Should return no results (or only in node_modules)

# Check that Redis env vars are not used
grep -r "REDIS_URL" server/

# Should return no results
```

---

## 📊 Expected Test Results

### **All Passing:**

```
✓ Postgres Session Store (15 tests)
  ✓ Session Table (3)
  ✓ Session Operations (3)
  ✓ Session Persistence (3)
  ✓ Impersonation Compatibility (2)
  ✓ Session Cleanup (1)
  ✓ Migration Verification (3)

✓ Impersonation E2E (6 tests)
  ✓ admin can impersonate another user
  ✓ impersonation persists across page reloads
  ✓ admin can stop impersonation
  ✓ impersonation session data is stored in Postgres
  ✓ non-admin users cannot access impersonation
  ✓ impersonation session expires correctly

Test Files  2 passed (2)
Tests  21 passed (21)
```

---

## 🐛 Troubleshooting

### **Test Failure: "Table does not exist"**

**Cause:** `user_sessions` table hasn't been created yet.

**Fix:**

1. Start the server: `npm run dev`
2. Login once to trigger session creation
3. Table will be auto-created
4. Re-run tests

### **Test Failure: "Database connection failed"**

**Cause:** `DATABASE_URL` not set or database not running.

**Fix:**

```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Or load from Doppler
doppler run --project seed-portal-api --config dev -- npm test
```

### **E2E Test Failure: "User not found"**

**Cause:** Test users don't exist in database.

**Fix:** Create test users manually or seed database.

```sql
-- Create admin user
INSERT INTO users (email, password, role)
VALUES ('admin@example.com', 'hashed-password', 'admin');

-- Create regular user
INSERT INTO users (email, password, role)
VALUES ('user@example.com', 'hashed-password', 'user');
```

---

## 🎯 Success Criteria

All tests pass ✅ means:

- ✅ Postgres session store configured correctly
- ✅ Sessions persist to database
- ✅ Impersonation works end-to-end
- ✅ No Redis dependencies remain
- ✅ Security settings correct (HttpOnly, SameSite)
- ✅ Session cleanup working

---

## 📝 Next Steps

After all tests pass:

1. **Deploy to staging**
2. **Test impersonation in staging**
3. **Monitor session table size** (should grow slowly)
4. **Remove Redis from infrastructure**
5. **Update deployment docs**

---

## 🔐 Security Checklist

- ✅ Sessions use `HttpOnly` cookies (prevents XSS)
- ✅ Sessions use `SameSite: Lax` (CSRF protection)
- ✅ Sessions use `secure: true` in production (HTTPS only)
- ✅ SESSION_SECRET is strong and unique (not default)
- ✅ Sessions expire after 7 days (configurable)
- ✅ Old sessions auto-pruned every 15 min

---

## 🎉 Migration Validated

Once all tests pass, your Redis → Postgres session migration is **verified and production-ready**!

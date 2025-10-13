# RBAC System Testing Guide

**Status:** ✅ Ready for Testing  
**Last Updated:** 2025-10-12

This guide covers all automated and manual testing for the RBAC permission system.

---

## 📊 Test Coverage Summary

| Test Type               | Files                                                      | Status        |
| ----------------------- | ---------------------------------------------------------- | ------------- |
| **Backend Unit Tests**  | `server/routes/__tests__/admin-rbac.test.ts`               | ✅ Added      |
| **Frontend Hook Tests** | `client/src/hooks/__tests__/use-user-permissions.test.tsx` | ✅ Created    |
| **E2E Tests**           | `e2e/rbac-permissions.spec.ts`                             | ✅ Created    |
| **Manual Tests**        | This document                                              | ✅ Documented |

---

## 🧪 Backend Tests (Vitest + Supertest)

### What's Tested

- ✅ `GET /api/admin/rbac/user-permissions/:userId` endpoint
- ✅ Authentication and authorization
- ✅ Role deduplication
- ✅ Permission aggregation from multiple roles
- ✅ Error handling (404, 400, 401, 403)
- ✅ Edge cases (no roles, multiple roles)

### Running Backend Tests

```bash
# Run all backend tests
npm run test:api

# Run only RBAC tests
npm run test:api -- admin-rbac

# Run with coverage
npm run test:api -- --coverage
```

### Key Test Cases

**✅ Test 1: Happy Path**

```typescript
GET /api/admin/rbac/user-permissions/1
→ Returns { userId, roles[], permissions[], departments[] }
→ Status: 200
```

**✅ Test 2: Role Deduplication**

```typescript
User assigned same role twice
→ Response contains only 1 instance of that role
```

**✅ Test 3: Multiple Roles**

```typescript
User with roles A and B
→ Permissions include all from both roles
```

**✅ Test 4: Error Cases**

```typescript
Invalid userId    → 400
Non-existent user → 404
No auth           → 401
No permission     → 403
```

---

## 🎨 Frontend Tests (Vitest + MSW)

### What's Tested

- ✅ `useUserPermissions()` hook data fetching
- ✅ Permission checking functions
- ✅ Role checking functions
- ✅ Department checking functions
- ✅ Loading and error states
- ✅ Caching behavior
- ✅ Refetch functionality

### Running Frontend Tests

```bash
# Run all frontend tests
npm run test

# Run only hook tests
npm run test -- use-user-permissions

# Run with UI
npm run test:ui

# Run with coverage
npm run test -- --coverage
```

### Key Test Cases

**✅ Test 1: Data Fetching**

```typescript
Hook fetches permissions on mount
→ isLoading: true → false
→ Data populated correctly
```

**✅ Test 2: Permission Checks**

```typescript
hasPermission("users.view") → true/false
hasAnyPermission(["a", "b"]) → true if user has either
hasAllPermissions(["a", "b"]) → true only if user has both
```

**✅ Test 3: Caching**

```typescript
Second render uses cached data
→ No new API call
```

---

## 🎭 E2E Tests (Playwright)

### What's Tested

- ✅ Permissions load on app start
- ✅ No infinite reload loops
- ✅ Permission caching during navigation
- ✅ Admin features visible to admins only
- ✅ Error handling doesn't crash app
- ✅ RBAC admin panel loads correctly
- ✅ Performance (API response < 500ms)

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode
npm run test:e2e -- --ui

# Run specific test file
npm run test:e2e -- rbac-permissions

# Run with debug
npm run test:e2e -- --debug
```

### Key Test Scenarios

**✅ Scenario 1: App Load**

```
1. User logs in
2. App calls /api/admin/rbac/user-permissions/1
3. Response received successfully
4. No reload loops
```

**✅ Scenario 2: Navigation**

```
1. User navigates between pages
2. Permissions are cached (no new API calls)
3. UI updates based on permissions
```

**✅ Scenario 3: Error Handling**

```
1. Mock API error (500)
2. App still loads
3. No crash, no error toast
4. Falls back to safe defaults
```

---

## 🧭 Manual Testing Checklist

### Initial Load Test

- [ ] Load app in browser
- [ ] Open DevTools → Network tab
- [ ] Refresh page
- [ ] Verify: `GET /api/admin/rbac/user-permissions/1` returns 200
- [ ] Verify: Response has `userId`, `roles`, `permissions`, `departments`
- [ ] Verify: No 404 or 401 errors
- [ ] Verify: No infinite reload loop

### Permission Loading Test

- [ ] Login as admin user
- [ ] Open Console
- [ ] No errors about permissions
- [ ] No "undefined" errors
- [ ] App loads and stays loaded

### UI Rendering Test

- [ ] Navigate to `/settings`
- [ ] Admin features visible (e.g., "System Settings")
- [ ] Navigate to other pages
- [ ] Permission-based elements show/hide correctly

### Caching Test

- [ ] Load app (Network tab open)
- [ ] Note: API called on load
- [ ] Navigate to different pages
- [ ] Verify: No repeated API calls
- [ ] Wait 5+ minutes
- [ ] Navigate again
- [ ] Verify: API called again (cache expired)

### Role Deduplication Test

- [ ] Load app
- [ ] Check API response in Network tab
- [ ] Verify: No duplicate roles in response
- [ ] If user ID 1 has duplicate roles in DB, response still shows unique roles

---

## 🐛 Debugging Failed Tests

### Backend Test Failures

**❌ "Expected 200, received 401"**

- Check: `requireAuth` imported from `../middleware/supabase-auth`
- Check: Test sets proper Authorization header
- Check: Mock user exists in test database

**❌ "Expected 200, received 403"**

- Check: Test user has `users.view` permission
- Check: Admin role has correct permissions assigned

**❌ "Role deduplication failed"**

- Check: Deduplication logic in endpoint (lines 176-179)
- Check: `Array.from(new Map(...))` is working correctly

### Frontend Test Failures

**❌ "Hook doesn't fetch data"**

- Check: MSW server is running (`beforeAll`)
- Check: Mock URL matches actual API endpoint
- Check: `useAuth` mock returns valid user

**❌ "Permission checks fail"**

- Check: Mock data includes expected permissions
- Check: Wait for data to load before assertions
- Check: `isLoading` is false before checking permissions

### E2E Test Failures

**❌ "Timeout waiting for API"**

- Check: Server is running on correct port
- Check: Login credentials are correct
- Check: Database has test data seeded

**❌ "Element not found"**

- Check: Selectors match actual DOM
- Check: Wait for proper load state
- Check: Element is actually rendered (conditional rendering)

---

## 🎯 Test Data Requirements

### Database Setup

**Required Users:**

```sql
-- Admin user (for tests)
INSERT INTO users (email, role, ...)
VALUES ('admin@test.com', 'admin', ...);

-- Regular user (for permission tests)
INSERT INTO users (email, role, ...)
VALUES ('user@test.com', 'employee', ...);
```

**Required Roles:**

```sql
INSERT INTO roles (name, description)
VALUES ('admin', 'System administrator');

INSERT INTO roles (name, description)
VALUES ('test_role', 'Test role');
```

**Required Permissions:**

```sql
INSERT INTO permissions (key, category)
VALUES ('users.view', 'users');

INSERT INTO permissions (key, category)
VALUES ('test.permission', 'test');
```

---

## 📈 CI/CD Integration

### GitHub Actions

Add to `.github/workflows/ci.yml`:

```yaml
- name: Run Backend Tests
  run: npm run test:api

- name: Run Frontend Tests
  run: npm run test -- --run

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

### Test Coverage Thresholds

**Recommended Minimums:**

- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

Configure in `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
},
```

---

## 🚀 Quick Start

### Run All Tests

```bash
# Backend tests
npm run test:api

# Frontend tests
npm run test

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:all -- --coverage
```

### Expected Output

```
✓ Backend Tests: 15 passed
✓ Frontend Tests: 12 passed
✓ E2E Tests: 10 passed
─────────────────────────────
Total: 37 tests passed
Coverage: 85%
```

---

## 📝 Test Maintenance

### When to Update Tests

**✅ Update when:**

- New RBAC endpoints added
- Permission checking logic changes
- New UI components use permissions
- Response format changes

**📋 Update checklist:**

1. Add new test cases
2. Update mock data
3. Update E2E selectors
4. Update this documentation

---

## 🔍 Test Results

### Latest Test Run

**Date:** [To be filled after first run]  
**Status:** ⏳ Pending  
**Coverage:** TBD

**Backend:** ⏳  
**Frontend:** ⏳  
**E2E:** ⏳

---

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
- [RBAC Migration Status](./RBAC_MIGRATION_STATUS.md)

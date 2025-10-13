# RBAC Testing Strategy

## 🐛 The Bug That Should Have Been Caught

**Issue**: RBAC tabs used raw `fetch()` without Authorization headers  
**Impact**: All requests returned 401, blocking RBAC management UI  
**Root Cause**: Missing component tests to verify auth headers are sent

## 🔍 Testing Gaps Identified

### ❌ Gap 1: No Component Tests for RBAC Tabs

**Problem**: No tests verify components use `apiFetch()` instead of raw `fetch()`  
**Impact**: Frontend can forget auth headers, causing 401 errors  
**Fix**: Add component tests that verify `apiFetch` is used

### ❌ Gap 2: E2E Tests Only Check Success Status

**Problem**: E2E tests only verify `response.status() === 200`  
**Impact**: Don't catch missing Authorization headers if auth is bypassed  
**Fix**: Verify Authorization header is present in requests

### ❌ Gap 3: Backend Tests Mock Authentication

**Problem**: Backend tests manually add auth headers in test setup  
**Impact**: Never catch when frontend forgets to send headers  
**Fix**: Add integration tests that test full auth flow

---

## ✅ Recommended Testing Layers

### 1. Component Tests (Vitest + React Testing Library)

**Purpose**: Verify components use authenticated API helpers

```typescript
// client/src/components/settings/system/rbac/__tests__/UsersTab.test.tsx
it("should use apiFetch with Authorization header", async () => {
  const apiFetchSpy = vi.spyOn(api, "apiFetch").mockResolvedValue({
    users: [],
  });

  render(
    <QueryClientProvider client={queryClient}>
      <UsersTab />
    </QueryClientProvider>
  );

  await waitFor(() => {
    expect(apiFetchSpy).toHaveBeenCalled();
  });

  expect(apiFetchSpy).toHaveBeenCalledWith("GET", "/api/admin/rbac/users");
});

it("should NOT use raw fetch() for authenticated endpoints", async () => {
  const fetchSpy = vi.spyOn(global, "fetch");

  render(<UsersTab />);

  await waitFor(() => {
    const rbacCalls = fetchSpy.mock.calls.filter(([url]) =>
      url.includes("/api/admin/rbac")
    );
    expect(rbacCalls.length).toBe(0);
  });
});
```

**Files to Test**:

- ✅ `UsersTab.tsx`
- ✅ `RolesTab.tsx`
- ✅ `PermissionsTab.tsx`
- ✅ `AssignRoleDialog.tsx`

---

### 2. API Integration Tests (Vitest + Supertest)

**Purpose**: Test full request/response cycle with real auth middleware

```typescript
// server/routes/__tests__/admin-rbac-auth.test.ts
describe("RBAC Auth Integration", () => {
  it("should reject requests without Authorization header", async () => {
    await request(app)
      .get("/api/admin/rbac/users")
      // No .set("Authorization", ...) - test real auth flow
      .expect(401);
  });

  it("should accept requests with valid Supabase token", async () => {
    const token = await getValidSupabaseToken();

    await request(app)
      .get("/api/admin/rbac/users")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });

  it("should reject requests with invalid token", async () => {
    await request(app)
      .get("/api/admin/rbac/users")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);
  });
});
```

---

### 3. E2E Tests (Playwright) - Enhanced

**Purpose**: Verify full user flow including auth headers

```typescript
// e2e/rbac-permissions.spec.ts
test("should send Authorization header in API requests", async ({ page }) => {
  await page.goto("/settings#system");

  const response = await page.waitForResponse((res) => res.url().includes("/api/admin/rbac/users"));

  // CRITICAL: Verify auth header is present
  const request = response.request();
  const authHeader = request.headers()["authorization"];

  expect(authHeader).toBeDefined();
  expect(authHeader).toMatch(/^Bearer /);
  expect(response.status()).toBe(200);
});

test("should fail gracefully when auth token is missing", async ({ page }) => {
  // Clear Supabase session
  await page.evaluate(() => {
    localStorage.clear();
  });

  await page.goto("/settings#system");

  // Should redirect to login or show error
  await expect(page).toHaveURL(/login/);
});
```

---

### 4. Lint Rules for Auth Safety

**Purpose**: Catch raw fetch usage at dev time

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // Warn on raw fetch() in component files
    "no-restricted-globals": [
      "warn",
      {
        name: "fetch",
        message: "Use apiFetch() from @/lib/api for authenticated requests",
      },
    ],
  },
  overrides: [
    {
      files: ["client/src/components/**/*.tsx", "client/src/pages/**/*.tsx"],
      rules: {
        "no-restricted-globals": [
          "error",
          {
            name: "fetch",
            message:
              "Components must use apiFetch() for authenticated API calls. Import from @/lib/api",
          },
        ],
      },
    },
  ],
};
```

---

## 🎯 Action Plan

### Immediate (P0)

- [ ] Fix UsersTab.test.tsx path alias configuration
- [ ] Run updated E2E test to verify auth headers
- [ ] Add component tests for RolesTab and PermissionsTab

### Short-term (P1)

- [ ] Add integration tests for auth middleware
- [ ] Add ESLint rule to prevent raw fetch in components
- [ ] Document apiFetch() usage in API guidelines

### Medium-term (P2)

- [ ] Add visual regression tests for RBAC UI
- [ ] Add performance tests (API response time < 500ms)
- [ ] Add accessibility tests (a11y) for RBAC forms

### Long-term (P3)

- [ ] Add contract tests between frontend and backend
- [ ] Add security tests (OWASP Top 10)
- [ ] Add load tests for RBAC endpoints

---

## 📊 Test Coverage Goals

| Layer                  | Current | Target | Priority |
| ---------------------- | ------- | ------ | -------- |
| Component Tests (RBAC) | 0%      | 80%    | P0       |
| API Integration Tests  | 60%     | 90%    | P1       |
| E2E Tests (RBAC)       | 40%     | 80%    | P0       |
| Auth Flow Tests        | 30%     | 95%    | P0       |

---

## 🔧 CI/CD Integration

### Pre-Commit Hooks

```bash
# .husky/pre-commit
npm run lint
npm run test:unit -- --run --changed
```

### Pull Request Checks

```yaml
# .github/workflows/ci.yml
- name: Run Component Tests
  run: npm run test:unit -- --run --coverage

- name: Run E2E Tests
  run: npm run test:e2e

- name: Check Coverage
  run: npm run test:coverage
  # Fail if coverage drops below thresholds
```

### Required Test Coverage

- **Component Tests**: 80% line coverage
- **API Tests**: 90% line coverage
- **E2E Tests**: Critical paths only

---

## 📝 Test Naming Conventions

```typescript
// ✅ Good: Describes behavior and expected outcome
test("should send Authorization header when fetching users", async () => {});

// ❌ Bad: Vague and doesn't describe expectation
test("test users tab", async () => {});

// ✅ Good: Tests specific error case
test("should show error when API returns 401", async () => {});

// ❌ Bad: Tests implementation detail
test("calls useState hook", async () => {});
```

---

## 🎓 Developer Guidelines

### When Writing New Components

1. **Always use `apiFetch()` for authenticated endpoints**

   ```typescript
   // ✅ Correct
   const data = await apiFetch<T>("GET", "/api/admin/rbac/users");

   // ❌ Wrong
   const res = await fetch("/api/admin/rbac/users");
   ```

2. **Write component tests before merging**
   - Test happy path (success case)
   - Test error cases (401, 403, 500)
   - Test loading states

3. **Add E2E tests for critical user flows**
   - New feature? Add E2E test
   - Auth-protected? Verify headers
   - Form submission? Test validation

---

## 🚨 Preventing Future Bugs

### Checklist for Auth-Protected Features

- [ ] Components use `apiFetch()` from `@/lib/api`
- [ ] Component tests verify `apiFetch()` is called
- [ ] E2E tests verify Authorization header is sent
- [ ] Backend tests verify 401 without auth
- [ ] ESLint rule catches raw fetch usage
- [ ] Code review checks for auth headers

---

## 📚 References

- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Vitest Guide](https://vitest.dev/guide/)
- [React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)

---

**Last Updated**: October 2025  
**Owner**: Engineering Team  
**Review Cycle**: Quarterly

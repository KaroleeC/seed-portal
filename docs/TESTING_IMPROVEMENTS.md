# Testing Improvements - Preventing Runtime Errors

## Problem

Unit tests pass but the app crashes at runtime with:

- Missing imports (`ComposeModal is not defined`)
- 500 errors from API endpoints
- Type mismatches that TypeScript warnings don't catch

## Root Cause

**We're testing in isolation, not integration.**

Current tests:

- ✅ Unit tests - Mock everything, test logic
- ✅ Component tests - Render isolated components
- ❌ **No smoke tests** - Actually load pages and call APIs
- ❌ **No E2E tests** - Full user flows

## Solution: 3-Tier Testing Strategy

### Tier 1: Smoke Tests (MISSING - HIGH PRIORITY)

**Purpose:** Catch import errors, 500s, and basic rendering issues

```typescript
// __tests__/smoke/seedmail.smoke.test.ts
describe('SeedMail Smoke Tests', () => {
  it('should load the page without crashing', async () => {
    // Actually import and render the page
    const { default: SeedMailPage } = await import('@/pages/seedmail');
    render(<SeedMailPage />);
    // If we get here, no import errors!
  });
  
  it('should fetch lead emails without 500', async () => {
    const response = await fetch('/api/crm/leads/emails', {
      headers: { Authorization: `Bearer ${testToken}` }
    });
    expect(response.status).not.toBe(500);
  });
  
  it('should fetch threads without 404', async () => {
    const response = await fetch('/api/email/threads?accountId=test');
    expect(response.status).not.toBe(404);
  });
});
```

**Run frequency:** Every commit, takes <5s

### Tier 2: Integration Tests (PARTIALLY EXISTS)

**Purpose:** Test full request/response cycles

```typescript
// Already have: email-lead-linking.http.test.ts
// Need to add: API endpoint coverage for all new routes
```

**Run frequency:** Pre-merge, takes <30s

### Tier 3: E2E Tests (MISSING - MEDIUM PRIORITY)

**Purpose:** Test full user workflows with Playwright

```typescript
test('can link email to lead', async ({ page }) => {
  await page.goto('/apps/seedmail');
  await page.click('[data-testid="thread-menu"]');
  await page.click('text=Associate with Existing Lead');
  await page.fill('[placeholder="Search leads..."]', 'test');
  await page.click('text=Test Lead');
  await expect(page.locator('.lead-badge')).toBeVisible();
});
```

**Run frequency:** Pre-deploy, takes 2-5min

## Implementation Plan

### Phase 1: Smoke Tests ✅ COMPLETE

1. ✅ Create `__tests__/smoke/` directory
2. ✅ Add smoke tests for all main pages (`pages.smoke.test.tsx`)
3. ✅ Add smoke tests for all API endpoints (`api-endpoints.smoke.test.ts`)
4. ✅ Add `npm run test:smoke` script
5. ⏳ Add to CI pipeline (next step)

### Phase 2: Integration Test Coverage (NEXT SPRINT)

1. Add HTTP tests for all CRUD operations
2. Test error cases (401, 403, 404, 500)
3. Test query parameter validation

### Phase 3: E2E Tests (FOLLOWING SPRINT)

1. Set up Playwright
2. Add critical user flows
3. Add to deployment pipeline

## CI Pipeline

```yaml
# .github/workflows/test.yml
test:
  - Lint & Type Check (fast fail)
  - Smoke Tests (fast fail) ← NEW
  - Unit Tests
  - Integration Tests
  - E2E Tests (only on main)
```

## Metrics

- **Code Coverage:** Track with Vitest
- **Smoke Test Coverage:** All pages + All new endpoints
- **E2E Coverage:** All critical user flows

## Immediate Action

**Run before every merge:**

```bash
npm run test:smoke  # ← Need to add this
npm run test:integration
npm run lint
npm run typecheck
```

---

**Bottom Line:** Smoke tests would have caught both errors in <5 seconds.

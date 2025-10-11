# Smoke Tests

**Fast, fail-first tests that catch basic errors before running the full test suite.**

## What They Catch

- ✅ Missing imports (`ComposeModal is not defined`)
- ✅ Broken component references
- ✅ 404 errors (routes not mounted)
- ✅ 500 errors (basic API failures)
- ✅ Syntax errors

## What They DON'T Test

- ❌ Business logic (use unit tests)
- ❌ Complex workflows (use E2E tests)
- ❌ Edge cases (use integration tests)

## Run Smoke Tests

```bash
# Run once (CI mode)
npm run test:smoke

# Watch mode (development)
npm run test:smoke:watch
```

## Test Files

### `pages.smoke.test.tsx`

Tests that all major pages can be imported without errors.

**Example failure it catches:**

```
ReferenceError: ComposeModal is not defined
```

### `api-endpoints.smoke.test.ts`

Tests that all API endpoints exist and don't immediately 500.

**Example failures it catches:**

- `404 Not Found` - Route not mounted
- `500 Internal Server Error` - Drizzle query error, missing imports

## When to Run

### ✅ Always

- Before committing
- In CI pipeline (runs first, fails fast)
- Before merging PRs

### ✅ After

- Adding new pages/components
- Adding new API endpoints
- Refactoring imports
- Changing route definitions

## CI Integration

```yaml
# .github/workflows/test.yml
test:
  steps:
    - run: npm run lint # Fast fail #1
    - run: npm run test:smoke # Fast fail #2 ← NEW
    - run: npm run test:run # Full test suite
    - run: npm run test:e2e # Slowest tests
```

## Speed

- **Target:** <5 seconds
- **Current:** ~2-3 seconds
- **Why fast:** No rendering, minimal setup, fail immediately

## Adding New Smoke Tests

### For a new page

```typescript
it("should import MyNewPage without errors", async () => {
  const module = await import("../../client/src/pages/my-page/index");
  expect(module.default).toBeDefined();
});
```

### For a new API endpoint

```typescript
it("GET /api/my-endpoint should not 404 or 500", async () => {
  const response = await fetch(`${server.url}/api/my-endpoint`, {
    headers: { Authorization: `Bearer ${server.testToken}` },
  });
  expect(response.status).not.toBe(404);
  expect(response.status).not.toBe(500);
});
```

## Philosophy

**Smoke tests are the canary in the coal mine.**

If smoke tests fail, don't bother running the full test suite - something fundamental is broken.

They're not comprehensive, they're **practical**. They catch the most common developer errors in the shortest time possible.

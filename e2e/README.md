# E2E Testing with Playwright

End-to-end tests for critical user flows across the Seed Portal application.

---

## 🚀 Quick Start

### Run All E2E Tests

```bash
# Run all tests (headless, all browsers)
npm run test:e2e

# Run with UI mode (best for development)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run only Chromium (fastest)
npm run test:e2e:chromium

# Debug mode (step through tests)
npm run test:e2e:debug
```

### View Test Report

```bash
# After running tests, view HTML report
npm run test:e2e:report
```

---

## 📁 Test Files

| File                  | Purpose                 | Priority  |
| --------------------- | ----------------------- | --------- |
| `smoke.spec.ts`       | Basic app health checks | ✅ HIGH   |
| `calculator.spec.ts`  | Quote calculator flows  | ✅ HIGH   |
| `commissions.spec.ts` | Commission tracker      | ✅ HIGH   |
| `seedmail.spec.ts`    | Email client            | ✅ HIGH   |
| `dashboards.spec.ts`  | Dashboard navigation    | ⚠️ MEDIUM |

---

## 🔧 Prerequisites

### 1. Start Development Servers

E2E tests require both web and API servers running:

```bash
# Terminal 1: API server
doppler run --project seed-portal-api --config dev -- \
  sh -c 'PORT_OVERRIDE=5001 USE_SUPABASE_AUTH=true npm run dev:api'

# Terminal 2: Web server
doppler run --project seed-portal-web --config dev -- \
  sh -c 'VITE_STRICT_PORT=1 npm run dev:web'

# Terminal 3: Run tests
npm run test:e2e:ui
```

**OR** use the webServer config (auto-starts web, you manually start API):

```bash
# Terminal 1: API server (manual)
npm run dev:api:doppler

# Terminal 2: Run tests (auto-starts web)
npm run test:e2e
```

### 2. Database Setup

Tests require a clean test database:

```bash
# Use dev database or create separate test database
# Set TEST_DATABASE_URL in Doppler if needed
```

---

## ✍️ Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("specific behavior", async ({ page }) => {
    // 1. Navigate
    await page.goto("/feature");

    // 2. Interact
    await page.click('button:has-text("Action")');
    await page.fill('input[name="field"]', "value");

    // 3. Assert
    await expect(page.locator(".result")).toBeVisible();
    await expect(page.locator(".result")).toContainText("Success");
  });
});
```

### Authentication Helper (TODO)

```typescript
// e2e/helpers/auth.ts
import { Page } from "@playwright/test";

export async function loginAsAdmin(page: Page) {
  // TODO: Implement Supabase auth login
  await page.goto("/");
  await page.fill('input[type="email"]', "admin@seed.com");
  await page.fill('input[type="password"]', "password");
  await page.click('button:has-text("Login")');
  await page.waitForURL(/\/(sales|admin|service)/);
}

export async function loginAsSales(page: Page) {
  // TODO: Similar to above
}
```

### Network Mocking

```typescript
test("mocks HubSpot API", async ({ page }) => {
  // Mock HubSpot responses
  await page.route("**/api/hubspot/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: mockData }),
    });
  });

  await page.goto("/calculator");
  // Test continues with mocked API
});
```

---

## 📊 Test Coverage Goals

### Priority 1 (This Week) ✅

- [x] Smoke tests (basic page loads)
- [ ] Authentication flow
- [ ] Calculator quote creation
- [ ] Navigation between dashboards

### Priority 2 (Next Week)

- [ ] Calculator → HubSpot sync
- [ ] Commission tracker data display
- [ ] SeedMail inbox load
- [ ] Settings pages

### Priority 3 (Ongoing)

- [ ] Email OAuth flow
- [ ] AI conversations
- [ ] Multi-browser testing
- [ ] Mobile viewports

---

## 🐛 Debugging Failed Tests

### 1. Use UI Mode (Best)

```bash
npm run test:e2e:ui
```

- See test execution in real-time
- Inspect DOM at each step
- Time travel through test execution

### 2. Use Debug Mode

```bash
npm run test:e2e:debug
```

- Steps through test line-by-line
- Pause at breakpoints
- Inspect page state

### 3. View Screenshots/Videos

After test failure:

```bash
# View HTML report with artifacts
npm run test:e2e:report
```

Screenshots and videos are in `test-results/` directory.

### 4. Add Debug Statements

```typescript
test("debugging example", async ({ page }) => {
  await page.goto("/calculator");

  // Pause execution
  await page.pause();

  // Log page content
  console.log(await page.content());

  // Take manual screenshot
  await page.screenshot({ path: "debug.png" });
});
```

---

## ⚙️ Configuration

See `playwright.config.ts` for:

- Browser configurations
- Timeout settings
- Retry logic
- Reporter options
- Base URL
- Viewport size

---

## 🎯 Critical Flows to Test

### Quote Calculator (Priority #1)

1. Load calculator page
2. Fill out form fields
3. Calculate quote
4. Verify pricing displayed
5. Send to HubSpot
6. Verify success message

### Commission Tracker (Priority #2)

1. Load commissions page
2. Verify HubSpot data loaded
3. Check last sync indicator
4. Filter by date
5. View deal details

### SeedMail (Priority #3)

1. OAuth flow (Gmail connect)
2. Inbox loads with threads
3. Read email
4. Compose and send
5. Draft auto-save

---

## 📝 Best Practices

1. **Use test.describe** to group related tests
2. **Use meaningful test names** that describe behavior
3. **One assertion per test** when possible
4. **Clean up test data** after each test
5. **Mock external APIs** (HubSpot, Gmail) for reliability
6. **Use .skip for WIP tests** instead of commenting out
7. **Keep tests independent** - no test should rely on another

---

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📚 Resources

- **Playwright Docs:** <https://playwright.dev>
- **Best Practices:** <https://playwright.dev/docs/best-practices>
- **Selectors Guide:** <https://playwright.dev/docs/selectors>
- **API Reference:** <https://playwright.dev/docs/api/class-page>

---

## 🆘 Common Issues

### Tests fail with "Timeout"

- Increase timeout in config
- Check if servers are running
- Use `await page.waitForLoadState('networkidle')`

### Can't find elements

- Use `page.locator()` with better selectors
- Add `data-testid` attributes to UI
- Use Playwright inspector to debug selectors

### Flaky tests

- Add explicit waits: `await expect(locator).toBeVisible()`
- Mock time-dependent behavior
- Use Playwright's auto-waiting features

---

**Questions?** See `playwright.config.ts` or Playwright docs.

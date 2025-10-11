import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

/**
 * Quote Calculator E2E Tests
 *
 * Tests the critical quote creation flow.
 * Priority: HIGH (most important feature per product constraints)
 */

test.describe("Quote Calculator", () => {
  test("calculator page loads", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/calculator");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Verify page loaded (simpler check for now)
    await expect(page).toHaveURL(/\/calculator/);
    await expect(page.locator("body")).toBeVisible();

    // Stable selectors for primary actions
    await expect(page.getByTestId("qa-save-quote")).toBeVisible();
    await expect(page.getByTestId("qa-reset-quote")).toBeVisible();
  });

  test.skip("can fill out basic quote form", async ({ page }) => {
    // TODO: Adjust selectors based on actual UI
    await loginAsAdmin(page);
    await page.goto("/calculator");

    // Fill out email
    await page.fill('input[name="email"], input[type="email"]', "test@example.com");

    // Select industry (adjust selector based on your UI)
    // await page.selectOption('select[name="industry"]', 'technology');

    // Fill revenue range
    // await page.fill('input[name="revenue"]', '500000');

    // Calculate quote
    // await page.click('button:has-text("Calculate")');

    // Verify quote appears
    // await expect(page.locator('.quote-summary, .pricing-result')).toBeVisible();
  });

  test.skip("validates required fields", async ({ page }) => {
    // TODO: Test form validation
    await loginAsAdmin(page);
    await page.goto("/calculator");

    // Try to submit without filling required fields
    // await page.click('button:has-text("Calculate")');

    // Should show validation errors
    // await expect(page.locator('.error, [role="alert"]')).toBeVisible();
  });

  test.skip("quote creation flow end-to-end", async ({ page }) => {
    // TODO: Requires calculator page to respect mock session before redirect
    // TODO: Add data-testid attributes to form fields
    // Set auth context and go directly to calculator
    const email = process.env.TEST_ADMIN_EMAIL || "test-admin@seed.com";

    await page.setExtraHTTPHeaders({
      "x-e2e-test-user": email,
    });

    await page.goto("/calculator");

    // Set mock session in localStorage
    await page.evaluate((userEmail) => {
      const mockSession = {
        access_token: "e2e-test-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "e2e-refresh-token",
        user: {
          id: "e2e-test-user-id",
          email: userEmail,
          email_confirmed_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      };

      localStorage.setItem("supabase.auth.token", JSON.stringify(mockSession));
      localStorage.setItem("sb-localhost-3000-auth-token", JSON.stringify(mockSession));
    }, email);

    await page.reload({ waitUntil: "networkidle" });

    // 1. Fill out quote form
    await page.fill('input[name="email"]', "test-client@example.com");
    await page.fill('input[name="businessName"]', "Test Business Inc");

    // 2. Select industry (adjust selector to match your actual UI)
    // await page.selectOption('select[name="industry"]', 'technology');

    // 3. Enter revenue
    // await page.fill('input[name="revenue"]', '500000');

    // 4. Calculate quote
    await page.click('button:has-text("Calculate")');

    // 5. Verify pricing appears
    await expect(page.locator('[data-testid="quote-total"], .total-price')).toBeVisible({
      timeout: 10000,
    });

    // 6. Send to HubSpot
    await page.click('button:has-text("Send to HubSpot")');

    // 7. Verify success
    await expect(page.locator('.success-message, [role="alert"]')).toContainText(/success|sent/i, {
      timeout: 15000,
    });
  });
});

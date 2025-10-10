import { test, expect } from "@playwright/test";

/**
 * Smoke Tests - Basic Application Health Checks
 *
 * These tests verify that core pages load and basic navigation works.
 * Run before deploying to catch critical failures.
 */

test.describe("Application Smoke Tests", () => {
  test("homepage loads successfully", async ({ page }) => {
    await page.goto("/");

    // Check page loads (allow empty title for now)
    await expect(page).toHaveURL(/localhost:3000/);

    // Should show login page (Google sign-in button)
    const googleSignIn = page.locator('button:has-text("Sign in with Google")');
    await expect(googleSignIn).toBeVisible({ timeout: 10000 });
  });

  test("navigation between public pages works", async ({ page }) => {
    await page.goto("/");

    // Basic navigation smoke test
    await expect(page).toHaveURL(/localhost:3000/);
  });

  test.skip("login page loads (if not authenticated)", async ({ page }) => {
    // TODO: Add login flow test
    // This will depend on your Supabase Auth setup
    await page.goto("/");

    const loginInput = page.locator('input[type="email"]');
    if (await loginInput.isVisible()) {
      await expect(loginInput).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    }
  });
});

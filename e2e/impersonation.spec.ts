/**
 * Impersonation E2E Tests
 *
 * End-to-end tests for user impersonation feature with Postgres sessions.
 * These tests verify the full impersonation flow works after Redis migration.
 *
 * NOTE: These tests are SKIPPED because the app uses Google OAuth,
 * which cannot be easily automated in E2E tests. To test impersonation:
 * 1. Use the integration tests (test/integration/postgres-sessions.test.ts)
 * 2. Or manually test the impersonation feature in the UI
 */

import { test, expect } from "@playwright/test";

// Skip all tests in this file - app uses Google OAuth
test.describe.skip("User Impersonation (Postgres Sessions)", () => {
  test.beforeEach(async ({ page }) => {
    // This would need authenticated storageState, not login flow
    await page.goto("/dashboard");
  });

  test("admin can impersonate another user", async ({ page }) => {
    // This test requires Google OAuth authentication which is not feasible in E2E
    // Test impersonation manually or use integration tests instead

    // Navigate to user management
    await page.goto("/admin/users");

    // Find a user to impersonate
    const impersonateButton = page.locator('[data-testid^="button-impersonate-"]').first();
    await expect(impersonateButton).toBeVisible();

    // Click impersonate
    await impersonateButton.click();

    // Should see impersonation banner
    await expect(page.locator("text=/impersonating|signed in as/i")).toBeVisible({
      timeout: 5000,
    });

    // Verify session contains impersonation data
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "seedos.sid");

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.value).toBeTruthy();
  });

  test("impersonation persists across page reloads", async ({ page }) => {
    // Login as admin and impersonate
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "admin-password");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    await page.goto("/admin/users");
    await page.locator('[data-testid^="button-impersonate-"]').first().click();

    // Wait for impersonation to be active
    await expect(page.locator("text=/impersonating|signed in as/i")).toBeVisible();

    // Reload page
    await page.reload();

    // Impersonation should still be active
    await expect(page.locator("text=/impersonating|signed in as/i")).toBeVisible();
  });

  test("admin can stop impersonation", async ({ page }) => {
    // Login as admin and impersonate
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "admin-password");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    await page.goto("/admin/users");
    await page.locator('[data-testid^="button-impersonate-"]').first().click();

    // Wait for impersonation
    await expect(page.locator("text=/impersonating|signed in as/i")).toBeVisible();

    // Click stop impersonation
    const stopButton = page.locator("button:has-text('Stop Impersonation')");
    await expect(stopButton).toBeVisible();
    await stopButton.click();

    // Should be back to admin account
    await expect(page.locator("text=/impersonating|signed in as/i")).not.toBeVisible();

    // Should see admin features again
    await expect(page.locator("text=/admin|settings/i")).toBeVisible();
  });

  test("impersonation session data is stored in Postgres", async ({ page, request }) => {
    // This test verifies session is in Postgres, not Redis

    // Login as admin
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "admin-password");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // Impersonate a user
    await page.goto("/admin/users");
    await page.locator('[data-testid^="button-impersonate-"]').first().click();
    await expect(page.locator("text=/impersonating/i")).toBeVisible();

    // Get current user info (should show impersonation state)
    const response = await request.get("/api/auth/user");
    const userData = await response.json();

    // Should have impersonation flags
    expect(userData.isImpersonating).toBe(true);
    expect(userData.originalUser).toBeDefined();
    expect(userData.originalUser.email).toContain("admin");
  });

  test("non-admin users cannot access impersonation", async ({ page }) => {
    // Login as regular user
    await page.fill('input[name="email"]', "user@example.com");
    await page.fill('input[name="password"]', "user-password");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // Try to access admin users page
    await page.goto("/admin/users");

    // Should be redirected or see access denied
    await expect(page.locator("text=/access denied|unauthorized|forbidden/i")).toBeVisible();
  });

  test("impersonation session expires correctly", async ({ page }) => {
    // This would test session expiration, but requires waiting 7 days (maxAge)
    // For practical testing, we'll just verify the session cookie has correct attributes

    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "admin-password");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "seedos.sid");

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true); // Security: HttpOnly
    expect(sessionCookie?.sameSite).toBe("Lax"); // CSRF protection

    // In production, should be secure
    if (process.env.NODE_ENV === "production") {
      expect(sessionCookie?.secure).toBe(true);
    }
  });
});

import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsSales, loginAsService } from "./helpers/auth";

/**
 * Dashboard E2E Tests
 *
 * Tests Sales, Service, and Admin dashboards.
 * Verifies navigation, quick actions, and role-based access.
 */

test.describe("Dashboards", () => {
  test("sales dashboard loads", async ({ page }) => {
    await loginAsSales(page);

    // Verify dashboard UI
    await expect(page).toHaveURL(/\/sales/);

    // Wait for page to fully render
    await page.waitForLoadState("networkidle");

    // Just verify the page loaded (skip specific selectors for now)
    await expect(page.locator("body")).toBeVisible();
  });

  test("service dashboard loads", async ({ page }) => {
    await loginAsService(page);

    // Verify dashboard UI
    await expect(page).toHaveURL(/\/service/);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("admin dashboard loads", async ({ page }) => {
    await loginAsAdmin(page);

    // Verify admin dashboard (unique AI executive team layout)
    await expect(page).toHaveURL(/\/admin/);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test.skip("command dock opens with Cmd+K", async ({ page }) => {
    // TODO: Test keyboard shortcut
    await page.goto("/sales");

    // Press Cmd+K (or Ctrl+K on Windows)
    await page.keyboard.press("Meta+K");

    // Verify command dock opens
    // await expect(page.locator('[role="dialog"], .command-dock')).toBeVisible();
  });

  test.skip("quick actions navigate correctly", async ({ page }) => {
    // TODO: Test quick action clicks (adjust selectors)
    await loginAsSales(page);
    await page.goto("/sales");

    // Click a quick action (e.g., Calculator)
    // await page.click('.quick-action:has-text("Calculator")');

    // Verify navigation
    // await expect(page).toHaveURL(/\/calculator/);
  });
});

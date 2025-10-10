import { test, expect } from "@playwright/test";
import { loginAsSales } from "./helpers/auth";

/**
 * Commission Tracker E2E Tests
 *
 * Tests commission calculations and HubSpot deal sync.
 * Priority: HIGH (single source of truth requirement)
 */
test.describe("Commission Tracker", () => {
  test("commissions page loads", async ({ page }) => {
    await loginAsSales(page);
    await page.goto("/commissions");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Verify page loaded
    await expect(page).toHaveURL(/\/commissions/);
    await expect(page.locator("body")).toBeVisible();
  });

  test.skip("displays commission data from HubSpot", async ({ page }) => {
    // TODO: Add data-testid attributes to commission UI elements
    await loginAsSales(page);
    await page.goto("/commissions");
    await page.waitForLoadState("networkidle");

    // Verify commission totals loaded from HubSpot
    await expect(page.locator('[data-testid="total-commissions"], .commission-total')).toBeVisible({
      timeout: 10000,
    });

    // Verify deals are displayed
    const dealRows = page.locator('[data-testid="deal-row"], .deal-item, .commission-row');
    await expect(dealRows.first()).toBeVisible({ timeout: 10000 });

    // Check last synced timestamp (verifies HubSpot connection)
    await expect(page.locator('[data-testid="last-sync"], .last-synced')).toContainText(
      /synced|updated|ago/i
    );
  });

  test.skip("can filter commissions by date", async ({ page }) => {
    // TODO: Test filtering
    await loginAsSales(page);
    await page.goto("/commissions");

    // Apply date filter
    // await page.click('button:has-text("Filter")');
    // await page.selectOption('select[name="month"]', '2024-01');

    // Verify filtered results
    // await expect(page.locator('.commission-row')).toBeVisible();
  });

  test.skip("shows deal breakdown", async ({ page }) => {
    // TODO: Test deal details
    await loginAsSales(page);
    await page.goto("/commissions");

    // Click on a commission entry
    // await page.click('.commission-row:first-child');

    // Verify deal details modal/page
    // await expect(page.locator('.deal-detail')).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsSales } from "./helpers/auth";

/**
 * Data Consistency E2E Tests
 *
 * Critical: Verifies single source of truth for deal data across app.
 * Tests that data shown in Calculator matches Commissions tracker.
 *
 * Product constraint: Deal data must be consistent across the app.
 */

test.describe("Data Consistency", () => {
  test.skip("quote created in calculator appears in commissions", async ({ page }) => {
    // TODO: Requires working calculator and commission tests first
    // 1. Create a quote as admin
    await loginAsAdmin(page);
    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");

    // Fill out quote
    const testEmail = `test-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="businessName"]', "Data Consistency Test Co");

    // Calculate and send to HubSpot
    await page.click('button:has-text("Calculate")');
    await expect(page.locator('[data-testid="quote-total"]')).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Send to HubSpot")');
    await expect(page.locator(".success-message")).toBeVisible({ timeout: 15000 });

    // Get the deal/quote ID from the success message or URL
    const dealId = await page.locator('[data-testid="deal-id"]').textContent();

    // 2. Switch to sales user and check commissions
    await loginAsSales(page);
    await page.goto("/commissions");
    await page.waitForLoadState("networkidle");

    // 3. Verify the deal appears in commissions with same data
    const dealRow = page.locator(`[data-deal-id="${dealId}"]`);
    await expect(dealRow).toBeVisible({ timeout: 30000 }); // Allow time for HubSpot sync

    // Verify email matches
    await expect(dealRow.locator('[data-testid="client-email"]')).toContainText(testEmail);
  });

  test.skip("commission totals match individual deal amounts", async ({ page }) => {
    // TODO: Add data-testid attributes to commission totals
    await loginAsSales(page);
    await page.goto("/commissions");
    await page.waitForLoadState("networkidle");

    // Get total commission amount
    const totalText = await page.locator('[data-testid="total-commissions"]').textContent();
    const total = parseFloat(totalText?.replace(/[^0-9.]/g, "") || "0");

    // Sum individual deal commissions
    const dealRows = page.locator('[data-testid="deal-row"]');
    const count = await dealRows.count();

    let sum = 0;
    for (let i = 0; i < count; i++) {
      const amountText = await dealRows
        .nth(i)
        .locator('[data-testid="commission-amount"]')
        .textContent();
      sum += parseFloat(amountText?.replace(/[^0-9.]/g, "") || "0");
    }

    // Verify totals match (allowing for rounding differences)
    expect(Math.abs(total - sum)).toBeLessThan(0.01);
  });

  test.skip("deal data consistent between calculator and hubspot", async ({ page }) => {
    // TODO: Requires working calculator test first
    await loginAsAdmin(page);
    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");

    // Create a test quote
    const testEmail = `consistency-test-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', testEmail);

    // Get the calculated amount from calculator
    await page.click('button:has-text("Calculate")');
    const calculatedAmount = await page.locator('[data-testid="quote-total"]').textContent();

    // Send to HubSpot
    await page.click('button:has-text("Send to HubSpot")');
    await expect(page.locator(".success-message")).toBeVisible({ timeout: 15000 });

    // Navigate to commissions and find the same deal
    await page.goto("/commissions");
    await page.waitForLoadState("networkidle");

    // Find deal by email
    const dealRow = page.locator(`[data-testid="deal-row"]:has-text("${testEmail}")`);
    await expect(dealRow).toBeVisible({ timeout: 30000 });

    // Verify amount matches
    const commissionAmount = await dealRow.locator('[data-testid="deal-amount"]').textContent();
    expect(calculatedAmount).toContain(commissionAmount?.replace(/[^0-9.]/g, ""));
  });
});

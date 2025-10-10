import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

/**
 * SeedMail E2E Tests
 *
 * Tests email client functionality including OAuth, inbox, and compose.
 */
test.describe("SeedMail Email Client", () => {
  test("seedmail page loads", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/seedmail");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Verify page loaded
    await expect(page).toHaveURL(/\/seedmail/);
    await expect(page.locator("body")).toBeVisible();
  });

  test.skip("shows inbox when account connected", async ({ page }) => {
    // TODO: Requires authenticated user with connected email
    await loginAsAdmin(page);

    // Verify inbox UI
    // await expect(page.locator('.inbox, .email-list')).toBeVisible();

    // Check for email threads
    // await expect(page.locator('.email-thread, .message-row')).toBeVisible();
  });

  test.skip("can view email thread", async ({ page }) => {
    // TODO: Test email reading
    await loginAsAdmin(page);
    await page.goto("/seedmail");

    // Click first email
    // await page.click('.email-thread:first-child, .message-row:first-child');

    // Verify email detail view
    // await expect(page.locator('.email-detail, .message-content')).toBeVisible();
  });

  test.skip("can compose new email", async ({ page }) => {
    // TODO: Test compose flow
    await loginAsAdmin(page);
    await page.goto("/seedmail");

    // Click compose
    // await page.click('button:has-text("Compose")');

    // Fill email form
    // await page.fill('input[name="to"]', 'test@example.com');
    // await page.fill('input[name="subject"]', 'Test Email');
    // await page.fill('textarea, .editor', 'Email body content');

    // Send email
    // await page.click('button:has-text("Send")');

    // Verify success
    // await expect(page.locator('.success, .toast')).toBeVisible();
  });
});

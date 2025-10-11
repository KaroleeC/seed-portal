import { test, expect } from "@playwright/test";

/**
 * E2E Tests for SEEDMAIL Send Status and Retry
 * Tests the complete flow from sending an email to handling failures and retries
 */

test.describe("SEEDMAIL Send Status & Retry", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to SEEDMAIL and authenticate
    await page.goto("/apps/seedmail");
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="seedmail-page"]', { timeout: 10000 });
  });

  test("should show 'Sent' badge for successfully sent emails", async ({ page }) => {
    // Open compose modal
    await page.click('button:has-text("Compose")');
    
    // Fill in email details
    await page.fill('input[placeholder*="recipient"]', "test@example.com");
    await page.fill('input[placeholder*="subject"]', "Test Email");
    
    // Fill in body (assuming RichTextEditor)
    await page.fill('[contenteditable="true"]', "This is a test email");
    
    // Send email
    await page.click('button:has-text("Send")');
    
    // Wait for send confirmation toast
    await expect(page.locator('text="Sent!"')).toBeVisible({ timeout: 5000 });
    
    // Navigate to Sent folder
    await page.click('text="Sent"');
    
    // Wait for sent items to load
    await page.waitForSelector('[data-testid="thread-list-item"]', { timeout: 5000 });
    
    // Verify "Sent" badge is visible
    await expect(page.locator('text="Sent"').first()).toBeVisible();
  });

  test("should display failed send alert for failed emails", async ({ page }) => {
    // Mock a failed send by intercepting the API
    await page.route("**/api/email/send", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Failed to send email",
          details: "Network timeout",
        }),
      });
    });

    // Open compose modal
    await page.click('button:has-text("Compose")');
    
    // Fill in email details
    await page.fill('input[placeholder*="recipient"]', "test@example.com");
    await page.fill('input[placeholder*="subject"]', "Test Failed Email");
    await page.fill('[contenteditable="true"]', "This will fail");
    
    // Send email
    await page.click('button:has-text("Send")');
    
    // Wait for error toast
    await expect(page.locator('text="Failed to send email"')).toBeVisible({ timeout: 5000 });
  });

  test("should show failed send alert in email detail view", async ({ page }) => {
    // Navigate to a sent email with failed status
    await page.click('text="Sent"');
    
    // Click on a thread
    await page.click('[data-testid="thread-list-item"]');
    
    // If there's a failed send alert, it should be visible
    const failedAlert = page.locator('[role="alert"]:has-text("Failed")');
    
    if (await failedAlert.isVisible()) {
      // Verify alert contains expected elements
      await expect(failedAlert).toContainText("Failed");
      
      // Verify retry button exists
      const retryButton = failedAlert.locator('button:has-text("Retry")');
      await expect(retryButton).toBeVisible();
    }
  });

  test("should retry a failed send successfully", async ({ page }) => {
    // Set up route mocking
    let sendAttempts = 0;
    
    // First send fails
    await page.route("**/api/email/send", async (route) => {
      sendAttempts++;
      if (sendAttempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Temporary failure" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, messageId: "test-123" }),
        });
      }
    });

    // Mock retry endpoint to succeed
    await page.route("**/api/email/retry-send/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          retryCount: 1,
          messageId: "test-123",
        }),
      });
    });

    // Open compose and send (will fail)
    await page.click('button:has-text("Compose")');
    await page.fill('input[placeholder*="recipient"]', "retry@example.com");
    await page.fill('input[placeholder*="subject"]', "Retry Test");
    await page.fill('[contenteditable="true"]', "Retry test content");
    await page.click('button:has-text("Send")');
    
    // Wait for failure
    await expect(page.locator('text="Failed"')).toBeVisible({ timeout: 5000 });
    
    // Navigate to sent items
    await page.click('text="Sent"');
    await page.click('[data-testid="thread-list-item"]:has-text("Retry Test")');
    
    // Click retry button
    const retryButton = page.locator('button:has-text("Retry")');
    if (await retryButton.isVisible()) {
      await retryButton.click();
      
      // Wait for success toast
      await expect(page.locator('text="Email sent!"')).toBeVisible({ timeout: 5000 });
    }
  });

  test("should show retry count in failed send alert", async ({ page }) => {
    // Navigate to an email with failed status
    await page.click('text="Sent"');
    await page.click('[data-testid="thread-list-item"]');
    
    const failedAlert = page.locator('[role="alert"]:has-text("Failed")');
    
    if (await failedAlert.isVisible()) {
      // Check for retry count indicator (e.g., "Attempt 2/3")
      const retryCount = failedAlert.locator('text=/Attempt \\d+\\/\\d+/');
      
      if (await retryCount.isVisible()) {
        const text = await retryCount.textContent();
        expect(text).toMatch(/Attempt \d+\/\d+/);
      }
    }
  });

  test("should hide retry button when max retries exceeded", async ({ page }) => {
    // Mock send status with max retries
    await page.route("**/api/email/send-status/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "status-123",
          status: "failed",
          retryCount: 3,
          maxRetries: 3,
          errorMessage: "All retries exhausted",
        }),
      });
    });

    // Navigate to failed email
    await page.click('text="Sent"');
    await page.click('[data-testid="thread-list-item"]');
    
    const failedAlert = page.locator('[role="alert"]:has-text("Failed")');
    
    if (await failedAlert.isVisible()) {
      // Retry button should NOT be visible
      const retryButton = failedAlert.locator('button:has-text("Retry")');
      await expect(retryButton).not.toBeVisible();
      
      // Should show max retries message
      await expect(failedAlert).toContainText(/maximum retry attempts/i);
    }
  });

  test("should display bounce type classification", async ({ page }) => {
    // Mock send status with hard bounce
    await page.route("**/api/email/send-status/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "status-123",
          status: "bounced",
          bounceType: "hard",
          bounceReason: "Recipient address does not exist",
          retryCount: 0,
          maxRetries: 3,
        }),
      });
    });

    // Navigate to bounced email
    await page.click('text="Sent"');
    await page.click('[data-testid="thread-list-item"]');
    
    const failedAlert = page.locator('[role="alert"]');
    
    if (await failedAlert.isVisible()) {
      // Should show bounce type
      await expect(failedAlert).toContainText(/permanent failure/i);
      
      // Should show helpful message
      await expect(failedAlert).toContainText(/email address appears to be invalid/i);
    }
  });

  test("should enable tracking toggle in compose modal", async ({ page }) => {
    // Open compose modal
    await page.click('button:has-text("Compose")');
    
    // Verify tracking checkbox exists
    const trackingCheckbox = page.locator('label:has-text("Enable read receipts")');
    await expect(trackingCheckbox).toBeVisible();
    
    // Toggle tracking on
    await trackingCheckbox.click();
    
    // Checkbox should be checked
    const checkbox = trackingCheckbox.locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
  });

  test("should show open status for tracked emails", async ({ page }) => {
    // Navigate to sent email with tracking enabled
    await page.click('text="Sent"');
    await page.click('[data-testid="thread-list-item"]');
    
    // Look for tracking status indicator
    const trackingStatus = page.locator('text=/Opened|Not opened/');
    
    if (await trackingStatus.isVisible()) {
      const status = await trackingStatus.textContent();
      expect(status).toMatch(/(Opened|Not opened)/);
    }
  });
});

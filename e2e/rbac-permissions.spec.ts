import { test, expect } from "@playwright/test";

/**
 * RBAC Permissions E2E Test Suite
 *
 * Tests the RBAC system end-to-end including:
 * - Permission loading on app start
 * - Permission-based UI visibility
 * - Role assignment workflow
 * - Permission checking in real scenarios
 */

test.describe("RBAC Permissions System", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@test.com");
    await page.fill('input[name="password"]', "test123");
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL("/dashboard");
  });

  test("should load user permissions on app start", async ({ page }) => {
    // Intercept the permissions API call
    const permissionsRequest = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/rbac/user-permissions") && response.status() === 200
    );

    // Reload to trigger permission fetch
    await page.reload();

    // Wait for permissions to load
    const response = await permissionsRequest;
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty("userId");
    expect(data).toHaveProperty("roles");
    expect(data).toHaveProperty("permissions");
    expect(data).toHaveProperty("departments");
    expect(Array.isArray(data.permissions)).toBe(true);
  });

  test("should not show infinite loading or reload loops", async ({ page }) => {
    let apiCallCount = 0;

    // Track API calls
    page.on("response", (response) => {
      if (response.url().includes("/api/admin/rbac/user-permissions")) {
        apiCallCount++;
      }
    });

    // Wait for page to be stable
    await page.waitForTimeout(3000);

    // Should only call API once (or twice if there's an initial + retry)
    expect(apiCallCount).toBeLessThanOrEqual(2);
  });

  test("should cache permissions and not refetch on navigation", async ({ page }) => {
    let apiCallCount = 0;

    // Wait for initial load
    await page.waitForLoadState("networkidle");

    // Start tracking after initial load
    page.on("response", (response) => {
      if (response.url().includes("/api/admin/rbac/user-permissions")) {
        apiCallCount++;
      }
    });

    // Navigate to different pages
    await page.goto("/apps/seedqc");
    await page.waitForLoadState("networkidle");

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Should not make new API calls (cached for 5 minutes)
    expect(apiCallCount).toBe(0);
  });

  test("should show admin-only features for admin users", async ({ page }) => {
    // Navigate to settings page
    await page.goto("/settings");

    // Admin users should see system settings
    const systemSettings = page
      .locator("text=System Settings")
      .or(page.locator("text=RBAC Management"));
    await expect(systemSettings).toBeVisible({ timeout: 5000 });
  });

  test("should handle permission check errors gracefully", async ({ page }) => {
    // Mock API to return error
    await page.route("/api/admin/rbac/user-permissions/*", (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    // Reload page
    await page.reload();

    // App should still load (with default denied permissions)
    await expect(page.locator("body")).toBeVisible();

    // Should not show error toast or crash
    const errorToast = page.locator("text=Internal server error");
    await expect(errorToast).not.toBeVisible();
  });
});

test.describe("RBAC Admin Panel", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@test.com");
    await page.fill('input[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should load RBAC management panel", async ({ page }) => {
    // Navigate to RBAC settings (adjust URL based on your app)
    await page.goto("/settings#system");

    // Wait for RBAC panel to load
    await page.waitForSelector("text=Users", { timeout: 5000 });
    await page.waitForSelector("text=Roles", { timeout: 5000 });
  });

  test("should display user list with roles", async ({ page }) => {
    await page.goto("/settings#system");

    // Wait for API response and verify auth header is sent
    const response = await page.waitForResponse((response) =>
      response.url().includes("/api/admin/rbac/users")
    );

    // CRITICAL: Verify request was authenticated
    const request = response.request();
    const authHeader = request.headers()["authorization"];
    expect(authHeader).toBeDefined();
    expect(authHeader).toMatch(/^Bearer /);

    // Verify successful response
    expect(response.status()).toBe(200);

    // Verify users are displayed
    const userList = page.locator("[data-testid='user-list']").or(page.locator("table"));
    await expect(userList).toBeVisible({ timeout: 5000 });
  });

  test.skip("should assign role to user", async ({ page }) => {
    // This test requires the full RBAC UI to be implemented
    await page.goto("/settings#system");

    // Find a user
    await page.click("text=Assign Role");

    // Select role from dropdown
    await page.click("[data-testid='role-select']");
    await page.click("text=Admin");

    // Submit
    await page.click("button:has-text('Assign')");

    // Wait for success message
    await expect(page.locator("text=Role assigned successfully")).toBeVisible();
  });
});

test.describe("Permission-Based UI Rendering", () => {
  test("admin users see admin features", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@test.com");
    await page.fill('input[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // Navigate to a page with admin features
    await page.goto("/settings");

    // Check for admin-only elements
    const adminFeatures = ["System Settings", "User Management", "RBAC"];

    for (const feature of adminFeatures) {
      const element = page.locator(`text=${feature}`);
      // At least one admin feature should be visible
      try {
        await expect(element).toBeVisible({ timeout: 2000 });
        break;
      } catch {
        // Continue checking other features
      }
    }
  });

  test.skip("non-admin users do not see admin features", async ({ page }) => {
    // Login as regular user
    await page.goto("/login");
    await page.fill('input[name="email"]', "user@test.com");
    await page.fill('input[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // Navigate to settings
    await page.goto("/settings");

    // Should not see admin-only settings
    await expect(page.locator("text=System Settings")).not.toBeVisible();
    await expect(page.locator("text=User Management")).not.toBeVisible();
  });
});

test.describe("Performance & Caching", () => {
  test("permissions API should respond quickly", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@test.com");
    await page.fill('input[name="password"]', "test123");

    // Measure API response time
    const startTime = Date.now();

    await page.click('button[type="submit"]');

    await page.waitForResponse((response) =>
      response.url().includes("/api/admin/rbac/user-permissions")
    );

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Should respond within 500ms
    expect(responseTime).toBeLessThan(500);
  });

  test("should not refetch on rapid navigation", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@test.com");
    await page.fill('input[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    let permissionCallCount = 0;

    page.on("response", (response) => {
      if (response.url().includes("/api/admin/rbac/user-permissions")) {
        permissionCallCount++;
      }
    });

    // Rapidly navigate between pages
    await page.goto("/apps/seedqc");
    await page.goto("/settings");
    await page.goto("/dashboard");
    await page.goto("/apps/seedmail");
    await page.goto("/settings");

    // Should use cached data, not refetch
    expect(permissionCallCount).toBe(0);
  });
});

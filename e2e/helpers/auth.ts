import { Page, expect } from "@playwright/test";

/**
 * Authentication Helpers for E2E Tests
 *
 * Uses E2E test bypass header to authenticate without real tokens.
 * The backend recognizes x-e2e-test-user header in dev/test mode.
 */

/**
 * Set E2E test context for bypassing auth
 * Sets a special header that the backend will recognize
 */
async function setE2ETestUser(page: Page, email: string, url: string) {
  // Set extra HTTP headers for all requests from this page
  await page.setExtraHTTPHeaders({
    "x-e2e-test-user": email,
  });

  // Navigate to the target URL first
  await page.goto(url);

  // Then create a mock session in localStorage for client-side checks
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

    // Set in multiple possible locations
    localStorage.setItem("supabase.auth.token", JSON.stringify(mockSession));
    localStorage.setItem("sb-localhost-3000-auth-token", JSON.stringify(mockSession));
  }, email);

  // Reload to apply the session
  await page.reload({ waitUntil: "networkidle" });
}

/**
 * Login as Admin user
 * Default dashboard: /admin
 */
export async function loginAsAdmin(page: Page) {
  const email = process.env.TEST_ADMIN_EMAIL || "test-admin@seed.com";

  // Set E2E test user context and navigate
  await setE2ETestUser(page, email, "/admin");
}

/**
 * Login as Sales user
 * Default dashboard: /sales
 */
export async function loginAsSales(page: Page) {
  const email = process.env.TEST_SALES_EMAIL || "test-sales@seed.com";

  // Set E2E test user context and navigate
  await setE2ETestUser(page, email, "/sales");
}

/**
 * Login as Service user
 * Default dashboard: /service
 */
export async function loginAsService(page: Page) {
  const email = process.env.TEST_SERVICE_EMAIL || "test-service@seed.com";

  // Set E2E test user context and navigate
  await setE2ETestUser(page, email, "/service");
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  // Clear Supabase session from localStorage
  await page.evaluate(() => {
    localStorage.removeItem("supabase.auth.token");
    localStorage.removeItem("sb-localhost-auth-token");
  });

  // Navigate to logout endpoint
  await page.goto("/api/auth/logout");
  await page.waitForURL("/", { timeout: 5000 });

  // Verify logged out (Google sign-in button visible)
  await expect(page.locator('button:has-text("Sign in with Google")')).toBeVisible({
    timeout: 5000,
  });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check for Google sign-in button (inverse check)
  const googleSignInVisible = await page
    .locator('button:has-text("Sign in with Google")')
    .isVisible()
    .catch(() => false);
  return !googleSignInVisible;
}

/**
 * Get authentication state from localStorage/cookies
 */
export async function getAuthState(page: Page): Promise<any> {
  return await page.evaluate(() => {
    // Check localStorage for Supabase session
    const supabaseSession = localStorage.getItem("supabase.auth.token");
    return supabaseSession ? JSON.parse(supabaseSession) : null;
  });
}

/**
 * Wait for API to be ready
 */
export async function waitForApiReady(page: Page) {
  // Poll health endpoint
  let retries = 30;
  while (retries > 0) {
    try {
      const response = await page.request.get("http://127.0.0.1:5001/health");
      if (response.ok()) {
        return;
      }
    } catch (error) {
      // API not ready yet
    }
    await page.waitForTimeout(1000);
    retries--;
  }
  throw new Error("API failed to become ready within 30 seconds");
}

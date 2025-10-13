import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Testing Configuration
 *
 * Tests critical user flows across the application.
 * Runs against local dev server (web:3000, api:5001).
 */
export default defineConfig({
  testDir: "./e2e",

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ["html"], // HTML report for local development
    ["list"], // List reporter for terminal output
  ],

  // Shared settings for all tests
  use: {
    // Base URL for tests
    baseURL: "http://localhost:3000",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "retain-on-failure",

    // Viewport size
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // Mobile viewports
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Run local dev servers before starting the tests
  // Start both the Web (Vite) and API servers via Doppler
  // Skip if SKIP_WEBSERVER=1 is set (for testing with existing servers)
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: "doppler run --project seed-portal-web --config dev -- npm run dev:web",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
        {
          command:
            "doppler run --project seed-portal-api --config dev -- sh -c 'PORT_OVERRIDE=5001 USE_SUPABASE_AUTH=true SKIP_EMAIL_RETRY_SCHEDULER=true npm run dev:api'",
          url: "http://127.0.0.1:5001/health",
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      ],
});

/**
 * Vitest Configuration for Integration Tests
 *
 * Separate config for tests that require a database
 */

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "integration",
    globals: true,
    environment: "node", // Node environment for API tests
    globalSetup: ["./test/global-setup.ts"],
    include: ["**/*.integration.test.{ts,tsx}"],
    testTimeout: 30000, // Longer timeout for database operations
    hookTimeout: 30000,
    teardownTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/**", "dist/**", "**/*.config.*", "**/*.test.*", "**/test/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@server": path.resolve(__dirname, "./server"),
      "@test": path.resolve(__dirname, "./test"),
    },
  },
});

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Response Logging Middleware Tests
 *
 * Verifies that heavy response logging is properly gated behind DEBUG_HTTP=1
 * and disabled in production environments.
 */
describe("Response Logging Middleware", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("Production Safety", () => {
    it("shouldLogResponses returns false in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.DEBUG_HTTP = "1";

      const { shouldLogResponses } = await import("../config/environment");

      expect(shouldLogResponses()).toBe(false);
    });

    it("shouldDebugRequests returns false in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.DEBUG_HTTP = "1";

      const { shouldDebugRequests } = await import("../config/environment");

      expect(shouldDebugRequests()).toBe(false);
    });
  });

  describe("Development Opt-in", () => {
    it("requires DEBUG_HTTP=1 to enable logging in development", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.DEBUG_HTTP;

      const { shouldLogResponses } = await import("../config/environment");

      expect(shouldLogResponses()).toBe(false);
    });

    it("enables logging when DEBUG_HTTP=1 in development", async () => {
      process.env.NODE_ENV = "development";
      process.env.DEBUG_HTTP = "1";

      const { shouldLogResponses } = await import("../config/environment");

      expect(shouldLogResponses()).toBe(true);
    });
  });

  describe("Middleware Integration", () => {
    it("verifies server/index.ts imports shared config", async () => {
      const fs = await import("fs");
      const indexSource = fs.readFileSync(require.resolve("../index.ts"), "utf-8");

      // Verify imports from shared config
      expect(indexSource).toContain('from "./config/environment"');
      expect(indexSource).toContain("shouldLogResponses");
      expect(indexSource).toContain("shouldDebugRequests");

      // Verify uses shared config, not direct process.env checks
      expect(indexSource).toContain("if (shouldLogResponses())");
      expect(indexSource).toContain("if (shouldDebugRequests())");
    });

    it("verifies no unguarded DEBUG_HTTP checks remain", async () => {
      const fs = await import("fs");
      const indexSource = fs.readFileSync(require.resolve("../index.ts"), "utf-8");

      // Count remaining direct DEBUG_HTTP checks (should be 0 in conditional logic)
      // Note: Comments and strings don't count
      const directChecks = indexSource.match(/if\s*\(\s*process\.env\.DEBUG_HTTP/g);

      expect(directChecks).toBeNull();
    });

    it("verifies middleware is conditionally registered", async () => {
      const fs = await import("fs");
      const indexSource = fs.readFileSync(require.resolve("../index.ts"), "utf-8");

      // Verify the logging middleware is inside a conditional block
      const hasConditional = indexSource.includes("if (shouldLogResponses())");
      expect(hasConditional).toBe(true);

      // Verify it logs when enabled
      const hasEnabledMessage = indexSource.includes("Heavy response logging ENABLED");
      expect(hasEnabledMessage).toBe(true);

      // Verify it logs when disabled
      const hasDisabledMessage = indexSource.includes("Response logging disabled");
      expect(hasDisabledMessage).toBe(true);
    });
  });

  describe("Performance Impact", () => {
    it("documents performance cost in comments", async () => {
      const fs = await import("fs");
      const indexSource = fs.readFileSync(require.resolve("../index.ts"), "utf-8");

      // Verify documentation of performance impact
      expect(indexSource).toContain("Heavy response logging");
      expect(indexSource).toContain("expensive operation");
    });

    it("shared config documents performance impact", async () => {
      const fs = await import("fs");
      const envSource = fs.readFileSync(require.resolve("../config/environment.ts"), "utf-8");

      // Verify documentation in shared config
      expect(envSource).toContain("Performance impact");
      expect(envSource).toContain("JSON.stringify");
    });
  });

  describe("DRY Principle Compliance", () => {
    it("uses single source of truth for debug flags", async () => {
      const { shouldLogResponses, shouldDebugRequests, DEBUG_HTTP_ENABLED } = await import(
        "../config/environment"
      );

      // All functions should reference the same underlying flag
      const result1 = shouldLogResponses();
      const result2 = shouldDebugRequests();

      // Both should be consistent (either both true or both false for DEBUG)
      expect(result1).toBe(DEBUG_HTTP_ENABLED && process.env.NODE_ENV !== "production");
      expect(result2).toBe(DEBUG_HTTP_ENABLED);
    });

    it("environment module exports all needed constants", async () => {
      const env = await import("../config/environment");

      expect(env.NODE_ENV).toBeDefined();
      expect(env.IS_PRODUCTION).toBeDefined();
      expect(env.IS_DEVELOPMENT).toBeDefined();
      expect(env.IS_TEST).toBeDefined();
      expect(env.DEBUG_HTTP_ENABLED).toBeDefined();
      expect(env.shouldLogResponses).toBeDefined();
      expect(env.shouldDebugRequests).toBeDefined();
    });
  });
});

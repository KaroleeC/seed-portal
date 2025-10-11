import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Environment Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to re-evaluate environment
    vi.resetModules();
    // Create clean env copy
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe("shouldLogResponses()", () => {
    it("returns false in production regardless of DEBUG_HTTP", async () => {
      process.env.NODE_ENV = "production";
      process.env.DEBUG_HTTP = "1";

      const { shouldLogResponses } = await import("../environment");
      expect(shouldLogResponses()).toBe(false);
    });

    it("returns false in production without DEBUG_HTTP", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.DEBUG_HTTP;

      const { shouldLogResponses } = await import("../environment");
      expect(shouldLogResponses()).toBe(false);
    });

    it("returns true in development with DEBUG_HTTP=1", async () => {
      process.env.NODE_ENV = "development";
      process.env.DEBUG_HTTP = "1";

      const { shouldLogResponses } = await import("../environment");
      expect(shouldLogResponses()).toBe(true);
    });

    it("returns false in development without DEBUG_HTTP", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.DEBUG_HTTP;

      const { shouldLogResponses } = await import("../environment");
      expect(shouldLogResponses()).toBe(false);
    });

    it("returns false in development with DEBUG_HTTP=0", async () => {
      process.env.NODE_ENV = "development";
      process.env.DEBUG_HTTP = "0";

      const { shouldLogResponses } = await import("../environment");
      expect(shouldLogResponses()).toBe(false);
    });

    it("returns false in test environment with DEBUG_HTTP=1", async () => {
      process.env.NODE_ENV = "test";
      process.env.DEBUG_HTTP = "1";

      const { shouldLogResponses } = await import("../environment");
      expect(shouldLogResponses()).toBe(false);
    });
  });

  describe("shouldDebugRequests()", () => {
    it("returns false in production regardless of DEBUG_HTTP", async () => {
      process.env.NODE_ENV = "production";
      process.env.DEBUG_HTTP = "1";

      const { shouldDebugRequests } = await import("../environment");
      expect(shouldDebugRequests()).toBe(false);
    });

    it("returns true in development with DEBUG_HTTP=1", async () => {
      process.env.NODE_ENV = "development";
      process.env.DEBUG_HTTP = "1";

      const { shouldDebugRequests } = await import("../environment");
      expect(shouldDebugRequests()).toBe(true);
    });

    it("returns false in development without DEBUG_HTTP", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.DEBUG_HTTP;

      const { shouldDebugRequests } = await import("../environment");
      expect(shouldDebugRequests()).toBe(false);
    });
  });

  describe("Environment Constants", () => {
    it("IS_PRODUCTION is true when NODE_ENV=production", async () => {
      process.env.NODE_ENV = "production";

      const { IS_PRODUCTION } = await import("../environment");
      expect(IS_PRODUCTION).toBe(true);
    });

    it("IS_PRODUCTION is false in development", async () => {
      process.env.NODE_ENV = "development";

      const { IS_PRODUCTION } = await import("../environment");
      expect(IS_PRODUCTION).toBe(false);
    });

    it("IS_DEVELOPMENT is true when NODE_ENV=development", async () => {
      process.env.NODE_ENV = "development";

      const { IS_DEVELOPMENT } = await import("../environment");
      expect(IS_DEVELOPMENT).toBe(true);
    });

    it("IS_TEST is true when NODE_ENV=test", async () => {
      process.env.NODE_ENV = "test";

      const { IS_TEST } = await import("../environment");
      expect(IS_TEST).toBe(true);
    });

    it("DEBUG_HTTP_ENABLED respects production safety", async () => {
      process.env.NODE_ENV = "production";
      process.env.DEBUG_HTTP = "1";

      const { DEBUG_HTTP_ENABLED } = await import("../environment");
      expect(DEBUG_HTTP_ENABLED).toBe(false);
    });
  });

  describe("Performance Safety", () => {
    it("prevents heavy logging in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.DEBUG_HTTP = "1";
      process.env.VERBOSE = "1";

      const { shouldLogResponses, IS_PRODUCTION } = await import("../environment");
      
      expect(IS_PRODUCTION).toBe(true);
      expect(shouldLogResponses()).toBe(false);
    });

    it("requires explicit opt-in in development", async () => {
      process.env.NODE_ENV = "development";
      // No DEBUG_HTTP set

      const { shouldLogResponses, shouldDebugRequests } = await import("../environment");
      
      expect(shouldLogResponses()).toBe(false);
      expect(shouldDebugRequests()).toBe(false);
    });
  });
});

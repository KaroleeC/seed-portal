import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";
import { BUILD_OUTPUT_PATH, ASSETS_PATH } from "../constants";

describe("Asset Path Alignment", () => {
  const expectedBuildPath = path.resolve(process.cwd(), "dist", "public");
  const expectedAssetsPath = path.join(expectedBuildPath, "assets");

  describe("Constants", () => {
    it("BUILD_OUTPUT_PATH points to canonical dist/public path", () => {
      expect(BUILD_OUTPUT_PATH).toBe(expectedBuildPath);
    });

    it("ASSETS_PATH points to dist/public/assets", () => {
      expect(ASSETS_PATH).toBe(expectedAssetsPath);
    });

    it("ASSETS_PATH is a subdirectory of BUILD_OUTPUT_PATH", () => {
      expect(ASSETS_PATH).toContain(BUILD_OUTPUT_PATH);
      expect(path.relative(BUILD_OUTPUT_PATH, ASSETS_PATH)).toBe("assets");
    });
  });

  describe("Vite Static Serving", () => {
    it("serveStatic references BUILD_OUTPUT_PATH from constants", () => {
      // Read the source file to verify it imports and uses BUILD_OUTPUT_PATH
      const fs = require("fs");
      const viteSource = fs.readFileSync(path.join(process.cwd(), "server", "vite.ts"), "utf-8");

      // Verify it imports BUILD_OUTPUT_PATH from constants
      expect(viteSource).toContain('import { BUILD_OUTPUT_PATH } from "./constants"');

      // Verify it uses BUILD_OUTPUT_PATH (not hardcoded paths)
      expect(viteSource).toContain("BUILD_OUTPUT_PATH");

      // Verify it doesn't use the old hardcoded paths
      expect(viteSource).not.toContain('path.resolve(import.meta.dirname, "public")');
    });
  });

  describe("Asset Optimization Middleware", () => {
    it("servePrecompressed uses BUILD_OUTPUT_PATH for brotli files", async () => {
      const { servePrecompressed } = await import("../middleware/asset-optimization");
      const mockReq = {
        headers: { "accept-encoding": "br" },
        url: "/app.js",
      } as any;
      const mockRes = {
        setHeader: vi.fn(),
      } as any;
      const mockNext = vi.fn();

      const fs = await import("fs");
      const { promises } = fs;
      const accessSpy = vi.spyOn(promises, "access").mockRejectedValue(new Error("not found"));

      servePrecompressed(mockReq, mockRes, mockNext);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify it tried to access the brotli file at the canonical path
      expect(accessSpy).toHaveBeenCalledWith(
        expect.stringContaining(path.join("dist", "public", "/app.js.br"))
      );

      accessSpy.mockRestore();
    });

    it("servePrecompressed uses BUILD_OUTPUT_PATH for gzip files", async () => {
      const { servePrecompressed } = await import("../middleware/asset-optimization");
      const mockReq = {
        headers: { "accept-encoding": "gzip" },
        url: "/app.js",
      } as any;
      const mockRes = {
        setHeader: vi.fn(),
      } as any;
      const mockNext = vi.fn();

      const fs = await import("fs");
      const { promises } = fs;
      const accessSpy = vi.spyOn(promises, "access").mockRejectedValue(new Error("not found"));

      servePrecompressed(mockReq, mockRes, mockNext);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify it tried to access the gzip file at the canonical path
      expect(accessSpy).toHaveBeenCalledWith(
        expect.stringContaining(path.join("dist", "public", "/app.js.gz"))
      );

      accessSpy.mockRestore();
    });
  });

  describe("CDN Service", () => {
    it("CDNService uses ASSETS_PATH from constants", async () => {
      const { cdnService } = await import("../cdn");

      // Access the private assetsPath property via reflection for testing
      const assetsPath = (cdnService as any).assetsPath;

      expect(assetsPath).toBe(ASSETS_PATH);
      expect(assetsPath).toBe(expectedAssetsPath);
    });
  });

  describe("Path Consistency Across Modules", () => {
    it("all modules reference the same canonical build directory", async () => {
      // Import all modules
      const constants = await import("../constants");
      const cdn = await import("../cdn");

      // Verify CDN service uses the constant
      const cdnAssetsPath = (cdn.cdnService as any).assetsPath;
      expect(cdnAssetsPath).toBe(constants.ASSETS_PATH);

      // Verify all paths are derived from the same base
      expect(constants.ASSETS_PATH).toContain(constants.BUILD_OUTPUT_PATH);
      expect(cdnAssetsPath).toContain(constants.BUILD_OUTPUT_PATH);
    });

    it("no module uses legacy client/dist or server/public paths", async () => {
      const constants = await import("../constants");

      // Ensure we're not using old paths
      expect(constants.BUILD_OUTPUT_PATH).not.toContain(path.join("client", "dist"));
      expect(constants.BUILD_OUTPUT_PATH).not.toContain(path.join("server", "public"));
      expect(constants.ASSETS_PATH).not.toContain(path.join("client", "dist"));
      expect(constants.ASSETS_PATH).not.toContain(path.join("server", "public"));

      // Verify we're using the new canonical path
      expect(constants.BUILD_OUTPUT_PATH).toContain(path.join("dist", "public"));
    });
  });
});

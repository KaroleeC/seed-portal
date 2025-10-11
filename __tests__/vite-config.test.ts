import { describe, it, expect } from "vitest";
import path from "path";
import viteConfig from "../vite.config";

describe("Vite Configuration", () => {
  describe("Build-time Precompression", () => {
    it("includes vite-plugin-compression for both gzip and brotli", () => {
      const plugins = viteConfig.plugins || [];

      // Filter out conditional plugins and get actual plugin instances
      const pluginList = plugins.flat();

      // Count compression plugins (we should have 2: gzip and brotli)
      const compressionPlugins = pluginList.filter((p: any) => p && p.name === "vite:compression");

      expect(compressionPlugins.length).toBeGreaterThanOrEqual(2);
    });

    it("compression plugins are configured with correct settings", async () => {
      // Read the vite.config.ts source to verify configuration
      const fs = await import("fs");
      const configSource = fs.readFileSync(path.join(process.cwd(), "vite.config.ts"), "utf-8");

      // Verify gzip configuration
      expect(configSource).toContain('algorithm: "gzip"');
      expect(configSource).toContain('ext: ".gz"');

      // Verify brotli configuration
      expect(configSource).toContain('algorithm: "brotliCompress"');
      expect(configSource).toContain('ext: ".br"');

      // Verify both use shared constants (DRY principle)
      expect(configSource).toContain("threshold: COMPRESSION_THRESHOLD");
      expect(configSource).toContain("filter: COMPRESSIBLE_FILE_PATTERN");

      // Verify it imports compression config
      expect(configSource).toContain('from "./config/compression"');

      // Verify files are not deleted
      expect(configSource).toContain("deleteOriginFile: false");

      // Verify the actual constants have correct values
      const { COMPRESSION_THRESHOLD, COMPRESSIBLE_EXTENSIONS } = await import(
        "../config/compression"
      );
      expect(COMPRESSION_THRESHOLD).toBe(1024);
      expect(COMPRESSIBLE_EXTENSIONS).toContain("js");
      expect(COMPRESSIBLE_EXTENSIONS).toContain("css");
      expect(COMPRESSIBLE_EXTENSIONS).toContain("html");
    });

    it("build output directory is configured correctly", () => {
      const expectedOutDir = path.resolve(process.cwd(), "dist/public");
      expect(viteConfig.build?.outDir).toBe(expectedOutDir);
    });

    it("compression is not duplicate - uses single import", async () => {
      const fs = await import("fs");
      const configSource = fs.readFileSync(path.join(process.cwd(), "vite.config.ts"), "utf-8");

      // Count viteCompression imports (should be exactly 1 - DRY)
      const importMatches = configSource.match(/import\s+viteCompression\s+from/g);
      expect(importMatches).toBeDefined();
      expect(importMatches!.length).toBe(1);
    });
  });

  describe("Plugin Order", () => {
    it("compression plugins run after react plugin", () => {
      const plugins = viteConfig.plugins || [];
      const pluginList = plugins.flat();

      const reactPluginIndex = pluginList.findIndex((p: any) => p && p.name === "vite:react-babel");
      const firstCompressionIndex = pluginList.findIndex(
        (p: any) => p && p.name === "vite:compression"
      );

      // React plugin should come before compression
      expect(reactPluginIndex).toBeGreaterThanOrEqual(0);
      expect(firstCompressionIndex).toBeGreaterThanOrEqual(0);
      expect(firstCompressionIndex).toBeGreaterThan(reactPluginIndex);
    });
  });
});

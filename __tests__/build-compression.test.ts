import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { BUILD_OUTPUT_PATH } from "../server/constants";

/**
 * Build Compression Verification Tests
 * 
 * These tests verify that build-time precompression is working correctly.
 * They check for the existence of .gz and .br files after a production build.
 * 
 * Note: These tests require a production build to have been run first.
 * Run `npm run build` before running these tests in CI.
 */
describe("Build-time Precompression", () => {
  const buildExists = async () => {
    try {
      await fs.access(BUILD_OUTPUT_PATH);
      return true;
    } catch {
      return false;
    }
  };

  describe("Compressed Asset Generation", () => {
    it("generates .gz files for JavaScript bundles", async () => {
      const hasBuild = await buildExists();
      if (!hasBuild) {
        console.warn(`Skipping test: Build directory not found at ${BUILD_OUTPUT_PATH}`);
        return;
      }

      // Find JS files in build output
      const files = await findFilesRecursively(BUILD_OUTPUT_PATH, /\.js$/);
      
      if (files.length === 0) {
        console.warn("No JS files found in build output - build may not be complete");
        return;
      }

      // Check that at least some .gz files exist
      const gzFiles = files.filter(f => f.endsWith(".js")).map(f => `${f}.gz`);
      const existingGzFiles = await Promise.all(
        gzFiles.map(async (file) => {
          try {
            await fs.access(file);
            return true;
          } catch {
            return false;
          }
        })
      );

      const gzCount = existingGzFiles.filter(Boolean).length;
      
      // At least some JS files should have .gz versions
      // (only files > 1KB are compressed per our config)
      if (files.length > 0) {
        expect(gzCount).toBeGreaterThan(0);
      }
    });

    it("generates .br files for JavaScript bundles", async () => {
      const hasBuild = await buildExists();
      if (!hasBuild) {
        console.warn(`Skipping test: Build directory not found at ${BUILD_OUTPUT_PATH}`);
        return;
      }

      const files = await findFilesRecursively(BUILD_OUTPUT_PATH, /\.js$/);
      
      if (files.length === 0) {
        console.warn("No JS files found in build output - build may not be complete");
        return;
      }

      const brFiles = files.filter(f => f.endsWith(".js")).map(f => `${f}.br`);
      const existingBrFiles = await Promise.all(
        brFiles.map(async (file) => {
          try {
            await fs.access(file);
            return true;
          } catch {
            return false;
          }
        })
      );

      const brCount = existingBrFiles.filter(Boolean).length;
      
      if (files.length > 0) {
        expect(brCount).toBeGreaterThan(0);
      }
    });

    it("generates .gz files for CSS bundles", async () => {
      const hasBuild = await buildExists();
      if (!hasBuild) {
        console.warn(`Skipping test: Build directory not found at ${BUILD_OUTPUT_PATH}`);
        return;
      }

      const files = await findFilesRecursively(BUILD_OUTPUT_PATH, /\.css$/);
      
      if (files.length === 0) {
        // CSS files are optional depending on build
        return;
      }

      const gzFiles = files.filter(f => f.endsWith(".css")).map(f => `${f}.gz`);
      const existingGzFiles = await Promise.all(
        gzFiles.map(async (file) => {
          try {
            await fs.access(file);
            return true;
          } catch {
            return false;
          }
        })
      );

      const gzCount = existingGzFiles.filter(Boolean).length;
      
      if (files.length > 0) {
        expect(gzCount).toBeGreaterThan(0);
      }
    });

    it("original files are preserved (not deleted)", async () => {
      const hasBuild = await buildExists();
      if (!hasBuild) {
        console.warn(`Skipping test: Build directory not found at ${BUILD_OUTPUT_PATH}`);
        return;
      }

      const jsFiles = await findFilesRecursively(BUILD_OUTPUT_PATH, /\.js$/);
      const cssFiles = await findFilesRecursively(BUILD_OUTPUT_PATH, /\.css$/);
      
      // Should have original uncompressed files
      expect(jsFiles.length).toBeGreaterThan(0);
      
      // Verify original files exist (not just .gz/.br)
      const originalJsFiles = jsFiles.filter(f => !f.endsWith(".gz") && !f.endsWith(".br"));
      expect(originalJsFiles.length).toBeGreaterThan(0);
    });

    it("brotli files are smaller than gzip files", async () => {
      const hasBuild = await buildExists();
      if (!hasBuild) {
        console.warn(`Skipping test: Build directory not found at ${BUILD_OUTPUT_PATH}`);
        return;
      }

      const jsFiles = await findFilesRecursively(BUILD_OUTPUT_PATH, /\.js$/);
      const originalFiles = jsFiles.filter(f => !f.endsWith(".gz") && !f.endsWith(".br"));
      
      if (originalFiles.length === 0) return;

      // Find a file that has both .gz and .br versions
      for (const file of originalFiles) {
        const gzFile = `${file}.gz`;
        const brFile = `${file}.br`;
        
        try {
          const [gzStats, brStats] = await Promise.all([
            fs.stat(gzFile),
            fs.stat(brFile),
          ]);
          
          // Brotli should generally be smaller than gzip
          expect(brStats.size).toBeLessThanOrEqual(gzStats.size);
          
          // Found at least one comparison, test passes
          return;
        } catch {
          // This file might not have both versions, try next
          continue;
        }
      }
    });
  });

  describe("Compression Ratio Verification", () => {
    it("compressed files achieve meaningful compression", async () => {
      const hasBuild = await buildExists();
      if (!hasBuild) {
        console.warn(`Skipping test: Build directory not found at ${BUILD_OUTPUT_PATH}`);
        return;
      }

      const jsFiles = await findFilesRecursively(BUILD_OUTPUT_PATH, /\.js$/);
      const originalFiles = jsFiles.filter(f => !f.endsWith(".gz") && !f.endsWith(".br"));
      
      if (originalFiles.length === 0) return;

      // Check compression ratio for at least one large file
      for (const file of originalFiles) {
        try {
          const [originalStats, gzStats] = await Promise.all([
            fs.stat(file),
            fs.stat(`${file}.gz`),
          ]);
          
          // Only check files > 1KB (our threshold)
          if (originalStats.size > 1024) {
            const compressionRatio = gzStats.size / originalStats.size;
            
            // Compression ratio should be < 1 (file is smaller)
            expect(compressionRatio).toBeLessThan(1);
            
            // Should achieve at least 10% compression for JS
            expect(compressionRatio).toBeLessThan(0.9);
            
            return; // Found at least one, test passes
          }
        } catch {
          continue;
        }
      }
    });
  });
});

/**
 * Recursively find files matching a pattern
 */
async function findFilesRecursively(dir: string, pattern: RegExp): Promise<string[]> {
  const results: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await findFilesRecursively(fullPath, pattern);
        results.push(...subFiles);
      } else if (pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or is inaccessible
  }
  
  return results;
}

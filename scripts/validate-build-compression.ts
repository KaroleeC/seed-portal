#!/usr/bin/env tsx
/**
 * Build Compression Validation Script
 *
 * This script runs after a production build to validate that:
 * 1. Compressed files (.gz and .br) were generated
 * 2. Compression ratios are meaningful
 * 3. Original files are preserved
 *
 * Usage: npm run build:validate
 * Exit code 0 = success, 1 = failure
 */

import { promises as fs } from "fs";
import path from "path";
import { BUILD_OUTPUT_PATH } from "../server/constants";

interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
}

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
    // Directory doesn't exist
  }

  return results;
}

async function validateBuildCompression(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Check build directory exists
  try {
    await fs.access(BUILD_OUTPUT_PATH);
    results.push({
      success: true,
      message: `✓ Build directory exists at ${BUILD_OUTPUT_PATH}`,
    });
  } catch {
    results.push({
      success: false,
      message: `✗ Build directory not found at ${BUILD_OUTPUT_PATH}`,
    });
    return results;
  }

  // Find all JS files
  const jsFiles = await findFilesRecursively(BUILD_OUTPUT_PATH, /\.js$/);
  const originalJsFiles = jsFiles.filter((f) => !f.endsWith(".gz") && !f.endsWith(".br"));

  results.push({
    success: originalJsFiles.length > 0,
    message: `✓ Found ${originalJsFiles.length} JavaScript files`,
  });

  // Check for .gz files
  let gzCount = 0;
  let brCount = 0;

  for (const file of originalJsFiles) {
    const gzFile = `${file}.gz`;
    const brFile = `${file}.br`;

    try {
      await fs.access(gzFile);
      gzCount++;
    } catch {
      // File doesn't exist or is too small
    }

    try {
      await fs.access(brFile);
      brCount++;
    } catch {
      // File doesn't exist or is too small
    }
  }

  results.push({
    success: gzCount > 0,
    message:
      gzCount > 0
        ? `✓ Generated ${gzCount} Gzip compressed files`
        : `✗ No Gzip compressed files found`,
    details: { gzCount, totalFiles: originalJsFiles.length },
  });

  results.push({
    success: brCount > 0,
    message:
      brCount > 0
        ? `✓ Generated ${brCount} Brotli compressed files`
        : `✗ No Brotli compressed files found`,
    details: { brCount, totalFiles: originalJsFiles.length },
  });

  // Validate compression ratios
  let validCompressionCount = 0;
  const compressionRatios: number[] = [];

  for (const file of originalJsFiles) {
    try {
      const [originalStats, gzStats] = await Promise.all([fs.stat(file), fs.stat(`${file}.gz`)]);

      const ratio = gzStats.size / originalStats.size;
      compressionRatios.push(ratio);

      if (ratio < 0.9) {
        validCompressionCount++;
      }
    } catch {
      // File doesn't have .gz version
    }
  }

  if (compressionRatios.length > 0) {
    const avgRatio = compressionRatios.reduce((a, b) => a + b, 0) / compressionRatios.length;
    const savingsPercent = ((1 - avgRatio) * 100).toFixed(1);

    results.push({
      success: avgRatio < 0.9,
      message: `✓ Average compression ratio: ${(avgRatio * 100).toFixed(1)}% (${savingsPercent}% savings)`,
      details: { avgRatio, validCompressionCount, totalChecked: compressionRatios.length },
    });
  }

  // Check CSS files
  const cssFiles = await findFilesRecursively(BUILD_OUTPUT_PATH, /\.css$/);
  const originalCssFiles = cssFiles.filter((f) => !f.endsWith(".gz") && !f.endsWith(".br"));

  if (originalCssFiles.length > 0) {
    let cssGzCount = 0;
    for (const file of originalCssFiles) {
      try {
        await fs.access(`${file}.gz`);
        cssGzCount++;
      } catch {
        // Not compressed
      }
    }

    results.push({
      success: true,
      message: `✓ Found ${originalCssFiles.length} CSS files, ${cssGzCount} compressed`,
      details: { cssFiles: originalCssFiles.length, cssGzCount },
    });
  }

  return results;
}

async function main() {
  console.log("\n🔍 Validating build compression...\n");

  const results = await validateBuildCompression();

  let hasFailures = false;

  for (const result of results) {
    console.log(result.message);
    if (!result.success) {
      hasFailures = true;
      if (result.details) {
        console.log("   Details:", JSON.stringify(result.details, null, 2));
      }
    }
  }

  console.log("");

  if (hasFailures) {
    console.error("❌ Build compression validation FAILED");
    process.exit(1);
  } else {
    console.log("✅ Build compression validation PASSED");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("Error running validation:", error);
  process.exit(1);
});

import path from "path";

/**
 * Asset Path Configuration
 * 
 * This module defines the canonical build paths for static assets.
 * All asset-serving code MUST reference these constants to ensure consistency.
 * 
 * Files that use these constants:
 * - server/vite.ts (serveStatic)
 * - server/middleware/asset-optimization.ts (servePrecompressed)
 * - server/cdn.ts (CDNService)
 */

/**
 * Canonical build path for static assets.
 * Corresponds to Vite's build.outDir configuration.
 */
export const BUILD_OUTPUT_PATH = path.resolve(process.cwd(), "dist", "public");

/**
 * Assets subdirectory within the build output.
 * Used by CDN service for asset manifest and caching.
 */
export const ASSETS_PATH = path.join(BUILD_OUTPUT_PATH, "assets");

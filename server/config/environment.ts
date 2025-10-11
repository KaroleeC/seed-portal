/**
 * Environment Configuration
 * 
 * Centralized environment checks to enforce DRY principle.
 * All environment flag checks should reference these constants.
 */

/**
 * Current Node environment
 */
export const NODE_ENV = process.env.NODE_ENV || "development";

/**
 * Is running in production mode
 */
export const IS_PRODUCTION = NODE_ENV === "production";

/**
 * Is running in development mode
 */
export const IS_DEVELOPMENT = NODE_ENV === "development";

/**
 * Is running in test mode
 */
export const IS_TEST = NODE_ENV === "test";

/**
 * HTTP request/response debugging enabled
 * Only enable in development with explicit flag.
 * NEVER enable in production (performance impact).
 */
export const DEBUG_HTTP_ENABLED = 
  !IS_PRODUCTION && process.env.DEBUG_HTTP === "1";

/**
 * Verbose logging enabled
 */
export const VERBOSE_LOGGING = 
  process.env.VERBOSE === "1";

/**
 * Check if heavy response logging should be enabled.
 * This captures and logs full JSON responses - expensive operation.
 * 
 * Performance impact:
 * - JSON.stringify() on every response
 * - String concatenation and truncation
 * - Additional memory allocation
 * 
 * @returns false in production/test, true in dev only if DEBUG_HTTP=1
 */
export function shouldLogResponses(): boolean {
  // Never log full responses in production or test
  if (IS_PRODUCTION || IS_TEST) {
    return false;
  }
  
  // In development, require explicit opt-in
  return DEBUG_HTTP_ENABLED;
}

/**
 * Check if request debugging should be enabled.
 * 
 * @returns false in production, true in dev only if DEBUG_HTTP=1
 */
export function shouldDebugRequests(): boolean {
  return DEBUG_HTTP_ENABLED;
}

/**
 * Error Handling Utilities
 *
 * Centralized error message extraction and formatting.
 */

/**
 * Extracts a readable error message from unknown error types
 *
 * Safely handles:
 * - Error objects (returns .message)
 * - Objects (returns JSON.stringify)
 * - Primitives (returns String())
 *
 * @param err - Unknown error value
 * @returns Human-readable error message
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   logger.error(message);
 * }
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

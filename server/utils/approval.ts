/**
 * Approval Utilities
 * 
 * Helper functions for approval code generation and validation.
 */

/**
 * Generates a random 4-digit approval code
 * 
 * @returns 4-digit string (e.g., "1234", "9876")
 * 
 * @example
 * const code = generateApprovalCode();
 * // => "7654"
 */
export function generateApprovalCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

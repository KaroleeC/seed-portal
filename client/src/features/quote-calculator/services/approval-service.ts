/**
 * Approval Service
 *
 * Handles approval code validation for cleanup overrides and duplicate quotes.
 * Extracted from QuoteCalculator.tsx for DRY and testability.
 *
 * Business Rules:
 * - Code must be exactly 4 digits
 * - Contact email is required
 * - Code expires after 30 minutes
 * - Code is single-use
 */

import { apiRequest } from "@/lib/queryClient";

export interface ApprovalValidationRequest {
  code: string;
  contactEmail: string;
}

export interface ApprovalValidationResult {
  valid: boolean;
  message?: string;
  error?: string;
}

export interface ApprovalCodeFormatValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validate approval code format (client-side)
 *
 * DRY: Single validation function used everywhere
 *
 * @param code - Approval code to validate
 * @returns Validation result
 */
export function validateApprovalCodeFormat(
  code: string | null | undefined
): ApprovalCodeFormatValidation {
  if (!code) {
    return {
      valid: false,
      error: "Approval code is required",
    };
  }

  const trimmedCode = code.trim();

  if (trimmedCode.length === 0) {
    return {
      valid: false,
      error: "Approval code cannot be empty",
    };
  }

  if (trimmedCode.length !== 4) {
    return {
      valid: false,
      error: "Approval code must be exactly 4 digits",
    };
  }

  // Check if all characters are digits
  if (!/^\d{4}$/.test(trimmedCode)) {
    return {
      valid: false,
      error: "Approval code must contain only digits",
    };
  }

  return { valid: true };
}

/**
 * Validate contact email format
 *
 * DRY: Consistent email validation across app
 *
 * @param email - Email to validate
 * @returns Validation result
 */
export function validateContactEmail(
  email: string | null | undefined
): ApprovalCodeFormatValidation {
  if (!email) {
    return {
      valid: false,
      error: "Contact email is required",
    };
  }

  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) {
    return {
      valid: false,
      error: "Contact email cannot be empty",
    };
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return {
      valid: false,
      error: "Invalid email format",
    };
  }

  return { valid: true };
}

/**
 * Validate approval code against backend
 *
 * DRY: Single API call for validation
 *
 * @param request - Validation request
 * @returns Validation result from server
 */
export async function validateApprovalCodeWithServer(
  request: ApprovalValidationRequest
): Promise<ApprovalValidationResult> {
  try {
    const result = await apiRequest("/api/approval/validate", {
      method: "POST",
      body: JSON.stringify({
        code: request.code.trim(),
        contactEmail: request.contactEmail.trim(),
      }),
    });

    return {
      valid: result.valid === true,
      message: result.message,
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error?.message || "Failed to validate approval code",
    };
  }
}

/**
 * Complete approval validation (format + server)
 *
 * DRY: Single validation pipeline
 *
 * @param code - Approval code
 * @param contactEmail - Contact email
 * @returns Combined validation result
 */
export async function validateApprovalCode(
  code: string | null | undefined,
  contactEmail: string | null | undefined
): Promise<ApprovalValidationResult> {
  // Step 1: Validate format
  const codeValidation = validateApprovalCodeFormat(code);
  if (!codeValidation.valid) {
    return {
      valid: false,
      error: codeValidation.error,
    };
  }

  // Step 2: Validate email
  const emailValidation = validateContactEmail(contactEmail);
  if (!emailValidation.valid) {
    return {
      valid: false,
      error: emailValidation.error,
    };
  }

  // Step 3: Validate with server
  return validateApprovalCodeWithServer({
    code: code!,
    contactEmail: contactEmail!,
  });
}

/**
 * Request a new approval code
 *
 * DRY: Single request function
 *
 * @param contactEmail - Email to request code for
 * @returns Success status and code (in production, code is sent via email/Slack)
 */
export async function requestApprovalCode(contactEmail: string): Promise<{
  success: boolean;
  code?: string;
  message?: string;
  error?: string;
}> {
  const emailValidation = validateContactEmail(contactEmail);
  if (!emailValidation.valid) {
    return {
      success: false,
      error: emailValidation.error,
    };
  }

  try {
    const result = await apiRequest("/api/approval/request", {
      method: "POST",
      body: JSON.stringify({ contactEmail: contactEmail.trim() }),
    });

    return {
      success: result.success === true,
      code: result.code, // Only for dev/testing
      message: result.message,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to request approval code",
    };
  }
}

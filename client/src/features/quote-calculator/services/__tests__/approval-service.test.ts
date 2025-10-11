/**
 * Approval Service Tests
 *
 * Comprehensive tests for approval code validation service.
 * Tests format validation, email validation, and server integration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateApprovalCodeFormat,
  validateContactEmail,
  validateApprovalCodeWithServer,
  validateApprovalCode,
  requestApprovalCode,
} from "../approval-service";
import * as queryClient from "@/lib/queryClient";

// Mock apiRequest
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: {},
}));

describe("approval-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateApprovalCodeFormat", () => {
    it("should accept valid 4-digit code", () => {
      const result = validateApprovalCodeFormat("1234");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept code with leading zeros", () => {
      const result = validateApprovalCodeFormat("0123");
      expect(result.valid).toBe(true);
    });

    it("should reject null code", () => {
      const result = validateApprovalCodeFormat(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Approval code is required");
    });

    it("should reject undefined code", () => {
      const result = validateApprovalCodeFormat(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Approval code is required");
    });

    it("should reject empty string", () => {
      const result = validateApprovalCodeFormat("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Approval code is required");
    });

    it("should reject whitespace-only string", () => {
      const result = validateApprovalCodeFormat("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Approval code cannot be empty");
    });

    it("should reject code with less than 4 digits", () => {
      const result = validateApprovalCodeFormat("123");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Approval code must be exactly 4 digits");
    });

    it("should reject code with more than 4 digits", () => {
      const result = validateApprovalCodeFormat("12345");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Approval code must be exactly 4 digits");
    });

    it("should reject code with letters", () => {
      const result = validateApprovalCodeFormat("12ab");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Approval code must contain only digits");
    });

    it("should reject code with special characters", () => {
      const result = validateApprovalCodeFormat("12-4");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Approval code must contain only digits");
    });

    it("should reject code with spaces", () => {
      const result = validateApprovalCodeFormat("12 4");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Approval code must contain only digits");
    });

    it("should handle code with leading/trailing whitespace", () => {
      const result = validateApprovalCodeFormat("  1234  ");
      expect(result.valid).toBe(true); // Trimmed internally
    });
  });

  describe("validateContactEmail", () => {
    it("should accept valid email", () => {
      const result = validateContactEmail("test@example.com");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept email with subdomains", () => {
      const result = validateContactEmail("user@mail.example.com");
      expect(result.valid).toBe(true);
    });

    it("should accept email with plus sign", () => {
      const result = validateContactEmail("user+tag@example.com");
      expect(result.valid).toBe(true);
    });

    it("should reject null email", () => {
      const result = validateContactEmail(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Contact email is required");
    });

    it("should reject undefined email", () => {
      const result = validateContactEmail(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Contact email is required");
    });

    it("should reject empty string", () => {
      const result = validateContactEmail("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Contact email is required");
    });

    it("should reject whitespace-only string", () => {
      const result = validateContactEmail("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Contact email cannot be empty");
    });

    it("should reject email without @", () => {
      const result = validateContactEmail("testexample.com");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid email format");
    });

    it("should reject email without domain", () => {
      const result = validateContactEmail("test@");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid email format");
    });

    it("should reject email without TLD", () => {
      const result = validateContactEmail("test@example");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid email format");
    });

    it("should reject email with spaces", () => {
      const result = validateContactEmail("test @example.com");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid email format");
    });

    it("should handle email with leading/trailing whitespace", () => {
      const result = validateContactEmail("  test@example.com  ");
      expect(result.valid).toBe(true); // Trimmed internally
    });
  });

  describe("validateApprovalCodeWithServer", () => {
    it("should return valid result from server", async () => {
      vi.mocked(queryClient.apiRequest).mockResolvedValue({
        valid: true,
        message: "Code is valid",
      });

      const result = await validateApprovalCodeWithServer({
        code: "1234",
        contactEmail: "test@example.com",
      });

      expect(result.valid).toBe(true);
      expect(result.message).toBe("Code is valid");
      expect(queryClient.apiRequest).toHaveBeenCalledWith("/api/approval/validate", {
        method: "POST",
        body: JSON.stringify({ code: "1234", contactEmail: "test@example.com" }),
      });
    });

    it("should return invalid result from server", async () => {
      vi.mocked(queryClient.apiRequest).mockResolvedValue({
        valid: false,
        message: "Code expired",
      });

      const result = await validateApprovalCodeWithServer({
        code: "1234",
        contactEmail: "test@example.com",
      });

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Code expired");
    });

    it("should handle server error", async () => {
      vi.mocked(queryClient.apiRequest).mockRejectedValue(new Error("Network error"));

      const result = await validateApprovalCodeWithServer({
        code: "1234",
        contactEmail: "test@example.com",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should handle unknown server error", async () => {
      vi.mocked(queryClient.apiRequest).mockRejectedValue(new Error());

      const result = await validateApprovalCodeWithServer({
        code: "1234",
        contactEmail: "test@example.com",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Failed to validate approval code");
    });

    it("should trim code and email before sending", async () => {
      vi.mocked(queryClient.apiRequest).mockResolvedValue({ valid: true });

      await validateApprovalCodeWithServer({
        code: "  1234  ",
        contactEmail: "  test@example.com  ",
      });

      expect(queryClient.apiRequest).toHaveBeenCalledWith("/api/approval/validate", {
        method: "POST",
        body: JSON.stringify({ code: "1234", contactEmail: "test@example.com" }),
      });
    });
  });

  describe("validateApprovalCode", () => {
    it("should validate complete flow with valid code", async () => {
      vi.mocked(queryClient.apiRequest).mockResolvedValue({ valid: true });

      const result = await validateApprovalCode("1234", "test@example.com");

      expect(result.valid).toBe(true);
    });

    it("should fail on invalid code format", async () => {
      const result = await validateApprovalCode("123", "test@example.com");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Approval code must be exactly 4 digits");
      expect(queryClient.apiRequest).not.toHaveBeenCalled();
    });

    it("should fail on invalid email format", async () => {
      const result = await validateApprovalCode("1234", "invalid-email");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid email format");
      expect(queryClient.apiRequest).not.toHaveBeenCalled();
    });

    it("should fail on null code", async () => {
      const result = await validateApprovalCode(null, "test@example.com");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Approval code is required");
    });

    it("should fail on null email", async () => {
      const result = await validateApprovalCode("1234", null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Contact email is required");
    });

    it("should propagate server validation result", async () => {
      vi.mocked(queryClient.apiRequest).mockResolvedValue({
        valid: false,
        message: "Code has been used",
      });

      const result = await validateApprovalCode("1234", "test@example.com");

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Code has been used");
    });
  });

  describe("requestApprovalCode", () => {
    it("should request code for valid email", async () => {
      vi.mocked(queryClient.apiRequest).mockResolvedValue({
        success: true,
        code: "5678",
        message: "Code sent",
      });

      const result = await requestApprovalCode("test@example.com");

      expect(result.success).toBe(true);
      expect(result.code).toBe("5678");
      expect(result.message).toBe("Code sent");
      expect(queryClient.apiRequest).toHaveBeenCalledWith("/api/approval/request", {
        method: "POST",
        body: JSON.stringify({ contactEmail: "test@example.com" }),
      });
    });

    it("should reject invalid email", async () => {
      const result = await requestApprovalCode("invalid-email");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid email format");
      expect(queryClient.apiRequest).not.toHaveBeenCalled();
    });

    it("should handle server error", async () => {
      vi.mocked(queryClient.apiRequest).mockRejectedValue(new Error("Server error"));

      const result = await requestApprovalCode("test@example.com");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Server error");
    });

    it("should trim email before sending", async () => {
      vi.mocked(queryClient.apiRequest).mockResolvedValue({ success: true });

      await requestApprovalCode("  test@example.com  ");

      expect(queryClient.apiRequest).toHaveBeenCalledWith("/api/approval/request", {
        method: "POST",
        body: JSON.stringify({ contactEmail: "test@example.com" }),
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle all zeros code", () => {
      const result = validateApprovalCodeFormat("0000");
      expect(result.valid).toBe(true);
    });

    it("should handle all nines code", () => {
      const result = validateApprovalCodeFormat("9999");
      expect(result.valid).toBe(true);
    });

    it("should handle email with numbers", () => {
      const result = validateContactEmail("user123@example456.com");
      expect(result.valid).toBe(true);
    });

    it("should handle email with hyphens", () => {
      const result = validateContactEmail("first-last@my-company.com");
      expect(result.valid).toBe(true);
    });

    it("should handle email with underscores", () => {
      const result = validateContactEmail("first_last@example.com");
      expect(result.valid).toBe(true);
    });
  });
});

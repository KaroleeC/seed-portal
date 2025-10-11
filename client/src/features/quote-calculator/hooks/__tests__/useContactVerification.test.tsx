/**
 * useContactVerification Tests
 * 
 * Comprehensive tests for contact verification hook.
 * Tests debouncing, timeout, state management, and callbacks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useContactVerification } from "../useContactVerification";
import * as hubspotService from "@/services/hubspot";
import * as quotesService from "@/services/quotes";

// Mock dependencies
vi.mock("@/services/hubspot", () => ({
  verifyContact: vi.fn(),
}));

vi.mock("@/services/quotes", () => ({
  checkExistingQuotes: vi.fn(),
}));

describe("useContactVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe("Initial State", () => {
    it("should start with idle status", () => {
      const { result } = renderHook(() => useContactVerification());

      expect(result.current.status).toBe("idle");
      expect(result.current.contact).toBeNull();
      expect(result.current.existingQuotes).toEqual([]);
      expect(result.current.lastVerifiedEmail).toBe("");
    });

    it("should have computed properties set correctly", () => {
      const { result } = renderHook(() => useContactVerification());

      expect(result.current.isVerifying).toBe(false);
      expect(result.current.isVerified).toBe(false);
      expect(result.current.isNotFound).toBe(false);
    });
  });

  describe("Debounced Verification", () => {
    it("should debounce verification calls", async () => {
      vi.mocked(hubspotService.verifyContact).mockResolvedValue({
        verified: true,
        contact: { email: "test@example.com" },
      });
      vi.mocked(quotesService.checkExistingQuotes).mockResolvedValue([]);

      const { result } = renderHook(() => 
        useContactVerification({ debounceMs: 500 })
      );

      // Call multiple times rapidly
      act(() => {
        result.current.verifyEmail("test@example.com");
        result.current.verifyEmail("test@example.com");
        result.current.verifyEmail("test@example.com");
      });

      // Should not call API yet
      expect(hubspotService.verifyContact).not.toHaveBeenCalled();

      // Fast-forward debounce time
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should call API only once
      await waitFor(() => {
        expect(hubspotService.verifyContact).toHaveBeenCalledTimes(1);
      });
    });

    it("should reset debounce timer on new input", async () => {
      vi.mocked(hubspotService.verifyContact).mockResolvedValue({
        verified: true,
        contact: {},
      });
      vi.mocked(quotesService.checkExistingQuotes).mockResolvedValue([]);

      const { result } = renderHook(() => 
        useContactVerification({ debounceMs: 500 })
      );

      act(() => {
        result.current.verifyEmail("test1@example.com");
      });

      // Wait 400ms
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // New email resets timer
      act(() => {
        result.current.verifyEmail("test2@example.com");
      });

      // Wait another 400ms (total 800ms)
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Should not have called yet (only 400ms since last input)
      expect(hubspotService.verifyContact).not.toHaveBeenCalled();

      // Wait final 100ms
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Now should call
      await waitFor(() => {
        expect(hubspotService.verifyContact).toHaveBeenCalledWith("test2@example.com");
      });
    });
  });

  describe("Successful Verification", () => {
    it("should verify contact successfully", async () => {
      const mockContact = { email: "test@example.com", name: "Test User" };
      const mockQuotes = [{ id: 1, email: "test@example.com" }];

      vi.mocked(hubspotService.verifyContact).mockResolvedValue({
        verified: true,
        contact: mockContact,
      });
      vi.mocked(quotesService.checkExistingQuotes).mockResolvedValue(mockQuotes as any);

      const { result } = renderHook(() => 
        useContactVerification({ debounceMs: 100 })
      );

      act(() => {
        result.current.verifyEmail("test@example.com");
      });

      // Status should be idle initially
      expect(result.current.status).toBe("idle");

      // Fast-forward debounce
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should be verifying
      await waitFor(() => {
        expect(result.current.status).toBe("verifying");
      });

      // Wait for verification to complete
      await waitFor(() => {
        expect(result.current.status).toBe("verified");
        expect(result.current.contact).toEqual(mockContact);
        expect(result.current.existingQuotes).toEqual(mockQuotes);
        expect(result.current.lastVerifiedEmail).toBe("test@example.com");
      });
    });

    it("should call onVerified callback", async () => {
      const mockContact = { email: "test@example.com" };
      const onVerified = vi.fn();

      vi.mocked(hubspotService.verifyContact).mockResolvedValue({
        verified: true,
        contact: mockContact,
      });
      vi.mocked(quotesService.checkExistingQuotes).mockResolvedValue([]);

      const { result } = renderHook(() => 
        useContactVerification({ debounceMs: 100, onVerified })
      );

      act(() => {
        result.current.verifyEmail("test@example.com");
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(onVerified).toHaveBeenCalledWith(mockContact);
      });
    });
  });

  describe("Contact Not Found", () => {
    it("should handle contact not found", async () => {
      vi.mocked(hubspotService.verifyContact).mockResolvedValue({
        verified: false,
        contact: null,
      });
      vi.mocked(quotesService.checkExistingQuotes).mockResolvedValue([]);

      const { result } = renderHook(() => 
        useContactVerification({ debounceMs: 100 })
      );

      act(() => {
        result.current.verifyEmail("notfound@example.com");
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("not-found");
        expect(result.current.contact).toBeNull();
        expect(result.current.existingQuotes).toEqual([]);
      });
    });

    it("should call onNotFound callback", async () => {
      const onNotFound = vi.fn();

      vi.mocked(hubspotService.verifyContact).mockResolvedValue({
        verified: false,
        contact: null,
      });
      vi.mocked(quotesService.checkExistingQuotes).mockResolvedValue([]);

      const { result } = renderHook(() => 
        useContactVerification({ debounceMs: 100, onNotFound })
      );

      act(() => {
        result.current.verifyEmail("notfound@example.com");
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(onNotFound).toHaveBeenCalled();
      });
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout after specified duration", async () => {
      vi.mocked(hubspotService.verifyContact).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      vi.mocked(quotesService.checkExistingQuotes).mockResolvedValue([]);

      const { result } = renderHook(() => 
        useContactVerification({ debounceMs: 100, timeoutMs: 500 })
      );

      act(() => {
        result.current.verifyEmail("test@example.com");
      });

      // Fast-forward debounce
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should be verifying
      await waitFor(() => {
        expect(result.current.status).toBe("verifying");
      });

      // Fast-forward timeout
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should reset to idle after timeout
      await waitFor(() => {
        expect(result.current.status).toBe("idle");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle verification error gracefully", async () => {
      vi.mocked(hubspotService.verifyContact).mockRejectedValue(
        new Error("Network error")
      );
      vi.mocked(quotesService.checkExistingQuotes).mockResolvedValue([]);

      const { result } = renderHook(() => 
        useContactVerification({ debounceMs: 100 })
      );

      act(() => {
        result.current.verifyEmail("test@example.com");
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("idle");
        expect(result.current.contact).toBeNull();
      });
    });
  });

  describe("Reset Functionality", () => {
    it("should reset all state", async () => {
      vi.mocked(hubspotService.verifyContact).mockResolvedValue({
        verified: true,
        contact: { email: "test@example.com" },
      });
      vi.mocked(quotesService.checkExistingQuotes).mockResolvedValue([{ id: 1 }] as any);

      const { result } = renderHook(() => 
        useContactVerification({ debounceMs: 100 })
      );

      // Verify
      act(() => {
        result.current.verifyEmail("test@example.com");
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("verified");
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.contact).toBeNull();
      expect(result.current.existingQuotes).toEqual([]);
      expect(result.current.lastVerifiedEmail).toBe("");
    });
  });

  describe("Empty Email Handling", () => {
    it("should reset state for empty email", () => {
      const { result } = renderHook(() => useContactVerification());

      act(() => {
        result.current.verifyEmail("");
      });

      expect(result.current.status).toBe("idle");
      expect(hubspotService.verifyContact).not.toHaveBeenCalled();
    });

    it("should reset state for whitespace-only email", () => {
      const { result } = renderHook(() => useContactVerification());

      act(() => {
        result.current.verifyEmail("   ");
      });

      expect(result.current.status).toBe("idle");
      expect(hubspotService.verifyContact).not.toHaveBeenCalled();
    });
  });

  describe("Duplicate Verification Prevention", () => {
    it("should skip verification if email already verified", async () => {
      vi.mocked(hubspotService.verifyContact).mockResolvedValue({
        verified: true,
        contact: { email: "test@example.com" },
      });
      vi.mocked(quotesService.checkExistingQuotes).mockResolvedValue([]);

      const { result } = renderHook(() => 
        useContactVerification({ debounceMs: 100 })
      );

      // First verification
      act(() => {
        result.current.verifyEmail("test@example.com");
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("verified");
      });

      expect(hubspotService.verifyContact).toHaveBeenCalledTimes(1);

      // Clear mocks
      vi.clearAllMocks();

      // Second verification with same email - should be skipped immediately
      act(() => {
        result.current.verifyEmail("test@example.com");
        vi.advanceTimersByTime(100);
      });

      // Small delay to ensure no async operations start
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Should not call API again (verified status + same email = skip)
      expect(hubspotService.verifyContact).not.toHaveBeenCalled();
      expect(result.current.status).toBe("verified"); // Still verified
    });
  });

  describe("needsVerification helper", () => {
    it("should return true for new email", () => {
      const { result } = renderHook(() => useContactVerification());

      const needs = result.current.needsVerification("test@example.com");
      expect(needs).toBe(true);
    });

    it("should return false for verified email", async () => {
      vi.mocked(hubspotService.verifyContact).mockResolvedValue({
        verified: true,
        contact: {},
      });
      vi.mocked(quotesService.checkExistingQuotes).mockResolvedValue([]);

      const { result } = renderHook(() => 
        useContactVerification({ debounceMs: 100 })
      );

      act(() => {
        result.current.verifyEmail("test@example.com");
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("verified");
      });

      const needs = result.current.needsVerification("test@example.com");
      expect(needs).toBe(false);
    });

    it("should return true for different email even if previous verified", async () => {
      vi.mocked(hubspotService.verifyContact).mockResolvedValue({
        verified: true,
        contact: {},
      });
      vi.mocked(quotesService.checkExistingQuotes).mockResolvedValue([]);

      const { result } = renderHook(() => 
        useContactVerification({ debounceMs: 100 })
      );

      // Verify first email
      act(() => {
        result.current.verifyEmail("test1@example.com");
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("verified");
      });

      // Check if different email needs verification
      const needs = result.current.needsVerification("test2@example.com");
      expect(needs).toBe(true);
    });
  });
});

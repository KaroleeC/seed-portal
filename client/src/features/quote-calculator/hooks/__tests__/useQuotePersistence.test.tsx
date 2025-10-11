/**
 * useQuotePersistence Tests
 * 
 * Comprehensive test coverage for quote persistence hook.
 * Tests save/update logic, unsaved changes tracking, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useQuotePersistence } from "../useQuotePersistence";
import * as quotesService from "@/services/quotes";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";

// Mock dependencies
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/services/quotes", () => ({
  createQuote: vi.fn(),
  updateQuote: vi.fn(),
}));

vi.mock("@shared/pricing", () => ({
  calculateQuotePricing: vi.fn(() => ({
    combined: { monthlyFee: 1500, setupFee: 500 },
    bookkeeping: { monthlyFee: 800, setupFee: 300 },
    taas: { monthlyFee: 700, setupFee: 200 },
  })),
  calculateCombinedFees: vi.fn(() => ({
    combined: { monthlyFee: 1500, setupFee: 500 },
    bookkeeping: { monthlyFee: 800, setupFee: 300 },
    taas: { monthlyFee: 700, setupFee: 200 },
  })),
}));

vi.mock("@/features/quote-calculator/logic/mapping", () => ({
  mapFormToQuotePayload: vi.fn((data) => data),
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

describe("useQuotePersistence", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const createTestHook = (editingQuoteId: number | null = null) => {
    const setEditingQuoteId = vi.fn();
    const refetchQuotes = vi.fn();
    
    const { result: formResult } = renderHook(
      () => useForm<QuoteFormFields>({
        defaultValues: {
          contactEmail: "test@example.com",
          companyName: "Test Company",
        },
      }),
      { wrapper }
    );

    const { result } = renderHook(
      () => useQuotePersistence({
        form: formResult.current,
        mappedPricingConfig: undefined,
        editingQuoteId,
        setEditingQuoteId,
        refetchQuotes,
      }),
      { wrapper }
    );

    return {
      result,
      formResult,
      setEditingQuoteId,
      refetchQuotes,
    };
  };

  describe("Unsaved Changes Tracking", () => {
    it("should initially have no unsaved changes", () => {
      const { result } = createTestHook();

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it("should track unsaved changes when form is modified", async () => {
      const { result, formResult } = createTestHook();

      act(() => {
        formResult.current.setValue("companyName", "Updated Company");
      });

      await waitFor(() => {
        expect(result.current.hasUnsavedChanges).toBe(true);
      });
    });

    it("should clear unsaved changes when explicitly cleared", async () => {
      const { result, formResult } = createTestHook();

      // Make a change
      act(() => {
        formResult.current.setValue("companyName", "Updated Company");
      });

      await waitFor(() => {
        expect(result.current.hasUnsavedChanges).toBe(true);
      });

      // Clear changes
      act(() => {
        result.current.clearUnsavedChanges();
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  describe("Create Quote", () => {
    it("should create a new quote successfully", async () => {
      const mockQuote = { id: 123, email: "test@example.com" };
      vi.mocked(quotesService.createQuote).mockResolvedValue(mockQuote);

      const { result, formResult, setEditingQuoteId, refetchQuotes } = createTestHook();

      const formData = formResult.current.getValues();

      await act(async () => {
        await result.current.saveQuote(formData);
      });

      expect(quotesService.createQuote).toHaveBeenCalledOnce();
      expect(setEditingQuoteId).toHaveBeenCalledWith(123);
      expect(refetchQuotes).toHaveBeenCalledOnce();
    });

    it("should clear unsaved changes after successful create", async () => {
      const mockQuote = { id: 123, email: "test@example.com" };
      vi.mocked(quotesService.createQuote).mockResolvedValue(mockQuote);

      const { result, formResult } = createTestHook();

      // Make a change
      act(() => {
        formResult.current.setValue("companyName", "Test");
      });

      await waitFor(() => {
        expect(result.current.hasUnsavedChanges).toBe(true);
      });

      // Save
      await act(async () => {
        await result.current.saveQuote(formResult.current.getValues());
      });

      await waitFor(() => {
        expect(result.current.hasUnsavedChanges).toBe(false);
      });
    });

    it("should set creating flag during save", async () => {
      vi.mocked(quotesService.createQuote).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: 123 }), 100))
      );

      const { result, formResult } = createTestHook();

      expect(result.current.creating).toBe(false);

      act(() => {
        result.current.saveQuote(formResult.current.getValues());
      });

      await waitFor(() => {
        expect(result.current.creating).toBe(true);
      });

      await waitFor(
        () => {
          expect(result.current.creating).toBe(false);
        },
        { timeout: 200 }
      );
    });
  });

  describe("Update Quote", () => {
    it("should update an existing quote successfully", async () => {
      const mockQuote = { id: 456, email: "test@example.com" };
      vi.mocked(quotesService.updateQuote).mockResolvedValue(mockQuote);

      const { result, formResult, setEditingQuoteId, refetchQuotes } = createTestHook(456);

      await act(async () => {
        await result.current.saveQuote(formResult.current.getValues());
      });

      expect(quotesService.updateQuote).toHaveBeenCalledWith(456, expect.any(Object));
      expect(setEditingQuoteId).not.toHaveBeenCalled(); // Don't update ID for updates
      expect(refetchQuotes).toHaveBeenCalledOnce();
    });

    it("should call updateQuote instead of createQuote when editing", async () => {
      vi.mocked(quotesService.updateQuote).mockResolvedValue({ id: 789 });

      const { result, formResult } = createTestHook(789);

      await act(async () => {
        await result.current.saveQuote(formResult.current.getValues());
      });

      expect(quotesService.updateQuote).toHaveBeenCalledOnce();
      expect(quotesService.createQuote).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle create error gracefully", async () => {
      vi.mocked(quotesService.createQuote).mockRejectedValue(
        new Error("Network error")
      );

      const { result, formResult } = createTestHook();

      await expect(
        act(async () => {
          await result.current.saveQuote(formResult.current.getValues());
        })
      ).rejects.toThrow("Network error");

      expect(result.current.creating).toBe(false);
    });

    it("should handle update error gracefully", async () => {
      vi.mocked(quotesService.updateQuote).mockRejectedValue(
        new Error("Update failed")
      );

      const { result, formResult } = createTestHook(123);

      await expect(
        act(async () => {
          await result.current.saveQuote(formResult.current.getValues());
        })
      ).rejects.toThrow("Update failed");

      expect(result.current.creating).toBe(false);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle create → modify → update flow", async () => {
      // Initial create
      vi.mocked(quotesService.createQuote).mockResolvedValue({ id: 111 });
      
      const { result, formResult, setEditingQuoteId } = createTestHook();

      // Create
      await act(async () => {
        await result.current.saveQuote(formResult.current.getValues());
      });

      expect(setEditingQuoteId).toHaveBeenCalledWith(111);

      // Simulate editing state being set
      const { result: result2, formResult: formResult2, refetchQuotes } = createTestHook(111);

      vi.mocked(quotesService.updateQuote).mockResolvedValue({ id: 111 });

      // Modify
      act(() => {
        formResult2.current.setValue("companyName", "Modified");
      });

      // Update
      await act(async () => {
        await result2.current.saveQuote(formResult2.current.getValues());
      });

      expect(quotesService.updateQuote).toHaveBeenCalledWith(111, expect.any(Object));
      expect(refetchQuotes).toHaveBeenCalled();
    });
  });
});

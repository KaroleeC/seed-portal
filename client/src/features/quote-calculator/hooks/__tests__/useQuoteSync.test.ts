/**
 * useQuoteSync Tests
 *
 * Comprehensive test coverage for provider-agnostic quote sync hook.
 * Tests business logic without coupling to specific CRM.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  decideSyncAction,
  buildEnhancedFormData,
  type QuoteSyncActionDecision,
} from "../useQuoteSync";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import type { FeeCalculation } from "@/components/seedqc/types";

describe("useQuoteSync", () => {
  describe("decideSyncAction", () => {
    it("should return 'save_then_sync' for new quote with unsaved changes", () => {
      const decision = decideSyncAction({
        hasExternalIds: false,
        hasUnsavedChanges: true,
        editingQuoteId: null,
      });

      expect(decision).toBe("save_then_sync");
    });

    it("should return 'update_quote_then_sync' for synced quote with unsaved changes", () => {
      const decision = decideSyncAction({
        hasExternalIds: true,
        hasUnsavedChanges: true,
        editingQuoteId: 123,
      });

      expect(decision).toBe("update_quote_then_sync");
    });

    it("should return 'update_then_sync' for edited quote without external IDs", () => {
      const decision = decideSyncAction({
        hasExternalIds: false,
        hasUnsavedChanges: false,
        editingQuoteId: 123,
      });

      expect(decision).toBe("update_then_sync");
    });

    it("should return 'error_save_first' when no valid action", () => {
      const decision = decideSyncAction({
        hasExternalIds: false,
        hasUnsavedChanges: false,
        editingQuoteId: null,
      });

      expect(decision).toBe("error_save_first");
    });

    // Edge cases
    it("should handle null editingQuoteId consistently", () => {
      const decision = decideSyncAction({
        hasExternalIds: false,
        hasUnsavedChanges: false,
        editingQuoteId: null,
      });

      expect(decision).toBe("error_save_first");
    });

    it("should prioritize unsaved changes over external IDs", () => {
      const decision = decideSyncAction({
        hasExternalIds: true,
        hasUnsavedChanges: true,
        editingQuoteId: 123,
      });

      expect(decision).toBe("update_quote_then_sync");
    });
  });

  describe("buildEnhancedFormData", () => {
    it("should convert all fee calculations to strings", () => {
      const formValues: Partial<QuoteFormFields> = {
        companyName: "Test Company",
        email: "test@example.com",
      };

      const feeCalc: Partial<FeeCalculation> = {
        combined: {
          monthlyFee: 1500,
          setupFee: 500,
        } as any,
        bookkeeping: {
          monthlyFee: 800,
        } as any,
        taas: {
          monthlyFee: 700,
          setupFee: 500,
        } as any,
        serviceTierFee: 200,
        cleanupProjectFee: 1000,
        priorYearFilingsFee: 300,
        payrollFee: 150,
        apFee: 100,
        arFee: 100,
        agentOfServiceFee: 50,
        cfoAdvisoryFee: 500,
      };

      const result = buildEnhancedFormData(
        formValues as QuoteFormFields,
        feeCalc as FeeCalculation
      );

      expect(result.monthlyFee).toBe("1500");
      expect(result.setupFee).toBe("500");
      expect(result.bookkeepingMonthlyFee).toBe("800");
      expect(result.taasMonthlyFee).toBe("700");
      expect(result.taasPriorYearsFee).toBe("500");
      expect(result.serviceTierFee).toBe("200");
      expect(result.cleanupProjectFee).toBe("1000");
    });

    it("should handle zero values correctly", () => {
      const formValues = {} as QuoteFormFields;
      const feeCalc: Partial<FeeCalculation> = {
        combined: { monthlyFee: 0, setupFee: 0 } as any,
        bookkeeping: { monthlyFee: 0 } as any,
        taas: { monthlyFee: 0, setupFee: 0 } as any,
        serviceTierFee: 0,
        cleanupProjectFee: 0,
        priorYearFilingsFee: 0,
        payrollFee: 0,
        apFee: 0,
        arFee: 0,
        agentOfServiceFee: 0,
        cfoAdvisoryFee: 0,
      };

      const result = buildEnhancedFormData(formValues, feeCalc as FeeCalculation);

      expect(result.monthlyFee).toBe("0");
      expect(result.setupFee).toBe("0");
      expect(result.serviceTierFee).toBe("0");
    });

    it("should handle null/undefined fees gracefully", () => {
      const formValues = {} as QuoteFormFields;
      const feeCalc: Partial<FeeCalculation> = {
        combined: { monthlyFee: 100, setupFee: 50 } as any,
        bookkeeping: { monthlyFee: 100 } as any,
        taas: { monthlyFee: 0, setupFee: 0 } as any,
        serviceTierFee: null as any,
        cleanupProjectFee: undefined,
      };

      const result = buildEnhancedFormData(formValues, feeCalc as FeeCalculation);

      // Both null and undefined are coerced to 0 by Number()
      expect(result.serviceTierFee).toBe("0");
      expect(result.cleanupProjectFee).toBe("0");
    });

    it("should preserve original form values", () => {
      const formValues: Partial<QuoteFormFields> = {
        companyName: "Test Company",
        email: "test@example.com",
        industry: "Technology",
      };

      const feeCalc: Partial<FeeCalculation> = {
        combined: { monthlyFee: 100, setupFee: 50 } as any,
        bookkeeping: { monthlyFee: 100 } as any,
        taas: { monthlyFee: 0, setupFee: 0 } as any,
      };

      const result = buildEnhancedFormData(
        formValues as QuoteFormFields,
        feeCalc as FeeCalculation
      );

      expect(result.companyName).toBe("Test Company");
      expect(result.email).toBe("test@example.com");
      expect(result.industry).toBe("Technology");
    });

    it("should handle decimal values correctly", () => {
      const formValues = {} as QuoteFormFields;
      const feeCalc: Partial<FeeCalculation> = {
        combined: { monthlyFee: 1500.5, setupFee: 500.75 } as any,
        bookkeeping: { monthlyFee: 800.25 } as any,
        taas: { monthlyFee: 700.1, setupFee: 500.99 } as any,
      };

      const result = buildEnhancedFormData(formValues, feeCalc as FeeCalculation);

      expect(result.monthlyFee).toBe("1500.5");
      expect(result.setupFee).toBe("500.75");
      expect(result.bookkeepingMonthlyFee).toBe("800.25");
    });
  });

  describe("Decision Flow Integration", () => {
    it("should handle complete new quote flow", () => {
      // Step 1: New quote, unsaved changes
      const decision1 = decideSyncAction({
        hasExternalIds: false,
        hasUnsavedChanges: true,
        editingQuoteId: null,
      });
      expect(decision1).toBe("save_then_sync");

      // Step 2: After save, now has ID but not synced
      const decision2 = decideSyncAction({
        hasExternalIds: false,
        hasUnsavedChanges: false,
        editingQuoteId: 123,
      });
      expect(decision2).toBe("update_then_sync");

      // Step 3: After sync, now has external IDs and user makes changes
      const decision3 = decideSyncAction({
        hasExternalIds: true,
        hasUnsavedChanges: true,
        editingQuoteId: 123,
      });
      expect(decision3).toBe("update_quote_then_sync");
    });

    it("should handle edit existing synced quote flow", () => {
      // Start: Editing synced quote
      const decision1 = decideSyncAction({
        hasExternalIds: true,
        hasUnsavedChanges: false,
        editingQuoteId: 123,
      });
      // No action needed (quote is synced and unchanged)
      expect(decision1).toBe("error_save_first"); // Will show already synced

      // Make changes
      const decision2 = decideSyncAction({
        hasExternalIds: true,
        hasUnsavedChanges: true,
        editingQuoteId: 123,
      });
      expect(decision2).toBe("update_quote_then_sync");
    });
  });
});

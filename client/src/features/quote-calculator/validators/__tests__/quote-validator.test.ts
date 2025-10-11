/**
 * Quote Validator Tests
 * 
 * Comprehensive test coverage for quote validation logic.
 * Uses Vitest for unit testing.
 */

import { describe, it, expect } from "vitest";
import {
  getMissingTaasFields,
  getMissingFields,
  validateQuoteForSync,
  formatValidationErrors,
  FIELD_DISPLAY_NAMES,
} from "../quote-validator";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import type { FeeCalculation } from "@/components/seedqc/types";

describe("quote-validator", () => {
  describe("getMissingTaasFields", () => {
    it("should return empty array when all TaaS fields are present", () => {
      const values: Partial<QuoteFormFields> = {
        monthlyRevenueRange: "10k-50k",
        industry: "Technology",
        numEntities: 2,
        statesFiled: 3,
        internationalFiling: false,
        numBusinessOwners: 1,
        include1040s: true,
      };

      const missing = getMissingTaasFields(values as QuoteFormFields);
      expect(missing).toEqual([]);
    });

    it("should detect missing monthlyRevenueRange", () => {
      const values: Partial<QuoteFormFields> = {
        industry: "Technology",
        numEntities: 2,
        statesFiled: 3,
        internationalFiling: false,
        numBusinessOwners: 1,
        include1040s: true,
      };

      const missing = getMissingTaasFields(values as QuoteFormFields);
      expect(missing).toContain("monthlyRevenueRange");
    });

    it("should detect missing industry", () => {
      const values: Partial<QuoteFormFields> = {
        monthlyRevenueRange: "10k-50k",
        numEntities: 2,
        statesFiled: 3,
        internationalFiling: false,
        numBusinessOwners: 1,
        include1040s: true,
      };

      const missing = getMissingTaasFields(values as QuoteFormFields);
      expect(missing).toContain("industry");
    });

    it("should detect missing numEntities (zero)", () => {
      const values: Partial<QuoteFormFields> = {
        monthlyRevenueRange: "10k-50k",
        industry: "Technology",
        numEntities: 0,
        statesFiled: 3,
        internationalFiling: false,
        numBusinessOwners: 1,
        include1040s: true,
      };

      const missing = getMissingTaasFields(values as QuoteFormFields);
      expect(missing).toContain("numEntities");
    });

    it("should detect missing statesFiled (zero)", () => {
      const values: Partial<QuoteFormFields> = {
        monthlyRevenueRange: "10k-50k",
        industry: "Technology",
        numEntities: 2,
        statesFiled: 0,
        internationalFiling: false,
        numBusinessOwners: 1,
        include1040s: true,
      };

      const missing = getMissingTaasFields(values as QuoteFormFields);
      expect(missing).toContain("statesFiled");
    });

    it("should detect missing internationalFiling (undefined)", () => {
      const values: Partial<QuoteFormFields> = {
        monthlyRevenueRange: "10k-50k",
        industry: "Technology",
        numEntities: 2,
        statesFiled: 3,
        numBusinessOwners: 1,
        include1040s: true,
      };

      const missing = getMissingTaasFields(values as QuoteFormFields);
      expect(missing).toContain("internationalFiling");
    });

    it("should detect missing numBusinessOwners", () => {
      const values: Partial<QuoteFormFields> = {
        monthlyRevenueRange: "10k-50k",
        industry: "Technology",
        numEntities: 2,
        statesFiled: 3,
        internationalFiling: false,
        include1040s: true,
      };

      const missing = getMissingTaasFields(values as QuoteFormFields);
      expect(missing).toContain("numBusinessOwners");
    });

    it("should detect missing include1040s", () => {
      const values: Partial<QuoteFormFields> = {
        monthlyRevenueRange: "10k-50k",
        industry: "Technology",
        numEntities: 2,
        statesFiled: 3,
        internationalFiling: false,
        numBusinessOwners: 1,
      };

      const missing = getMissingTaasFields(values as QuoteFormFields);
      expect(missing).toContain("include1040s");
    });

    it("should detect multiple missing fields", () => {
      const values: Partial<QuoteFormFields> = {
        monthlyRevenueRange: "10k-50k",
      };

      const missing = getMissingTaasFields(values as QuoteFormFields);
      expect(missing.length).toBeGreaterThan(1);
      expect(missing).toContain("industry");
      expect(missing).toContain("numEntities");
      expect(missing).toContain("statesFiled");
    });
  });

  describe("getMissingFields", () => {
    it("should return empty array when TaaS is not included", () => {
      const values = {} as QuoteFormFields;
      const feeCalc = { includesTaas: false } as FeeCalculation;

      const missing = getMissingFields(values, feeCalc);
      expect(missing).toEqual([]);
    });

    it("should validate TaaS fields when includesTaas is true", () => {
      const values: Partial<QuoteFormFields> = {
        monthlyRevenueRange: "10k-50k",
      };
      const feeCalc = { includesTaas: true } as FeeCalculation;

      const missing = getMissingFields(values as QuoteFormFields, feeCalc);
      expect(missing.length).toBeGreaterThan(0);
    });

    it("should check includesTaas in both feeCalculation and values", () => {
      const values = { includesTaas: true } as any;
      const feeCalc = {} as FeeCalculation;

      const missing = getMissingFields(values, feeCalc);
      expect(missing.length).toBeGreaterThan(0);
    });
  });

  describe("validateQuoteForSync", () => {
    it("should pass validation when all required fields present", () => {
      const values: Partial<QuoteFormFields> = {
        monthlyRevenueRange: "10k-50k",
        industry: "Technology",
        numEntities: 2,
        statesFiled: 3,
        internationalFiling: false,
        numBusinessOwners: 1,
        include1040s: true,
      };
      const feeCalc = { includesTaas: true } as FeeCalculation;

      const result = validateQuoteForSync(values as QuoteFormFields, feeCalc);
      
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("should fail validation when fields are missing", () => {
      const values: Partial<QuoteFormFields> = {
        monthlyRevenueRange: "10k-50k",
      };
      const feeCalc = { includesTaas: true } as FeeCalculation;

      const result = validateQuoteForSync(values as QuoteFormFields, feeCalc);
      
      expect(result.isValid).toBe(false);
      expect(result.missingFields.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should include missing fields in error message", () => {
      const values: Partial<QuoteFormFields> = {
        monthlyRevenueRange: "10k-50k",
      };
      const feeCalc = { includesTaas: true } as FeeCalculation;

      const result = validateQuoteForSync(values as QuoteFormFields, feeCalc);
      
      expect(result.errors[0]).toContain("Missing required fields:");
    });
  });

  describe("formatValidationErrors", () => {
    it("should return empty string for valid result", () => {
      const result = {
        isValid: true,
        missingFields: [],
        errors: [],
      };

      const formatted = formatValidationErrors(result);
      expect(formatted).toBe("");
    });

    it("should format field names using display names", () => {
      const result = {
        isValid: false,
        missingFields: ["monthlyRevenueRange", "industry"],
        errors: ["test error"],
      };

      const formatted = formatValidationErrors(result);
      expect(formatted).toContain("Monthly Revenue Range");
      expect(formatted).toContain("Industry");
    });

    it("should handle unknown field names gracefully", () => {
      const result = {
        isValid: false,
        missingFields: ["unknownField"],
        errors: ["test error"],
      };

      const formatted = formatValidationErrors(result);
      expect(formatted).toContain("unknownField");
    });
  });

  describe("FIELD_DISPLAY_NAMES", () => {
    it("should have user-friendly names for all validated fields", () => {
      expect(FIELD_DISPLAY_NAMES.monthlyRevenueRange).toBe("Monthly Revenue Range");
      expect(FIELD_DISPLAY_NAMES.industry).toBe("Industry");
      expect(FIELD_DISPLAY_NAMES.numEntities).toBe("Number of Entities");
      expect(FIELD_DISPLAY_NAMES.statesFiled).toBe("States Filed");
      expect(FIELD_DISPLAY_NAMES.internationalFiling).toBe("International Filing");
      expect(FIELD_DISPLAY_NAMES.numBusinessOwners).toBe("Number of Business Owners");
      expect(FIELD_DISPLAY_NAMES.include1040s).toBe("Include 1040s");
    });
  });
});

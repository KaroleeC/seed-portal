/**
 * Quote Sanitization Utilities Tests
 * 
 * Tests for sanitizeQuoteFields and prepareQuoteForValidation
 */

import { describe, it, expect } from "vitest";
import { sanitizeQuoteFields, prepareQuoteForValidation } from "../quote-sanitization";

describe("sanitizeQuoteFields", () => {
  it("should convert empty string fee fields to '0'", () => {
    const input = {
      monthlyFee: "",
      setupFee: "",
      taasMonthlyFee: "",
      cleanupComplexity: "",
    };

    const result = sanitizeQuoteFields(input);

    expect(result.monthlyFee).toBe("0");
    expect(result.setupFee).toBe("0");
    expect(result.taasMonthlyFee).toBe("0");
    expect(result.cleanupComplexity).toBe("0");
  });

  it("should convert undefined fee fields to '0'", () => {
    const input = {
      monthlyFee: undefined,
      setupFee: undefined,
    };

    const result = sanitizeQuoteFields(input);

    expect(result.monthlyFee).toBe("0");
    expect(result.setupFee).toBe("0");
  });

  it("should preserve valid fee field values", () => {
    const input = {
      monthlyFee: "1500.00",
      setupFee: "500.00",
    };

    const result = sanitizeQuoteFields(input);

    expect(result.monthlyFee).toBe("1500.00");
    expect(result.setupFee).toBe("500.00");
  });

  it("should convert empty string integer fields to null", () => {
    const input = {
      cleanupMonths: "",
      numEntities: "",
      statesFiled: "",
    };

    const result = sanitizeQuoteFields(input);

    expect(result.cleanupMonths).toBeNull();
    expect(result.numEntities).toBeNull();
    expect(result.statesFiled).toBeNull();
  });

  it("should convert undefined integer fields to null", () => {
    const input = {
      cleanupMonths: undefined,
      customNumEntities: undefined,
    };

    const result = sanitizeQuoteFields(input);

    expect(result.cleanupMonths).toBeNull();
    expect(result.customNumEntities).toBeNull();
  });

  it("should preserve valid integer field values", () => {
    const input = {
      cleanupMonths: 6,
      numEntities: 2,
      statesFiled: 3,
    };

    const result = sanitizeQuoteFields(input);

    expect(result.cleanupMonths).toBe(6);
    expect(result.numEntities).toBe(2);
    expect(result.statesFiled).toBe(3);
  });

  it("should not modify other fields", () => {
    const input = {
      contactEmail: "test@example.com",
      companyName: "Test Company",
      monthlyFee: "",
      customField: "custom value",
    };

    const result = sanitizeQuoteFields(input);

    expect(result.contactEmail).toBe("test@example.com");
    expect(result.companyName).toBe("Test Company");
    expect(result.customField).toBe("custom value");
  });

  it("should handle mixed empty and valid fields", () => {
    const input = {
      monthlyFee: "1000.00",
      setupFee: "",
      cleanupMonths: 6,
      numEntities: "",
    };

    const result = sanitizeQuoteFields(input);

    expect(result.monthlyFee).toBe("1000.00");
    expect(result.setupFee).toBe("0");
    expect(result.cleanupMonths).toBe(6);
    expect(result.numEntities).toBeNull();
  });

  it("should not mutate the original object", () => {
    const input = {
      monthlyFee: "",
      setupFee: "500.00",
    };

    const result = sanitizeQuoteFields(input);

    expect(input.monthlyFee).toBe("");
    expect(result.monthlyFee).toBe("0");
  });
});

describe("prepareQuoteForValidation", () => {
  it("should add default values for missing required fields", () => {
    const input = {};

    const result = prepareQuoteForValidation(input);

    expect(result.monthlyFee).toBe("0");
    expect(result.setupFee).toBe("0");
    expect(result.taasMonthlyFee).toBe("0");
    expect(result.taasPriorYearsFee).toBe("0");
    expect(result.monthlyTransactions).toBe("N/A");
    expect(result.cleanupComplexity).toBe("0");
    expect(result.cleanupMonths).toBe(0);
    expect(result.monthlyRevenueRange).toBe("Not specified");
    expect(result.industry).toBe("Not specified");
  });

  it("should preserve existing values when present", () => {
    const input = {
      monthlyFee: "2000.00",
      setupFee: "1000.00",
      monthlyTransactions: "300-500",
      cleanupMonths: 12,
      monthlyRevenueRange: "$100K-$500K",
      industry: "Professional Services",
    };

    const result = prepareQuoteForValidation(input);

    expect(result.monthlyFee).toBe("2000.00");
    expect(result.setupFee).toBe("1000.00");
    expect(result.monthlyTransactions).toBe("300-500");
    expect(result.cleanupMonths).toBe(12);
    expect(result.monthlyRevenueRange).toBe("$100K-$500K");
    expect(result.industry).toBe("Professional Services");
  });

  it("should handle TaaS-only quotes correctly", () => {
    const input = {
      taasMonthlyFee: "500.00",
      taasPriorYearsFee: "1500.00",
      // Missing bookkeeping fields
    };

    const result = prepareQuoteForValidation(input);

    expect(result.taasMonthlyFee).toBe("500.00");
    expect(result.taasPriorYearsFee).toBe("1500.00");
    expect(result.monthlyTransactions).toBe("N/A");
    expect(result.cleanupComplexity).toBe("0");
    expect(result.cleanupMonths).toBe(0);
  });

  it("should override null/empty values with defaults", () => {
    const input = {
      monthlyFee: null,
      setupFee: "",
      monthlyTransactions: undefined,
    };

    const result = prepareQuoteForValidation(input);

    expect(result.monthlyFee).toBe("0");
    expect(result.setupFee).toBe("0");
    expect(result.monthlyTransactions).toBe("N/A");
  });

  it("should preserve additional fields not in defaults", () => {
    const input = {
      contactEmail: "test@example.com",
      companyName: "Test LLC",
      customField: "value",
    };

    const result = prepareQuoteForValidation(input);

    expect(result.contactEmail).toBe("test@example.com");
    expect(result.companyName).toBe("Test LLC");
    expect(result.customField).toBe("value");
  });
});

describe("sanitizeQuoteFields + prepareQuoteForValidation integration", () => {
  it("should work together for complete quote processing", () => {
    const rawBody = {
      contactEmail: "client@example.com",
      monthlyFee: "",
      setupFee: "500.00",
      cleanupMonths: "",
      numEntities: 2,
    };

    // Step 1: Sanitize
    const sanitized = sanitizeQuoteFields(rawBody);

    expect(sanitized.monthlyFee).toBe("0");
    expect(sanitized.setupFee).toBe("500.00");
    expect(sanitized.cleanupMonths).toBeNull();
    expect(sanitized.numEntities).toBe(2);

    // Step 2: Prepare for validation
    const prepared = prepareQuoteForValidation(sanitized);

    expect(prepared.monthlyFee).toBe("0");
    expect(prepared.setupFee).toBe("500.00");
    expect(prepared.monthlyTransactions).toBe("N/A");
    expect(prepared.cleanupMonths).toBe(0); // Note: null becomes 0 in prepare
    expect(prepared.industry).toBe("Not specified");
    expect(prepared.contactEmail).toBe("client@example.com");
  });
});

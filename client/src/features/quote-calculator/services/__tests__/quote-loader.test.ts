/**
 * Quote Loader Tests
 *
 * Comprehensive tests for quote loading service.
 * Tests form view determination, data mapping, and numeric conversions.
 */

import { describe, it, expect } from "vitest";
import { determineFormView, mapQuoteToFormFields, getCriticalNumericFields } from "../quote-loader";
import type { Quote } from "@shared/schema";

describe("quote-loader", () => {
  describe("determineFormView", () => {
    it("should return 'bookkeeping' for quotes with bookkeeping services", () => {
      const quote = {
        id: 1,
        serviceMonthlyBookkeeping: true,
      } as Quote;

      const view = determineFormView(quote);
      expect(view).toBe("bookkeeping");
    });

    it("should return 'bookkeeping' for quotes with cleanup projects", () => {
      const quote = {
        id: 1,
        serviceCleanupProjects: true,
      } as Quote;

      const view = determineFormView(quote);
      expect(view).toBe("bookkeeping");
    });

    it("should return 'taas' for quotes with TaaS services only", () => {
      const quote = {
        id: 1,
        serviceTaasMonthly: true,
        serviceMonthlyBookkeeping: false,
      } as Quote;

      const view = determineFormView(quote);
      expect(view).toBe("taas");
    });

    it("should return 'taas' for quotes with prior year filings only", () => {
      const quote = {
        id: 1,
        servicePriorYearFilings: true,
        serviceMonthlyBookkeeping: false,
      } as Quote;

      const view = determineFormView(quote);
      expect(view).toBe("taas");
    });

    it("should prioritize bookkeeping over TaaS when both present", () => {
      const quote = {
        id: 1,
        serviceMonthlyBookkeeping: true,
        serviceTaasMonthly: true,
      } as Quote;

      const view = determineFormView(quote);
      expect(view).toBe("bookkeeping");
    });

    it("should return 'bookkeeping' for quotes with only other services", () => {
      const quote = {
        id: 1,
        servicePayrollService: true,
        serviceMonthlyBookkeeping: false,
        serviceTaasMonthly: false,
      } as Quote;

      const view = determineFormView(quote);
      expect(view).toBe("bookkeeping");
    });

    it("should return 'bookkeeping' as default fallback", () => {
      const quote = {
        id: 1,
        // No services selected
      } as Quote;

      const view = determineFormView(quote);
      expect(view).toBe("bookkeeping");
    });
  });

  describe("mapQuoteToFormFields", () => {
    it("should map all basic fields correctly", () => {
      const quote = {
        id: 1,
        contactEmail: "test@example.com",
        companyName: "Test Company",
        contactName: "John Doe",
        monthlyRevenueRange: "10k-50k",
        industry: "Technology",
        entityType: "LLC",
      } as Quote;

      const fields = mapQuoteToFormFields(quote);

      expect(fields.contactEmail).toBe("test@example.com");
      expect(fields.companyName).toBe("Test Company");
      expect(fields.contactName).toBe("John Doe");
      expect(fields.monthlyRevenueRange).toBe("10k-50k");
      expect(fields.industry).toBe("Technology");
      expect(fields.entityType).toBe("LLC");
    });

    it("should handle fallback email fields", () => {
      const quote1 = {
        id: 1,
        email: "fallback@example.com",
      } as Quote;

      const fields1 = mapQuoteToFormFields(quote1);
      expect(fields1.contactEmail).toBe("fallback@example.com");

      const quote2 = {
        id: 2,
        contactEmail: "primary@example.com",
        email: "fallback@example.com",
      } as Quote;

      const fields2 = mapQuoteToFormFields(quote2);
      expect(fields2.contactEmail).toBe("primary@example.com");
    });

    it("should handle fallback company name fields", () => {
      const quote1 = {
        id: 1,
        company_name: "Fallback Company",
      } as Quote;

      const fields1 = mapQuoteToFormFields(quote1);
      expect(fields1.companyName).toBe("Fallback Company");

      const quote2 = {
        id: 2,
        companyName: "Primary Company",
        company_name: "Fallback Company",
      } as Quote;

      const fields2 = mapQuoteToFormFields(quote2);
      expect(fields2.companyName).toBe("Primary Company");
    });

    it("should convert numeric fields correctly", () => {
      const quote = {
        id: 1,
        numEntities: "3",
        statesFiled: "5",
        numBusinessOwners: "2",
        priorYearsUnfiled: "1",
      } as any;

      const fields = mapQuoteToFormFields(quote);

      expect(fields.numEntities).toBe(3);
      expect(fields.statesFiled).toBe(5);
      expect(fields.numBusinessOwners).toBe(2);
      expect(fields.priorYearsUnfiled).toBe(1);
    });

    it("should handle missing numeric fields with defaults", () => {
      const quote = {
        id: 1,
        // No numeric fields set
      } as Quote;

      const fields = mapQuoteToFormFields(quote);

      expect(fields.numEntities).toBe(1);
      expect(fields.statesFiled).toBe(1);
      expect(fields.numBusinessOwners).toBe(1);
      expect(fields.priorYearsUnfiled).toBe(0);
    });

    it("should handle boolean fields with defaults", () => {
      const quote1 = {
        id: 1,
        includesBookkeeping: true,
        includesTaas: false,
        internationalFiling: true,
      } as Quote;

      const fields1 = mapQuoteToFormFields(quote1);

      expect(fields1.includesBookkeeping).toBe(true);
      expect(fields1.includesTaas).toBe(false);
      expect(fields1.internationalFiling).toBe(true);

      const quote2 = {
        id: 2,
        // No boolean fields set
      } as Quote;

      const fields2 = mapQuoteToFormFields(quote2);

      expect(fields2.includesBookkeeping).toBe(true); // Default
      expect(fields2.includesTaas).toBe(false); // Default
      expect(fields2.internationalFiling).toBe(false); // Default
    });

    it("should handle override fields correctly", () => {
      const quote = {
        id: 1,
        overrideCleanupFee: true,
        overrideSetupFee: false,
        customSetupFee: 1000,
        customMonthlyFee: 2000,
        overrideReason: "Special discount",
      } as Quote;

      const fields = mapQuoteToFormFields(quote);

      expect(fields.overrideCleanupFee).toBe(true);
      expect(fields.overrideSetupFee).toBe(false);
      expect(fields.customSetupFee).toBe("1000");
      expect(fields.customMonthlyFee).toBe("2000");
      expect(fields.overrideReason).toBe("Special discount");
    });

    it("should convert custom fee numbers to strings", () => {
      const quote = {
        id: 1,
        customSetupFee: 500,
        customMonthlyFee: 1500,
        customCleanupFee: 2000,
      } as Quote;

      const fields = mapQuoteToFormFields(quote);

      expect(fields.customSetupFee).toBe("500");
      expect(fields.customMonthlyFee).toBe("1500");
      expect(fields.customCleanupFee).toBe("2000");
    });

    it("should handle service tier fields", () => {
      const quote = {
        id: 1,
        serviceTier: "Guided",
        apServiceTier: "advanced",
        arServiceTier: "lite",
      } as Quote;

      const fields = mapQuoteToFormFields(quote);

      expect(fields.serviceTier).toBe("Guided");
      expect(fields.apServiceTier).toBe("advanced");
      expect(fields.arServiceTier).toBe("lite");
    });

    it("should handle CFO Advisory fields", () => {
      const quote = {
        id: 1,
        cfoAdvisoryType: "bundle",
        cfoAdvisoryBundleHours: 16,
      } as Quote;

      const fields = mapQuoteToFormFields(quote);

      expect(fields.cfoAdvisoryType).toBe("bundle");
      expect(fields.cfoAdvisoryBundleHours).toBe(16);
    });

    it("should handle payroll fields", () => {
      const quote = {
        id: 1,
        payrollEmployeeCount: 50,
        payrollStateCount: 3,
      } as Quote;

      const fields = mapQuoteToFormFields(quote);

      expect(fields.payrollEmployeeCount).toBe(50);
      expect(fields.payrollStateCount).toBe(3);
    });

    it("should handle AP/AR fields", () => {
      const quote = {
        id: 1,
        apVendorBillsBand: "50-100",
        apVendorCount: 25,
        arCustomerInvoicesBand: "100-200",
        arCustomerCount: 50,
      } as Quote;

      const fields = mapQuoteToFormFields(quote);

      expect(fields.apVendorBillsBand).toBe("50-100");
      expect(fields.apVendorCount).toBe(25);
      expect(fields.arCustomerInvoicesBand).toBe("100-200");
      expect(fields.arCustomerCount).toBe(50);
    });

    it("should handle array fields", () => {
      const quote = {
        id: 1,
        priorYearFilings: [{ year: 2023, fee: 1500 }],
        cleanupPeriods: [{ month: "2024-01", fee: 100 }],
      } as any;

      const fields = mapQuoteToFormFields(quote);

      expect(fields.priorYearFilings).toEqual([{ year: 2023, fee: 1500 }]);
      expect(fields.cleanupPeriods).toEqual([{ month: "2024-01", fee: 100 }]);
    });
  });

  describe("getCriticalNumericFields", () => {
    it("should extract critical numeric fields", () => {
      const quote = {
        id: 1,
        entityType: "LLC",
        numEntities: "3",
        statesFiled: "5",
        numBusinessOwners: "2",
        priorYearsUnfiled: "1",
        bookkeepingQuality: "Clean (Seed)",
      } as any;

      const critical = getCriticalNumericFields(quote);

      expect(critical.entityType).toBe("LLC");
      expect(critical.numEntities).toBe(3);
      expect(critical.statesFiled).toBe(5);
      expect(critical.numBusinessOwners).toBe(2);
      expect(critical.priorYearsUnfiled).toBe(1);
      expect(critical.bookkeepingQuality).toBe("Clean (Seed)");
    });

    it("should return undefined for missing fields", () => {
      const quote = {
        id: 1,
        // No critical fields set
      } as Quote;

      const critical = getCriticalNumericFields(quote);

      expect(critical.entityType).toBeUndefined();
      expect(critical.numEntities).toBeUndefined();
      expect(critical.statesFiled).toBeUndefined();
      expect(critical.numBusinessOwners).toBeUndefined();
      expect(critical.priorYearsUnfiled).toBeUndefined();
      expect(critical.bookkeepingQuality).toBeUndefined();
    });

    it("should handle zero values correctly", () => {
      const quote = {
        id: 1,
        numEntities: 0,
        statesFiled: 0,
        numBusinessOwners: 0,
        priorYearsUnfiled: 0,
      } as Quote;

      const critical = getCriticalNumericFields(quote);

      expect(critical.numEntities).toBe(0);
      expect(critical.statesFiled).toBe(0);
      expect(critical.numBusinessOwners).toBe(0);
      expect(critical.priorYearsUnfiled).toBe(0);
    });
  });
});

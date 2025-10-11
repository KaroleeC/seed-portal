import { quoteFormSchema } from "./schema";
import { formSchema } from "../../components/quote-form/QuoteFormSchema";

describe("Quote Form Schema", () => {
  describe("Schema Parity", () => {
    it("should have the same fields in both schemas", () => {
      // Both schemas are ZodEffects (due to superRefine), so they reference the same underlying schema
      // They should be functionally identical
      expect(quoteFormSchema).toBe(formSchema);
    });

    it("should have the same default values for fields with defaults", () => {
      // Test fields that have defaults with a minimal valid object
      const minimalValidData = {
        contactEmail: "test@example.com",
        monthlyRevenueRange: "10K-25K",
        monthlyTransactions: "1-50",
        industry: "Software/SaaS",
        cleanupMonths: 1,
        cleanupComplexity: "1.0",
      };

      const quoteFormDefaults = quoteFormSchema.parse(minimalValidData);
      const formDefaults = formSchema.parse(minimalValidData);

      // Compare specific fields with defaults
      expect(quoteFormDefaults.serviceMonthlyBookkeeping).toEqual(
        formDefaults.serviceMonthlyBookkeeping
      );
      expect(quoteFormDefaults.serviceTaasMonthly).toEqual(formDefaults.serviceTaasMonthly);
      expect(quoteFormDefaults.serviceCleanupProjects).toEqual(formDefaults.serviceCleanupProjects);
      expect(quoteFormDefaults.servicePriorYearFilings).toEqual(
        formDefaults.servicePriorYearFilings
      );
      expect(quoteFormDefaults.serviceCfoAdvisory).toEqual(formDefaults.serviceCfoAdvisory);
      expect(quoteFormDefaults.servicePayrollService).toEqual(formDefaults.servicePayrollService);
      expect(quoteFormDefaults.serviceApArService).toEqual(formDefaults.serviceApArService);
      expect(quoteFormDefaults.serviceArService).toEqual(formDefaults.serviceArService);
      expect(quoteFormDefaults.serviceFpaBuild).toEqual(formDefaults.serviceFpaBuild);
      expect(quoteFormDefaults.serviceFpaSupport).toEqual(formDefaults.serviceFpaSupport);
      expect(quoteFormDefaults.serviceNexusStudy).toEqual(formDefaults.serviceNexusStudy);
      expect(quoteFormDefaults.serviceEntityOptimization).toEqual(
        formDefaults.serviceEntityOptimization
      );
      expect(quoteFormDefaults.serviceCostSegregation).toEqual(formDefaults.serviceCostSegregation);
      expect(quoteFormDefaults.serviceRdCredit).toEqual(formDefaults.serviceRdCredit);
      expect(quoteFormDefaults.serviceRealEstateAdvisory).toEqual(
        formDefaults.serviceRealEstateAdvisory
      );
      expect(quoteFormDefaults.serviceAgentOfService).toEqual(formDefaults.serviceAgentOfService);
      expect(quoteFormDefaults.clientCountry).toEqual(formDefaults.clientCountry);
      expect(quoteFormDefaults.companyNameLocked).toEqual(formDefaults.companyNameLocked);
      expect(quoteFormDefaults.contactFirstNameLocked).toEqual(formDefaults.contactFirstNameLocked);
      expect(quoteFormDefaults.contactLastNameLocked).toEqual(formDefaults.contactLastNameLocked);
      expect(quoteFormDefaults.industryLocked).toEqual(formDefaults.industryLocked);
      expect(quoteFormDefaults.companyAddressLocked).toEqual(formDefaults.companyAddressLocked);
      expect(quoteFormDefaults.payrollEmployeeCount).toEqual(formDefaults.payrollEmployeeCount);
      expect(quoteFormDefaults.payrollStateCount).toEqual(formDefaults.payrollStateCount);
    });
  });

  describe("Roundtrip Parse/Stringify", () => {
    it("should maintain data integrity through parse/stringify cycles", () => {
      // Test data with various field types (including required fields)
      const testData = {
        contactEmail: "test@example.com",
        monthlyTransactions: "1-50",
        monthlyRevenueRange: "10K-25K",
        industry: "Software/SaaS",
        entityType: "LLC",
        cleanupMonths: 12,
        cleanupComplexity: "1.0",
        serviceMonthlyBookkeeping: true,
        serviceTaasMonthly: false,
        serviceCleanupProjects: true,
        servicePriorYearFilings: false,
        serviceCfoAdvisory: true,
        servicePayrollService: false,
        serviceApArService: true,
        serviceArService: false,
        serviceFpaBuild: true,
        serviceFpaSupport: false,
        serviceNexusStudy: true,
        serviceEntityOptimization: false,
        serviceCostSegregation: true,
        serviceRdCredit: false,
        serviceRealEstateAdvisory: true,
        serviceAgentOfService: false,
        clientStreetAddress: "123 Main St",
        clientCity: "Anytown",
        clientState: "CA",
        clientZipCode: "12345",
        clientCountry: "US",
        numEntities: 3,
        statesFiled: 2,
        internationalFiling: false,
        numBusinessOwners: 1,
        include1040s: true,
        priorYearsUnfiled: 0,
        qboSubscription: true,
        serviceTier: "Guided",
        approvalCode: "ABC123",
        accountingBasis: "Accrual",
        businessLoans: false,
        currentBookkeepingSoftware: "QuickBooks",
        primaryBank: "Bank of America",
        merchantProviders: ["Stripe", "PayPal"],
        apVendorBillsBand: "1-100",
        apVendorCount: 50,
        apServiceTier: "lite",
        arCustomerInvoicesBand: "1-100",
        arCustomerCount: 75,
        arServiceTier: "advanced",
        cfoAdvisoryType: "pay_as_you_go",
        cfoAdvisoryBundleHours: 10,
        cfoAdvisoryHubspotProductId: "12345",
      };

      // Parse the data with both schemas
      const quoteFormParsed = quoteFormSchema.parse(testData);
      const formParsed = formSchema.parse(testData);

      // Stringify both parsed results
      const quoteFormStringified = JSON.stringify(quoteFormParsed);
      const formStringified = JSON.stringify(formParsed);

      // Parse again to ensure roundtrip integrity
      const quoteFormRoundtrip = quoteFormSchema.parse(JSON.parse(quoteFormStringified));
      const formRoundtrip = formSchema.parse(JSON.parse(formStringified));

      // Compare the roundtrip results
      expect(quoteFormRoundtrip).toEqual(formRoundtrip);
    });
  });
});

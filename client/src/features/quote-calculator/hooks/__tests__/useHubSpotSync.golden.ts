/*
  useHubSpotSync Golden Tests (lightweight harness)
  Run with: npm run test:hubspot:sync
*/

import type { QuoteFormFields } from "../../schema";
import type { FeeCalculation } from "../../../../components/seedqc/types";
import { decideHubSpotAction, buildEnhancedFormData } from "../useHubSpotSync";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (e: any) {
    console.error(`❌ ${name} -> ${e?.message || e}`);
    throw e;
  }
}

(function main() {
  try {
    // 1. decideHubSpotAction branching
    run("decide: save_then_create", () => {
      const action = decideHubSpotAction({
        hasHubSpotIds: false,
        hasUnsavedChanges: true,
        editingQuoteId: null,
      });
      assert(action === "save_then_create", `expected save_then_create, got ${action}`);
    });

    run("decide: update_quote_then_update", () => {
      const action = decideHubSpotAction({
        hasHubSpotIds: true,
        hasUnsavedChanges: true,
        editingQuoteId: 123,
      });
      assert(
        action === "update_quote_then_update",
        `expected update_quote_then_update, got ${action}`
      );
    });

    run("decide: update_then_create", () => {
      const action = decideHubSpotAction({
        hasHubSpotIds: false,
        hasUnsavedChanges: false,
        editingQuoteId: 456,
      });
      assert(action === "update_then_create", `expected update_then_create, got ${action}`);
    });

    run("decide: error_save_first", () => {
      const action = decideHubSpotAction({
        hasHubSpotIds: false,
        hasUnsavedChanges: false,
        editingQuoteId: null,
      });
      assert(action === "error_save_first", `expected error_save_first, got ${action}`);
    });

    // 2. buildEnhancedFormData contract shape
    run("buildEnhancedFormData includes derived fee strings", () => {
      const formValues = {
        contactEmail: "a@example.com",
        monthlyRevenueRange: "25K-75K",
        monthlyTransactions: "100-300",
        industry: "Professional Services",
        entityType: "LLC",
        cleanupMonths: 6,
        cleanupComplexity: "1.0",
        overrideReason: "",
        customOverrideReason: "",
        customSetupFee: "",
        companyName: "Acme",
        quoteType: "bookkeeping",
        serviceMonthlyBookkeeping: true,
        serviceTaasMonthly: false,
        serviceCleanupProjects: false,
        servicePriorYearFilings: false,
        serviceCfoAdvisory: false,
        servicePayrollService: false,
        serviceApArService: false,
        serviceArService: false,
        serviceFpaBuild: false,
        serviceFpaSupport: false,
        serviceNexusStudy: false,
        serviceEntityOptimization: false,
        serviceCostSegregation: false,
        serviceRdCredit: false,
        serviceRealEstateAdvisory: false,
        includesBookkeeping: true,
        includesTaas: false,
        numEntities: 1,
        statesFiled: 1,
        internationalFiling: false,
        numBusinessOwners: 1,
        include1040s: false,
        priorYearsUnfiled: 0,
        qboSubscription: false,
        serviceTier: "Automated",
        accountingBasis: "Accrual",
        businessLoans: false,
        currentBookkeepingSoftware: "QuickBooks Online",
        otherBookkeepingSoftware: "",
        primaryBank: "",
        otherPrimaryBank: "",
        additionalBanks: [],
        otherAdditionalBanks: [],
        merchantProviders: [],
        otherMerchantProvider: "",
        serviceAgentOfService: false,
        agentOfServiceAdditionalStates: 0,
        agentOfServiceComplexCase: false,
        approvalCode: "",
        // extras from form schema that may not be used here
        contactFirstName: "",
        contactLastName: "",
        clientStreetAddress: "",
        clientCity: "",
        clientState: "",
        clientZipCode: "",
        clientCountry: "US",
        companyNameLocked: false,
        contactFirstNameLocked: false,
        contactLastNameLocked: false,
        industryLocked: false,
        companyAddressLocked: false,
        bookkeepingQuality: "Clean (Seed)",
        priorYearFilings: [],
        cleanupPeriods: [],
        apVendorBillsBand: "",
        apVendorCount: 0,
        customApVendorCount: null,
        apServiceTier: "lite",
        arCustomerInvoicesBand: "",
        arCustomerCount: 0,
        customArCustomerCount: null,
        arServiceTier: "advanced",
        cfoAdvisoryType: "",
        cfoAdvisoryBundleHours: 8,
        cfoAdvisoryHubspotProductId: "",
        payrollEmployeeCount: 1,
        payrollStateCount: 1,
      } as unknown as QuoteFormFields;

      const f: FeeCalculation = {
        combined: { monthlyFee: 500, setupFee: 1000 },
        bookkeeping: { monthlyFee: 350, setupFee: 0 },
        taas: { monthlyFee: 300, setupFee: 0 },
        priorYearFilingsFee: 0,
        cleanupProjectFee: 0,
        cfoAdvisoryFee: 0,
        payrollFee: 0,
        apFee: 0,
        arFee: 0,
        agentOfServiceFee: 0,
        serviceTierFee: 79,
        qboFee: 60,
        includesBookkeeping: true,
        includesTaas: false,
      };

      const payload = buildEnhancedFormData(formValues, f);
      assert(
        payload.monthlyFee === "500",
        `monthlyFee should be string '500', got ${payload.monthlyFee}`
      );
      assert(
        payload.setupFee === "1000",
        `setupFee should be string '1000', got ${payload.setupFee}`
      );
      assert(
        payload.bookkeepingMonthlyFee === "350",
        `bookkeepingMonthlyFee should be '350', got ${payload.bookkeepingMonthlyFee}`
      );
      assert(
        payload.taasMonthlyFee === "300",
        `taasMonthlyFee should be '300', got ${payload.taasMonthlyFee}`
      );
      assert(
        payload.serviceTierFee === "79",
        `serviceTierFee should be '79', got ${payload.serviceTierFee}`
      );
      // Optional fields present
      assert("apFee" in payload, "apFee missing");
      assert("arFee" in payload, "arFee missing");
    });

    console.log("\nAll HubSpot sync hook tests passed ✅");
  } catch (e) {
    console.error("\nHubSpot sync hook tests failed ❌");
    throw e;
  }
})();

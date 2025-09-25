/*
  Pricing Golden Test Suite
  Run with: npm run test:pricing:golden

  This suite exercises shared/pricing.ts end-to-end via calculateQuotePricing
  and toUiPricing. It uses a lightweight harness (no Vitest/Jest) so it can
  run in CI today without further tooling. Acceptance: ≥ 20 passing tests.
*/

import {
  calculateQuotePricing,
  calculatePricingDisplay,
  toUiPricing,
  PRICING_CONSTANTS,
  type QuotePricingInput,
} from "../pricing.ts";

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

function baseBkInput(): QuotePricingInput {
  return {
    monthlyRevenueRange: "25K-75K",
    monthlyTransactions: "100-300",
    industry: "Professional Services",
    serviceMonthlyBookkeeping: true,
    qboSubscription: false,
  };
}

function baseTaasInput(): QuotePricingInput {
  return {
    monthlyRevenueRange: "25K-75K",
    industry: "Professional Services",
    serviceTaasMonthly: true,
    includesTaas: true,
    numEntities: 1,
    statesFiled: 1,
    internationalFiling: false,
    numBusinessOwners: 1,
    include1040s: false,
  };
}

(function main() {
  try {
    // 1. Bookkeeping before/after discount (with TaaS)
    run("BK + TaaS applies 50% discount to BK", () => {
      const input: QuotePricingInput = {
        ...baseBkInput(),
        ...baseTaasInput(),
      };
      const result = calculateQuotePricing(input);
      const expectedBkBefore = Math.round(
        (PRICING_CONSTANTS.baseMonthlyFee +
          PRICING_CONSTANTS.txSurcharge["100-300"]) *
          PRICING_CONSTANTS.revenueMultipliers["25K-75K"] *
          PRICING_CONSTANTS.industryMultipliers["Professional Services"].monthly,
      );
      assert(expectedBkBefore === 550, `expected BK pre-discount 550, got ${expectedBkBefore}`);
      assert(result.bookkeeping.monthlyFee === 275, `BK after discount expected 275, got ${result.bookkeeping.monthlyFee}`);
    });

    // 2. QBO line item not discounted
    run("QBO fee is separate and not discounted", () => {
      const input: QuotePricingInput = {
        ...baseBkInput(),
        ...baseTaasInput(),
        qboSubscription: true,
      };
      const ui = calculatePricingDisplay(input);
      const qboFee = (ui as any).qboFee as number | undefined;
      assert(qboFee === 60, `qboFee expected 60, got ${qboFee}`);
      assert(ui.bookkeeping.monthlyFee === 275, `BK after discount should remain 275, got ${ui.bookkeeping.monthlyFee}`);
      const parts =
        ui.bookkeeping.monthlyFee +
        ui.taas.monthlyFee +
        ui.serviceTierFee +
        ui.payrollFee +
        ui.apFee +
        ui.arFee +
        (ui as any).qboFee;
      assert(parts === ui.totalMonthlyFee, `sum of parts ${parts} != totalMonthlyFee ${ui.totalMonthlyFee}`);
    });

    // 3. TaaS rounds to nearest 25
    run("TaaS monthly rounds to nearest 25", () => {
      const input: QuotePricingInput = {
        ...baseTaasInput(),
        monthlyRevenueRange: "10K-25K",
      };
      const result = calculateQuotePricing(input);
      assert(result.taas.monthlyFee === 200, `TaaS monthly expected 200, got ${result.taas.monthlyFee}`);
    });

    // 4. BK setup fee formula uses current month and > 0
    run("BK setup fee formula computed with current month", () => {
      const input: QuotePricingInput = baseBkInput();
      const result = calculateQuotePricing(input);
      const currentMonth = new Date().getMonth() + 1;
      const expectedBkBefore = Math.round(
        (PRICING_CONSTANTS.baseMonthlyFee +
          PRICING_CONSTANTS.txSurcharge["100-300"]) *
          PRICING_CONSTANTS.revenueMultipliers["25K-75K"] *
          PRICING_CONSTANTS.industryMultipliers["Professional Services"].monthly,
      );
      const expectedSetup = Math.round(expectedBkBefore * currentMonth * 0.25);
      assert(result.bookkeeping.setupFee === expectedSetup, `BK setup expected ${expectedSetup}, got ${result.bookkeeping.setupFee}`);
      assert(result.bookkeeping.setupFee > 0, "BK setup should be > 0");
    });

    // 5-7. Tier fees reflected in totals
    run("Tier fees: Automated=0, Guided=79, Concierge=249", () => {
      const auto = calculateQuotePricing({ ...baseBkInput(), serviceTier: "Automated" }).serviceTierFee;
      const guided = calculateQuotePricing({ ...baseBkInput(), serviceTier: "Guided" }).serviceTierFee;
      const conc = calculateQuotePricing({ ...baseBkInput(), serviceTier: "Concierge" }).serviceTierFee;
      assert(auto === 0, `Automated expected 0, got ${auto}`);
      assert(guided === 79, `Guided expected 79, got ${guided}`);
      assert(conc === 249, `Concierge expected 249, got ${conc}`);
    });

    // 8. Cleanup fee totals
    run("Cleanup fee: $100 per selected month", () => {
      const input: QuotePricingInput = {
        ...baseBkInput(),
        serviceCleanupProjects: true,
        cleanupPeriods: ["Jan", "Feb", "Mar"],
      } as any;
      const result = calculateQuotePricing(input);
      assert((result as any).cleanupProjectFee === 300, `cleanupProjectFee expected 300, got ${(result as any).cleanupProjectFee}`);
      assert(result.combined.setupFee >= 300, "combined setup should include cleanup fee");
    });

    // 9. Prior year filings fee totals
    run("Prior year filings: $1500 per year", () => {
      const input: QuotePricingInput = {
        ...baseBkInput(),
        servicePriorYearFilings: true,
        priorYearFilings: ["2022", "2023"],
      } as any;
      const result = calculateQuotePricing(input);
      assert((result as any).priorYearFilingsFee === 3000, `priorYearFilingsFee expected 3000, got ${(result as any).priorYearFilingsFee}`);
      assert(result.combined.setupFee >= 3000, "combined setup should include prior-year filings fee");
    });

    // 10. Monotonic tx bands (BK monthly non-decreasing)
    run("BK monthly is non-decreasing across tx bands", () => {
      const txBands = ["<100", "100-300", "300-600", "600-1000", "1000-2000", "2000+"] as const;
      let last = 0;
      for (const band of txBands) {
        const fee = calculateQuotePricing({
          ...baseBkInput(),
          monthlyTransactions: band,
        }).bookkeeping.monthlyFee;
        assert(fee >= last, `tx band ${band} produced ${fee} < ${last}`);
        last = fee;
      }
    });

    // 11. Monotonic revenue bands (BK monthly non-decreasing)
    run("BK monthly is non-decreasing across revenue bands", () => {
      const revBands = ["<$10K", "10K-25K", "25K-75K", "75K-250K", "250K-1M", "1M+"] as const;
      let last = 0;
      for (const band of revBands) {
        const fee = calculateQuotePricing({
          ...baseBkInput(),
          monthlyRevenueRange: band,
          monthlyTransactions: "<100",
        }).bookkeeping.monthlyFee;
        assert(fee >= last, `revenue band ${band} produced ${fee} < ${last}`);
        last = fee;
      }
    });

    // 12. Industry multiplier effect (BK monthly higher for higher multiplier)
    run("Industry multiplier increases BK monthly", () => {
      const base = calculateQuotePricing({ ...baseBkInput(), industry: "Software/SaaS" }).bookkeeping.monthlyFee;
      const rest = calculateQuotePricing({ ...baseBkInput(), industry: "Restaurant/Food Service" }).bookkeeping.monthlyFee;
      assert(rest >= base, `Restaurant BK ${rest} should be >= Software ${base}`);
    });

    // 13. TaaS owner upcharge (6 owners > 5 owners)
    run("TaaS owner upcharge after 5 owners", () => {
      const base5 = calculateQuotePricing({ ...baseTaasInput(), numBusinessOwners: 5 }).taas.monthlyFee;
      const six = calculateQuotePricing({ ...baseTaasInput(), numBusinessOwners: 6 }).taas.monthlyFee;
      assert(six > base5, `6 owners fee ${six} should be > 5 owners ${base5}`);
    });

    // 14. TaaS entity upcharge (6 entities > 5 entities)
    run("TaaS entity upcharge after 5 entities", () => {
      const base5 = calculateQuotePricing({ ...baseTaasInput(), numEntities: 5 }).taas.monthlyFee;
      const six = calculateQuotePricing({ ...baseTaasInput(), numEntities: 6 }).taas.monthlyFee;
      assert(six > base5, `6 entities fee ${six} should be > 5 entities ${base5}`);
    });

    // 15. TaaS state upcharge (>1 state adds fee)
    run("TaaS state upcharge above 1 state", () => {
      const one = calculateQuotePricing({ ...baseTaasInput(), statesFiled: 1 }).taas.monthlyFee;
      const three = calculateQuotePricing({ ...baseTaasInput(), statesFiled: 3 }).taas.monthlyFee;
      assert(three > one, `3 states fee ${three} should be > 1 state ${one}`);
    });

    // 16. TaaS personal 1040 effect
    run("TaaS includes 1040s increases fee", () => {
      const no1040 = calculateQuotePricing({ ...baseTaasInput(), include1040s: false }).taas.monthlyFee;
      const yes1040 = calculateQuotePricing({ ...baseTaasInput(), include1040s: true }).taas.monthlyFee;
      assert(yes1040 > no1040, `include1040s true ${yes1040} should be > false ${no1040}`);
    });

    // 17. AP advanced >= lite
    run("AP advanced tier >= lite", () => {
      const lite = calculateQuotePricing({
        ...baseBkInput(),
        serviceApArService: true,
        apServiceTier: "lite",
        apVendorBillsBand: "26-100",
        apVendorCount: 5,
      } as any);
      const adv = calculateQuotePricing({
        ...baseBkInput(),
        serviceApArService: true,
        apServiceTier: "advanced",
        apVendorBillsBand: "26-100",
        apVendorCount: 5,
      } as any);
      assert(adv.apFee >= lite.apFee, `AP advanced ${adv.apFee} >= lite ${lite.apFee}`);
    });

    // 18. AR advanced >= lite
    run("AR advanced tier >= lite", () => {
      const lite = calculateQuotePricing({
        ...baseBkInput(),
        serviceArService: true,
        arServiceTier: "lite",
        arCustomerInvoicesBand: "26-100",
        arCustomerCount: 5,
      } as any);
      const adv = calculateQuotePricing({
        ...baseBkInput(),
        serviceArService: true,
        arServiceTier: "advanced",
        arCustomerInvoicesBand: "26-100",
        arCustomerCount: 5,
      } as any);
      assert(adv.arFee >= lite.arFee, `AR advanced ${adv.arFee} >= lite ${lite.arFee}`);
    });

    // 19. Agent of Service fee included in setup
    run("Agent of Service fee included in setup", () => {
      const result = calculateQuotePricing({
        ...baseBkInput(),
        serviceAgentOfService: true,
        agentOfServiceAdditionalStates: 2,
        agentOfServiceComplexCase: true,
      } as any);
      assert((result as any).agentOfServiceFee > 0, "agentOfServiceFee should be > 0");
      assert(result.combined.setupFee >= (result as any).agentOfServiceFee, "setup should include agent of service fee");
    });

    // 20. Cleanup-only case has zero BK monthly
    run("Cleanup-only yields BK monthly 0 and setup > 0", () => {
      const result = calculateQuotePricing({
        monthlyRevenueRange: "25K-75K",
        monthlyTransactions: "100-300",
        industry: "Professional Services",
        serviceCleanupProjects: true,
        cleanupPeriods: ["Jan", "Feb"],
      } as any);
      assert(result.bookkeeping.monthlyFee === 0, `BK monthly expected 0, got ${result.bookkeeping.monthlyFee}`);
      assert((result as any).cleanupProjectFee === 200, `cleanupProjectFee expected 200, got ${(result as any).cleanupProjectFee}`);
      assert(result.combined.setupFee >= 200, "setup should include cleanup fee");
    });

    // 21. QBO not discounted difference check
    run("Turning on QBO increases total by 60, BK unchanged", () => {
      const off = calculateQuotePricing({ ...baseBkInput(), ...baseTaasInput(), qboSubscription: false });
      const on = calculateQuotePricing({ ...baseBkInput(), ...baseTaasInput(), qboSubscription: true });
      assert(on.combined.monthlyFee - off.combined.monthlyFee === 60, `total diff expected 60, got ${on.combined.monthlyFee - off.combined.monthlyFee}`);
      assert(on.bookkeeping.monthlyFee === off.bookkeeping.monthlyFee, "BK monthly should be unchanged by QBO");
    });

    // 22. Concierge tier increases total by 249 vs Automated
    run("Concierge total monthly higher by 249 vs Automated", () => {
      const auto = calculateQuotePricing({ ...baseBkInput(), serviceTier: "Automated" });
      const conc = calculateQuotePricing({ ...baseBkInput(), serviceTier: "Concierge" });
      assert(conc.combined.monthlyFee - auto.combined.monthlyFee === 249, `concierge-auto diff expected 249, got ${conc.combined.monthlyFee - auto.combined.monthlyFee}`);
    });

    console.log("\nAll pricing golden tests passed ✅");
  } catch (e) {
    console.error("\nPricing golden tests failed ❌");
    throw e;
  }
})();

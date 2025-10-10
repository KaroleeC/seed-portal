/*
  Lightweight shared pricing tests (no test runner)
  Run with: npm run test:pricing
*/

import {
  calculatePricingDisplay,
  calculateQuotePricing,
  toUiPricing,
  PRICING_CONSTANTS,
  type QuotePricingInput,
} from "../shared/pricing.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function log(title: string, obj?: unknown) {
  console.log(`\n=== ${title} ===`);
  if (obj !== undefined) console.log(obj);
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
    // Test 1: Bundle discount (Bookkeeping + TaaS)
    run("Bundle discount applies to bookkeeping and totals map via adapter", () => {
      const input: QuotePricingInput = {
        // Core
        monthlyRevenueRange: "25K-75K", // revenueMult = 2.2
        monthlyTransactions: "100-300", // txUpcharge = 100
        industry: "Professional Services", // monthlyMult = 1.0
        // Bookkeeping monthly
        serviceMonthlyBookkeeping: true,
        // TaaS
        serviceTaasMonthly: true,
        includesTaas: true,
        numEntities: 1,
        statesFiled: 1,
        internationalFiling: false,
        numBusinessOwners: 1,
        include1040s: false,
        // QBO off for this test
        qboSubscription: false,
      };

      const result = calculateQuotePricing(input);
      const ui = toUiPricing(result);

      // Bookkeeping before discount (based on constants):
      // base 150 + tx 100 = 250; * revenue 2.2 * industry 1.0 = 550 (rounded by Math.round)
      const expectedBkBefore = Math.round(
        (PRICING_CONSTANTS.baseMonthlyFee + PRICING_CONSTANTS.txSurcharge["100-300"]) *
          PRICING_CONSTANTS.revenueMultipliers["25K-75K"] *
          PRICING_CONSTANTS.industryMultipliers["Professional Services"].monthly
      );
      assert(expectedBkBefore === 550, `expected BK before discount 550, got ${expectedBkBefore}`);

      // After discount (50% and then roundToNearest25) => 275
      const expectedBkAfter = 275;
      const bkAfter = result.bookkeeping.monthlyFee;
      assert(
        bkAfter === expectedBkAfter,
        `bookkeeping.monthlyFee expected ${expectedBkAfter}, got ${bkAfter}`
      );

      // Discount breakdown
      const before = (result.bookkeeping as any).breakdown?.monthlyFeeBeforeDiscount;
      const after = (result.bookkeeping as any).breakdown?.monthlyFeeAfterDiscount;
      assert(
        before === expectedBkBefore,
        `breakdown.before expected ${expectedBkBefore}, got ${before}`
      );
      assert(
        after === expectedBkAfter,
        `breakdown.after expected ${expectedBkAfter}, got ${after}`
      );

      // UI adapter totals map to combined
      assert(ui.totalMonthlyFee === result.combined.monthlyFee, "ui.totalMonthlyFee mismatch");
      assert(ui.totalSetupFee === result.combined.setupFee, "ui.totalSetupFee mismatch");
    });

    // Test 2: QBO line item is included (60) and not discounted
    run("QBO fee is 60 and not discounted in bundle", () => {
      const input: QuotePricingInput = {
        monthlyRevenueRange: "25K-75K",
        monthlyTransactions: "100-300",
        industry: "Professional Services",
        serviceMonthlyBookkeeping: true,
        serviceTaasMonthly: true,
        includesTaas: true,
        numEntities: 1,
        statesFiled: 1,
        internationalFiling: false,
        numBusinessOwners: 1,
        include1040s: false,
        qboSubscription: true,
      };

      const ui = calculatePricingDisplay(input);
      // Ensure adapter exposes totals and packageDiscountMonthly
      const pkgDisc = (ui as any).packageDiscountMonthly as number | undefined;
      assert(typeof pkgDisc === "number" && pkgDisc > 0, "packageDiscountMonthly missing or zero");

      // QBO line item should be 60 and included in totalMonthlyFee
      const qboFee = (ui as any).qboFee as number | undefined;
      assert(qboFee === 60, `qboFee expected 60, got ${qboFee}`);

      // Ensure BK discount still 50% of pre-discount 550 => 275 (already verified above)
      assert(
        ui.bookkeeping.monthlyFee === 275,
        `BK monthly with discount expected 275, got ${ui.bookkeeping.monthlyFee}`
      );

      // Combined monthly must include qboFee
      const sumOfParts =
        ui.bookkeeping.monthlyFee +
        ui.taas.monthlyFee +
        ui.serviceTierFee +
        ui.payrollFee +
        ui.apFee +
        ui.arFee +
        (ui as any).qboFee;
      assert(
        sumOfParts === ui.totalMonthlyFee,
        `sumOfParts ${sumOfParts} != totalMonthlyFee ${ui.totalMonthlyFee}`
      );
    });

    // Test 3: TaaS rounding to nearest 25
    run("TaaS monthly rounds to nearest 25", () => {
      const input: QuotePricingInput = {
        monthlyRevenueRange: "10K-25K", // revenueMult = 1.2
        monthlyTransactions: "100-300",
        industry: "Professional Services",
        serviceTaasMonthly: true,
        includesTaas: true,
        numEntities: 1,
        statesFiled: 1,
        internationalFiling: false,
        numBusinessOwners: 1,
        include1040s: false,
      };

      const result = calculateQuotePricing(input);
      // TaaS: base 150, no surcharges => beforeMultipliers = 150
      // industry monthly 1.0 * revenue 1.2 => raw 180 => roundToNearest25 = 200
      assert(
        result.taas.monthlyFee === 200,
        `TaaS monthly expected 200, got ${result.taas.monthlyFee}`
      );
    });

    // Test 4: Bookkeeping setup fee formula produces a positive value using current month
    run("Bookkeeping setup fee is computed from formula and positive", () => {
      const input: QuotePricingInput = {
        monthlyRevenueRange: "25K-75K",
        monthlyTransactions: "100-300",
        industry: "Professional Services",
        serviceMonthlyBookkeeping: true,
      };

      const result = calculateQuotePricing(input);
      const currentMonth = new Date().getMonth() + 1;
      const expectedBkBefore = Math.round(
        (PRICING_CONSTANTS.baseMonthlyFee + PRICING_CONSTANTS.txSurcharge["100-300"]) *
          PRICING_CONSTANTS.revenueMultipliers["25K-75K"] *
          PRICING_CONSTANTS.industryMultipliers["Professional Services"].monthly
      );
      const expectedSetup = Math.round(expectedBkBefore * currentMonth * 0.25);
      assert(
        result.bookkeeping.setupFee === expectedSetup,
        `bookkeeping.setupFee expected ${expectedSetup}, got ${result.bookkeeping.setupFee}`
      );
      assert(result.bookkeeping.setupFee > 0, "bookkeeping.setupFee should be > 0");
    });

    log("All tests passed ✅");
    process.exit(0);
  } catch (e) {
    log("Tests failed ❌");
    process.exit(1);
  }
})();

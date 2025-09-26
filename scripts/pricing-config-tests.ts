/*
  Dynamic PricingConfig tests (no test runner)
  Run with: npm run test:pricing:config
*/

import {
  calculateQuotePricing,
  calculatePricingDisplay,
  type QuotePricingInput,
  type PricingConfig,
} from "../shared/pricing.ts";

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
    // Base input used across tests
    const base: QuotePricingInput = {
      monthlyRevenueRange: "25K-75K",
      monthlyTransactions: "100-300",
      industry: "Professional Services",
      // Bookkeeping
      serviceMonthlyBookkeeping: true,
      // TaaS
      serviceTaasMonthly: true,
      includesTaas: true,
      numEntities: 1,
      statesFiled: 1,
      internationalFiling: false,
      numBusinessOwners: 1,
      include1040s: false,
    };

    run("Config disables TaaS -> no discount, TaaS monthly 0", () => {
      const config: PricingConfig = {
        services: { taas: { enabled: false } },
      };
      const ui = calculatePricingDisplay(base, config);
      assert(
        ui.taas.monthlyFee === 0,
        `TaaS monthly expected 0, got ${ui.taas.monthlyFee}`,
      );
      // When TaaS disabled, discount should not be applied
      const discountApplied = (ui.bookkeeping as any).breakdown
        ?.discountApplied;
      assert(
        !discountApplied,
        "Discount should not be applied when TaaS disabled",
      );
      // combined total should equal BK + tier + payroll/ap/ar (all zero) + qbo (0 here)
      const sum =
        ui.bookkeeping.monthlyFee +
        ui.serviceTierFee +
        ui.payrollFee +
        ui.apFee +
        ui.arFee +
        (ui as any).qboFee;
      assert(
        sum === ui.totalMonthlyFee,
        `sum ${sum} != totalMonthlyFee ${ui.totalMonthlyFee}`,
      );
    });

    run("Config rounding step 10 -> TaaS monthly divisible by 10", () => {
      const config: PricingConfig = {
        services: { taas: { enabled: true } },
        rounding: { monthlyStep: 10 },
      };
      const ui = calculatePricingDisplay(base, config);
      assert(
        ui.taas.monthlyFee % 10 === 0,
        `TaaS monthly not divisible by 10: ${ui.taas.monthlyFee}`,
      );
      // With bundle, bookkeeping discount should also round to step 10
      const bkAfter = ui.bookkeeping.monthlyFee;
      assert(
        bkAfter % 10 === 0,
        `BK monthly after discount not divisible by 10: ${bkAfter}`,
      );
    });

    run("Config disables QBO -> qboFee 0 despite subscription", () => {
      const input: QuotePricingInput = { ...base, qboSubscription: true };
      const config: PricingConfig = {
        services: { qbo: { enabled: false } },
      };
      const ui = calculatePricingDisplay(input, config);
      const qboFee = (ui as any).qboFee as number | undefined;
      assert(qboFee === 0, `qboFee expected 0 when disabled, got ${qboFee}`);
    });

    run("Config baseMonthlyFee override affects BK monthly", () => {
      const input: QuotePricingInput = {
        ...base,
        serviceTaasMonthly: false,
        includesTaas: false,
      };
      const config: PricingConfig = {
        fees: { baseMonthlyFee: 200 },
      };
      const result = calculateQuotePricing(input, config);
      // expected: base 200 + tx 100 = 300; * revenue 2.2 * industry 1.0 => 660 (no discount)
      assert(
        result.bookkeeping.monthlyFee === 660,
        `BK monthly expected 660, got ${result.bookkeeping.monthlyFee}`,
      );
      // setup should still be computed from afterMultipliers and current month
      assert(result.bookkeeping.setupFee > 0, "setup fee should be > 0");
    });

    console.log("\nAll PricingConfig tests passed ✅");
    process.exit(0);
  } catch (e) {
    console.error("\nPricingConfig tests failed ❌");
    process.exit(1);
  }
})();

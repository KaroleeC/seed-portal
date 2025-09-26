import { buildServiceConfig } from "../server/services/hubspot/compose.ts";
import { calculateCombinedFees } from "../shared/pricing.ts";

function assert(condition: any, message: string) {
  if (!condition) throw new Error(message);
}

function log(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function testBuildServiceConfigBasic() {
  log("buildServiceConfig - basic bookkeeping only");
  const quote: any = {
    contactEmail: "test@example.com",
    serviceBookkeeping: true,
    monthlyRevenueRange: "25K-75K",
    monthlyTransactions: "300-600",
    industry: "Software/SaaS",
    serviceTier: "Automated",
    qboSubscription: false,
  };

  const cfg = buildServiceConfig(quote);
  const calc = calculateCombinedFees(quote);

  assert(cfg.includes.bookkeeping === true, "bookkeeping should be included");
  assert(cfg.includes.taas === false, "taas should not be included");
  assert(cfg.fees.bookkeepingMonthly >= 0, "bk monthly non-negative");
  assert(
    cfg.fees.combinedMonthly === calc.combined.monthlyFee,
    "combined monthly matches",
  );
  assert(
    cfg.fees.combinedSetup === calc.combined.setupFee,
    "combined setup matches",
  );
}

async function testBuildServiceConfigBundle() {
  log("buildServiceConfig - bookkeeping + taas bundle");
  const quote: any = {
    contactEmail: "bundle@example.com",
    serviceBookkeeping: true,
    serviceTaas: true,
    monthlyRevenueRange: "75K-250K",
    monthlyTransactions: "600-1000",
    industry: "E-commerce/Retail",
    numEntities: 3,
    statesFiled: 2,
    internationalFiling: false,
    numBusinessOwners: 2,
    include1040s: false,
    serviceTier: "Guided",
    qboSubscription: true,
  };

  const cfg = buildServiceConfig(quote);
  const calc = calculateCombinedFees(quote);

  assert(cfg.includes.bookkeeping === true, "bookkeeping should be included");
  assert(cfg.includes.taas === true, "taas should be included");
  assert(cfg.fees.bookkeepingMonthly >= 0, "bk monthly non-negative");
  assert(cfg.fees.taasMonthly >= 0, "taas monthly non-negative");
  assert(
    cfg.fees.combinedMonthly === calc.combined.monthlyFee,
    "combined monthly matches",
  );
  assert(
    cfg.fees.combinedSetup === calc.combined.setupFee,
    "combined setup matches",
  );
}

async function run() {
  await testBuildServiceConfigBasic();
  await testBuildServiceConfigBundle();
  console.log("\n✅ service-config-tests passed");
}

run().catch((err) => {
  console.error("❌ service-config-tests failed", err);
});

import { syncQuoteToHubSpot } from "../server/services/hubspot/sync.ts";
import { storage } from "../server/storage.ts";
import { HubSpotService } from "../server/hubspot.ts";

function assert(condition: any, message: string) {
  if (!condition) throw new Error(message);
}

async function testCreatePath() {
  console.log("\n=== syncQuoteToHubSpot - create path ===");
  // Ensure constructor won't throw
  (process as any).env.HUBSPOT_ACCESS_TOKEN = "test";

  // Mock quote missing HubSpot IDs
  const originalGetQuote = storage.getQuote;
  const originalUpdateQuote = storage.updateQuote;

  storage.getQuote = async (id: number) =>
    ({
      id,
      contactEmail: "alice@example.com",
      monthlyRevenueRange: "25K-75K",
      monthlyTransactions: "300-600",
      industry: "Software/SaaS",
      serviceBookkeeping: true,
      serviceTaas: true,
      numEntities: 2,
      statesFiled: 1,
      internationalFiling: false,
      numBusinessOwners: 2,
      include1040s: false,
      serviceTier: "Automated",
    }) as any;

  let updatedPayload: any = null;
  storage.updateQuote = async (payload: any) => {
    updatedPayload = payload;
    return payload as any;
  };

  const svc = new HubSpotService();
  (svc as any).verifyContactByEmail = async (email: string) => ({
    verified: true,
    contact: {
      id: "contact-1",
      properties: {
        email,
        firstname: "Alice",
        lastname: "Smith",
        company: "ACME",
      },
    },
  });
  (svc as any).getOwnerByEmail = async () => "owner-1";
  (svc as any).createDeal = async () => ({ id: "deal-1", properties: {} });
  (svc as any).createQuote = async () => ({
    id: "quote-1",
    title: "Test Quote",
  });

  const result = await syncQuoteToHubSpot(101, "create", "owner@example.com", svc as any);
  console.log("Result:", result);

  assert(result.success === true, "create should succeed");
  assert(result.hubspotDealId === "deal-1", "deal id should be deal-1");
  assert(result.hubspotQuoteId === "quote-1", "quote id should be quote-1");
  assert(
    updatedPayload && updatedPayload.hubspotQuoteId === "quote-1",
    "storage.updateQuote should persist IDs"
  );

  // restore
  storage.getQuote = originalGetQuote;
  storage.updateQuote = originalUpdateQuote;
}

async function testUpdatePath() {
  console.log("\n=== syncQuoteToHubSpot - update path ===");
  (process as any).env.HUBSPOT_ACCESS_TOKEN = "test";

  const originalGetQuote = storage.getQuote;
  storage.getQuote = async (id: number) =>
    ({
      id,
      contactEmail: "bob@example.com",
      monthlyRevenueRange: "75K-250K",
      monthlyTransactions: "600-1000",
      industry: "E-commerce/Retail",
      serviceBookkeeping: true,
      serviceTaas: true,
      numEntities: 3,
      statesFiled: 2,
      internationalFiling: false,
      numBusinessOwners: 2,
      include1040s: false,
      serviceTier: "Guided",
      hubspotDealId: "deal-9",
      hubspotQuoteId: "quote-9",
    }) as any;

  const svc = new HubSpotService();
  (svc as any).verifyContactByEmail = async (email: string) => ({
    verified: true,
    contact: {
      id: "contact-2",
      properties: {
        email,
        firstname: "Bob",
        lastname: "Lee",
        company: "Widgets",
      },
    },
  });
  (svc as any).getOwnerByEmail = async () => "owner-2";
  (svc as any).updateDeal = async (dealId: string) => ({
    id: dealId,
    properties: {},
  });
  (svc as any).updateQuote = async () => true;

  const result = await syncQuoteToHubSpot(202, "update", "owner@example.com", svc as any);
  console.log("Result:", result);

  assert(result.success === true, "update should succeed");
  assert(result.hubspotDealId === "deal-9", "deal id should be deal-9");
  assert(result.hubspotQuoteId === "quote-9", "quote id should be quote-9");

  storage.getQuote = originalGetQuote;
}

async function run() {
  await testCreatePath();
  await testUpdatePath();
  console.log("\n✅ sync-tests passed");
}

run().catch((err) => {
  console.error("❌ sync-tests failed", err);
});

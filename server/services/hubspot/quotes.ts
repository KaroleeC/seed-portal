import type { HubSpotRequestFn } from "./http.js";
import { mapFeesToLineItems, validateLineItems } from "./fee-mapper.js";

type ProductIds = {
  MONTHLY_BOOKKEEPING: string;
  MONTHLY_BOOKKEEPING_SETUP: string;
  CLEANUP_PROJECT: string;
  TAAS: string;
  MANAGED_QBO_SUBSCRIPTION: string;
  PRIOR_YEAR_FILINGS: string;
  // Service tier product IDs removed - no longer used for pricing
  CFO_ADVISORY_DEPOSIT: string;
  PAYROLL_SERVICE: string;
  AP_LITE_SERVICE: string;
  AP_ADVANCED_SERVICE: string;
  AR_LITE_SERVICE: string;
  AR_ADVANCED_SERVICE: string;
  AGENT_OF_SERVICE: string;
};

/**
 * Configuration for creating or updating a HubSpot quote
 * Replaces the fragile 33-parameter function signature
 */
export interface QuoteConfig {
  // Core identifiers
  dealId: string;
  companyName: string;

  // Totals
  monthlyFee: number;
  oneTimeFees: number; // Renamed from setupFee for clarity

  // User/owner info
  userEmail: string;
  firstName: string;
  lastName: string;

  // Service flags
  includesBookkeeping?: boolean;
  includesTaas?: boolean;
  includesPayroll?: boolean;
  includesAP?: boolean;
  includesAR?: boolean;
  includesAgentOfService?: boolean;
  includesCfoAdvisory?: boolean;
  includesFpaBuild?: boolean;

  // Service fees (individual line items)
  taasMonthlyFee?: number;
  bookkeepingMonthlyFee?: number;
  bookkeepingSetupFee?: number;
  payrollFee?: number;
  apFee?: number;
  arFee?: number;
  agentOfServiceFee?: number;
  cfoAdvisoryFee?: number;
  cleanupProjectFee?: number;
  priorYearFilingsFee?: number;
  fpaServiceFee?: number;

  // Calculated fees (for display/breakdown)
  calculatedBookkeepingMonthlyFee?: number;
  calculatedTaasMonthlyFee?: number;
  calculatedServiceTierFee?: number;

  // Quote data (full quote object for assumptions/terms generation)
  quoteData?: any;

  // Service tier
  serviceTier?: string;
}

/**
 * Configuration for updating an existing HubSpot quote
 * Extends QuoteConfig with quote ID and makes dealId optional
 */
export interface UpdateQuoteConfig extends Omit<QuoteConfig, "dealId"> {
  quoteId: string;
  dealId?: string; // Optional for updates
}

export function createQuotesService(
  request: HubSpotRequestFn,
  deps: {
    getUserProfile: (email: string) => Promise<{
      firstName?: string;
      lastName?: string;
      companyName?: string;
      companyAddress?: string;
      companyAddress2?: string;
      companyCity?: string;
      companyState?: string;
      companyZip?: string;
      companyCountry?: string;
    } | null>;
    getProductsCached: () => Promise<any[]>;
    updateDeal: (
      dealId: string,
      monthlyFee: number,
      setupFee: number,
      ownerId?: string,
      includesBookkeeping?: boolean,
      includesTaas?: boolean,
      serviceTier?: string,
      quoteData?: any
    ) => Promise<any | null>;
    HUBSPOT_PRODUCT_IDS: ProductIds;
  }
) {
  const PRODUCT = deps.HUBSPOT_PRODUCT_IDS;

  async function doesQuoteExist(quoteId: string): Promise<boolean> {
    try {
      const result = await request(`/crm/v3/objects/quotes/${quoteId}`, {
        method: "GET",
      });
      return !!result?.id;
    } catch {
      return false;
    }
  }

  async function associateProductWithQuote(
    quoteId: string,
    productId: string,
    price: number,
    quantity: number,
    customName?: string
  ): Promise<void> {
    const product = await request(`/crm/v3/objects/products/${productId}`);
    const nativeName = product?.properties?.name || "Service";

    const lineItem = {
      properties: {
        name: nativeName,
        price: price.toString(),
        quantity: quantity.toString(),
        hs_product_id: productId,
        hs_sku: product?.properties?.hs_sku || productId,
        description: `Seed Financial - ${nativeName}`,
        ...(customName ? { name_override: customName } : {}),
      },
    } as any;

    const lineItemResult = await request("/crm/v3/objects/line_items", {
      method: "POST",
      body: JSON.stringify(lineItem),
    });

    const associationBody = {
      inputs: [
        {
          from: { id: quoteId },
          to: { id: lineItemResult.id },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 67 }],
        },
      ],
    };

    await request("/crm/v4/associations/quotes/line_items/batch/create", {
      method: "POST",
      body: JSON.stringify(associationBody),
    });
  }

  /**
   * Create initial line items for a quote using the fee mapping layer
   *
   * @param quoteId - HubSpot quote ID
   * @param serviceConfig - Service configuration (legacy format for backward compatibility)
   */
  async function createInitialServiceLineItems(quoteId: string, serviceConfig: any): Promise<void> {
    // Convert legacy serviceConfig to QuoteConfig format
    const quoteConfig: QuoteConfig = {
      dealId: "", // Not needed for line items
      companyName: "", // Not needed for line items
      monthlyFee: serviceConfig.monthlyFee || 0,
      oneTimeFees: serviceConfig.setupFee || 0,
      userEmail: "", // Not needed for line items
      firstName: "", // Not needed for line items
      lastName: "", // Not needed for line items
      includesBookkeeping: serviceConfig.includesBookkeeping,
      includesTaas: serviceConfig.includesTaas,
      taasMonthlyFee: serviceConfig.taasMonthlyFee,
      bookkeepingMonthlyFee: serviceConfig.bookkeepingMonthlyFee,
      bookkeepingSetupFee: serviceConfig.bookkeepingSetupFee,
      quoteData: {
        apServiceTier: serviceConfig.apServiceTier,
        arServiceTier: serviceConfig.arServiceTier,
        qboSubscription: serviceConfig.qboSubscription,
        qboFee: serviceConfig.qboFee,
      },
      includesPayroll: serviceConfig.includesPayroll,
      payrollFee: serviceConfig.payrollFee,
      includesAP: serviceConfig.includesAP,
      apFee: serviceConfig.apFee,
      includesAR: serviceConfig.includesAR,
      arFee: serviceConfig.arFee,
      includesAgentOfService: serviceConfig.includesAgentOfService,
      agentOfServiceFee: serviceConfig.agentOfServiceFee,
      includesCfoAdvisory: serviceConfig.includesCfoAdvisory,
      cfoAdvisoryFee: serviceConfig.cfoAdvisoryFee,
      cleanupProjectFee: serviceConfig.cleanupProjectFee,
      priorYearFilingsFee: serviceConfig.priorYearFilingsFee,
      includesFpaBuild: serviceConfig.includesFpaBuild,
      fpaServiceFee: serviceConfig.fpaServiceFee,
    };

    // Use the fee mapping layer to generate line items
    const lineItems = mapFeesToLineItems(quoteConfig, PRODUCT);

    // Validate line items before creating
    const validation = validateLineItems(quoteConfig, lineItems);
    if (!validation.valid) {
      console.warn("[HubSpot] Line item validation warnings:", validation.warnings);
    }

    // Create line items in HubSpot
    for (const item of lineItems) {
      await associateProductWithQuote(quoteId, item.productId, item.price, 1, null as any);
    }
  }

  async function fetchExistingLineItems(quoteId: string): Promise<
    Array<{
      id: string;
      productId: string;
      price: number;
      quantity: number;
      name: string;
    }>
  > {
    const associations = await request(
      `/crm/v4/objects/quotes/${quoteId}/associations/line_items`,
      { method: "GET" }
    );
    if (!associations?.results?.length) return [];
    const lineItems = await Promise.all(
      associations.results.map(async (association: any) => {
        try {
          const lineItem = await request(
            `/crm/v3/objects/line_items/${association.toObjectId}?properties=name,price,quantity,hs_product_id,hs_sku`
          );
          return {
            id: lineItem.id,
            productId: lineItem.properties?.hs_product_id || "",
            price: parseFloat(lineItem.properties?.price || "0"),
            quantity: parseFloat(lineItem.properties?.quantity || "1"),
            name: lineItem.properties?.name || "Unknown Service",
          };
        } catch {
          return null;
        }
      })
    );
    return lineItems.filter((x) => x !== null) as any[];
  }

  function analyzeLineItemChanges(
    existingItems: Array<{
      id: string;
      productId: string;
      price: number;
      quantity: number;
      name: string;
    }>,
    requiredServices: Array<{ price: number; productId: string }>
  ) {
    const toUpdate: Array<{
      id: string;
      productId: string;
      oldPrice: number;
      newPrice: number;
    }> = [];
    const toDelete: Array<{ id: string; productId: string; name: string }> = [];
    const toAdd: Array<{ price: number; productId: string }> = [];

    const existingByProductId = new Map(existingItems.map((i) => [i.productId, i]));
    const requiredByProductId = new Map(requiredServices.map((s) => [s.productId, s]));

    for (const existingItem of existingItems) {
      const requiredService = requiredByProductId.get(existingItem.productId);
      if (!requiredService) {
        toDelete.push({
          id: existingItem.id,
          productId: existingItem.productId,
          name: existingItem.name,
        });
      } else if (Math.abs(existingItem.price - requiredService.price) > 0.01) {
        toUpdate.push({
          id: existingItem.id,
          productId: existingItem.productId,
          oldPrice: existingItem.price,
          newPrice: requiredService.price,
        });
      }
    }

    for (const requiredService of requiredServices) {
      if (!existingByProductId.has(requiredService.productId)) toAdd.push(requiredService);
    }

    return { toUpdate, toDelete, toAdd };
  }

  async function executeLineItemChanges(
    quoteId: string,
    changes: {
      toUpdate: Array<{
        id: string;
        productId: string;
        oldPrice: number;
        newPrice: number;
      }>;
      toDelete: Array<{ id: string; productId: string; name: string }>;
      toAdd: Array<{ price: number; productId: string }>;
    }
  ): Promise<boolean> {
    for (const update of changes.toUpdate) {
      try {
        await request(`/crm/v3/objects/line_items/${update.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            properties: { price: update.newPrice.toString() },
          }),
        });
      } catch {
        // continue other updates
      }
    }

    for (const deletion of changes.toDelete) {
      try {
        await request(`/crm/v3/objects/line_items/${deletion.id}`, {
          method: "DELETE",
        });
      } catch {
        // continue other deletions
      }
    }

    for (const addition of changes.toAdd) {
      try {
        await associateProductWithQuote(
          quoteId,
          addition.productId,
          addition.price,
          1,
          null as any
        );
      } catch {
        // continue other adds
      }
    }

    return true;
  }

  function generatePaymentTerms(
    includesBookkeeping: boolean,
    includesTaas: boolean,
    includesPayroll?: boolean,
    includesAP?: boolean,
    includesAR?: boolean,
    includesAgentOfService?: boolean,
    includesCfoAdvisory?: boolean,
    includesCleanup?: boolean,
    includesPriorYears?: boolean,
    includesFpaBuild?: boolean
  ): string {
    const baseTerms = `This Quote is the Order Form under Seed's MSA and the selected Service Schedule(s), which are incorporated by reference. By signing and paying, Client agrees to those documents. Pricing is based on the Assumptions listed above; material changes may adjust Bookkeeping fees prospectively per our right-sizing rule. Order of precedence: Quote → Schedule(s) → MSA. Governing law: California.

<a href="https://seedfinancial.io/legal/msa-v-2025-07-01">MSA v2025.07.01</a>`;

    const schedules: string[] = [];
    const added = new Set<string>();

    if (includesBookkeeping && !added.has("A")) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssa-v-2025-09-01">SCHEDULE A - BOOKKEEPING v2025.09.01</a>'
      );
      added.add("A");
    }
    if (includesTaas && !added.has("B")) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssb-v-2025-09-01">SCHEDULE B - TAX AS A SERVICE v2025.09.01</a>'
      );
      added.add("B");
    }
    if (includesPayroll)
      schedules.push(
        '<a href="https://www.seedfinancial.io/legal/ssc-v-2025-09-01">SCHEDULE C - PAYROLL v2025.09.01</a>'
      );
    if (includesAP)
      schedules.push(
        '<a href="https://www.seedfinancial.io/legal/ssd-v-2025-09-01">SCHEDULE D - ACCOUNTS PAYABLE v2025.09.01</a>'
      );
    if (includesAR)
      schedules.push(
        '<a href="https://www.seedfinancial.io/legal/sse-v-2025-09-01">SCHEDULE E - ACCOUNTS RECEIVABLE v2025.09.01</a>'
      );
    if (includesAgentOfService)
      schedules.push(
        '<a href="https://www.seedfinancial.io/legal/ssf-v-2025-09-01">SCHEDULE F - AGENT OF SERVICE v2025.09.01</a>'
      );
    if (includesCfoAdvisory && !added.has("A")) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssa-v-2025-09-01">SCHEDULE A - BOOKKEEPING v2025.09.01</a>'
      );
      added.add("A");
    }
    if (includesCleanup && !added.has("A")) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssa-v-2025-09-01">SCHEDULE A - BOOKKEEPING v2025.09.01</a>'
      );
      added.add("A");
    }
    if (includesPriorYears && !added.has("B")) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssb-v-2025-09-01">SCHEDULE B - TAX AS A SERVICE v2025.09.01</a>'
      );
      added.add("B");
    }
    if (includesFpaBuild && !added.has("A")) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssa-v-2025-09-01">SCHEDULE A - BOOKKEEPING v2025.09.01</a>'
      );
      added.add("A");
    }

    return schedules.length > 0 ? `${baseTerms}\n${schedules.join("\n")}` : baseTerms;
  }

  function generateScopeAssumptions(quoteData: any): string {
    const assumptions: string[] = [];
    assumptions.push("SCOPE ASSUMPTIONS:");
    assumptions.push("===================");

    if (
      quoteData.serviceBookkeeping ||
      quoteData.includesBookkeeping ||
      quoteData.serviceMonthlyBookkeeping
    ) {
      assumptions.push("");
      assumptions.push("BOOKKEEPING SERVICE:");
      assumptions.push(`• Entity Type: ${quoteData.entityType || "Not specified"}`);
      assumptions.push(
        `• Monthly Transactions: ${quoteData.monthlyTransactions || "Not specified"}`
      );
      assumptions.push(`• Months of Initial Cleanup Required: ${quoteData.cleanupMonths || 0}`);
      assumptions.push(`• Accounting Basis: ${quoteData.accountingBasis || "Not specified"}`);
      assumptions.push(
        `• QuickBooks Subscription Needed: ${quoteData.qboSubscription ? "Yes" : "No"}`
      );
    }

    if (quoteData.serviceTaas || quoteData.includesTaas || quoteData.serviceTaasMonthly) {
      assumptions.push("");
      assumptions.push("TAX AS A SERVICE (TaaS):");
      const numEntitiesText =
        quoteData.customNumEntities ?? quoteData.numEntities ?? "Not specified";
      assumptions.push(`• Number of Entities: ${numEntitiesText}`);
      const statesFiledText =
        quoteData.customStatesFiled ?? quoteData.statesFiled ?? "Not specified";
      assumptions.push(`• States Filed: ${statesFiledText}`);
      assumptions.push(
        `• International Filing Required: ${quoteData.internationalFiling ? "Yes" : "No"}`
      );
      let personal1040sText = "Not included";
      if (quoteData.include1040s) {
        const owners = quoteData.customNumBusinessOwners ?? quoteData.numBusinessOwners ?? 0;
        personal1040sText = String(owners);
      }
      assumptions.push(`• Number of Personal 1040s: ${personal1040sText}`);
    }

    if (quoteData.servicePayroll || quoteData.servicePayrollService) {
      assumptions.push("");
      assumptions.push("PAYROLL SERVICE:");
      assumptions.push(`• Employee Count: ${quoteData.payrollEmployeeCount || "Not specified"}`);
      assumptions.push(`• States Count: ${quoteData.payrollStateCount || "Not specified"}`);
    }

    if (quoteData.serviceAgentOfService) {
      assumptions.push("");
      assumptions.push("AGENT OF SERVICE:");
      assumptions.push(`• Additional States: ${quoteData.agentOfServiceAdditionalStates || 0}`);
      assumptions.push(`• Complex Case: ${quoteData.agentOfServiceComplexCase ? "Yes" : "No"}`);
    }

    if (quoteData.serviceCfoAdvisory) {
      assumptions.push("");
      assumptions.push("CFO ADVISORY SERVICE:");
      assumptions.push(`• Type: ${quoteData.cfoAdvisoryType || "Not specified"}`);
      if (quoteData.cfoAdvisoryBundleHours)
        assumptions.push(`• Bundle Hours: ${quoteData.cfoAdvisoryBundleHours}`);
    }

    if (quoteData.serviceApLite || quoteData.serviceApAdvanced || quoteData.serviceApArService) {
      assumptions.push("");
      assumptions.push("ACCOUNTS PAYABLE SERVICE:");
      assumptions.push(`• Vendor Bills Band: ${quoteData.apVendorBillsBand || "Not specified"}`);
      assumptions.push(`• Vendor Count: ${quoteData.apVendorCount || "Not specified"}`);
      assumptions.push(`• Service Tier: ${quoteData.apServiceTier || "Not specified"}`);
    }

    if (quoteData.serviceArLite || quoteData.serviceArAdvanced || quoteData.serviceArService) {
      assumptions.push("");
      assumptions.push("ACCOUNTS RECEIVABLE SERVICE:");
      assumptions.push(
        `• Customer Invoices Band: ${quoteData.arCustomerInvoicesBand || "Not specified"}`
      );
      assumptions.push(`• Customer Count: ${quoteData.arCustomerCount || "Not specified"}`);
      assumptions.push(`• Service Tier: ${quoteData.arServiceTier || "Not specified"}`);
    }

    const priorYearFilings = quoteData.priorYearFilings || [];
    if (priorYearFilings.length > 0) {
      assumptions.push("");
      assumptions.push("PRIOR YEAR FILINGS:");
      assumptions.push(`• Number of Years: ${priorYearFilings.length}`);
      assumptions.push(`• Filing Years: ${priorYearFilings.join(", ")}`);
    }

    if (quoteData.serviceCleanupProjects && quoteData.cleanupMonths > 0) {
      assumptions.push("");
      assumptions.push("CLEANUP/CATCH-UP PROJECT:");
      assumptions.push(`• Cleanup Months Required: ${quoteData.cleanupMonths}`);
      assumptions.push(`• Cleanup Periods: ${(quoteData.cleanupPeriods || []).join(", ")}`);
      if (quoteData.cleanupComplexity && quoteData.cleanupComplexity !== "0.00") {
        assumptions.push(`• Complexity Factor: ${quoteData.cleanupComplexity}`);
      }
    }

    return assumptions.join("\n");
  }

  /**
   * Create a new HubSpot quote using typed configuration
   * @param config - Quote configuration object
   * @returns Quote ID and title, or null if creation fails
   */
  async function createQuote(config: QuoteConfig): Promise<{ id: string; title: string } | null> {
    const userProfile = await deps.getUserProfile(config.userEmail);

    const services: string[] = [];
    if (
      config.includesBookkeeping ||
      config.quoteData?.serviceBookkeeping ||
      config.quoteData?.serviceMonthlyBookkeeping
    )
      services.push("Bookkeeping");
    if (
      config.includesTaas ||
      config.quoteData?.serviceTaas ||
      config.quoteData?.serviceTaasMonthly
    )
      services.push("TaaS");
    if (config.quoteData?.servicePayroll || config.quoteData?.servicePayrollService)
      services.push("Payroll");
    if (
      config.quoteData?.serviceApArLite ||
      config.quoteData?.serviceApArService ||
      config.quoteData?.serviceApLite ||
      config.quoteData?.serviceApAdvanced
    )
      services.push("AP");
    if (
      config.quoteData?.serviceArService ||
      config.quoteData?.serviceArLite ||
      config.quoteData?.serviceArAdvanced
    )
      services.push("AR");
    if (config.quoteData?.serviceAgentOfService) services.push("Agent of Service");
    if (config.quoteData?.serviceCfoAdvisory) services.push("CFO Advisory");
    if (
      config.quoteData?.serviceFpaLite ||
      config.quoteData?.serviceFpaBuild ||
      config.quoteData?.serviceFpaSupport
    )
      services.push("FP&A");
    if (config.quoteData?.serviceCleanupProjects) services.push("Cleanup");
    if (config.quoteData?.servicePriorYearFilings) services.push("Prior Year Filings");
    if (services.length === 0) services.push("Services");

    const serviceName = `${services.join(" + ")} Services`;
    const quoteName = `${config.companyName} - ${serviceName} Quote`;

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    const scopeAssumptions = config.quoteData ? generateScopeAssumptions(config.quoteData) : "";
    const paymentTerms = generatePaymentTerms(
      !!config.includesBookkeeping,
      !!config.includesTaas,
      !!config.includesPayroll,
      !!config.includesAP,
      !!config.includesAR,
      !!config.includesAgentOfService,
      !!config.includesCfoAdvisory,
      (config.cleanupProjectFee || 0) > 0,
      (config.priorYearFilingsFee || 0) > 0,
      !!config.includesFpaBuild
    );

    const quoteBody = {
      properties: {
        hs_title: quoteName,
        hs_status: "DRAFT",
        hs_expiration_date: expirationDate.toISOString().substring(0, 10),
        hs_language: "en",
        hs_sender_company_name: userProfile?.companyName || "Seed Financial",
        hs_sender_company_address:
          userProfile?.companyAddress || "4136 Del Rey Ave, Ste 521, Marina Del Rey, CA 90292",
        hs_sender_firstname: userProfile?.firstName || config.firstName || "Jon",
        hs_sender_lastname: userProfile?.lastName || config.lastName || "Wells",
        hs_sender_email: config.userEmail,
        hs_esign_enabled: true,
        hs_comments: scopeAssumptions,
        hs_terms: paymentTerms,
      },
      associations: [
        {
          to: { id: config.dealId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 64 }],
        },
      ],
    };

    const result = await request("/crm/v3/objects/quotes", {
      method: "POST",
      body: JSON.stringify(quoteBody),
    });

    try {
      await createInitialServiceLineItems(result.id, {
        includesBookkeeping: config.includesBookkeeping ?? true,
        includesTaas: config.includesTaas ?? false,
        includesPayroll: config.includesPayroll ?? false,
        includesAP: config.includesAP ?? false,
        includesAR: config.includesAR ?? false,
        includesAgentOfService: config.includesAgentOfService ?? false,
        includesCfoAdvisory: config.includesCfoAdvisory ?? false,
        cleanupProjectFee: config.cleanupProjectFee || 0,
        priorYearFilingsFee: config.priorYearFilingsFee || 0,
        includesFpaBuild: config.includesFpaBuild ?? false,
        fpaServiceFee: config.fpaServiceFee || 0,
        payrollFee: config.payrollFee || 0,
        apFee: config.apFee || 0,
        arFee: config.arFee || 0,
        agentOfServiceFee: config.agentOfServiceFee || 0,
        cfoAdvisoryFee: config.cfoAdvisoryFee || 0,
        apServiceTier: config.quoteData?.apServiceTier,
        arServiceTier: config.quoteData?.arServiceTier,
        serviceTier: config.quoteData?.serviceTier,
        serviceTierFee: config.calculatedServiceTierFee || 0,
        qboSubscription: config.quoteData?.qboSubscription ?? false,
        qboFee: config.quoteData?.qboFee || (config.quoteData?.qboSubscription ? 60 : 0),
        bookkeepingMonthlyFee: config.calculatedBookkeepingMonthlyFee || 0,
        taasMonthlyFee: config.calculatedTaasMonthlyFee || 0,
        monthlyFee: config.monthlyFee,
        setupFee: config.oneTimeFees,
        bookkeepingSetupFee: config.bookkeepingSetupFee,
      });
    } catch {
      // quote created without line items is acceptable
    }

    return { id: result.id, title: quoteName };
  }

  /**
   * Update an existing HubSpot quote using typed configuration
   * @param config - Update quote configuration object
   * @returns True if update succeeded, false if quote is expired
   */
  async function updateQuote(config: UpdateQuoteConfig): Promise<boolean> {
    const check = await request(`/crm/v3/objects/quotes/${config.quoteId}`, {
      method: "GET",
    });
    if (!check || check.properties?.hs_status === "EXPIRED") return false;

    const existingItems = await fetchExistingLineItems(config.quoteId);

    // Use the fee mapping layer to generate required line items
    const lineItems = mapFeesToLineItems(config, PRODUCT);

    // Validate line items
    const validation = validateLineItems(config, lineItems);
    if (!validation.valid) {
      console.warn("[HubSpot] Line item validation warnings:", validation.warnings);
    }

    // Convert to the format expected by analyzeLineItemChanges
    const requiredServices = lineItems.map((item) => ({
      price: item.price,
      productId: item.productId,
    }));

    const changes = analyzeLineItemChanges(existingItems, requiredServices);
    const updateSuccess = await executeLineItemChanges(config.quoteId, changes);
    if (!updateSuccess) return false;

    let serviceType = "Services";
    if (config.includesBookkeeping && config.includesTaas) serviceType = "Bookkeeping + TaaS";
    else if (config.includesTaas) serviceType = "TaaS";
    else serviceType = "Bookkeeping Services";

    const updatedTitle = `${config.companyName} - ${serviceType} Quote`;

    const scopeAssumptions = config.quoteData ? generateScopeAssumptions(config.quoteData) : "";
    const paymentTerms = generatePaymentTerms(
      !!config.includesBookkeeping,
      !!config.includesTaas,
      !!config.quoteData?.includesPayroll,
      !!config.quoteData?.includesAP,
      !!config.quoteData?.includesAR,
      !!config.quoteData?.includesAgentOfService,
      !!config.quoteData?.includesCfoAdvisory,
      (config.quoteData?.cleanupProjectFee || 0) > 0,
      (config.quoteData?.priorYearFilingsFee || 0) > 0,
      !!config.quoteData?.includesFpaBuild
    );

    const updateBody = {
      properties: {
        hs_title: updatedTitle,
        hs_comments: scopeAssumptions,
        hs_terms: paymentTerms,
      },
    };

    await request(`/crm/v3/objects/quotes/${config.quoteId}`, {
      method: "PATCH",
      body: JSON.stringify(updateBody),
    });

    if (config.dealId && updateSuccess) {
      try {
        await deps.updateDeal(
          config.dealId,
          config.monthlyFee,
          config.oneTimeFees,
          undefined,
          config.includesBookkeeping,
          config.includesTaas,
          config.serviceTier,
          config.quoteData
        );
      } catch {
        // ignore deal update failure
      }
    }

    return true;
  }

  return {
    createQuote,
    updateQuote,
    doesQuoteExist,
  };
}

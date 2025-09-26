import type { HubSpotRequestFn } from "./http.js";

type ProductIds = {
  MONTHLY_BOOKKEEPING: string;
  MONTHLY_BOOKKEEPING_SETUP: string;
  CLEANUP_PROJECT: string;
  TAAS: string;
  MANAGED_QBO_SUBSCRIPTION: string;
  PRIOR_YEAR_FILINGS: string;
  GUIDED_SERVICE_TIER: string;
  CONCIERGE_SERVICE_TIER: string;
  CFO_ADVISORY_DEPOSIT: string;
  PAYROLL_SERVICE: string;
  AP_LITE_SERVICE: string;
  AP_ADVANCED_SERVICE: string;
  AR_LITE_SERVICE: string;
  AR_ADVANCED_SERVICE: string;
  AGENT_OF_SERVICE: string;
};

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
      quoteData?: any,
    ) => Promise<any | null>;
    HUBSPOT_PRODUCT_IDS: ProductIds;
  },
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
    customName?: string,
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
          types: [
            { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 67 },
          ],
        },
      ],
    };

    await request("/crm/v4/associations/quotes/line_items/batch/create", {
      method: "POST",
      body: JSON.stringify(associationBody),
    });
  }

  async function createInitialServiceLineItems(
    quoteId: string,
    serviceConfig: any,
  ): Promise<void> {
    // Optional verification and diagnostics of product presence
    try {
      const products = await deps.getProductsCached();
      const taasFromCache = products.find((p: any) => p.id === PRODUCT.TAAS);
      if (!taasFromCache) {
        try {
          await request(`/crm/v3/objects/products/${PRODUCT.TAAS}`);
        } catch {
          // no-op; continue anyway
        }
      }
    } catch {
      // ignore cache issues
    }

    const services: Array<{ price: number; productId: string }> = [];

    if (serviceConfig.includesBookkeeping) {
      const bookkeepingPrice = serviceConfig.bookkeepingMonthlyFee;
      if (bookkeepingPrice > 0) {
        services.push({
          price: bookkeepingPrice,
          productId: PRODUCT.MONTHLY_BOOKKEEPING,
        });
      }
      const bookkeepingSetupFee = serviceConfig.bookkeepingSetupFee || 0;
      if (bookkeepingSetupFee > 0) {
        services.push({
          price: bookkeepingSetupFee,
          productId: PRODUCT.MONTHLY_BOOKKEEPING_SETUP,
        });
      }
    }

    if (serviceConfig.includesTaas) {
      const taasPrice = serviceConfig.taasMonthlyFee;
      if (taasPrice > 0) {
        services.push({ price: taasPrice, productId: PRODUCT.TAAS });
      }
    }

    if (serviceConfig.cleanupProjectFee > 0) {
      services.push({
        price: serviceConfig.cleanupProjectFee,
        productId: PRODUCT.CLEANUP_PROJECT,
      });
    }

    if (serviceConfig.priorYearFilingsFee > 0) {
      services.push({
        price: serviceConfig.priorYearFilingsFee,
        productId: PRODUCT.PRIOR_YEAR_FILINGS,
      });
    }

    if (serviceConfig.includesPayroll && serviceConfig.payrollFee > 0) {
      services.push({
        price: serviceConfig.payrollFee,
        productId: PRODUCT.PAYROLL_SERVICE,
      });
    }

    if (serviceConfig.includesAP) {
      const apProductId =
        serviceConfig.apServiceTier === "advanced"
          ? PRODUCT.AP_ADVANCED_SERVICE
          : PRODUCT.AP_LITE_SERVICE;
      if (serviceConfig.apFee > 0)
        services.push({ price: serviceConfig.apFee, productId: apProductId });
    }

    if (serviceConfig.includesAR) {
      const arProductId =
        serviceConfig.arServiceTier === "advanced"
          ? PRODUCT.AR_ADVANCED_SERVICE
          : PRODUCT.AR_LITE_SERVICE;
      if (serviceConfig.arFee > 0)
        services.push({ price: serviceConfig.arFee, productId: arProductId });
    }

    if (
      serviceConfig.includesAgentOfService &&
      serviceConfig.agentOfServiceFee > 0
    ) {
      services.push({
        price: serviceConfig.agentOfServiceFee,
        productId: PRODUCT.AGENT_OF_SERVICE,
      });
    }

    if (serviceConfig.qboSubscription) {
      const qboPrice = serviceConfig.qboFee || 60;
      services.push({
        price: qboPrice,
        productId: PRODUCT.MANAGED_QBO_SUBSCRIPTION,
      });
    }

    for (const s of services) {
      await associateProductWithQuote(
        quoteId,
        s.productId,
        s.price,
        1,
        null as any,
      );
    }
  }

  async function fetchExistingLineItems(
    quoteId: string,
  ): Promise<
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
      { method: "GET" },
    );
    if (!associations?.results?.length) return [];
    const lineItems = await Promise.all(
      associations.results.map(async (association: any) => {
        try {
          const lineItem = await request(
            `/crm/v3/objects/line_items/${association.toObjectId}?properties=name,price,quantity,hs_product_id,hs_sku`,
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
      }),
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
    requiredServices: Array<{ price: number; productId: string }>,
  ) {
    const toUpdate: Array<{
      id: string;
      productId: string;
      oldPrice: number;
      newPrice: number;
    }> = [];
    const toDelete: Array<{ id: string; productId: string; name: string }> = [];
    const toAdd: Array<{ price: number; productId: string }> = [];

    const existingByProductId = new Map(
      existingItems.map((i) => [i.productId, i]),
    );
    const requiredByProductId = new Map(
      requiredServices.map((s) => [s.productId, s]),
    );

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
      if (!existingByProductId.has(requiredService.productId))
        toAdd.push(requiredService);
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
    },
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
          null as any,
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
    includesFpaBuild?: boolean,
  ): string {
    const baseTerms = `This Quote is the Order Form under Seed's MSA and the selected Service Schedule(s), which are incorporated by reference. By signing and paying, Client agrees to those documents. Pricing is based on the Assumptions listed above; material changes may adjust Bookkeeping fees prospectively per our right-sizing rule. Order of precedence: Quote → Schedule(s) → MSA. Governing law: California.

<a href="https://seedfinancial.io/legal/msa-v-2025-07-01">MSA v2025.07.01</a>`;

    const schedules: string[] = [];
    const added = new Set<string>();

    if (includesBookkeeping && !added.has("A")) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssa-v-2025-09-01">SCHEDULE A - BOOKKEEPING v2025.09.01</a>',
      );
      added.add("A");
    }
    if (includesTaas && !added.has("B")) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssb-v-2025-09-01">SCHEDULE B - TAX AS A SERVICE v2025.09.01</a>',
      );
      added.add("B");
    }
    if (includesPayroll)
      schedules.push(
        '<a href="https://www.seedfinancial.io/legal/ssc-v-2025-09-01">SCHEDULE C - PAYROLL v2025.09.01</a>',
      );
    if (includesAP)
      schedules.push(
        '<a href="https://www.seedfinancial.io/legal/ssd-v-2025-09-01">SCHEDULE D - ACCOUNTS PAYABLE v2025.09.01</a>',
      );
    if (includesAR)
      schedules.push(
        '<a href="https://www.seedfinancial.io/legal/sse-v-2025-09-01">SCHEDULE E - ACCOUNTS RECEIVABLE v2025.09.01</a>',
      );
    if (includesAgentOfService)
      schedules.push(
        '<a href="https://www.seedfinancial.io/legal/ssf-v-2025-09-01">SCHEDULE F - AGENT OF SERVICE v2025.09.01</a>',
      );
    if (includesCfoAdvisory && !added.has("A")) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssa-v-2025-09-01">SCHEDULE A - BOOKKEEPING v2025.09.01</a>',
      );
      added.add("A");
    }
    if (includesCleanup && !added.has("A")) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssa-v-2025-09-01">SCHEDULE A - BOOKKEEPING v2025.09.01</a>',
      );
      added.add("A");
    }
    if (includesPriorYears && !added.has("B")) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssb-v-2025-09-01">SCHEDULE B - TAX AS A SERVICE v2025.09.01</a>',
      );
      added.add("B");
    }
    if (includesFpaBuild && !added.has("A")) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssa-v-2025-09-01">SCHEDULE A - BOOKKEEPING v2025.09.01</a>',
      );
      added.add("A");
    }

    return schedules.length > 0
      ? `${baseTerms}\n${schedules.join("\n")}`
      : baseTerms;
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
      assumptions.push(
        `• Entity Type: ${quoteData.entityType || "Not specified"}`,
      );
      assumptions.push(
        `• Monthly Transactions: ${quoteData.monthlyTransactions || "Not specified"}`,
      );
      assumptions.push(
        `• Months of Initial Cleanup Required: ${quoteData.cleanupMonths || 0}`,
      );
      assumptions.push(
        `• Accounting Basis: ${quoteData.accountingBasis || "Not specified"}`,
      );
      assumptions.push(
        `• QuickBooks Subscription Needed: ${quoteData.qboSubscription ? "Yes" : "No"}`,
      );
    }

    if (
      quoteData.serviceTaas ||
      quoteData.includesTaas ||
      quoteData.serviceTaasMonthly
    ) {
      assumptions.push("");
      assumptions.push("TAX AS A SERVICE (TaaS):");
      const numEntitiesText =
        quoteData.customNumEntities ?? quoteData.numEntities ?? "Not specified";
      assumptions.push(`• Number of Entities: ${numEntitiesText}`);
      const statesFiledText =
        quoteData.customStatesFiled ?? quoteData.statesFiled ?? "Not specified";
      assumptions.push(`• States Filed: ${statesFiledText}`);
      assumptions.push(
        `• International Filing Required: ${quoteData.internationalFiling ? "Yes" : "No"}`,
      );
      let personal1040sText = "Not included";
      if (quoteData.include1040s) {
        const owners =
          quoteData.customNumBusinessOwners ?? quoteData.numBusinessOwners ?? 0;
        personal1040sText = String(owners);
      }
      assumptions.push(`• Number of Personal 1040s: ${personal1040sText}`);
    }

    if (quoteData.servicePayroll || quoteData.servicePayrollService) {
      assumptions.push("");
      assumptions.push("PAYROLL SERVICE:");
      assumptions.push(
        `• Employee Count: ${quoteData.payrollEmployeeCount || "Not specified"}`,
      );
      assumptions.push(
        `• States Count: ${quoteData.payrollStateCount || "Not specified"}`,
      );
    }

    if (quoteData.serviceAgentOfService) {
      assumptions.push("");
      assumptions.push("AGENT OF SERVICE:");
      assumptions.push(
        `• Additional States: ${quoteData.agentOfServiceAdditionalStates || 0}`,
      );
      assumptions.push(
        `• Complex Case: ${quoteData.agentOfServiceComplexCase ? "Yes" : "No"}`,
      );
    }

    if (quoteData.serviceCfoAdvisory) {
      assumptions.push("");
      assumptions.push("CFO ADVISORY SERVICE:");
      assumptions.push(
        `• Type: ${quoteData.cfoAdvisoryType || "Not specified"}`,
      );
      if (quoteData.cfoAdvisoryBundleHours)
        assumptions.push(`• Bundle Hours: ${quoteData.cfoAdvisoryBundleHours}`);
    }

    if (
      quoteData.serviceApLite ||
      quoteData.serviceApAdvanced ||
      quoteData.serviceApArService
    ) {
      assumptions.push("");
      assumptions.push("ACCOUNTS PAYABLE SERVICE:");
      assumptions.push(
        `• Vendor Bills Band: ${quoteData.apVendorBillsBand || "Not specified"}`,
      );
      assumptions.push(
        `• Vendor Count: ${quoteData.apVendorCount || "Not specified"}`,
      );
      assumptions.push(
        `• Service Tier: ${quoteData.apServiceTier || "Not specified"}`,
      );
    }

    if (
      quoteData.serviceArLite ||
      quoteData.serviceArAdvanced ||
      quoteData.serviceArService
    ) {
      assumptions.push("");
      assumptions.push("ACCOUNTS RECEIVABLE SERVICE:");
      assumptions.push(
        `• Customer Invoices Band: ${quoteData.arCustomerInvoicesBand || "Not specified"}`,
      );
      assumptions.push(
        `• Customer Count: ${quoteData.arCustomerCount || "Not specified"}`,
      );
      assumptions.push(
        `• Service Tier: ${quoteData.arServiceTier || "Not specified"}`,
      );
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
      assumptions.push(
        `• Cleanup Periods: ${(quoteData.cleanupPeriods || []).join(", ")}`,
      );
      if (
        quoteData.cleanupComplexity &&
        quoteData.cleanupComplexity !== "0.00"
      ) {
        assumptions.push(`• Complexity Factor: ${quoteData.cleanupComplexity}`);
      }
    }

    return assumptions.join("\n");
  }

  async function createQuote(
    dealId: string,
    companyName: string,
    monthlyFee: number,
    setupFee: number,
    userEmail: string,
    firstName: string,
    lastName: string,
    includesBookkeeping?: boolean,
    includesTaas?: boolean,
    taasMonthlyFee?: number,
    taasPriorYearsFee?: number,
    bookkeepingMonthlyFee?: number,
    bookkeepingSetupFee?: number,
    quoteData?: any,
    serviceTier?: string,
    includesPayroll?: boolean,
    payrollFee?: number,
    includesAP?: boolean,
    apFee?: number,
    includesAR?: boolean,
    arFee?: number,
    includesAgentOfService?: boolean,
    agentOfServiceFee?: number,
    includesCfoAdvisory?: boolean,
    cfoAdvisoryFee?: number,
    cleanupProjectFee?: number,
    priorYearFilingsFee?: number,
    includesFpaBuild?: boolean,
    fpaServiceFee?: number,
    calculatedBookkeepingMonthlyFee?: number,
    calculatedTaasMonthlyFee?: number,
    calculatedServiceTierFee?: number,
  ): Promise<{ id: string; title: string } | null> {
    const userProfile = await deps.getUserProfile(userEmail);

    const services: string[] = [];
    if (
      includesBookkeeping ||
      quoteData?.serviceBookkeeping ||
      quoteData?.serviceMonthlyBookkeeping
    )
      services.push("Bookkeeping");
    if (includesTaas || quoteData?.serviceTaas || quoteData?.serviceTaasMonthly)
      services.push("TaaS");
    if (quoteData?.servicePayroll || quoteData?.servicePayrollService)
      services.push("Payroll");
    if (
      quoteData?.serviceApArLite ||
      quoteData?.serviceApArService ||
      quoteData?.serviceApLite ||
      quoteData?.serviceApAdvanced
    )
      services.push("AP");
    if (
      quoteData?.serviceArService ||
      quoteData?.serviceArLite ||
      quoteData?.serviceArAdvanced
    )
      services.push("AR");
    if (quoteData?.serviceAgentOfService) services.push("Agent of Service");
    if (quoteData?.serviceCfoAdvisory) services.push("CFO Advisory");
    if (
      quoteData?.serviceFpaLite ||
      quoteData?.serviceFpaBuild ||
      quoteData?.serviceFpaSupport
    )
      services.push("FP&A");
    if (quoteData?.serviceCleanupProjects) services.push("Cleanup");
    if (quoteData?.servicePriorYearFilings) services.push("Prior Year Filings");
    if (services.length === 0) services.push("Services");

    const serviceName = `${services.join(" + ")  } Services`;
    const quoteName = `${companyName} - ${serviceName} Quote`;

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    const scopeAssumptions = quoteData
      ? generateScopeAssumptions(quoteData)
      : "";
    const paymentTerms = generatePaymentTerms(
      !!includesBookkeeping,
      !!includesTaas,
      !!includesPayroll,
      !!includesAP,
      !!includesAR,
      !!includesAgentOfService,
      !!includesCfoAdvisory,
      (cleanupProjectFee || 0) > 0,
      (priorYearFilingsFee || 0) > 0,
      !!includesFpaBuild,
    );

    const quoteBody = {
      properties: {
        hs_title: quoteName,
        hs_status: "DRAFT",
        hs_expiration_date: expirationDate.toISOString().substring(0, 10),
        hs_language: "en",
        hs_sender_company_name: userProfile?.companyName || "Seed Financial",
        hs_sender_company_address:
          userProfile?.companyAddress ||
          "4136 Del Rey Ave, Ste 521, Marina Del Rey, CA 90292",
        hs_sender_firstname: userProfile?.firstName || firstName || "Jon",
        hs_sender_lastname: userProfile?.lastName || lastName || "Wells",
        hs_sender_email: userEmail,
        hs_esign_enabled: true,
        hs_comments: scopeAssumptions,
        hs_terms: paymentTerms,
      },
      associations: [
        {
          to: { id: dealId },
          types: [
            { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 64 },
          ],
        },
      ],
    };

    const result = await request("/crm/v3/objects/quotes", {
      method: "POST",
      body: JSON.stringify(quoteBody),
    });

    try {
      await createInitialServiceLineItems(result.id, {
        includesBookkeeping: includesBookkeeping ?? true,
        includesTaas: includesTaas ?? false,
        includesPayroll: includesPayroll ?? false,
        includesAP: includesAP ?? false,
        includesAR: includesAR ?? false,
        includesAgentOfService: includesAgentOfService ?? false,
        includesCfoAdvisory: includesCfoAdvisory ?? false,
        cleanupProjectFee: cleanupProjectFee || 0,
        priorYearFilingsFee: priorYearFilingsFee || 0,
        includesFpaBuild: includesFpaBuild ?? false,
        fpaServiceFee: fpaServiceFee || 0,
        payrollFee: payrollFee || 0,
        apFee: apFee || 0,
        arFee: arFee || 0,
        agentOfServiceFee: agentOfServiceFee || 0,
        cfoAdvisoryFee: cfoAdvisoryFee || 0,
        apServiceTier: quoteData?.apServiceTier,
        arServiceTier: quoteData?.arServiceTier,
        serviceTier: quoteData?.serviceTier,
        serviceTierFee: calculatedServiceTierFee || 0,
        qboSubscription: quoteData?.qboSubscription ?? false,
        qboFee: quoteData?.qboFee || (quoteData?.qboSubscription ? 60 : 0),
        bookkeepingMonthlyFee: calculatedBookkeepingMonthlyFee || 0,
        taasMonthlyFee: calculatedTaasMonthlyFee || 0,
        monthlyFee,
        setupFee,
        bookkeepingSetupFee,
      });
    } catch {
      // quote created without line items is acceptable
    }

    return { id: result.id, title: quoteName };
  }

  async function updateQuote(
    quoteId: string,
    dealId: string | undefined,
    companyName: string,
    monthlyFee: number,
    setupFee: number,
    userEmail: string,
    firstName: string,
    lastName: string,
    includesBookkeeping?: boolean,
    includesTaas?: boolean,
    taasMonthlyFee?: number,
    taasPriorYearsFee?: number,
    bookkeepingMonthlyFee?: number,
    bookkeepingSetupFee?: number,
    quoteData?: any,
    serviceTier?: string,
    includesPayroll?: boolean,
    payrollFee?: number,
    includesAP?: boolean,
    apFee?: number,
    includesAR?: boolean,
    arFee?: number,
    includesAgentOfService?: boolean,
    agentOfServiceFee?: number,
    includesCfoAdvisory?: boolean,
    cfoAdvisoryFee?: number,
    cleanupProjectFee?: number,
    priorYearFilingsFee?: number,
    includesFpaBuild?: boolean,
    fpaServiceFee?: number,
    calculatedBookkeepingMonthlyFee?: number,
    calculatedTaasMonthlyFee?: number,
    calculatedServiceTierFee?: number,
  ): Promise<boolean> {
    const check = await request(`/crm/v3/objects/quotes/${quoteId}`, {
      method: "GET",
    });
    if (!check || check.properties?.hs_status === "EXPIRED") return false;

    const existingItems = await fetchExistingLineItems(quoteId);
    const requiredServices: Array<{ price: number; productId: string }> = [];

    if (
      includesBookkeeping &&
      bookkeepingMonthlyFee &&
      bookkeepingMonthlyFee > 0
    ) {
      requiredServices.push({
        price: bookkeepingMonthlyFee,
        productId: PRODUCT.MONTHLY_BOOKKEEPING,
      });
    }
    if (includesBookkeeping && bookkeepingSetupFee && bookkeepingSetupFee > 0) {
      requiredServices.push({
        price: bookkeepingSetupFee,
        productId: PRODUCT.MONTHLY_BOOKKEEPING_SETUP,
      });
    }
    if (includesTaas && taasMonthlyFee && taasMonthlyFee > 0) {
      requiredServices.push({ price: taasMonthlyFee, productId: PRODUCT.TAAS });
    }
    if (taasPriorYearsFee && taasPriorYearsFee > 0) {
      requiredServices.push({
        price: taasPriorYearsFee,
        productId: PRODUCT.PRIOR_YEAR_FILINGS,
      });
    }
    if (cleanupProjectFee && cleanupProjectFee > 0) {
      requiredServices.push({
        price: cleanupProjectFee,
        productId: PRODUCT.CLEANUP_PROJECT,
      });
    }
    if (includesPayroll && payrollFee && payrollFee > 0) {
      requiredServices.push({
        price: payrollFee,
        productId: PRODUCT.PAYROLL_SERVICE,
      });
    }
    if (includesAP && apFee && apFee > 0) {
      const apProductId =
        quoteData?.apServiceTier === "advanced"
          ? PRODUCT.AP_ADVANCED_SERVICE
          : PRODUCT.AP_LITE_SERVICE;
      requiredServices.push({ price: apFee, productId: apProductId });
    }
    if (includesAR && arFee && arFee > 0) {
      const arProductId =
        quoteData?.arServiceTier === "advanced"
          ? PRODUCT.AR_ADVANCED_SERVICE
          : PRODUCT.AR_LITE_SERVICE;
      requiredServices.push({ price: arFee, productId: arProductId });
    }
    if (includesAgentOfService && agentOfServiceFee && agentOfServiceFee > 0) {
      requiredServices.push({
        price: agentOfServiceFee,
        productId: PRODUCT.AGENT_OF_SERVICE,
      });
    }
    if (includesCfoAdvisory && cfoAdvisoryFee && cfoAdvisoryFee > 0) {
      requiredServices.push({
        price: cfoAdvisoryFee,
        productId: PRODUCT.CFO_ADVISORY_DEPOSIT,
      });
    }
    // Note: No FPA Build product in HUBSPOT_PRODUCT_IDS; omit line item and keep terms/assumptions only

    // Service tier products disabled

    if (quoteData?.qboSubscription) {
      const qboPrice = quoteData?.qboFee || 60;
      requiredServices.push({
        price: qboPrice,
        productId: PRODUCT.MANAGED_QBO_SUBSCRIPTION,
      });
    }

    const changes = analyzeLineItemChanges(existingItems, requiredServices);
    const updateSuccess = await executeLineItemChanges(quoteId, changes);
    if (!updateSuccess) return false;

    let serviceType = "Services";
    if (includesBookkeeping && includesTaas) serviceType = "Bookkeeping + TaaS";
    else if (includesTaas) serviceType = "TaaS";
    else serviceType = "Bookkeeping Services";

    const updatedTitle = `${companyName} - ${serviceType} Quote`;

    const scopeAssumptions = quoteData
      ? generateScopeAssumptions(quoteData)
      : "";
    const paymentTerms = generatePaymentTerms(
      !!includesBookkeeping,
      !!includesTaas,
      !!quoteData?.includesPayroll,
      !!quoteData?.includesAP,
      !!quoteData?.includesAR,
      !!quoteData?.includesAgentOfService,
      !!quoteData?.includesCfoAdvisory,
      (quoteData?.cleanupProjectFee || 0) > 0,
      (quoteData?.priorYearFilingsFee || 0) > 0,
      !!quoteData?.includesFpaBuild,
    );

    const updateBody = {
      properties: {
        hs_title: updatedTitle,
        hs_comments: scopeAssumptions,
        hs_terms: paymentTerms,
      },
    };

    await request(`/crm/v3/objects/quotes/${quoteId}`, {
      method: "PATCH",
      body: JSON.stringify(updateBody),
    });

    if (dealId && updateSuccess) {
      try {
        await deps.updateDeal(
          dealId,
          monthlyFee,
          setupFee,
          undefined,
          includesBookkeeping,
          includesTaas,
          serviceTier,
          quoteData,
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

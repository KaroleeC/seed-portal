// Simple HubSpot integration using fetch API to avoid TypeScript complexity
export interface HubSpotContact {
  id: string;
  properties: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    // Contact address fields
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    phone?: string;
    mobilephone?: string;
    hs_phone?: string;
    phone_number?: string;
    work_phone?: string;
    mobile_phone?: string;
    // Company enrichment fields (when available via association)
    industry?: string;
    monthly_revenue_range?: string;
    entity_type?: string;
    annualrevenue?: string;
    numberofemployees?: string;
  };
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    dealstage: string;
    amount?: string;
  };
}

import { cache, CacheTTL, CachePrefix } from "./cache.js";
import type { Invoice, InvoiceLineItem, Subscription, SubscriptionPayment } from "@shared/billing";
import { createProductsService } from "./services/hubspot/products.js";
import { createContactsService } from "./services/hubspot/contacts.js";
import { createDealsService } from "./services/hubspot/deals.js";
import { createQuotesService } from "./services/hubspot/quotes.js";
import { createBillingService } from "./services/hubspot/billing.js";

// HubSpot Product Record IDs - OFFICIAL SINGLE SOURCE OF TRUTH
// All IDs verified with HubSpot native product names (September 2025)
const HUBSPOT_PRODUCT_IDS = {
  // Core Services
  MONTHLY_BOOKKEEPING: "25687054003",           // Monthly Bookkeeping
  MONTHLY_BOOKKEEPING_SETUP: "29049077309",    // Monthly Bookkeeping Setup Fee
  CLEANUP_PROJECT: "25683750263",               // Clean-Up / Catch-Up Project
  TAAS: "26203849099",                          // Tax as a Service (Monthly)
  MANAGED_QBO_SUBSCRIPTION: "26213746490",     // Managed QBO Subscription
  PRIOR_YEAR_FILINGS: "26354718811",           // Prior Years Tax Filing(s)
  
  // Service Tier Upgrades
  GUIDED_SERVICE_TIER: "28884795543",          // Guided Service Tier Upgrade
  CONCIERGE_SERVICE_TIER: "28891925782",       // Concierge Service Tier Upgrade
  
  // CFO Advisory Services
  CFO_ADVISORY_DEPOSIT: "28945017957",         // CFO Advisory Pay-as-you-Go Deposit
  CFO_ADVISORY_8_HOUR: "28928008785",          // CFO Advisory 8-Hour Bundle
  CFO_ADVISORY_16_HOUR: "28945017959",         // CFO Advisory 16-Hour Bundle
  CFO_ADVISORY_32_HOUR: "28960863883",         // CFO Advisory 32-Hour Bundle
  CFO_ADVISORY_40_HOUR: "28960863884",         // CFO Advisory 40-Hour Bundle
  
  // Payroll Services
  PAYROLL_SERVICE: "29038614325",              // Payroll Administration
  
  // Accounts Receivable/Payable Services
  AR_LITE_SERVICE: "28960244571",              // AR Lite
  AP_LITE_SERVICE: "28960182651",              // AP Lite
  AR_ADVANCED_SERVICE: "28928071009",          // AR Advanced
  AP_ADVANCED_SERVICE: "28960182653",          // AP Advanced
  
  // Agent Services
  AGENT_OF_SERVICE: "29001355021",             // Agent of Service
} as const;

export class HubSpotService {
  private accessToken: string;
  private baseUrl = "https://api.hubapi.com";
  private products: ReturnType<typeof createProductsService>;
  private contacts: ReturnType<typeof createContactsService>;
  private deals: ReturnType<typeof createDealsService>;
  private quotes: ReturnType<typeof createQuotesService>;
  private billing: ReturnType<typeof createBillingService>;

  constructor() {
    if (!process.env.HUBSPOT_ACCESS_TOKEN) {
      throw new Error("HUBSPOT_ACCESS_TOKEN environment variable is required");
    }
    this.accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    // Initialize modular products service with this class's request method
    this.products = createProductsService((endpoint: string, options?: RequestInit) => this.makeRequest(endpoint, options));
    // Initialize modular contacts service with this class's request method
    this.contacts = createContactsService((endpoint: string, options?: RequestInit) => this.makeRequest(endpoint, options));
    // Initialize modular deals service with this class's request method
    this.deals = createDealsService(
      (endpoint: string, options?: RequestInit) => this.makeRequest(endpoint, options),
      { getSeedSalesPipelineStage: () => this.getSeedSalesPipelineStage() }
    );
    // Initialize modular quotes service with this class's request method
    this.quotes = createQuotesService(
      (endpoint: string, options?: RequestInit) => this.makeRequest(endpoint, options),
      {
        getUserProfile: (email: string) => this.getUserProfile(email),
        getProductsCached: () => this.getProductsCached(),
        updateDeal: (
          dealId: string,
          monthlyFee: number,
          setupFee: number,
          ownerId?: string,
          includesBookkeeping?: boolean,
          includesTaas?: boolean,
          serviceTier?: string,
          quoteData?: any,
        ) =>
          this.deals.updateDeal(
            dealId,
            monthlyFee,
            setupFee,
            ownerId,
            includesBookkeeping,
            includesTaas,
            serviceTier,
            quoteData,
          ),
        HUBSPOT_PRODUCT_IDS,
      }
    );
    // Initialize modular billing service with this class's request method
    this.billing = createBillingService(
      (endpoint: string, options?: RequestInit) => this.makeRequest(endpoint, options)
    );
  }

  async updateQuote(
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
    // New services
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
    // Calculated service fees for line items
    calculatedBookkeepingMonthlyFee?: number,
    calculatedTaasMonthlyFee?: number,
    calculatedServiceTierFee?: number,
  ): Promise<boolean> {
    return await this.quotes.updateQuote(
      quoteId,
      dealId,
      companyName,
      monthlyFee,
      setupFee,
      userEmail,
      firstName,
      lastName,
      includesBookkeeping,
      includesTaas,
      taasMonthlyFee,
      taasPriorYearsFee,
      bookkeepingMonthlyFee,
      bookkeepingSetupFee,
      quoteData,
      serviceTier,
      includesPayroll,
      payrollFee,
      includesAP,
      apFee,
      includesAR,
      arFee,
      includesAgentOfService,
      agentOfServiceFee,
      includesCfoAdvisory,
      cfoAdvisoryFee,
      cleanupProjectFee,
      priorYearFilingsFee,
      includesFpaBuild,
      fpaServiceFee,
      calculatedBookkeepingMonthlyFee,
      calculatedTaasMonthlyFee,
      calculatedServiceTierFee,
    );
  }

  // Check if a user exists in HubSpot by email (contacts or owners)
  async verifyUserByEmail(email: string): Promise<boolean> {
    return await this.contacts.verifyUserByEmail(email);
  }

  // Owners and companies utility methods
  async listOwners(): Promise<any[]> {
    return await this.contacts.listOwners();
  }

  async getOwnerById(ownerId: string): Promise<any | null> {
    return await this.contacts.getOwnerById(ownerId);
  }

  async getCompanyById(companyId: string): Promise<any | null> {
    return await this.contacts.getCompanyById(companyId);
  }

  // Quotes utility methods
  async doesQuoteExist(quoteId: string): Promise<boolean> {
    return await this.quotes.doesQuoteExist(quoteId);
  }

  // Cached product list to reduce API calls
  async getProductsCached(): Promise<any[]> {
    return await this.products.getProductsCached();
  }

  // Get pipeline information to find the correct pipeline and stage IDs
  async getPipelines(): Promise<any> {
    try {
      const result = await this.makeRequest("/crm/v3/pipelines/deals");
      return result;
    } catch (error) {
      console.error("Pipeline fetch failed:", error);
      console.error("Error fetching pipelines:", error);
      return null;
    }
  }

  // Find "Seed Sales Pipeline" and get "Qualified" stage ID
  async getSeedSalesPipelineStage(): Promise<{
    pipelineId: string;
    qualifiedStageId: string;
  } | null> {
    try {
      const pipelines = await this.getPipelines();
      if (!pipelines?.results) {
        console.error("No pipelines found");
        return null;
      }

      // Find "Seed Sales Pipeline" (case-insensitive search)
      const seedPipeline = pipelines.results.find(
        (p: any) =>
          p.label?.toLowerCase().includes("seed sales") ||
          p.label?.toLowerCase() === "seed sales pipeline",
      );

      if (!seedPipeline) {
        console.error(
          "Seed Sales Pipeline not found. Available pipelines:",
          pipelines.results.map((p: any) => p.label),
        );
        return null;
      }

      // Find "Qualified" stage (case-insensitive search)
      const qualifiedStage = seedPipeline.stages?.find((stage: any) =>
        stage.label?.toLowerCase().includes("qualified"),
      );

      if (!qualifiedStage) {
        console.error(
          "Qualified stage not found in Seed Sales Pipeline. Available stages:",
          seedPipeline.stages?.map((s: any) => s.label),
        );
        return null;
      }

      console.log(
        `Found Seed Sales Pipeline: ${seedPipeline.id}, Qualified Stage: ${qualifiedStage.id}`,
      );
      return {
        pipelineId: seedPipeline.id,
        qualifiedStageId: qualifiedStage.id,
      };
    } catch (error) {
      console.error("Error finding pipeline/stage:", error);
      return null;
    }
  }

  async getOwnerByEmail(email: string): Promise<string | null> {
    return await this.contacts.getOwnerByEmail(email);
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Handle rate limiting with retry
      if (response.status === 429) {
        console.log("Rate limited by HubSpot, waiting before retry...");
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

        // Retry once after rate limit
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text();
          console.error("HubSpot API retry failed:", {
            status: retryResponse.status,
            statusText: retryResponse.statusText,
            endpoint,
            errorResponse: retryErrorText,
          });
          throw new Error(
            `HubSpot API error: ${retryResponse.status} ${retryResponse.statusText} - ${retryErrorText}`,
          );
        }

        const contentType = retryResponse.headers.get("content-type");
        const contentLength = retryResponse.headers.get("content-length");

        if (
          retryResponse.status === 204 ||
          contentLength === "0" ||
          !contentType?.includes("application/json")
        ) {
          return null;
        }

        return retryResponse.json();
      }

      console.error(
        `HubSpot API error details:`,
        JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          endpoint,
          method: options.method || "GET",
          body: options.body,
          errorResponse: errorText,
        }),
      );
      throw new Error(
        `HubSpot API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    // Handle empty responses (like 204 No Content from DELETE requests)
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");

    if (
      response.status === 204 ||
      contentLength === "0" ||
      !contentType?.includes("application/json")
    ) {
      return null; // Return null for empty responses
    }

    return response.json();
  }

  async getUserProfile(
    email: string,
  ): Promise<{
    firstName?: string;
    lastName?: string;
    companyName?: string;
    companyAddress?: string;
    companyAddress2?: string;
    companyCity?: string;
    companyState?: string;
    companyZip?: string;
    companyCountry?: string;
  } | null> {
    try {
      // Get company branding information
      const brandingInfo = await this.getCompanyBranding();

      // First try to find the user in owners (team members)
      const ownersResult = await this.makeRequest("/crm/v3/owners", {
        method: "GET",
      });

      const owner = ownersResult.results?.find((o: any) => o.email === email);
      if (owner) {
        return {
          firstName: owner.firstName,
          lastName: owner.lastName,
          companyName: brandingInfo?.companyName || "Seed Financial",
          companyAddress: brandingInfo?.companyAddress || "Austin, TX",
          companyAddress2: brandingInfo?.companyAddress2,
          companyCity: brandingInfo?.companyCity,
          companyState: brandingInfo?.companyState,
          companyZip: brandingInfo?.companyZip,
          companyCountry: brandingInfo?.companyCountry,
        };
      }

      // If not found in owners, try contacts
      const contact = await this.verifyContactByEmail(email);
      if (contact.verified && contact.contact) {
        return {
          firstName: contact.contact.properties?.firstname,
          lastName: contact.contact.properties?.lastname,
          companyName: brandingInfo?.companyName || "Seed Financial",
          companyAddress: brandingInfo?.companyAddress || "Austin, TX",
          companyAddress2: brandingInfo?.companyAddress2,
          companyCity: brandingInfo?.companyCity,
          companyState: brandingInfo?.companyState,
          companyZip: brandingInfo?.companyZip,
          companyCountry: brandingInfo?.companyCountry,
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }

  async getCompanyBranding(): Promise<{
    companyName?: string;
    companyAddress?: string;
    companyAddress2?: string;
    companyCity?: string;
    companyState?: string;
    companyZip?: string;
    companyCountry?: string;
  } | null> {
    try {
      // Try to get account info first
      const accountInfo = await this.makeRequest("/integrations/v1/me");

      if (accountInfo && accountInfo.portalId) {
        // Search for your own company in HubSpot companies
        try {
          const companySearchBody = {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "domain",
                    operator: "EQ",
                    value: "seedfinancial.io",
                  },
                ],
              },
            ],
            properties: [
              "name",
              "domain",
              "address",
              "address2",
              "city",
              "state",
              "zip",
              "country",
            ],
          };

          const companyResult = await this.makeRequest(
            "/crm/v3/objects/companies/search",
            {
              method: "POST",
              body: JSON.stringify(companySearchBody),
            },
          );

          if (companyResult.results && companyResult.results.length > 0) {
            const company = companyResult.results[0];
            const props = company.properties;

            // Build full address string
            let fullAddress = "";
            if (props.address) fullAddress += props.address;
            if (props.address2)
              fullAddress += (fullAddress ? ", " : "") + props.address2;
            if (props.city)
              fullAddress += (fullAddress ? ", " : "") + props.city;
            if (props.state)
              fullAddress += (fullAddress ? ", " : "") + props.state;
            if (props.zip) fullAddress += (fullAddress ? " " : "") + props.zip;
            if (props.country)
              fullAddress += (fullAddress ? ", " : "") + props.country;

            // Check if this is actually the correct Seed Financial company
            // If not, force the correct address
            if (
              fullAddress.includes("Nepal") ||
              fullAddress.includes("Kathmandu")
            ) {
              console.log(
                "Found Nepal address, forcing correct Seed Financial address",
              );
              return {
                companyName: "Seed Financial",
                companyAddress:
                  "4136 Del Rey Ave, Ste 521, Marina Del Rey, CA 90292",
                companyAddress2: "Ste 521",
                companyCity: "Marina Del Rey",
                companyState: "CA",
                companyZip: "90292",
                companyCountry: "US",
              };
            }

            return {
              companyName: props.name || "Seed Financial",
              companyAddress:
                fullAddress ||
                "4136 Del Rey Ave, Ste 521, Marina Del Rey, CA 90292",
              companyAddress2: props.address2,
              companyCity: props.city,
              companyState: props.state,
              companyZip: props.zip,
              companyCountry: props.country,
            };
          }
        } catch (companyError) {
          console.log(
            "Could not fetch company details, using defaults:",
            (companyError as Error).message,
          );
        }

        // Fallback to correct Seed Financial address
        return {
          companyName: "Seed Financial",
          companyAddress: "4136 Del Rey Ave, Ste 521, Marina Del Rey, CA 90292",
          companyAddress2: "Ste 521",
          companyCity: "Marina Del Rey",
          companyState: "CA",
          companyZip: "90292",
          companyCountry: "US",
        };
      }

      return null;
    } catch (error) {
      console.log(
        "Could not fetch company branding, using defaults:",
        (error as Error).message,
      );
      return null;
    }
  }

  async verifyContactByEmail(
    email: string,
  ): Promise<{ verified: boolean; contact?: HubSpotContact }> {
    // Delegated to modular contacts service
    return await this.contacts.verifyContactByEmail(email);
  }

  async createDeal(
    contactId: string,
    companyName: string,
    monthlyFee: number,
    setupFee: number,
    ownerId?: string,
    includesBookkeeping?: boolean,
    includesTaas?: boolean,
    serviceTier?: string,
    quoteData?: any,
  ): Promise<HubSpotDeal | null> {
    return await this.deals.createDeal(
      contactId,
      companyName,
      monthlyFee,
      setupFee,
      ownerId,
      includesBookkeeping,
      includesTaas,
      serviceTier,
      quoteData,
    );
  }

  async updateDeal(
    dealId: string,
    monthlyFee: number,
    setupFee: number,
    ownerId?: string,
    includesBookkeeping?: boolean,
    includesTaas?: boolean,
    serviceTier?: string,
    quoteData?: any,
  ): Promise<HubSpotDeal | null> {
    return await this.deals.updateDeal(
      dealId,
      monthlyFee,
      setupFee,
      ownerId,
      includesBookkeeping,
      includesTaas,
      serviceTier,
      quoteData,
    );
  }

  async createQuote(
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
    // New services
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
    // Pass the individual calculated service fees for line items
    calculatedBookkeepingMonthlyFee?: number,
    calculatedTaasMonthlyFee?: number,
    calculatedServiceTierFee?: number,
  ): Promise<{ id: string; title: string } | null> {
    return await this.quotes.createQuote(
      dealId,
      companyName,
      monthlyFee,
      setupFee,
      userEmail,
      firstName,
      lastName,
      includesBookkeeping,
      includesTaas,
      taasMonthlyFee,
      taasPriorYearsFee,
      bookkeepingMonthlyFee,
      bookkeepingSetupFee,
      quoteData,
      serviceTier,
      includesPayroll,
      payrollFee,
      includesAP,
      apFee,
      includesAR,
      arFee,
      includesAgentOfService,
      agentOfServiceFee,
      includesCfoAdvisory,
      cfoAdvisoryFee,
      cleanupProjectFee,
      priorYearFilingsFee,
      includesFpaBuild,
      fpaServiceFee,
      calculatedBookkeepingMonthlyFee,
      calculatedTaasMonthlyFee,
      calculatedServiceTierFee,
    );
  }

  // Verify product IDs and potentially find alternatives
  async verifyAndGetProductIds(): Promise<{ bookkeeping: string; cleanup: string; valid: boolean }> {
    return await this.products.verifyAndGetProductIds({
      MONTHLY_BOOKKEEPING: HUBSPOT_PRODUCT_IDS.MONTHLY_BOOKKEEPING,
      CLEANUP_PROJECT: HUBSPOT_PRODUCT_IDS.CLEANUP_PROJECT,
    });
  }


  // Get all custom objects to find the Leads object
  async getCustomObjects(): Promise<any[]> {
    try {
      console.log("Fetching custom object schemas...");
      const response = await this.makeRequest("/crm/v3/schemas", {
        method: "GET",
      });
      console.log(
        "Custom objects response:",
        JSON.stringify(response, null, 2),
      );

      // If schemas endpoint returns empty, try properties endpoint for custom objects
      if (!response.results || response.results.length === 0) {
        console.log("No custom schemas found, trying properties endpoint...");
        try {
          const propertiesResponse = await this.makeRequest(
            "/crm/v3/properties/p149640503_leads",
            {
              method: "GET",
            },
          );
          console.log("Properties response for leads:", propertiesResponse);
        } catch (propError) {
          console.log(
            "Properties endpoint also failed:",
            (propError as any).message,
          );
        }
      }

      return response.results || [];
    } catch (error) {
      console.error("Error fetching custom objects:", error);
      return [];
    }
  }

  // Get all available products in HubSpot
  async getProducts(): Promise<any[]> {
    return await this.products.getProducts();
  }

  // Get sales inbox leads - optimized version
  async getSalesInboxLeads(
    ownerEmail?: string,
    limit: number = 20,
  ): Promise<any[]> {
    try {
      // We know HubSpot uses the standard 'leads' object, so go straight to it
      const searchResult = await this.searchLeadsObject(
        "leads",
        ownerEmail,
        limit,
      );
      return searchResult || [];
    } catch (error) {
      console.error("Error fetching sales inbox leads:", error);
      return [];
    }
  }

  // Helper method to search a specific Leads object
  private async searchLeadsObject(
    objectId: string,
    ownerEmail?: string,
    limit: number = 20,
  ): Promise<any[] | null> {
    try {
      // Determine if this is a custom object or standard leads object
      const isStandardLeads = objectId === "leads";

      // Build search body for Leads object with correct property names
      let leadsSearchBody: any = {
        filterGroups: [
          {
            filters: [],
          },
        ],
        sorts: [
          {
            propertyName: isStandardLeads
              ? "hs_lastmodifieddate"
              : "hs_lastmodifieddate",
            direction: "DESCENDING",
          },
        ],
        limit: limit,
        properties: isStandardLeads
          ? [
              "hs_lead_name",
              "hs_pipeline_stage",
              "hubspot_owner_id", // Standard leads use hubspot_owner_id
              "hs_createdate",
              "hs_lastmodifieddate",
              "hubspot_owner_assigneddate",
              "hs_object_id",
            ]
          : [
              "hs_lead_name",
              "hs_lead_status",
              "hs_lead_owner", // Custom objects use hs_lead_owner
              "hs_createdate",
              "hs_lastmodifieddate",
              "hs_object_id",
            ],
      };

      // Add owner filter if provided
      if (ownerEmail) {
        const ownerId = await this.getOwnerByEmail(ownerEmail);
        if (ownerId) {
          leadsSearchBody.filterGroups[0].filters.push({
            propertyName: isStandardLeads
              ? "hubspot_owner_id"
              : "hs_lead_owner",
            operator: "EQ",
            value: ownerId,
          });
        }
      }

      // Add lead status filter for active leads (exclude Qualified and Disqualified)
      // Use stage IDs for standard leads object
      const stageValues = isStandardLeads
        ? [
            "new-stage-id",
            "attempting-stage-id",
            "1108719384",
            "connected-stage-id",
          ] // Stage IDs for New, Assigned, Contact Attempted, Discovery Call Booked
        : ["New", "Assigned", "Contact Attempted", "Discovery Call Booked"]; // Keep names for custom objects

      leadsSearchBody.filterGroups[0].filters.push({
        propertyName: isStandardLeads ? "hs_pipeline_stage" : "hs_lead_status",
        operator: "IN",
        values: stageValues,
      });

      // Only log essential information in production
      if (process.env.NODE_ENV === "development") {
        console.log(
          `Searching ${objectId} with ${leadsSearchBody.filterGroups[0].filters.length} filters`,
        );
      }

      const searchResult = await this.makeRequest(
        `/crm/v3/objects/${objectId}/search`,
        {
          method: "POST",
          body: JSON.stringify(leadsSearchBody),
        },
      );

      // Get associated contacts for each lead
      const enrichedLeads = await Promise.all(
        (searchResult.results || []).map(async (lead: any) => {
          try {
            const leadName = lead.properties?.hs_lead_name || "Unknown";
            const leadStatus = lead.properties?.hs_lead_status || "New";
            const createDate = lead.properties?.hs_createdate;

            // Get associated contact
            const associations = await this.makeRequest(
              `/crm/v3/objects/${objectId}/${lead.id}/associations/contacts`,
              {
                method: "GET",
              },
            );

            let contactInfo = {
              company: "Unknown Company",
              firstName: "",
              lastName: "",
              email: "",
            };

            if (associations.results?.length > 0) {
              const contactId = associations.results[0].id;
              const contact = await this.makeRequest(
                `/crm/v3/objects/contacts/${contactId}?properties=company,firstname,lastname,email`,
                {
                  method: "GET",
                },
              );

              contactInfo = {
                company: contact.properties?.company || "Unknown Company",
                firstName: contact.properties?.firstname || "",
                lastName: contact.properties?.lastname || "",
                email: contact.properties?.email || "",
              };
            }

            return {
              id: lead.id,
              properties: {
                ...contactInfo,
                hs_createdate: createDate,
                hubspot_owner_assigneddate:
                  lead.properties?.hubspot_owner_assigneddate,
                hs_lead_status: leadStatus,
                hs_object_id: lead.properties?.hs_object_id || lead.id,
              },
              leadStage: leadStatus,
              hubspotContactUrl: `https://app.hubspot.com/lead-overview/48880113/?leadId=${lead.id}`,
            };
          } catch (error) {
            console.error(`Error enriching lead ${lead.id}:`, error);
            const leadName = lead.properties?.hs_lead_name || "Unknown";
            const leadStatus = lead.properties?.hs_lead_status || "New";
            const createDate = lead.properties?.hs_createdate;

            return {
              id: lead.id,
              properties: {
                company: leadName,
                firstName: "",
                lastName: "",
                email: "",
                hs_createdate: createDate,
                hubspot_owner_assigneddate:
                  lead.properties?.hubspot_owner_assigneddate,
                hs_lead_status: leadStatus,
                hs_object_id: lead.properties?.hs_object_id || lead.id,
              },
              leadStage: leadStatus,
              hubspotContactUrl: `https://app.hubspot.com/lead-overview/48880113/?leadId=${lead.id}`,
            };
          }
        }),
      );

      return enrichedLeads;
    } catch (error) {
      console.error(`Error searching Leads object ${objectId}:`, error);
      return null;
    }
  }

  // Fallback method to get leads from contacts when custom Leads object not found
  async getSalesInboxLeadsFromContacts(
    ownerEmail?: string,
    limit: number = 20,
  ): Promise<any[]> {
    try {
      let searchBody: any = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "HAS_PROPERTY",
              },
              {
                propertyName: "lifecyclestage",
                operator: "EQ",
                value: "lead",
              },
            ],
          },
        ],
        sorts: [
          {
            propertyName: "lastmodifieddate",
            direction: "DESCENDING",
          },
        ],
        limit: limit,
        properties: [
          "email",
          "firstname",
          "lastname",
          "company",
          "phone",
          "hs_lead_status",
          "lifecyclestage",
          "hubspot_owner_id",
          "hs_avatar_filemanager_key",
          "notes_last_activity_date",
          "createdate",
          "lastmodifieddate",
          "hubspot_owner_assigneddate",
          "lead_type",
          "hs_lead_source",
        ],
      };

      // Add owner filter if provided
      if (ownerEmail) {
        const ownerId = await this.getOwnerByEmail(ownerEmail);
        if (ownerId) {
          searchBody.filterGroups[0].filters.push({
            propertyName: "hubspot_owner_id",
            operator: "EQ",
            value: ownerId,
          });
        }
      }

      console.log("Searching contacts with lifecycle stage = lead");
      const searchResult = await this.makeRequest(
        "/crm/v3/objects/contacts/search",
        {
          method: "POST",
          body: JSON.stringify(searchBody),
        },
      );

      console.log(
        `Found ${searchResult.results?.length || 0} leads for sales inbox`,
      );

      // Enrich each contact with deal information for lead stage
      const enrichedContacts = await Promise.all(
        (searchResult.results || []).map(async (contact: any) => {
          try {
            console.log(
              `Processing contact: ${contact.properties?.company || "Unknown"} (${contact.properties?.email})`,
            );
            console.log(
              `Contact lifecycle stage: ${contact.properties?.lifecyclestage}, Owner ID: ${contact.properties?.hubspot_owner_id}, Lead Status: ${contact.properties?.hs_lead_status}`,
            );

            // Get associated deals to determine lead stage
            const deals = await this.getContactDeals(contact.id);
            const activeDeal = deals.find(
              (deal: any) =>
                deal.properties?.dealstage &&
                !["closedwon", "closedlost"].includes(
                  deal.properties.dealstage.toLowerCase(),
                ),
            );

            // Get stage name from pipeline info if available
            let leadStage =
              contact.properties?.hs_lead_status ||
              contact.properties?.lifecyclestage ||
              "New Lead";
            if (activeDeal?.properties?.dealstage) {
              // Try to get human-readable stage name
              const stageInfo = await this.getDealStageInfo(
                activeDeal.properties.dealstage,
              );
              leadStage = stageInfo?.label || activeDeal.properties.dealstage;
            }

            return {
              ...contact,
              leadStage,
              activeDealId: activeDeal?.id || null,
              hubspotContactUrl: `https://app.hubspot.com/contacts/149640503/contact/${contact.id}`,
            };
          } catch (error) {
            console.error(`Error enriching contact ${contact.id}:`, error);
            return {
              ...contact,
              leadStage:
                contact.properties?.hs_lead_status ||
                contact.properties?.lifecyclestage ||
                "New Lead",
              activeDealId: null,
              hubspotContactUrl: `https://app.hubspot.com/contacts/149640503/contact/${contact.id}`,
            };
          }
        }),
      );

      console.log(`Returning ${enrichedContacts.length} enriched contacts`);
      return enrichedContacts;
    } catch (error) {
      console.error("Error fetching sales inbox leads from contacts:", error);
      return [];
    }
  }

  // Get deal stage information for human-readable stage names
  async getDealStageInfo(
    stageId: string,
  ): Promise<{ label: string; id: string } | null> {
    try {
      // Get all pipelines to find stage info
      const pipelines = await this.getPipelines();
      if (!pipelines?.results) return null;

      for (const pipeline of pipelines.results) {
        const stage = pipeline.stages?.find((s: any) => s.id === stageId);
        if (stage) {
          return {
            id: stage.id,
            label: stage.label,
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Error getting deal stage info:", error);
      return null;
    }
  }

  // Search contacts for Client Intelligence with owner filtering
  async searchContacts(query: string, ownerEmail?: string): Promise<any[]> {
    // Delegated to modular contacts service
    return await this.contacts.searchContacts(query, ownerEmail);
  }

  // Get contact by ID for detailed analysis
  async getContactById(contactId: string): Promise<any> {
    // Delegated to modular contacts service
    return await this.contacts.getContactById(contactId);
  }

  // Get deals associated with a contact to determine services
  async getContactDeals(contactId: string): Promise<any[]> {
    // Delegated to modular contacts service
    return await this.contacts.getContactDeals(contactId);
  }

  // Get deals closed within a specific period for commission calculations
  async getDealsClosedInPeriod(
    startDate: string,
    endDate: string,
    salesRepHubspotId?: string,
  ): Promise<any[]> {
    return await this.deals.getDealsClosedInPeriod(startDate, endDate, salesRepHubspotId);
  }

  // Generic deals search delegation for BFF services
  async getDeals(query: {
    ids?: string[];
    ownerId?: string;
    limit?: number;
    properties?: string[];
    associations?: string[];
  }): Promise<any[]> {
    return await this.deals.searchDeals(query);
  }

  // Get paid invoices within a specific period for commission calculations
  async getPaidInvoicesInPeriod(
    startDate: string,
    endDate: string,
    salesRepHubspotId?: string,
  ): Promise<Invoice[]> {
    return await this.billing.getPaidInvoicesInPeriod(startDate, endDate, salesRepHubspotId);
  }

  // Get invoice line items for detailed commission calculations
  async getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    return await this.billing.getInvoiceLineItems(invoiceId);
  }

  // Get active subscriptions for ongoing commission tracking
  async getActiveSubscriptions(salesRepHubspotId?: string): Promise<Subscription[]> {
    return await this.billing.getActiveSubscriptions(salesRepHubspotId);
  }

  // Get subscription payments within a period for residual commission calculations
  async getSubscriptionPaymentsInPeriod(
    subscriptionId: string,
    startDate: string,
    endDate: string,
  ): Promise<SubscriptionPayment[]> {
    return await this.billing.getSubscriptionPaymentsInPeriod(subscriptionId, startDate, endDate);
  }

  // General invoice listing for diagnostics/sync utilities
  async listInvoices(limit: number = 100): Promise<any[]> {
    return await this.billing.listInvoices(limit);
  }

  // Determine services from deal names and types
  determineServicesFromDeals(deals: any[]): string[] {
    const services = new Set<string>();

    deals.forEach((deal) => {
      const dealName = (deal.properties?.dealname || "").toLowerCase();

      if (dealName.includes("bookkeeping") || dealName.includes("bk")) {
        services.add("Bookkeeping");
      }
      if (dealName.includes("tax") || dealName.includes("taas")) {
        services.add("Tax");
      }
      if (dealName.includes("payroll")) {
        services.add("Payroll");
      }
      if (dealName.includes("consulting") || dealName.includes("cfo")) {
        services.add("Consulting");
      }
      if (dealName.includes("ap/ar") || dealName.includes("accounts")) {
        services.add("AP/AR");
      }
    });

    return Array.from(services);
  }

  // Company data enhancement methods
  async createCompany(companyData: {
    name: string;
    domain?: string;
    city?: string;
    state?: string;
    country?: string;
    industry?: string;
    annualrevenue?: string;
    numberofemployees?: string;
    linkedin_company_page?: string;
    website?: string;
    address?: string;
    zip?: string;
    hubspot_owner_id?: string;
  }) {
    try {
      // Only include properties that have valid values (not empty strings, null, or undefined)
      const properties: any = {
        name: companyData.name, // Always required
      };

      // Add optional properties only if they have valid values
      if (companyData.domain && companyData.domain.trim()) {
        properties.domain = companyData.domain.trim();
      }
      if (companyData.city && companyData.city.trim()) {
        properties.city = companyData.city.trim();
      }
      if (companyData.state && companyData.state.trim()) {
        properties.state = companyData.state.trim();
      }
      if (companyData.country && companyData.country.trim()) {
        properties.country = companyData.country.trim();
      }
      if (companyData.industry && companyData.industry.trim()) {
        properties.industry = companyData.industry.trim();
      }
      if (companyData.annualrevenue && companyData.annualrevenue.trim()) {
        properties.annualrevenue = companyData.annualrevenue.trim();
      }
      if (
        companyData.numberofemployees &&
        companyData.numberofemployees.trim()
      ) {
        properties.numberofemployees = companyData.numberofemployees.trim();
      }
      if (
        companyData.linkedin_company_page &&
        companyData.linkedin_company_page.trim()
      ) {
        properties.linkedin_company_page =
          companyData.linkedin_company_page.trim();
      }
      if (companyData.website && companyData.website.trim()) {
        properties.website = companyData.website.trim();
      }
      if (companyData.address && companyData.address.trim()) {
        properties.address = companyData.address.trim();
      }
      if (companyData.zip && companyData.zip.trim()) {
        properties.zip = companyData.zip.trim();
      }

      // Add company owner if provided
      if (companyData.hubspot_owner_id && companyData.hubspot_owner_id.trim()) {
        properties.hubspot_owner_id = companyData.hubspot_owner_id.trim();
      }

      console.log(
        "Creating company with properties:",
        JSON.stringify(properties, null, 2),
      );

      const response = await this.makeRequest("/crm/v3/objects/companies", {
        method: "POST",
        body: JSON.stringify({ properties }),
      });
      return response;
    } catch (error) {
      console.error("Failed to create company:", error);
      return null;
    }
  }

  async updateCompany(companyId: string, properties: any) {
    try {
      const response = await this.makeRequest(
        `/crm/v3/objects/companies/${companyId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ properties }),
        },
      );
      return response;
    } catch (error) {
      console.error("Failed to update company:", error);
      return null;
    }
  }

  async updateContact(contactId: string, properties: any) {
    try {
      console.log(
        `Updating contact ${contactId} with properties:`,
        JSON.stringify(properties, null, 2),
      );

      const response = await this.makeRequest(
        `/crm/v3/objects/contacts/${contactId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ properties }),
        },
      );
      return response;
    } catch (error) {
      console.error("Failed to update contact:", error);
      return null;
    }
  }

  async associateContactWithCompany(contactId: string, companyId: string) {
    try {
      await this.makeRequest(
        "/crm/v4/associations/contact/company/batch/create",
        {
          method: "POST",
          body: JSON.stringify({
            inputs: [
              {
                from: { id: contactId },
                to: { id: companyId },
                types: [
                  {
                    associationCategory: "HUBSPOT_DEFINED",
                    associationTypeId: 1, // Contact to Company association
                  },
                ],
              },
            ],
          }),
        },
      );
      return true;
    } catch (error) {
      console.error("Failed to associate contact with company:", error);
      return false;
    }
  }

  async getContactAssociatedCompanies(contactId: string) {
    try {
      const response = await this.makeRequest(
        `/crm/v4/objects/contacts/${contactId}/associations/companies`,
      );
      return response.results || [];
    } catch (error) {
      console.error("Failed to get contact associations:", error);
      return [];
    }
  }

  // Update existing company from quote data (no company creation)
  async updateOrCreateCompanyFromQuote(
    contactId: string,
    quote: any,
  ): Promise<void> {
    try {
      const companyName = quote.companyName;
      if (!companyName) {
        console.log("No company name in quote, skipping company update");
        return;
      }

      // Check if contact has associated company
      const existingCompanies = await this.getContactAssociatedCompanies(contactId);

      if (existingCompanies.length === 0) {
        console.log(`Contact ${contactId} has no associated companies - skipping company update`);
        return;
      }

      // Update existing associated company only
      const companyId = existingCompanies[0].toObjectId;
      console.log(`Updating existing company ${companyId} with quote data`);

      // Update company properties with quote data (1-way sync - always override HubSpot)
      const companyUpdateProperties: any = {};

      // Force update company name (1-way sync from quote to HubSpot)
      companyUpdateProperties.name = companyName;

      // Address fields (2-way sync - moved from contact to company only)
      if (quote.clientStreetAddress) companyUpdateProperties.address = quote.clientStreetAddress;
      if (quote.clientCity) companyUpdateProperties.city = quote.clientCity;
      if (quote.clientState) companyUpdateProperties.state = quote.clientState;
      if (quote.clientZipCode) companyUpdateProperties.zip = quote.clientZipCode;
      if (quote.clientCountry) companyUpdateProperties.country = quote.clientCountry;

      // Conditional employee count (only if payroll service is selected)
      if (quote.includesPayroll || quote.servicePayroll) {
        // Add employee count from payroll data if available
        if (quote.numberOfEmployees) {
          companyUpdateProperties.numberofemployees = quote.numberOfEmployees.toString();
        }
      }

      // Note: industry and monthly_revenue synced via contact properties
      // Note: removed domain, website, phone, linkedin_company_page, lead_source per requirements

      // Always update company properties to ensure sync
      await this.updateCompany(companyId, companyUpdateProperties);
      console.log(
        "Updated HubSpot company properties (update only):",
        companyUpdateProperties,
      );
    } catch (error) {
      console.error("Error updating company from quote:", error);
      throw error;
    }
  }

  // Helper method to extract domain from company name
  private extractDomainFromCompanyName(companyName: string): string {
    // Simple domain extraction logic
    const name = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .replace(/inc|llc|corp|company|co|ltd/g, "");
    return `${name}.com`;
  }

  // Get user details for profile syncing (name and email only)
  async getUserDetails(
    email: string,
  ): Promise<{ firstName?: string; lastName?: string; email?: string } | null> {
    try {
      // First try to get from owners (internal team members)
      const ownersResponse = await this.makeRequest("/crm/v3/owners");

      if (ownersResponse && ownersResponse.results) {
        const owner = ownersResponse.results.find(
          (o: any) => o.email && o.email.toLowerCase() === email.toLowerCase(),
        );

        if (owner) {
          console.log("Owner data found:", {
            firstName: owner.firstName,
            lastName: owner.lastName,
            email: owner.email,
          });

          return {
            firstName: owner.firstName || "",
            lastName: owner.lastName || "",
            email: owner.email || email,
          };
        }
      }

      // Fallback to contacts if not found in owners
      const contactResult = await this.verifyContactByEmail(email);
      if (contactResult.verified && contactResult.contact) {
        const props = contactResult.contact.properties;

        console.log("Contact data found:", {
          firstname: props.firstname,
          lastname: props.lastname,
          email: props.email,
        });

        return {
          firstName: props.firstname || "",
          lastName: props.lastname || "",
          email: props.email || email,
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching user details from HubSpot:", error);
      return null;
    }
  }

  async verifyUser(
    email: string,
  ): Promise<{ exists: boolean; userData?: any }> {
    // Delegated to modular contacts service
    return await this.contacts.verifyUser(email);
    try {
      // Verify this is a @seedfinancial.io email
      if (!email.endsWith("@seedfinancial.io")) {
        return { exists: false };
      }

      const response = await this.makeRequest(`/crm/v3/owners/`, {
        method: "GET",
      });

      if (response.results) {
        const user = response.results.find(
          (owner: any) => owner.email?.toLowerCase() === email.toLowerCase(),
        );

        if (user) {
          return {
            exists: true,
            userData: {
              hubspotUserId: user.id,
              firstName: user.firstName || "",
              lastName: user.lastName || "",
              email: user.email,
            },
          };
        }
      }

      return { exists: false };
    } catch (error) {
      console.error("Error verifying user in HubSpot:", error);
      return { exists: false };
    }
  }

  // Get dashboard metrics for a specific user
  async getDashboardMetrics(userEmail: string) {
    try {
      const ownerId = await this.getOwnerByEmail(userEmail);
      console.log(
        `Getting dashboard metrics for ${userEmail}, ownerId: ${ownerId}`,
      );
      if (!ownerId) {
        console.log(
          `No HubSpot owner found for ${userEmail} - this could be why metrics are showing $0`,
        );
        console.log(
          "Available owners can be checked in HubSpot admin or user may need to be assigned as owner",
        );
        return {
          pipelineValue: 0,
          activeDeals: 0,
          mtdRevenue: 0,
        };
      }

      // Get pipeline information to find the correct Seed Sales Pipeline ID dynamically
      let seedPipelineId = null;
      try {
        const pipelinesResponse = await this.makeRequest(
          "/crm/v3/pipelines/deals",
          {
            method: "GET",
          },
        );

        console.log(
          "Available pipelines:",
          pipelinesResponse.results?.map((p: any) => `${p.id}: ${p.label}`),
        );

        // Find Seed Sales Pipeline ID dynamically
        const seedPipelineEntry = pipelinesResponse.results?.find(
          (p: any) =>
            p.label &&
            (p.label.toLowerCase().includes("seed") ||
              p.label.toLowerCase().includes("sales")),
        );

        if (seedPipelineEntry) {
          seedPipelineId = seedPipelineEntry.id;
          console.log(
            `Found Seed Sales Pipeline: ${seedPipelineId} (${seedPipelineEntry.label})`,
          );
        } else {
          console.log(
            "Could not find Seed Sales Pipeline, will search all pipelines",
          );
        }
      } catch (error) {
        console.log("Could not fetch pipeline info, will search all pipelines");
      }

      // Build search filters - include pipeline filter only if we found the specific pipeline
      const filters = [
        {
          propertyName: "hubspot_owner_id",
          operator: "EQ",
          value: ownerId,
        },
      ];

      // Add pipeline filter only if we found the specific Seed Sales Pipeline
      if (seedPipelineId) {
        filters.push({
          propertyName: "pipeline",
          operator: "EQ",
          value: seedPipelineId,
        });
      }

      console.log(`Searching deals with filters:`, filters);

      // Get deals with dynamic pipeline filtering
      const allDealsResponse = await this.makeRequest(
        "/crm/v3/objects/deals/search",
        {
          method: "POST",
          body: JSON.stringify({
            filterGroups: [{ filters }],
            properties: [
              "amount",
              "dealstage",
              "dealname",
              "closedate",
              "pipeline",
              "hs_deal_stage_probability",
            ],
            limit: 100,
          }),
        },
      );

      console.log(
        "All deals found:",
        allDealsResponse.results?.map((deal: any) => ({
          name: deal.properties?.dealname,
          stage: deal.properties?.dealstage,
          amount: deal.properties?.amount,
        })),
      );

      // Get deal stage information to understand the stage IDs
      let dealStageInfo: any = {};
      let pipelineInfo: any = {};
      try {
        const stagesResponse = await this.makeRequest(
          "/crm/v3/properties/deals/dealstage",
          {
            method: "GET",
          },
        );
        dealStageInfo =
          stagesResponse.options?.reduce((acc: any, option: any) => {
            acc[option.value] = option.label;
            return acc;
          }, {}) || {};
        console.log("Deal stage mapping:", dealStageInfo);
      } catch (error) {
        console.log(
          "Could not fetch deal stage info, will use raw stage values",
        );
      }

      // Also get all deals with more properties to understand the discrepancy
      console.log("\n=== DETAILED DEAL ANALYSIS ===");
      allDealsResponse.results?.forEach((deal: any) => {
        const stage = deal.properties?.dealstage || "";
        const stageName = dealStageInfo[stage] || stage;
        const pipelineName =
          pipelineInfo[deal.properties?.pipeline] || deal.properties?.pipeline;
        console.log(`Deal: ${deal.properties?.dealname}`);
        console.log(
          `  Pipeline: ${deal.properties?.pipeline} (${pipelineName})`,
        );
        console.log(`  Stage ID: ${stage}`);
        console.log(`  Stage Name: ${stageName}`);
        console.log(`  Amount: $${deal.properties?.amount || "0"}`);
        console.log(`  Close Date: ${deal.properties?.closedate || "None"}`);
        console.log("---");
      });

      // Calculate pipeline value - include ALL deals except Closed Won and Closed Lost
      // Per user: "any deal NOT in a closed won or closed lost stage"
      // This includes: Assigned, Responded, Discovery Call Scheduled, Qualified, Proposal Sent, Negotiation
      const pipelineValue =
        allDealsResponse.results?.reduce((total: number, deal: any) => {
          const stage = deal.properties?.dealstage || "";
          const stageName = dealStageInfo[stage] || stage;
          const amount = parseFloat(deal.properties.amount || "0");

          // Exclude closed won and closed lost stages based on actual Seed Sales Pipeline stages
          const closedWonStageIds = ["1108547153"]; // Closed Won from debug
          const closedLostStageIds = ["1108547154"]; // Closed Lost from debug
          const allClosedStageIds = [
            ...closedWonStageIds,
            ...closedLostStageIds,
          ];
          const closedStages = [
            "closedwon",
            "closedlost",
            "closed won",
            "closed lost",
          ];
          const isClosedStage =
            allClosedStageIds.includes(stage) ||
            closedStages.some(
              (closedStage) =>
                stage.toLowerCase().includes(closedStage) ||
                stageName.toLowerCase().includes(closedStage),
            );

          if (!isClosedStage) {
            console.log(
              `Including in pipeline: ${deal.properties?.dealname} - Stage: ${stage} (${stageName}) - Amount: $${amount}`,
            );
            return total + amount;
          } else {
            console.log(
              `Excluding from pipeline (closed stage): ${deal.properties?.dealname} - Stage: ${stage} (${stageName}) - Amount: $${amount}`,
            );
          }
          return total;
        }, 0) || 0;

      // Calculate active deals count - deals NOT in closed won or closed lost stages
      // This is the same logic as pipeline value but just counting deals instead of summing amounts
      const activeDeals =
        allDealsResponse.results?.filter((deal: any) => {
          const stage = deal.properties?.dealstage || "";
          const stageName = dealStageInfo[stage] || stage;

          // Exclude closed won and closed lost stages based on actual Seed Sales Pipeline stages
          const closedWonStageIds = ["1108547153"]; // Closed Won from debug
          const closedLostStageIds = ["1108547154"]; // Closed Lost from debug
          const allClosedStageIds = [
            ...closedWonStageIds,
            ...closedLostStageIds,
          ];
          const closedStages = [
            "closedwon",
            "closedlost",
            "closed won",
            "closed lost",
          ];
          const isClosedStage =
            allClosedStageIds.includes(stage) ||
            closedStages.some(
              (closedStage) =>
                stage.toLowerCase().includes(closedStage) ||
                stageName.toLowerCase().includes(closedStage),
            );

          return !isClosedStage; // Include only non-closed deals
        })?.length || 0;

      console.log(
        `Active deals count: ${activeDeals} (deals not in closed won/lost stages)`,
      );

      // Get MTD revenue from closed-won deals
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      firstOfMonth.setHours(0, 0, 0, 0);

      // Calculate MTD revenue from closed won deals with close date in current month
      // Per user: "Sum of deal value from all Deals in a Closed Won stage, and have a Close Date in the current calendar month"
      console.log("\n=== MTD REVENUE ANALYSIS ===");
      console.log(
        `Looking for deals closed since: ${firstOfMonth.toDateString()}`,
      );

      const mtdRevenue =
        allDealsResponse.results?.reduce((total: number, deal: any) => {
          const stage = deal.properties?.dealstage || "";
          const stageName = dealStageInfo[stage] || stage;
          const closeDate = deal.properties?.closedate;
          const amount = parseFloat(deal.properties.amount || "0");

          console.log(`\nAnalyzing deal: ${deal.properties?.dealname}`);
          console.log(`  Stage: ${stage} (${stageName})`);
          console.log(`  Close Date: ${closeDate || "None"}`);
          console.log(`  Amount: $${amount}`);

          // Check if it's a closed won deal - stage 1108547153 appears to be closed won based on user feedback
          const closedWonStageIds = ["1108547153", "closedwon", "closed won"];
          const isClosedWonStage =
            closedWonStageIds.includes(stage.toLowerCase()) ||
            closedWonStageIds.some((id) => stage === id) ||
            stageName.toLowerCase().includes("closed won") ||
            stageName.toLowerCase().includes("closedwon");

          console.log(`  Is Closed Won? ${isClosedWonStage}`);

          if (isClosedWonStage && closeDate) {
            const dealCloseDate = new Date(closeDate);
            const isThisMonth =
              dealCloseDate >= firstOfMonth && dealCloseDate <= new Date();
            console.log(`  Close date in current month? ${isThisMonth}`);

            if (isThisMonth) {
              console.log(`  ✓ INCLUDING in MTD revenue: $${amount}`);
              return total + amount;
            } else {
              console.log(
                `  ✗ Closed won but outside MTD: ${dealCloseDate.toDateString()}`,
              );
            }
          } else if (!closeDate && isClosedWonStage) {
            console.log(`  ✗ Closed won but no close date`);
          } else {
            console.log(`  ✗ Not a closed won deal`);
          }

          return total;
        }, 0) || 0;

      console.log(`\nFinal MTD Revenue: $${mtdRevenue}`);
      console.log("=== END MTD ANALYSIS ===\n");

      return {
        pipelineValue: Math.round(pipelineValue),
        activeDeals,
        mtdRevenue: Math.round(mtdRevenue),
      };
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      return {
        pipelineValue: 0,
        activeLeads: 0,
        mtdRevenue: 0,
      };
    }
  }
}

// Only create service if token is available
export const hubSpotService = process.env.HUBSPOT_ACCESS_TOKEN
  ? new HubSpotService()
  : null;

// Lightweight helper to check if a HubSpot quote exists by ID
// Uses the singleton and its internal request method safely.
export async function doesHubSpotQuoteExist(quoteId: string): Promise<boolean> {
  if (!hubSpotService) return false;
  try {
    return await hubSpotService.doesQuoteExist(quoteId);
  } catch {
    return false;
  }
}

// Simple HubSpot integration using fetch API to avoid TypeScript complexity
export interface HubSpotContact {
  id: string;
  properties: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
    mobilephone?: string;
    hs_phone?: string;
    phone_number?: string;
    work_phone?: string;
    mobile_phone?: string;
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

// HubSpot Product Record IDs for All Services - CORRECTED VALID IDs
const HUBSPOT_PRODUCT_IDS = {
  MONTHLY_BOOKKEEPING: "25687054003", // ✅ CORRECTED - this is the actual valid ID from HubSpot
  TAAS: "26203849099", // ✅ FIXED - correct product ID provided by user
  GUIDED_SERVICE_TIER: "28884795543",
  CONCIERGE_SERVICE_TIER: "28891925782",
  PAYROLL_SERVICE: "25683750265", // Updated to match services.ts
  AP_LITE_SERVICE: "25683750266", // Updated to match services.ts  
  AR_LITE_SERVICE: "25683750267", // Updated to match services.ts
  AP_ADVANCED_SERVICE: "28960182653",
  AR_ADVANCED_SERVICE: "28928071009",
  AGENT_OF_SERVICE: "29001355021",
  CLEANUP_PROJECT: "25683750263",
  PRIOR_YEAR_FILINGS: "26354718811"
} as const;

export class HubSpotService {
  private accessToken: string;
  private baseUrl = "https://api.hubapi.com";

  constructor() {
    if (!process.env.HUBSPOT_ACCESS_TOKEN) {
      throw new Error("HUBSPOT_ACCESS_TOKEN environment variable is required");
    }
    this.accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
  }

  // Check if a user exists in HubSpot by email (contacts or owners)
  async verifyUserByEmail(email: string): Promise<boolean> {
    try {
      // Check contacts first
      const contactExists = await this.verifyContactByEmail(email);
      if (contactExists.verified) {
        return true;
      }

      // Try to check HubSpot users (employees) via the owners API
      // Note: This requires the crm.objects.owners.read scope
      try {
        const ownersResponse = await this.makeRequest("/crm/v3/owners");
        if (ownersResponse && ownersResponse.results) {
          const userExists = ownersResponse.results.some(
            (owner: any) =>
              owner.email && owner.email.toLowerCase() === email.toLowerCase(),
          );
          if (userExists) {
            return true;
          }
        }
      } catch (ownerError) {
        console.log(
          "Owners API not accessible (missing scope), checking contacts only",
        );
      }

      return false;
    } catch (error) {
      console.error("Error verifying user in HubSpot:", error);
      return false;
    }
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
    try {
      // Use cache for owner lookups
      const cacheKey = cache.generateKey(CachePrefix.USER_PROFILE, email);
      return await cache.wrap(
        cacheKey,
        async () => {
          const result = await this.makeRequest("/crm/v3/owners", {
            method: "GET",
          });

          const owner = result.results?.find(
            (owner: any) => owner.email === email,
          );
          return owner?.id || null;
        },
        { ttl: CacheTTL.USER_PROFILE },
      );
    } catch (error) {
      console.error("Error fetching HubSpot owner:", error);
      return null;
    }
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
    try {
      const searchBody = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: email,
              },
            ],
          },
        ],
        properties: [
          "email",
          "firstname",
          "lastname",
          "company",
          // Contact address fields
          "address",
          "city",
          "state",
          "zip",
          "country",
          // All possible phone field variations
          "phone",
          "mobilephone",
          "hs_phone",
          "phone_number",
          "work_phone",
          "mobile_phone",
          "home_phone",
          "fax",
          "secondary_phone",
          "phone_ext",
          "phonenumber",
        ],
        associations: ["companies"],
      };

      const result = await this.makeRequest("/crm/v3/objects/contacts/search", {
        method: "POST",
        body: JSON.stringify(searchBody),
      });

      if (result.results && result.results.length > 0) {
        const contact = result.results[0];

        // Get associated company data if available
        let companyData = {};
        if (contact.associations?.companies?.results?.length > 0) {
          const companyId = contact.associations.companies.results[0].id;
          try {
            const companyResult = await this.makeRequest(
              `/crm/v3/objects/companies/${companyId}?properties=industry,annualrevenue,numberofemployees,hs_industry_group,monthly_revenue_range,entity_type`,
            );
            if (companyResult) {
              companyData = {
                industry:
                  companyResult.properties?.industry ||
                  companyResult.properties?.hs_industry_group ||
                  "",
                monthly_revenue_range:
                  companyResult.properties?.monthly_revenue_range || "",
                entity_type: companyResult.properties?.entity_type || "",
                annualrevenue: companyResult.properties?.annualrevenue || "",
                numberofemployees:
                  companyResult.properties?.numberofemployees || "",
              };
            }
          } catch (companyError) {
            console.log("Could not fetch company data:", companyError);
          }
        }

        return {
          verified: true,
          contact: {
            id: contact.id,
            properties: {
              email: contact.properties?.email || email,
              firstname: contact.properties?.firstname || "",
              lastname: contact.properties?.lastname || "",
              company: contact.properties?.company || "",
              // Contact address fields
              address: contact.properties?.address || "",
              city: contact.properties?.city || "",
              state: contact.properties?.state || "",
              zip: contact.properties?.zip || "",
              country: contact.properties?.country || "",
              // Phone fields
              phone: contact.properties?.phone || "",
              mobilephone: contact.properties?.mobilephone || "",
              hs_phone: contact.properties?.hs_phone || "",
              phone_number: contact.properties?.phone_number || "",
              work_phone: contact.properties?.work_phone || "",
              mobile_phone: contact.properties?.mobile_phone || "",
              // Company properties (from associated company)
              ...companyData,
            },
          },
        };
      }

      return { verified: false };
    } catch (error) {
      console.error("Error verifying contact in HubSpot:", error);
      return { verified: false };
    }
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
    try {
      // Generate comprehensive deal name based on ALL services
      const services = [];
      
      // Check for all service types from quote data
      if (includesBookkeeping || quoteData?.serviceBookkeeping || quoteData?.serviceMonthlyBookkeeping) {
        services.push("Bookkeeping");
      }
      if (includesTaas || quoteData?.serviceTaas || quoteData?.serviceTaasMonthly) {
        services.push("TaaS");
      }
      if (quoteData?.servicePayroll || quoteData?.servicePayrollService) {
        services.push("Payroll");
      }
      if (quoteData?.serviceApArLite || quoteData?.serviceApArService || quoteData?.serviceApLite || quoteData?.serviceApAdvanced) {
        services.push("AP");
      }
      if (quoteData?.serviceArService || quoteData?.serviceArLite || quoteData?.serviceArAdvanced) {
        services.push("AR");
      }
      if (quoteData?.serviceAgentOfService) {
        services.push("Agent of Service");
      }
      if (quoteData?.serviceCfoAdvisory) {
        services.push("CFO Advisory");
      }
      if (quoteData?.serviceFpaLite || quoteData?.serviceFpaBuild || quoteData?.serviceFpaSupport) {
        services.push("FP&A");
      }
      if (quoteData?.serviceCleanupProjects) {
        services.push("Cleanup");
      }
      if (quoteData?.servicePriorYearFilings) {
        services.push("Prior Year Filings");
      }
      
      // Fallback if no services detected
      if (services.length === 0) {
        services.push("Services");
      }
      
      const serviceName = services.join(" + ");
      const dealName = `${companyName} - ${serviceName}`;
      
      console.log(`🏷️ Generated deal name: "${dealName}" for services:`, services);
      const totalAmount = (monthlyFee * 12 + setupFee).toString();

      // Get the correct pipeline and stage IDs dynamically
      console.log("Fetching pipeline information...");
      const pipelineInfo = await this.getSeedSalesPipelineStage();
      console.log("Pipeline info result:", pipelineInfo);
      if (!pipelineInfo) {
        console.error("Could not find Seed Sales Pipeline or Qualified stage");
        return null;
      }

      const dealBody = {
        properties: {
          dealname: dealName,
          dealstage: pipelineInfo.qualifiedStageId,
          amount: totalAmount,
          pipeline: pipelineInfo.pipelineId,
          dealtype: "newbusiness", // Deal Type: New Business
          ...(ownerId && { hubspot_owner_id: ownerId }), // Set deal owner
          
          // HubSpot field mapping using only EXISTING properties with correct values
          
          // Entity type - map to correct HubSpot values
          ...(quoteData?.entityType && { 
            entity_type: quoteData.entityType === 'C-Corp' ? 'c-corp' :
                        quoteData.entityType === 'S-Corp' ? 's-corp' :
                        quoteData.entityType === 'Sole Proprietor' ? 'sole_prop' :
                        quoteData.entityType === 'Partnership' ? 'partnership' :
                        quoteData.entityType === 'Non-Profit' ? 'non-profit' :
                        quoteData.entityType.toLowerCase().replace('-', '_')
          }),
          
          // Service tier - map to actual HubSpot values (WITH hyphens as shown in error)
          ...(quoteData?.serviceTier && { 
            service_tier: quoteData.serviceTier === 'Automated' ? 'Level 1 - Automated' :
                         quoteData.serviceTier === 'Guided' ? 'Level 2 - Guided' :
                         quoteData.serviceTier === 'Concierge' ? 'Level 3 - Concierge' :
                         'Level 1 - Automated' // Default fallback
          }),
          
          // Core numeric fields that exist in HubSpot
          ...(quoteData?.numEntities && { number_of_entities: quoteData.numEntities.toString() }),
          ...(quoteData?.statesFiled && { number_of_state_filings: quoteData.statesFiled.toString() }),
          ...(quoteData?.numBusinessOwners && { number_of_owners_partners: quoteData.numBusinessOwners.toString() }),
          ...(quoteData?.cleanupMonths && { initial_clean_up_months: quoteData.cleanupMonths.toString() }),
          ...(quoteData?.priorYearsUnfiled && { prior_years_unfiled: quoteData.priorYearsUnfiled.toString() }),
          
          // Boolean fields that exist in HubSpot (converted to string format)
          ...(quoteData?.include1040s !== undefined && { include_personal_1040s: quoteData.include1040s ? 'true' : 'false' }),
          ...(quoteData?.internationalFiling !== undefined && { international_filing: quoteData.internationalFiling ? 'true' : 'false' }),
          ...(quoteData?.businessLoans !== undefined && { business_loans: quoteData.businessLoans ? 'true' : 'false' }),
          
          // Other existing fields (lowercase values)
          ...(quoteData?.accountingBasis && { 
            accounting_basis: quoteData.accountingBasis === 'Cash' ? 'cash' :
                             quoteData.accountingBasis === 'Accrual' ? 'accrual' :
                             quoteData.accountingBasis.toLowerCase()
          }),
          ...(quoteData?.currentBookkeepingSoftware && { current_bookkeeping_software: quoteData.currentBookkeepingSoftware }),
          ...(quoteData?.primaryBank && { primary_bank: quoteData.primaryBank }),
        },
        associations: [
          {
            to: { id: contactId },
            types: [
              { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 },
            ],
          },
        ],
      };

      console.log(
        "Creating deal with body:",
        JSON.stringify(dealBody, null, 2),
      );

      const result = await this.makeRequest("/crm/v3/objects/deals", {
        method: "POST",
        body: JSON.stringify(dealBody),
      });

      console.log("Raw HubSpot API response:", JSON.stringify(result, null, 2));

      if (!result || !result.id) {
        console.error(
          "Deal creation failed - no ID returned. Full response:",
          result,
        );
        throw new Error(
          `Deal creation failed: No ID returned from HubSpot. Response: ${JSON.stringify(result)}`,
        );
      }

      console.log("Deal created successfully with ID:", result.id);

      return {
        id: result.id,
        properties: {
          dealname: result.properties?.dealname || dealName,
          dealstage: result.properties?.dealstage || "qualified",
          amount: result.properties?.amount || totalAmount,
        },
      };
    } catch (error) {
      console.error("Error creating deal in HubSpot:", error);
      return null;
    }
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
  ): Promise<{ id: string; title: string } | null> {
    try {
      // Create a proper HubSpot quote using the quotes API
      console.log("Creating HubSpot quote...");

      // Get the user's profile information from HubSpot
      const userProfile = await this.getUserProfile(userEmail);

      // Generate comprehensive quote name based on ALL services
      const services = [];
      
      // Check for all service types from quote data
      if (includesBookkeeping || quoteData?.serviceBookkeeping || quoteData?.serviceMonthlyBookkeeping) {
        services.push("Bookkeeping");
      }
      if (includesTaas || quoteData?.serviceTaas || quoteData?.serviceTaasMonthly) {
        services.push("TaaS");
      }
      if (quoteData?.servicePayroll || quoteData?.servicePayrollService) {
        services.push("Payroll");
      }
      if (quoteData?.serviceApArLite || quoteData?.serviceApArService || quoteData?.serviceApLite || quoteData?.serviceApAdvanced) {
        services.push("AP");
      }
      if (quoteData?.serviceArService || quoteData?.serviceArLite || quoteData?.serviceArAdvanced) {
        services.push("AR");
      }
      if (quoteData?.serviceAgentOfService) {
        services.push("Agent of Service");
      }
      if (quoteData?.serviceCfoAdvisory) {
        services.push("CFO Advisory");
      }
      if (quoteData?.serviceFpaLite || quoteData?.serviceFpaBuild || quoteData?.serviceFpaSupport) {
        services.push("FP&A");
      }
      if (quoteData?.serviceCleanupProjects) {
        services.push("Cleanup");
      }
      if (quoteData?.servicePriorYearFilings) {
        services.push("Prior Year Filings");
      }
      
      // Fallback if no services detected
      if (services.length === 0) {
        services.push("Services");
      }
      
      const serviceName = services.join(" + ") + " Services";
      const quoteName = `${companyName} - ${serviceName} Quote`;
      
      console.log(`📋 Generated quote name: "${quoteName}" for services:`, services);

      // Set expiration date to 30 days from now
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      // Create detailed quote description with pricing breakdown
      const quoteDescription = `
Bookkeeping Services Quote

MONTHLY SERVICES:
• Monthly Bookkeeping Services: $${monthlyFee.toFixed(2)}/month
• Annual Total (12 months): $${(monthlyFee * 12).toFixed(2)}

${
  setupFee > 0
    ? `SETUP & CLEANUP:
• One-time Setup and Cleanup Fee: $${setupFee.toFixed(2)}
`
    : ""
}
TOTAL QUOTE VALUE: $${(monthlyFee * 12 + setupFee).toFixed(2)}

Services Include:
• Bank reconciliation
• Accounts payable/receivable management
• Financial statement preparation
• Monthly reporting
• QuickBooks maintenance
• Ongoing support and consultation
      `.trim();

      // Generate scope assumptions if quote data is available
      let scopeAssumptions = "";
      if (quoteData) {
        console.log("📋 Generating scope assumptions for quote creation");
        scopeAssumptions = this.generateScopeAssumptions(quoteData);
        console.log("📋 Scope assumptions generated:", scopeAssumptions);
      }

      // Generate payment terms based on service selection
      const paymentTerms = this.generatePaymentTerms(
        includesBookkeeping,
        includesTaas,
        includesPayroll,
        includesAP,
        includesAR,
        includesAgentOfService,
        includesCfoAdvisory,
        cleanupProjectFee > 0,
        priorYearFilingsFee > 0,
        includesFpaBuild,
      );
      console.log("📋 Payment terms generated:", paymentTerms);

      const quoteBody = {
        properties: {
          hs_title: quoteName,
          hs_status: "DRAFT",
          hs_expiration_date: expirationDate.toISOString().split("T")[0], // YYYY-MM-DD format
          hs_language: "en",
          hs_sender_company_name: userProfile?.companyName || "Seed Financial",
          hs_sender_company_address:
            userProfile?.companyAddress ||
            "4136 Del Rey Ave, Ste 521, Marina Del Rey, CA 90292",
          hs_sender_firstname: userProfile?.firstName || firstName || "Jon",
          hs_sender_lastname: userProfile?.lastName || lastName || "Wells",
          hs_sender_email: userEmail,
          hs_esign_enabled: true,
          // Removed invalid properties: hs_payment_enabled, hs_payments_enabled, hs_signature_required
          // These will be set manually in HubSpot after quote creation
          hs_comments: scopeAssumptions, // Add scope assumptions to comments field
          hs_terms: paymentTerms, // Add payment terms with MSA and service schedule links
        },
        associations: [
          {
            to: { id: dealId },
            types: [
              { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 64 },
            ], // Quote to Deal association
          },
        ],
      };

      console.log(
        "Creating quote with body:",
        JSON.stringify(quoteBody, null, 2),
      );

      console.log("🚀 ATTEMPTING HUBSPOT QUOTE CREATION...");
      const result = await this.makeRequest("/crm/v3/objects/quotes", {
        method: "POST",
        body: JSON.stringify(quoteBody),
      });

      console.log("✅ Quote created successfully:", result.id);

      // Use the comprehensive service management system for creating line items
      try {
        console.log("🔧 Using comprehensive service line item system");
        await this.createInitialServiceLineItems(result.id, {
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
          qboSubscription: quoteData?.qboSubscription ?? false,
        });
        console.log("📋 Comprehensive line items added successfully to quote");
      } catch (lineItemError) {
        console.error(
          "⚠️ Line item creation failed, but quote was created successfully:",
          lineItemError,
        );
        console.error(
          "📝 Quote will be created without line items. User can add them manually in HubSpot.",
        );
        // Don't throw here - allow quote creation to succeed even if line items fail
      }

      return {
        id: result.id,
        title: quoteName,
      };
    } catch (error) {
      console.error("❌ HUBSPOT QUOTE CREATION FAILED:", error);
      console.error("🔍 ERROR DETAILS:", {
        message: error instanceof Error ? error.message : "Unknown error",
        status: error.status || "No status",
        body: error.body || "No body",
        stack: error instanceof Error ? error.stack : undefined,
      });
      console.error(
        "🔍 QUOTE CREATION FAILED - No quote body available for debugging"
      );

      // REMOVE MISLEADING FALLBACK - throw the actual error
      throw error;
    }
  }

  private async createInitialServiceLineItems(quoteId: string, serviceConfig: any): Promise<void> {
    console.log("Creating service line items for quote:", quoteId);
    
    // CRITICAL: Verify all product IDs exist first to avoid failures
    console.log("🔍 VERIFYING ALL PRODUCT IDs BEFORE CREATING LINE ITEMS:");
    const products = await this.getProducts();
    
    // Test TAAS specifically since it's failing
    console.log(`🧪 TESTING TAAS PRODUCT ID: ${HUBSPOT_PRODUCT_IDS.TAAS}`);
    try {
      const taasProduct = await this.makeRequest(`/crm/v3/objects/products/${HUBSPOT_PRODUCT_IDS.TAAS}`);
      console.log(`✅ TAAS Product ID is valid: ${taasProduct.properties?.name}`);
    } catch (error) {
      console.log(`❌ TAAS Product ID ${HUBSPOT_PRODUCT_IDS.TAAS} is INVALID - this explains missing line items!`);
      console.log(`🔍 Searching for valid TAAS/Tax Service alternatives...`);
      products.forEach(product => {
        const name = product.properties?.name?.toLowerCase() || '';
        if (name.includes('tax') || name.includes('taas')) {
          console.log(`  💡 Found potential TAAS replacement: ID ${product.id} - "${product.properties?.name}"`);
        }
      });
    }
    
    const services = [];
    
    // Monthly Bookkeeping Service
    if (serviceConfig.includesBookkeeping) {
      services.push({price: 310, productId: HUBSPOT_PRODUCT_IDS.MONTHLY_BOOKKEEPING}); // Monthly fee from screenshot
    }
    
    // Tax as a Service
    if (serviceConfig.includesTaas) {
      services.push({price: 275, productId: HUBSPOT_PRODUCT_IDS.TAAS}); // Monthly fee from screenshot  
    }
    
    // Cleanup/Catch-up Project
    if (serviceConfig.cleanupProjectFee > 0) {
      services.push({price: serviceConfig.cleanupProjectFee, productId: HUBSPOT_PRODUCT_IDS.CLEANUP_PROJECT});
    }
    
    // Prior Year Filings
    if (serviceConfig.priorYearFilingsFee > 0) {
      services.push({price: serviceConfig.priorYearFilingsFee, productId: HUBSPOT_PRODUCT_IDS.PRIOR_YEAR_FILINGS});
    }
    
    // Payroll Service
    if (serviceConfig.includesPayroll) {
      services.push({price: serviceConfig.payrollFee || 125, productId: HUBSPOT_PRODUCT_IDS.PAYROLL_SERVICE});
    }
    
    // Accounts Payable Service
    if (serviceConfig.includesAP) {
      const apProductId = serviceConfig.apServiceTier === 'advanced' ? 
        HUBSPOT_PRODUCT_IDS.AP_ADVANCED_SERVICE : HUBSPOT_PRODUCT_IDS.AP_LITE_SERVICE;
      services.push({price: serviceConfig.apFee || 162, productId: apProductId});
    }
    
    // Accounts Receivable Service
    if (serviceConfig.includesAR) {
      const arProductId = serviceConfig.arServiceTier === 'advanced' ? 
        HUBSPOT_PRODUCT_IDS.AR_ADVANCED_SERVICE : HUBSPOT_PRODUCT_IDS.AR_LITE_SERVICE;
      services.push({price: serviceConfig.arFee || 405, productId: arProductId});
    }
    
    // Agent of Service
    if (serviceConfig.includesAgentOfService) {
      services.push({price: serviceConfig.agentOfServiceFee || 900, productId: HUBSPOT_PRODUCT_IDS.AGENT_OF_SERVICE});
    }
    
    // Service Tier (Concierge/Guided)
    if (serviceConfig.serviceTier === 'Concierge') {
      services.push({price: 240, productId: HUBSPOT_PRODUCT_IDS.CONCIERGE_SERVICE_TIER}); // +$240/month from screenshot
    } else if (serviceConfig.serviceTier === 'Guided') {
      services.push({price: 0, productId: HUBSPOT_PRODUCT_IDS.GUIDED_SERVICE_TIER}); // Base tier
    }
    
    // QBO Subscription
    if (serviceConfig.qboSubscription) {
      services.push({price: 60, productId: "26213746490"});
    }
    
    for (const service of services) {
      await this.associateProductWithQuote(quoteId, service.productId, service.price, 1, null);
    }
    console.log(`✅ Created ${services.length} line items`);
  }

  // Verify product IDs and potentially find alternatives
  async verifyAndGetProductIds(): Promise<{
    bookkeeping: string;
    cleanup: string;
    valid: boolean;
  }> {
    try {
      console.log("🔍 VERIFYING HUBSPOT PRODUCT IDS");

      const currentIds = {
        bookkeeping: "25687054003", // Direct valid ID from HubSpot product list
        cleanup: "25683750263",
      };

      // Test current product IDs
      let bookkeepingValid = false;
      let cleanupValid = false;

      try {
        await this.makeRequest(
          `/crm/v3/objects/products/${currentIds.bookkeeping}`,
        );
        bookkeepingValid = true;
        console.log(
          `✅ Bookkeeping product ID ${currentIds.bookkeeping} is valid`,
        );
      } catch {
        console.log(
          `❌ Bookkeeping product ID ${currentIds.bookkeeping} is invalid`,
        );
      }

      try {
        await this.makeRequest(
          `/crm/v3/objects/products/${currentIds.cleanup}`,
        );
        cleanupValid = true;
        console.log(`✅ Cleanup product ID ${currentIds.cleanup} is valid`);
      } catch {
        console.log(`❌ Cleanup product ID ${currentIds.cleanup} is invalid`);
      }

      if (bookkeepingValid && cleanupValid) {
        console.log("🎉 All product IDs are valid");
        return { ...currentIds, valid: true };
      }

      // If invalid, try to find alternatives
      console.log("🔍 Searching for alternative products...");
      const products = await this.getProducts();

      let altBookkeeping = currentIds.bookkeeping;
      let altCleanup = currentIds.cleanup;

      for (const product of products) {
        const name = product.properties?.name?.toLowerCase() || "";
        const sku = product.properties?.hs_sku?.toLowerCase() || "";

        if (
          !bookkeepingValid &&
          (name.includes("bookkeeping") ||
            name.includes("monthly") ||
            sku.includes("book"))
        ) {
          altBookkeeping = product.id;
          bookkeepingValid = true;
          console.log(
            `🔄 Found alternative bookkeeping product: ${product.id} - ${product.properties?.name}`,
          );
        }

        if (
          !cleanupValid &&
          (name.includes("cleanup") ||
            name.includes("catch") ||
            name.includes("setup") ||
            sku.includes("setup"))
        ) {
          altCleanup = product.id;
          cleanupValid = true;
          console.log(
            `🔄 Found alternative cleanup product: ${product.id} - ${product.properties?.name}`,
          );
        }
      }

      return {
        bookkeeping: altBookkeeping,
        cleanup: altCleanup,
        valid: bookkeepingValid && cleanupValid,
      };
    } catch (error) {
      console.error("❌ Error verifying product IDs:", error);
      return {
        bookkeeping: "25687054003", // Direct valid ID from HubSpot product list
        cleanup: "25683750263",
        valid: false,
      };
    }
  }

  private async associateProductWithQuote(
    quoteId: string,
    productId: string,
    price: number,
    quantity: number,
    customName?: string,
  ): Promise<void> {
    try {
      console.log(`🔧 STARTING PRODUCT ASSOCIATION`);
      console.log(`📋 Quote ID: ${quoteId}`);
      console.log(`🏷️ Product ID: ${productId}`);
      console.log(`💰 Price: $${price}`);
      console.log(`📦 Quantity: ${quantity}`);
      console.log(`🏷️ Custom Name: ${customName || "None"}`);

      // Step 1: Verify product exists
      console.log(`🔍 Step 1: Fetching product details for ID: ${productId}`);
      let product;
      try {
        product = await this.makeRequest(
          `/crm/v3/objects/products/${productId}`,
        );
        console.log(`✅ Product found:`, {
          id: product.id,
          name: product.properties?.name,
          sku: product.properties?.hs_sku,
        });
      } catch (productError) {
        console.error(
          `❌ PRODUCT NOT FOUND: Product ID ${productId} does not exist in HubSpot`,
        );
        console.error("Product fetch error:", productError);
        throw new Error(
          `Product ID ${productId} not found in HubSpot. Please verify the product exists.`,
        );
      }

      // Step 2: Create line item with HubSpot NATIVE name (eliminates Custom tags)
      console.log(`🏗️ Step 2: Creating line item`);
      const nativeName = product.properties?.name || "Service";
      console.log(`🏷️ Using HubSpot NATIVE product name: "${nativeName}" (should NOT contain 'Custom')`);
      
      const lineItem = {
        properties: {
          name: nativeName, // Use exact HubSpot native name to avoid (Custom) tags
          price: price.toString(),
          quantity: quantity.toString(),
          hs_product_id: productId,
          hs_sku: product.properties?.hs_sku || productId,
          description: `Seed Financial - ${nativeName}`, // Clear description
        },
      };

      console.log("📝 Line item payload:", JSON.stringify(lineItem, null, 2));

      let lineItemResult;
      try {
        lineItemResult = await this.makeRequest("/crm/v3/objects/line_items", {
          method: "POST",
          body: JSON.stringify(lineItem),
        });
        console.log(
          `✅ Line item created successfully with ID: ${lineItemResult.id}`,
        );
      } catch (lineItemError) {
        console.error("❌ LINE ITEM CREATION FAILED:", lineItemError);
        throw new Error(
          `Failed to create line item: ${lineItemError instanceof Error ? lineItemError.message : "Unknown error"}`,
        );
      }

      // Step 3: Associate line item with quote
      console.log(
        `🔗 Step 3: Associating line item ${lineItemResult.id} with quote ${quoteId}`,
      );
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

      console.log(
        "🔗 Association payload:",
        JSON.stringify(associationBody, null, 2),
      );

      try {
        await this.makeRequest(
          "/crm/v4/associations/quotes/line_items/batch/create",
          {
            method: "POST",
            body: JSON.stringify(associationBody),
          },
        );
        console.log(
          `✅ Successfully associated line item ${lineItemResult.id} with quote ${quoteId}`,
        );
      } catch (associationError) {
        console.error("❌ ASSOCIATION FAILED:", associationError);
        throw new Error(
          `Failed to associate line item with quote: ${associationError instanceof Error ? associationError.message : "Unknown error"}`,
        );
      }

      console.log(`🎉 PRODUCT ASSOCIATION COMPLETED SUCCESSFULLY`);
    } catch (error) {
      console.error("❌ CRITICAL ERROR in associateProductWithQuote:", error);
      throw error;
    }
  }

  // Search contacts in HubSpot (basic search)
  async searchContactsBasic(searchTerm: string): Promise<HubSpotContact[]> {
    try {
      console.log(`HubSpot searchContacts called with term: "${searchTerm}"`);

      const searchBody = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "CONTAINS_TOKEN",
                value: searchTerm,
              },
            ],
          },
          {
            filters: [
              {
                propertyName: "firstname",
                operator: "CONTAINS_TOKEN",
                value: searchTerm,
              },
            ],
          },
          {
            filters: [
              {
                propertyName: "lastname",
                operator: "CONTAINS_TOKEN",
                value: searchTerm,
              },
            ],
          },
          {
            filters: [
              {
                propertyName: "company",
                operator: "CONTAINS_TOKEN",
                value: searchTerm,
              },
            ],
          },
        ],
        properties: [
          "email",
          "firstname",
          "lastname",
          "company",
          "phone",
          "industry",
          "address",
          "city",
          "state",
          "zip",
        ],
        limit: 20,
      };

      console.log("HubSpot search body:", JSON.stringify(searchBody, null, 2));

      const result = await this.makeRequest("/crm/v3/objects/contacts/search", {
        method: "POST",
        body: JSON.stringify(searchBody),
      });

      console.log(
        `HubSpot search result: ${result.results?.length || 0} contacts found`,
      );
      if (result.results?.length > 0) {
        console.log(
          "First contact sample:",
          JSON.stringify(result.results[0], null, 2),
        );
      }

      return result.results || [];
    } catch (error) {
      console.error("Error searching HubSpot contacts:", error);
      return [];
    }
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
    try {
      console.log("🔍 FETCHING ALL HUBSPOT PRODUCTS...");
      const result = await this.makeRequest("/crm/v3/objects/products");
      console.log("🔍 ALL HUBSPOT PRODUCTS:");
      if (result.results) {
        result.results.forEach((product: any) => {
          console.log(`  ID: ${product.id} | Name: "${product.properties?.name}" | SKU: ${product.properties?.hs_sku}`);
        });
      }
      return result.results || [];
    } catch (error) {
      console.error("Error fetching products:", error);
      return [];
    }
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
    try {
      console.log(
        `Advanced searchContacts called with query: "${query}", ownerEmail: ${ownerEmail}`,
      );
      let searchBody: any;

      if (ownerEmail) {
        // Get the HubSpot owner ID for the email first
        const ownerId = await this.getOwnerByEmail(ownerEmail);

        if (ownerId) {
          // Use advanced search with owner filter and multiple field search
          searchBody = {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "hubspot_owner_id",
                    operator: "EQ",
                    value: ownerId,
                  },
                ],
              },
            ],
            query: query,
            sorts: [
              {
                propertyName: "lastmodifieddate",
                direction: "DESCENDING",
              },
            ],
            limit: 20,
            properties: [
              "email",
              "firstname",
              "lastname",
              "company",
              "industry",
              "annualrevenue",
              "numemployees",
              "phone",
              "city",
              "state",
              "country",
              "notes_last_contacted",
              "notes_last_activity_date",
              "hs_lead_status",
              "lifecyclestage",
              "createdate",
              "lastmodifieddate",
              "hubspot_owner_id",
            ],
          };
        } else {
          console.log(
            `Owner not found for email ${ownerEmail}, searching all contacts`,
          );
          // Fallback to general search if owner not found
          searchBody = {
            query: query,
            sorts: [
              {
                propertyName: "lastmodifieddate",
                direction: "DESCENDING",
              },
            ],
            limit: 20,
            properties: [
              "email",
              "firstname",
              "lastname",
              "company",
              "industry",
              "annualrevenue",
              "numemployees",
              "phone",
              "city",
              "state",
              "country",
              "notes_last_contacted",
              "notes_last_activity_date",
              "hs_lead_status",
              "lifecyclestage",
              "createdate",
              "lastmodifieddate",
              "hubspot_owner_id",
            ],
          };
        }
      } else {
        // No owner filter, search all contacts
        searchBody = {
          query: query,
          sorts: [
            {
              propertyName: "lastmodifieddate",
              direction: "DESCENDING",
            },
          ],
          limit: 20,
          properties: [
            "email",
            "firstname",
            "lastname",
            "company",
            "industry",
            "annualrevenue",
            "numemployees",
            "phone",
            "city",
            "state",
            "country",
            "notes_last_contacted",
            "notes_last_activity_date",
            "hs_lead_status",
            "lifecyclestage",
            "createdate",
            "lastmodifieddate",
            "hubspot_owner_id",
          ],
        };
      }

      console.log("Advanced search body:", JSON.stringify(searchBody, null, 2));

      const searchResult = await this.makeRequest(
        "/crm/v3/objects/contacts/search",
        {
          method: "POST",
          body: JSON.stringify(searchBody),
        },
      );

      console.log(
        `Advanced search result: ${searchResult.results?.length || 0} contacts found`,
      );
      if (searchResult.results?.length > 0) {
        console.log(
          "First contact sample:",
          JSON.stringify(searchResult.results[0], null, 2),
        );
      }

      return searchResult.results || [];
    } catch (error) {
      console.error("Error searching HubSpot contacts:", error);
      return [];
    }
  }

  // Get contact by ID for detailed analysis
  async getContactById(contactId: string): Promise<any> {
    try {
      // Use cache for contact lookups
      const cacheKey = cache.generateKey(
        CachePrefix.HUBSPOT_CONTACT,
        contactId,
      );
      return await cache.wrap(
        cacheKey,
        async () => {
          const contact = await this.makeRequest(
            `/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,company,industry,annualrevenue,numemployees,phone,city,state,country,notes_last_contacted,notes_last_activity_date,hs_lead_status,lifecyclestage,createdate,lastmodifieddate`,
          );
          return contact;
        },
        { ttl: CacheTTL.HUBSPOT_CONTACT },
      );
    } catch (error) {
      console.error("Error fetching contact by ID:", error);
      return null;
    }
  }

  // Get deals associated with a contact to determine services
  async getContactDeals(contactId: string): Promise<any[]> {
    try {
      // Use cache for deal lookups
      const cacheKey = cache.generateKey(
        CachePrefix.HUBSPOT_DEAL,
        `contact:${contactId}`,
      );
      return await cache.wrap(
        cacheKey,
        async () => {
          const dealsResponse = await this.makeRequest(
            `/crm/v4/objects/contacts/${contactId}/associations/deals`,
          );

          if (!dealsResponse?.results?.length) {
            return [];
          }

          // Get detailed deal information
          const dealIds = dealsResponse.results.map(
            (assoc: any) => assoc.toObjectId,
          );
          const dealDetails = await Promise.all(
            dealIds.map(async (dealId: string) => {
              try {
                const deal = await this.makeRequest(
                  `/crm/v3/objects/deals/${dealId}?properties=dealname,dealstage,amount,closedate,pipeline,deal_type,hs_object_id`,
                );
                return deal;
              } catch (error) {
                console.error(`Error fetching deal ${dealId}:`, error);
                return null;
              }
            }),
          );

          return dealDetails.filter((deal) => deal !== null);
        },
        { ttl: CacheTTL.HUBSPOT_DEALS },
      );
    } catch (error) {
      console.error("Error fetching contact deals:", error);
      return [];
    }
  }

  // Get deals closed within a specific period for commission calculations
  async getDealsClosedInPeriod(
    startDate: string,
    endDate: string,
    salesRepHubspotId?: string,
  ): Promise<any[]> {
    try {
      console.log(
        `🔍 Searching for deals closed between ${startDate} and ${endDate}${salesRepHubspotId ? ` for rep ${salesRepHubspotId}` : ""}`,
      );

      // Build search criteria for deals closed in the specified period
      const searchBody: any = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "dealstage",
                operator: "IN",
                values: ["closedwon", "closed_won"],
              },
              {
                propertyName: "closedate",
                operator: "GTE",
                value: new Date(startDate).getTime().toString(),
              },
              {
                propertyName: "closedate",
                operator: "LTE",
                value: new Date(endDate).getTime().toString(),
              },
            ],
          },
        ],
        properties: [
          "dealname",
          "dealstage",
          "amount",
          "closedate",
          "hs_deal_stage_probability",
          "hubspot_owner_id",
          "deal_type",
          "description",
          "hs_object_id",
        ],
        limit: 100,
      };

      // Add sales rep filter if provided
      if (salesRepHubspotId) {
        searchBody.filterGroups[0].filters.push({
          propertyName: "hubspot_owner_id",
          operator: "EQ",
          value: salesRepHubspotId,
        });
      }

      console.log("Deal search body:", JSON.stringify(searchBody, null, 2));

      const searchResult = await this.makeRequest(
        "/crm/v3/objects/deals/search",
        {
          method: "POST",
          body: JSON.stringify(searchBody),
        },
      );

      console.log(
        `Found ${searchResult.results?.length || 0} closed deals in period`,
      );

      const deals = searchResult.results || [];

      // Transform deal data to include relevant properties for commission calculation
      const transformedDeals = deals.map((deal: any) => {
        const props = deal.properties;
        const dealValue = parseFloat(props.amount || "0");

        // Determine service type from deal name/description
        const dealName = (props.dealname || "").toLowerCase();
        let serviceType = "recurring"; // default

        if (dealName.includes("setup") || dealName.includes("implementation")) {
          serviceType = "setup";
        } else if (
          dealName.includes("cleanup") ||
          dealName.includes("clean up")
        ) {
          serviceType = "cleanup";
        } else if (
          dealName.includes("prior year") ||
          dealName.includes("catch up")
        ) {
          serviceType = "prior_years";
        }

        // For recurring services, estimate monthly value
        // This is a simplified calculation - in practice you might have specific fields for this
        const monthlyValue = serviceType === "recurring" ? dealValue / 12 : 0;
        const setupFee =
          serviceType !== "recurring" ? dealValue : dealValue * 0.1; // 10% setup fee estimate

        return {
          id: deal.id,
          dealname: props.dealname,
          amount: dealValue,
          monthly_value: monthlyValue,
          setup_fee: setupFee,
          service_type: serviceType,
          close_date: props.closedate,
          hubspot_owner_id: props.hubspot_owner_id,
          company: "", // You might want to fetch company name separately
          deal_stage: props.dealstage,
        };
      });

      return transformedDeals;
    } catch (error) {
      console.error("Error fetching deals closed in period:", error);
      return [];
    }
  }

  // Get paid invoices within a specific period for commission calculations
  async getPaidInvoicesInPeriod(
    startDate: string,
    endDate: string,
    salesRepHubspotId?: string,
  ): Promise<any[]> {
    try {
      console.log(
        `🧾 Searching for paid invoices between ${startDate} and ${endDate}${salesRepHubspotId ? ` for rep ${salesRepHubspotId}` : ""}`,
      );

      // Build search criteria for invoices paid in the specified period
      const searchBody: any = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "hs_invoice_status",
                operator: "EQ",
                value: "PAID",
              },
              {
                propertyName: "hs_invoice_paid_date",
                operator: "GTE",
                value: new Date(startDate).getTime().toString(),
              },
              {
                propertyName: "hs_invoice_paid_date",
                operator: "LTE",
                value: new Date(endDate).getTime().toString(),
              },
            ],
          },
        ],
        properties: [
          "hs_invoice_number",
          "hs_invoice_status",
          "hs_invoice_total_amount",
          "hs_invoice_paid_amount",
          "hs_invoice_paid_date",
          "hs_invoice_due_date",
          "hs_object_id",
        ],
        limit: 100,
      };

      // Add sales rep filter if provided
      if (salesRepHubspotId) {
        searchBody.filterGroups[0].filters.push({
          propertyName: "hubspot_owner_id",
          operator: "EQ",
          value: salesRepHubspotId,
        });
      }

      console.log("Invoice search body:", JSON.stringify(searchBody, null, 2));

      const searchResult = await this.makeRequest(
        "/crm/v3/objects/invoices/search",
        {
          method: "POST",
          body: JSON.stringify(searchBody),
        },
      );

      console.log(
        `Found ${searchResult.results?.length || 0} paid invoices in period`,
      );
      return searchResult.results || [];
    } catch (error) {
      console.error("Error fetching paid invoices:", error);
      return [];
    }
  }

  // Get invoice line items for detailed commission calculations
  async getInvoiceLineItems(invoiceId: string): Promise<any[]> {
    try {
      console.log(`📋 Fetching line items for invoice ${invoiceId}`);

      const lineItemsResponse = await this.makeRequest(
        `/crm/v4/objects/invoices/${invoiceId}/associations/line_items`,
      );

      if (!lineItemsResponse?.results?.length) {
        return [];
      }

      // Get detailed line item information
      const lineItemIds = lineItemsResponse.results.map(
        (assoc: any) => assoc.toObjectId,
      );
      const lineItemDetails = await Promise.all(
        lineItemIds.map(async (lineItemId: string) => {
          try {
            const lineItem = await this.makeRequest(
              `/crm/v3/objects/line_items/${lineItemId}?properties=name,description,price,quantity,amount,hs_recurring_billing_period,hs_product_id`,
            );
            return lineItem;
          } catch (error) {
            console.error(`Error fetching line item ${lineItemId}:`, error);
            return null;
          }
        }),
      );

      return lineItemDetails.filter((item) => item !== null);
    } catch (error) {
      console.error("Error fetching invoice line items:", error);
      return [];
    }
  }

  // Get active subscriptions for ongoing commission tracking
  async getActiveSubscriptions(salesRepHubspotId?: string): Promise<any[]> {
    try {
      console.log(
        `🔄 Fetching active subscriptions${salesRepHubspotId ? ` for rep ${salesRepHubspotId}` : ""}`,
      );

      const searchBody: any = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "hs_subscription_status",
                operator: "IN",
                values: ["ACTIVE", "PAUSED"],
              },
            ],
          },
        ],
        properties: [
          "hs_subscription_status",
          "hs_subscription_start_date",
          "hs_subscription_end_date",
          "hs_subscription_recurring_amount",
          "hs_subscription_next_billing_date",
          "hs_object_id",
        ],
        limit: 100,
      };

      // Add sales rep filter if provided
      if (salesRepHubspotId) {
        searchBody.filterGroups[0].filters.push({
          propertyName: "hubspot_owner_id",
          operator: "EQ",
          value: salesRepHubspotId,
        });
      }

      const searchResult = await this.makeRequest(
        "/crm/v3/objects/subscriptions/search",
        {
          method: "POST",
          body: JSON.stringify(searchBody),
        },
      );

      console.log(
        `Found ${searchResult.results?.length || 0} active subscriptions`,
      );
      return searchResult.results || [];
    } catch (error) {
      console.error("Error fetching active subscriptions:", error);
      return [];
    }
  }

  // Get subscription payments within a period for residual commission calculations
  async getSubscriptionPaymentsInPeriod(
    subscriptionId: string,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    try {
      console.log(
        `💰 Fetching subscription payments for ${subscriptionId} between ${startDate} and ${endDate}`,
      );

      // Get invoices associated with this subscription that were paid in the period
      const searchBody = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "hs_subscription_id",
                operator: "EQ",
                value: subscriptionId,
              },
              {
                propertyName: "hs_invoice_status",
                operator: "EQ",
                value: "PAID",
              },
              {
                propertyName: "hs_invoice_paid_date",
                operator: "GTE",
                value: new Date(startDate).getTime().toString(),
              },
              {
                propertyName: "hs_invoice_paid_date",
                operator: "LTE",
                value: new Date(endDate).getTime().toString(),
              },
            ],
          },
        ],
        properties: [
          "hs_invoice_number",
          "hs_invoice_total_amount",
          "hs_invoice_paid_date",
          "hs_subscription_id",
        ],
        limit: 100,
      };

      const searchResult = await this.makeRequest(
        "/crm/v3/objects/invoices/search",
        {
          method: "POST",
          body: JSON.stringify(searchBody),
        },
      );

      return searchResult.results || [];
    } catch (error) {
      console.error("Error fetching subscription payments:", error);
      return [];
    }
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

  private async updateDealWithQuote(
    dealId: string,
    companyName: string,
    monthlyFee: number,
    setupFee: number,
  ): Promise<void> {
    const description = `Quote Details:
Monthly Fee: $${monthlyFee.toLocaleString()}
Setup Fee: $${setupFee.toLocaleString()}
Total Annual Value: $${(monthlyFee * 12 + setupFee).toLocaleString()}
Generated: ${new Date().toLocaleDateString()}`;

    const updateBody = {
      properties: {
        description: description,
      },
    };

    await this.makeRequest(`/crm/v3/objects/deals/${dealId}`, {
      method: "PATCH",
      body: JSON.stringify(updateBody),
    });
  }

  // Update contact properties for 2-way sync
  async updateContactProperties(
    contactId: string,
    properties: Record<string, string>,
  ): Promise<boolean> {
    try {
      console.log(`Updating contact ${contactId} with properties:`, properties);

      const updateBody = {
        properties: properties,
      };

      await this.makeRequest(`/crm/v3/objects/contacts/${contactId}`, {
        method: "PATCH",
        body: JSON.stringify(updateBody),
      });

      console.log(`Successfully updated contact ${contactId}`);
      return true;
    } catch (error) {
      console.error(`Error updating contact ${contactId}:`, error);
      return false;
    }
  }

  async updateQuote(
    quoteId: string,
    companyName: string,
    monthlyFee: number,
    setupFee: number,
    includesBookkeeping?: boolean,
    includesTaas?: boolean,
    taasMonthlyFee?: number,
    taasPriorYearsFee?: number,
    bookkeepingMonthlyFee?: number,
    bookkeepingSetupFee?: number,
    dealId?: string,
    quoteData?: any,
  ): Promise<boolean> {
    try {
      console.log(`🔵 UPDATE QUOTE START - Quote ID: ${quoteId}`);
      console.log(`🔵 Service Configuration:`);
      console.log(`   includesBookkeeping: ${includesBookkeeping}`);
      console.log(`   includesTaas: ${includesTaas}`);
      console.log(`   monthlyFee: $${monthlyFee}`);
      console.log(`   setupFee: $${setupFee}`);
      console.log(`   taasMonthlyFee: $${taasMonthlyFee || 0}`);
      console.log(`   taasPriorYearsFee: $${taasPriorYearsFee || 0}`);
      console.log(`   bookkeepingMonthlyFee: $${bookkeepingMonthlyFee || 0}`);
      console.log(`   bookkeepingSetupFee: $${bookkeepingSetupFee || 0}`);

      // First check if the quote still exists and is in a valid state
      const quoteCheck = await this.makeRequest(
        `/crm/v3/objects/quotes/${quoteId}`,
        {
          method: "GET",
        },
      );

      if (!quoteCheck || quoteCheck.properties?.hs_status === "EXPIRED") {
        console.log(`❌ Quote ${quoteId} is expired or not found`);
        return false;
      }

      console.log(`✅ Quote ${quoteId} is valid and active`);

      // Update the quote title with correct service combination
      let serviceType = "Services";
      if (includesBookkeeping && includesTaas) {
        serviceType = "Bookkeeping + TaaS";
      } else if (includesTaas) {
        serviceType = "TaaS";
      } else {
        serviceType = "Bookkeeping Services";
      }

      const updatedTitle = `${companyName} - ${serviceType} Quote`;

      // Generate scope assumptions if quote data is available
      let scopeAssumptions = "";
      if (quoteData) {
        console.log("📋 Generating scope assumptions for quote update");
        scopeAssumptions = this.generateScopeAssumptions(quoteData);
        console.log("📋 Scope assumptions updated:", scopeAssumptions);
      }

      // Generate payment terms based on service selection (updateQuote method)
      const paymentTerms = this.generatePaymentTerms(
        includesBookkeeping,
        includesTaas,
        quoteData?.includesPayroll || false,
        quoteData?.includesAP || false,
        quoteData?.includesAR || false,
        quoteData?.includesAgentOfService || false,
        quoteData?.includesCfoAdvisory || false,
        (quoteData?.cleanupProjectFee || 0) > 0,
        (quoteData?.priorYearFilingsFee || 0) > 0,
        quoteData?.includesFpaBuild || false,
      );
      console.log("📋 Payment terms updated:", paymentTerms);

      const updateBody = {
        properties: {
          hs_title: updatedTitle,
          // Removed invalid properties: hs_payments_enabled, hs_signature_required
          // These will be set manually in HubSpot after quote update
          hs_comments: scopeAssumptions, // Update scope assumptions in comments field
          hs_terms: paymentTerms, // Update payment terms with MSA and service schedule links
        },
      };

      await this.makeRequest(`/crm/v3/objects/quotes/${quoteId}`, {
        method: "PATCH",
        body: JSON.stringify(updateBody),
      });

      console.log(`Updated quote title to: ${updatedTitle}`);

      // Get associated line items for this quote
      const lineItemsResponse = await this.makeRequest(
        `/crm/v4/objects/quotes/${quoteId}/associations/line_items`,
        {
          method: "GET",
        },
      );

      // Collect existing line items for service management
      const existingLineItems: any[] = [];

      if (
        lineItemsResponse &&
        lineItemsResponse.results &&
        lineItemsResponse.results.length > 0
      ) {
        console.log(
          `Found ${lineItemsResponse.results.length} line items to update`,
        );

        for (const lineItemAssociation of lineItemsResponse.results) {
          const lineItemId = lineItemAssociation.toObjectId;

          // Get the line item details to determine if it's monthly or setup
          const lineItemDetails = await this.makeRequest(
            `/crm/v3/objects/line_items/${lineItemId}`,
            {
              method: "GET",
            },
          );

          if (lineItemDetails && lineItemDetails.properties) {
            // Add to existing line items for service management
            existingLineItems.push({
              id: lineItemId,
              properties: lineItemDetails.properties,
            });

            const productId = lineItemDetails.properties.hs_product_id;
            const lineItemName = lineItemDetails.properties.name || "";
            let newPrice;

            // Determine which price to use based on product ID and custom name
            if (productId === HUBSPOT_PRODUCT_IDS.MONTHLY_BOOKKEEPING) {
              if (lineItemName.includes("TaaS Monthly")) {
                // TaaS Monthly line item
                newPrice = taasMonthlyFee || 0;
                console.log(
                  `Updating TaaS monthly line item ${lineItemId} to $${newPrice}`,
                );
              } else {
                // Regular bookkeeping monthly line item
                newPrice =
                  bookkeepingMonthlyFee !== undefined
                    ? bookkeepingMonthlyFee
                    : monthlyFee - (taasMonthlyFee || 0);
                console.log(
                  `Updating bookkeeping monthly line item ${lineItemId} to $${newPrice}`,
                );
              }
            } else if (productId === HUBSPOT_PRODUCT_IDS.CLEANUP_PROJECT) {
              if (lineItemName.includes("TaaS Prior Years")) {
                // TaaS Prior Years line item
                newPrice = taasPriorYearsFee || 0;
                console.log(
                  `Updating TaaS prior years line item ${lineItemId} to $${newPrice}`,
                );
              } else {
                // Regular bookkeeping setup/cleanup line item
                newPrice =
                  bookkeepingSetupFee !== undefined
                    ? bookkeepingSetupFee
                    : setupFee - (taasPriorYearsFee || 0);
                console.log(
                  `Updating bookkeeping setup line item ${lineItemId} to $${newPrice}`,
                );
              }
            } else {
              console.log(
                `Unknown product ID ${productId} for line item ${lineItemId}, skipping`,
              );
              continue;
            }

            // Update the line item price
            const lineItemUpdateBody = {
              properties: {
                price: newPrice.toString(),
              },
            };

            await this.makeRequest(`/crm/v3/objects/line_items/${lineItemId}`, {
              method: "PATCH",
              body: JSON.stringify(lineItemUpdateBody),
            });

            console.log(
              `Successfully updated line item ${lineItemId} price to $${newPrice}`,
            );
          }
        }
      }

      // Refresh line items list after price updates for accurate duplicate detection
      const refreshedLineItemsResponse = await this.makeRequest(
        `/crm/v4/objects/quotes/${quoteId}/associations/line_items`,
        {
          method: "GET",
        },
      );

      const refreshedLineItems: any[] = [];
      if (
        refreshedLineItemsResponse &&
        refreshedLineItemsResponse.results &&
        refreshedLineItemsResponse.results.length > 0
      ) {
        console.log(
          `Refreshing ${refreshedLineItemsResponse.results.length} line items for accurate duplicate detection`,
        );
        for (const lineItemAssociation of refreshedLineItemsResponse.results) {
          const lineItemId = lineItemAssociation.toObjectId;
          const lineItemDetails = await this.makeRequest(
            `/crm/v3/objects/line_items/${lineItemId}`,
            {
              method: "GET",
            },
          );

          console.log(
            `Raw line item response for ${lineItemId}:`,
            JSON.stringify(lineItemDetails, null, 2),
          );

          if (lineItemDetails && lineItemDetails.properties) {
            refreshedLineItems.push({
              id: lineItemId,
              properties: lineItemDetails.properties,
            });
            console.log(
              `Refreshed line item: ${lineItemId} - ${lineItemDetails.properties.name || lineItemDetails.properties.hs_line_item_currency_code} - $${lineItemDetails.properties.price || lineItemDetails.properties.amount}`,
            );
          }
        }
      }
      console.log(`Total refreshed line items: ${refreshedLineItems.length}`);
      console.log(
        "Refreshed line items:",
        refreshedLineItems.map(
          (item) => `${item.properties.name} ($${item.properties.price})`,
        ),
      );

      // Line items are now handled by the main createInitialServiceLineItems method during quote creation
      // No need to recreate them during updates - just update the existing quote properties
      console.log(`🔵 Quote line items managed by main creation system - skipping duplicate creation`);

      // Update the associated deal amount and name
      let actualDealId = dealId;
      if (!actualDealId) {
        // Get deal ID from quote associations if not provided
        const dealAssociations = await this.makeRequest(
          `/crm/v4/objects/quotes/${quoteId}/associations/deals`,
          {
            method: "GET",
          },
        );
        if (
          dealAssociations &&
          dealAssociations.results &&
          dealAssociations.results.length > 0
        ) {
          actualDealId = dealAssociations.results[0].toObjectId;
        }
      }

      if (actualDealId) {
        // Calculate total amount including all TaaS fees
        const totalMonthlyAmount = monthlyFee * 12;
        const totalSetupAmount = setupFee;
        const totalAmount = totalMonthlyAmount + totalSetupAmount;

        // Update deal name based on services
        let dealName = `${companyName} - Services`;
        if (includesBookkeeping && includesTaas) {
          dealName = `${companyName} - Bookkeeping + TaaS`;
        } else if (includesTaas) {
          dealName = `${companyName} - TaaS`;
        } else {
          dealName = `${companyName} - Bookkeeping`;
        }

        console.log(
          `Updating deal ${actualDealId} amount to $${totalAmount} (Monthly: $${monthlyFee} x 12 + Setup: $${setupFee})`,
        );
        console.log(
          `TaaS breakdown - Monthly: $${taasMonthlyFee || 0}, Prior Years: $${taasPriorYearsFee || 0}`,
        );

        // Update the deal amount and name
        const dealUpdateBody = {
          properties: {
            amount: totalAmount.toString(),
            dealname: dealName,
            
            // Updated deal properties using only existing HubSpot fields with correct values
            
            // Entity type - map to correct HubSpot values (sole_prop, partnership, s-corp, c-corp, non-profit)
            ...(quoteData?.entityType && { 
              entity_type: quoteData.entityType === 'C-Corp' ? 'c-corp' :
                          quoteData.entityType === 'S-Corp' ? 's-corp' :
                          quoteData.entityType === 'Sole Proprietor' ? 'sole_prop' :
                          quoteData.entityType === 'Partnership' ? 'partnership' :
                          quoteData.entityType === 'Non-Profit' ? 'non-profit' :
                          'sole_prop' // Default fallback
            }),
            
            // Service tier - map to actual HubSpot values (WITH hyphens as shown in error)
            ...(quoteData?.serviceTier && { 
              service_tier: quoteData.serviceTier === 'Automated' ? 'Level 1 - Automated' :
                           quoteData.serviceTier === 'Guided' ? 'Level 2 - Guided' :
                           quoteData.serviceTier === 'Concierge' ? 'Level 3 - Concierge' :
                           'Level 1 - Automated' // Default fallback
            }),
            
            // Core numeric fields that exist in HubSpot
            ...(quoteData?.numEntities && { number_of_entities: quoteData.numEntities.toString() }),
            ...(quoteData?.statesFiled && { number_of_state_filings: quoteData.statesFiled.toString() }),
            ...(quoteData?.numBusinessOwners && { number_of_owners_partners: quoteData.numBusinessOwners.toString() }),
            ...(quoteData?.cleanupMonths && { initial_clean_up_months: quoteData.cleanupMonths.toString() }),
            ...(quoteData?.priorYearsUnfiled && { prior_years_unfiled: quoteData.priorYearsUnfiled.toString() }),
            
            // Boolean fields that exist in HubSpot (converted to string format)
            ...(quoteData?.include1040s !== undefined && { include_personal_1040s: quoteData.include1040s ? 'true' : 'false' }),
            ...(quoteData?.internationalFiling !== undefined && { international_filing: quoteData.internationalFiling ? 'true' : 'false' }),
            ...(quoteData?.businessLoans !== undefined && { business_loans: quoteData.businessLoans ? 'true' : 'false' }),
            
            // Other existing fields (lowercase values)
            ...(quoteData?.accountingBasis && { 
              accounting_basis: quoteData.accountingBasis === 'Cash' ? 'cash' :
                               quoteData.accountingBasis === 'Accrual' ? 'accrual' :
                               quoteData.accountingBasis.toLowerCase()
            }),
            ...(quoteData?.currentBookkeepingSoftware && { current_bookkeeping_software: quoteData.currentBookkeepingSoftware }),
            ...(quoteData?.primaryBank && { primary_bank: quoteData.primaryBank }),
          },
        };

        await this.makeRequest(`/crm/v3/objects/deals/${actualDealId}`, {
          method: "PATCH",
          body: JSON.stringify(dealUpdateBody),
        });

        console.log(
          `Successfully updated deal ${actualDealId} amount to $${totalAmount} and name to "${dealName}"`,
        );
      }

      console.log(`🟢 UPDATE QUOTE SUCCESS - Quote ID: ${quoteId}`);
      console.log(`🟢 Summary:`);
      console.log(`   ✅ Quote title updated`);
      console.log(`   ✅ Line items managed (added/updated/removed as needed)`);
      console.log(`   ✅ Deal amount and name updated`);
      console.log(
        `   ✅ Service configuration: Bookkeeping=${includesBookkeeping}, TaaS=${includesTaas}`,
      );
      return true;
    } catch (error: any) {
      console.error("Error updating quote in HubSpot:", error);

      // If quote is not found or expired, return false to trigger new quote creation
      if (
        error.message?.includes("404") ||
        error.message?.includes("not found")
      ) {
        console.log(
          `Quote ${quoteId} not found or expired, will need to create new quote`,
        );
        return false;
      }

      return false;
    }
  }

  // Generate payment terms based on service selection
  private generatePaymentTerms(
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

    if (includesBookkeeping) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssa-v-2025-09-01">SCHEDULE A - BOOKKEEPING v2025.09.01</a>',
      );
    }

    if (includesTaas) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssb-v-2025-09-01">SCHEDULE B - TAX AS A SERVICE v2025.09.01</a>',
      );
    }

    if (includesPayroll) {
      schedules.push(
        '<a href="https://www.seedfinancial.io/legal/ssc-v-2025-09-01">SCHEDULE C - PAYROLL v2025.09.01</a>',
      );
    }

    if (includesAP) {
      schedules.push(
        '<a href="https://www.seedfinancial.io/legal/ssd-v-2025-09-01">SCHEDULE D - ACCOUNTS PAYABLE v2025.09.01</a>',
      );
    }

    if (includesAR) {
      schedules.push(
        '<a href="https://www.seedfinancial.io/legal/sse-v-2025-09-01">SCHEDULE E - ACCOUNTS RECEIVABLE v2025.09.01</a>',
      );
    }

    if (includesAgentOfService) {
      schedules.push(
        '<a href="https://www.seedfinancial.io/legal/ssf-v-2025-09-01">SCHEDULE F - AGENT OF SERVICE v2025.09.01</a>',
      );
    }

    if (includesCfoAdvisory) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssa-v-2025-09-01">SCHEDULE A - BOOKKEEPING v2025.09.01</a>',
      );
    }

    if (includesCleanup) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssa-v-2025-09-01">SCHEDULE A - BOOKKEEPING v2025.09.01</a>',
      );
    }

    if (includesPriorYears) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssb-v-2025-09-01">SCHEDULE B - TAX AS A SERVICE v2025.09.01</a>',
      );
    }

    if (includesFpaBuild) {
      schedules.push(
        '<a href="https://seedfinancial.io/legal/ssa-v-2025-09-01">SCHEDULE A - BOOKKEEPING v2025.09.01</a>',
      );
    }

    return schedules.length > 0
      ? `${baseTerms}\n${schedules.join("\n")}`
      : baseTerms;
  }

  private generateScopeAssumptions(quoteData: any): string {
    const assumptions: string[] = [];

    assumptions.push("SCOPE ASSUMPTIONS:");
    assumptions.push("===================");

    // Bookkeeping scope assumptions  
    if (quoteData.serviceBookkeeping || quoteData.includesBookkeeping || quoteData.serviceMonthlyBookkeeping) {
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

    // TaaS scope assumptions
    if (quoteData.serviceTaas || quoteData.includesTaas || quoteData.serviceTaasMonthly) {
      assumptions.push("");
      assumptions.push("TAX AS A SERVICE (TaaS):");

      // Number of entities
      let numEntitiesText = "Not specified";
      if (quoteData.numEntities) {
        numEntitiesText = quoteData.numEntities.toString();
        if (quoteData.customNumEntities) {
          numEntitiesText = quoteData.customNumEntities.toString();
        }
      }
      assumptions.push(`• Number of Entities: ${numEntitiesText}`);

      // States filed
      let statesFiledText = "Not specified";
      if (quoteData.statesFiled) {
        statesFiledText = quoteData.statesFiled.toString();
        if (quoteData.customStatesFiled) {
          statesFiledText = quoteData.customStatesFiled.toString();
        }
      }
      assumptions.push(`• States Filed: ${statesFiledText}`);

      assumptions.push(
        `• International Filing Required: ${quoteData.internationalFiling ? "Yes" : "No"}`,
      );

      // Number of personal 1040s (if include1040s is checked, use numBusinessOwners)
      let personal1040sText = "Not included";
      if (quoteData.include1040s) {
        let numOwners = quoteData.numBusinessOwners || 0;
        if (quoteData.customNumBusinessOwners) {
          numOwners = quoteData.customNumBusinessOwners;
        }
        personal1040sText = numOwners.toString();
      }
      assumptions.push(`• Number of Personal 1040s: ${personal1040sText}`);

      assumptions.push(
        `• Number of Prior Years Filings: ${quoteData.priorYearsUnfiled || 0}`,
      );
    }

    // Add assumptions for other services
    if (quoteData.servicePayroll || quoteData.servicePayrollService) {
      assumptions.push("");
      assumptions.push("PAYROLL SERVICE:");
      assumptions.push(`• Employee Count: ${quoteData.payrollEmployeeCount || 'Not specified'}`);
      assumptions.push(`• States Count: ${quoteData.payrollStateCount || 'Not specified'}`);
    }

    if (quoteData.serviceAgentOfService) {
      assumptions.push("");
      assumptions.push("AGENT OF SERVICE:");
      assumptions.push(`• Additional States: ${quoteData.agentOfServiceAdditionalStates || 0}`);
      assumptions.push(`• Complex Case: ${quoteData.agentOfServiceComplexCase ? 'Yes' : 'No'}`);
    }

    if (quoteData.serviceCfoAdvisory) {
      assumptions.push("");
      assumptions.push("CFO ADVISORY SERVICE:");
      assumptions.push(`• Type: ${quoteData.cfoAdvisoryType || 'Not specified'}`);
      if (quoteData.cfoAdvisoryBundleHours) {
        assumptions.push(`• Bundle Hours: ${quoteData.cfoAdvisoryBundleHours}`);
      }
    }

    if (quoteData.serviceApLite || quoteData.serviceApAdvanced || quoteData.serviceApArService) {
      assumptions.push("");
      assumptions.push("ACCOUNTS PAYABLE SERVICE:");
      assumptions.push(`• Vendor Bills Band: ${quoteData.apVendorBillsBand || 'Not specified'}`);
      assumptions.push(`• Vendor Count: ${quoteData.apVendorCount || 'Not specified'}`);
      assumptions.push(`• Service Tier: ${quoteData.apServiceTier || 'Not specified'}`);
    }

    if (quoteData.serviceArLite || quoteData.serviceArAdvanced || quoteData.serviceArService) {
      assumptions.push("");
      assumptions.push("ACCOUNTS RECEIVABLE SERVICE:");
      assumptions.push(`• Customer Invoices Band: ${quoteData.arCustomerInvoicesBand || 'Not specified'}`);
      assumptions.push(`• Customer Count: ${quoteData.arCustomerCount || 'Not specified'}`);
      assumptions.push(`• Service Tier: ${quoteData.arServiceTier || 'Not specified'}`);
    }

    return assumptions.join("\n");
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

  async getCompanyById(companyId: string) {
    try {
      const response = await this.makeRequest(
        `/crm/v3/objects/companies/${companyId}`,
      );
      return response;
    } catch (error) {
      console.error("Failed to fetch company by ID:", error);
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

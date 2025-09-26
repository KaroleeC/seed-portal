import type { HubSpotRequestFn } from "./http.js";
import { cache, CacheTTL } from "../../cache.js";

export function createDealsService(
  request: HubSpotRequestFn,
  deps: {
    getSeedSalesPipelineStage: () => Promise<{
      pipelineId: string;
      qualifiedStageId: string;
    } | null>;
  },
) {
  async function searchDeals(query: {
    ids?: string[];
    ownerId?: string;
    limit?: number;
    properties?: string[];
    associations?: string[];
  }): Promise<any[]> {
    const properties = query.properties || [
      "dealname",
      "dealstage",
      "amount",
      "pipeline",
      "hubspot_owner_id",
      "closedate",
      "createdate",
      "hs_lastmodifieddate",
      "hs_currency",
    ];
    const associations = query.associations || ["companies"];
    const limit = Math.min(Math.max(query.limit || 100, 1), 100);

    let results: any[] = [];

    if (query.ids && query.ids.length > 0) {
      if (query.ids.length === 1) {
        const id = query.ids[0];
        const resp = await request(
          `/crm/v3/objects/deals/${id}?properties=${encodeURIComponent(properties.join(","))}&associations=${encodeURIComponent(associations.join(","))}`,
          { method: "GET" },
        );
        if (resp) results = [resp];
      } else {
        try {
          const body = {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "hs_object_id",
                    operator: "IN",
                    values: query.ids,
                  },
                ],
              },
            ],
            properties,
            associations,
            limit,
          } as any;
          const resp = await request("/crm/v3/objects/deals/search", {
            method: "POST",
            body: JSON.stringify(body),
          });
          results = resp?.results || [];
        } catch (e) {
          const fetched: any[] = [];
          for (const id of query.ids.slice(0, limit)) {
            try {
              const r = await request(
                `/crm/v3/objects/deals/${id}?properties=${encodeURIComponent(properties.join(","))}&associations=${encodeURIComponent(associations.join(","))}`,
                { method: "GET" },
              );
              if (r) fetched.push(r);
            } catch {
              // ignore individual failures
            }
          }
          results = fetched;
        }
      }
    } else if (query.ownerId) {
      const body = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "hubspot_owner_id",
                operator: "EQ",
                value: query.ownerId,
              },
            ],
          },
        ],
        properties,
        associations,
        limit,
      } as any;
      const resp = await request("/crm/v3/objects/deals/search", {
        method: "POST",
        body: JSON.stringify(body),
      });
      results = resp?.results || [];
    } else {
      const resp = await request(
        `/crm/v3/objects/deals?limit=${limit}&properties=${encodeURIComponent(properties.join(","))}&associations=${encodeURIComponent(associations.join(","))}`,
        { method: "GET" },
      );
      results = Array.isArray(resp?.results) ? resp.results : [];
    }

    return results;
  }
  async function getDealsClosedInPeriod(
    startDate: string,
    endDate: string,
    salesRepHubspotId?: string,
  ): Promise<any[]> {
    const cacheKey = `hs:deals:closed:${startDate}:${endDate}:${salesRepHubspotId ?? "all"}`;
    return await cache.wrap(
      cacheKey,
      async () => {
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

        if (salesRepHubspotId) {
          searchBody.filterGroups[0].filters.push({
            propertyName: "hubspot_owner_id",
            operator: "EQ",
            value: salesRepHubspotId,
          });
        }

        const searchResult = await request("/crm/v3/objects/deals/search", {
          method: "POST",
          body: JSON.stringify(searchBody),
        });

        const deals = searchResult?.results || [];
        const transformed = deals.map((deal: any) => {
          const props = deal.properties || {};
          const dealValue = parseFloat(props.amount || "0");
          const dealName = String(props.dealname || "").toLowerCase();

          let serviceType: "recurring" | "setup" | "cleanup" | "prior_years" =
            "recurring";
          if (
            dealName.includes("setup") ||
            dealName.includes("implementation")
          ) {
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

          const monthlyValue = serviceType === "recurring" ? dealValue / 12 : 0;
          const setupFee =
            serviceType !== "recurring" ? dealValue : dealValue * 0.1;

          return {
            id: deal.id,
            dealname: props.dealname,
            amount: dealValue,
            monthly_value: monthlyValue,
            setup_fee: setupFee,
            service_type: serviceType,
            close_date: props.closedate,
            hubspot_owner_id: props.hubspot_owner_id,
            company: "",
            deal_stage: props.dealstage,
          };
        });

        return transformed;
      },
      { ttl: CacheTTL.HUBSPOT_DEALS },
    );
  }

  async function createDeal(
    contactId: string,
    companyName: string,
    monthlyFee: number,
    setupFee: number,
    ownerId?: string,
    includesBookkeeping?: boolean,
    includesTaas?: boolean,
    serviceTier?: string,
    quoteData?: any,
  ): Promise<{
    id: string;
    properties: { dealname: string; dealstage: string; amount?: string };
  } | null> {
    try {
      const services: string[] = [];
      if (
        includesBookkeeping ||
        quoteData?.serviceBookkeeping ||
        quoteData?.serviceMonthlyBookkeeping
      )
        services.push("Bookkeeping");
      if (
        includesTaas ||
        quoteData?.serviceTaas ||
        quoteData?.serviceTaasMonthly
      )
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
      if (quoteData?.servicePriorYearFilings)
        services.push("Prior Year Filings");
      if (services.length === 0) services.push("Services");

      const serviceName = services.join(" + ");
      const dealName = `${companyName} - ${serviceName}`;
      const totalAmountNum = monthlyFee * 12 + setupFee;
      const totalAmount = totalAmountNum.toString();

      const pipelineInfo = await deps.getSeedSalesPipelineStage();
      if (!pipelineInfo) {
        console.error(
          "Could not find HubSpot pipeline or stage (configured or fallback)",
        );
        throw new Error(
          "HubSpot pipeline/stage not configured or not found. Open Calculator Settings → HubSpot Pipeline and select a valid pipeline and stage.",
        );
      }

      const dealProperties: any = {
        dealname: dealName,
        dealstage: pipelineInfo.qualifiedStageId,
        pipeline: pipelineInfo.pipelineId,
        dealtype: "newbusiness",
        ...(ownerId && { hubspot_owner_id: ownerId }),
          ...(quoteData?.entityType && {
            entity_type:
              quoteData.entityType === "C-Corp"
                ? "c-corp"
                : quoteData.entityType === "S-Corp"
                  ? "s-corp"
                  : quoteData.entityType === "Sole Proprietor"
                    ? "sole_prop"
                    : quoteData.entityType === "Partnership"
                      ? "partnership"
                      : quoteData.entityType === "Non-Profit"
                        ? "non-profit"
                        : String(quoteData.entityType)
                            .toLowerCase()
                            .replace("-", "_"),
          }),
          ...(quoteData?.serviceTier && {
            service_tier:
              quoteData.serviceTier === "Automated"
                ? "Level 1 - Automated"
                : quoteData.serviceTier === "Guided"
                  ? "Level 2 - Guided"
                  : quoteData.serviceTier === "Concierge"
                    ? "Level 3 - Concierge"
                    : "Level 1 - Automated",
          }),
          ...(quoteData?.numEntities && {
            number_of_entities: String(quoteData.numEntities),
          }),
          ...(quoteData?.statesFiled && {
            number_of_state_filings: String(quoteData.statesFiled),
          }),
          ...(quoteData?.numBusinessOwners && {
            number_of_owners_partners: String(quoteData.numBusinessOwners),
          }),
          ...(quoteData?.cleanupMonths && {
            initial_clean_up_months: String(quoteData.cleanupMonths),
          }),
          ...(quoteData?.priorYearsUnfiled && {
            prior_years_unfiled: String(quoteData.priorYearsUnfiled),
          }),
          ...(quoteData?.include1040s !== undefined && {
            include_personal_1040s: quoteData.include1040s ? "true" : "false",
          }),
          ...(quoteData?.internationalFiling !== undefined && {
            international_filing: quoteData.internationalFiling
              ? "true"
              : "false",
          }),
          ...(quoteData?.businessLoans !== undefined && {
            business_loans: quoteData.businessLoans ? "true" : "false",
          }),
          ...(quoteData?.accountingBasis && {
            accounting_basis:
              quoteData.accountingBasis === "Cash"
                ? "cash"
                : quoteData.accountingBasis === "Accrual"
                  ? "accrual"
                  : String(quoteData.accountingBasis).toLowerCase(),
          }),
          ...(quoteData?.currentBookkeepingSoftware && {
            current_bookkeeping_software: quoteData.currentBookkeepingSoftware,
          }),
          ...(quoteData?.primaryBank && {
            primary_bank: quoteData.primaryBank,
          }),
      };

      // Only set amount if totals are non-zero to avoid HubSpot validation issues
      if (totalAmountNum > 0) {
        dealProperties.amount = totalAmount;
      }

      const dealBody: any = {
        properties: dealProperties,
        associations: [
          {
            to: { id: contactId },
            types: [
              { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 },
            ],
          },
        ],
      };

      const result = await request("/crm/v3/objects/deals", {
        method: "POST",
        body: JSON.stringify(dealBody),
      });

      if (!result || !result.id) {
        console.error("Deal creation failed - no ID returned.", result);
        throw new Error(
          `Deal creation failed: No ID returned from HubSpot. Response: ${JSON.stringify(result)}`,
        );
      }

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
      // Propagate the error so callers can surface the reason to clients
      throw (error instanceof Error ? error : new Error(String(error)));
    }
  }

  async function updateDeal(
    dealId: string,
    monthlyFee: number,
    setupFee: number,
    ownerId?: string,
    includesBookkeeping?: boolean,
    includesTaas?: boolean,
    serviceTier?: string,
    quoteData?: any,
  ): Promise<{
    id: string;
    properties: { dealname: string; dealstage: string; amount?: string };
  } | null> {
    try {
      const totalAmountNum = monthlyFee * 12 + setupFee;
      const totalAmount = totalAmountNum.toString();

      const updateProps: any = {
        ...(ownerId && { hubspot_owner_id: ownerId }),
        // Map to the same labels used in createDeal to satisfy HubSpot picklist
        ...(serviceTier && {
          service_tier:
            serviceTier === "Guided"
              ? "Level 2 - Guided"
              : serviceTier === "Concierge"
                ? "Level 3 - Concierge"
                : "Level 1 - Automated",
        }),
      };

      // Compute updated deal name based on services, similar to createDeal
      try {
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
        if (services.length === 0) services.push("Services");

        const serviceName = services.join(" + ");

        let dealName: string | undefined;
        const companyFromQuote = quoteData?.companyName;
        if (companyFromQuote) {
          dealName = `${companyFromQuote} - ${serviceName}`;
        } else {
          try {
            const current = await request(
              `/crm/v3/objects/deals/${dealId}?properties=dealname`,
              { method: "GET" },
            );
            const existing = String(current?.properties?.dealname || "");
            const idx = existing.indexOf(" - ");
            const prefix = idx >= 0 ? existing.slice(0, idx) : existing || "Deal";
            dealName = `${prefix} - ${serviceName}`;
          } catch {
            // ignore name update failure; not critical
          }
        }

        if (dealName) {
          updateProps.dealname = dealName;
        }
      } catch {
        // ignore any errors computing dealname to avoid blocking updates
      }

      if (totalAmountNum > 0) {
        updateProps.amount = totalAmount;
      }

      const updateBody: any = {
        properties: updateProps,
      };

      const result = await request(`/crm/v3/objects/deals/${dealId}`, {
        method: "PATCH",
        body: JSON.stringify(updateBody),
      });

      if (!result || !result.id) {
        console.error("Deal update failed - no ID returned.", result);
        throw new Error(
          `Deal update failed: No ID returned from HubSpot. Response: ${JSON.stringify(result)}`,
        );
      }

      return {
        id: result.id,
        properties: {
          dealname: result.properties?.dealname || "Updated Deal",
          dealstage: result.properties?.dealstage || "qualified",
          amount: result.properties?.amount || totalAmount,
        },
      };
    } catch (error) {
      console.error("Error updating deal in HubSpot:", error);
      // Propagate the error so callers can surface the reason to clients
      throw (error instanceof Error ? error : new Error(String(error)));
    }
  }

  return {
    createDeal,
    updateDeal,
    searchDeals,
    getDealsClosedInPeriod,
  };
}

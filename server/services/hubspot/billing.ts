import { cache, CacheTTL } from "../../cache.js";
import type { HubSpotRequestFn } from "./http.js";

export function createBillingService(request: HubSpotRequestFn) {
  // List invoices (general listing with key properties and associations)
  async function listInvoices(limit: number = 100): Promise<any[]> {
    try {
      const resp = await request(
        `/crm/v3/objects/invoices?limit=${limit}` +
          `&properties=${encodeURIComponent(
            [
              "hs_createdate",
              "hs_lastmodifieddate",
              "hs_object_id",
              "hs_invoice_amount",
              "hs_balance_due",
              "hs_invoice_number",
              "hs_invoice_status",
              "hs_deal_id",
              "hs_deal_name",
              "company_name",
              "hs_company_name",
              "recipient_company_name",
              "billing_contact_name",
            ].join(",")
          )}` +
          `&associations=${encodeURIComponent(["line_items", "deals", "companies", "contacts"].join(","))}`
      );
      return Array.isArray(resp?.results) ? resp.results : [];
    } catch (error) {
      console.error("Error listing HubSpot invoices:", error);
      return [];
    }
  }
  // Paid invoices in a period
  async function getPaidInvoicesInPeriod(
    startDate: string,
    endDate: string,
    salesRepHubspotId?: string
  ): Promise<any[]> {
    const cacheKey = `hs:invoices:paid:${startDate}:${endDate}:${salesRepHubspotId ?? "all"}`;
    return await cache.wrap(
      cacheKey,
      async () => {
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

        if (salesRepHubspotId) {
          searchBody.filterGroups[0].filters.push({
            propertyName: "hubspot_owner_id",
            operator: "EQ",
            value: salesRepHubspotId,
          });
        }

        const searchResult = await request("/crm/v3/objects/invoices/search", {
          method: "POST",
          body: JSON.stringify(searchBody),
        });
        return searchResult?.results || [];
      },
      { ttl: CacheTTL.FIFTEEN_MINUTES }
    );
  }

  // Invoice line items
  async function getInvoiceLineItems(invoiceId: string): Promise<any[]> {
    const cacheKey = `hs:invoice:${invoiceId}:line_items`;
    return await cache.wrap(
      cacheKey,
      async () => {
        const lineItemsResponse = await request(
          `/crm/v4/objects/invoices/${invoiceId}/associations/line_items`
        );
        if (!lineItemsResponse?.results?.length) return [];

        const lineItemIds = lineItemsResponse.results.map((assoc: any) => assoc.toObjectId);
        const lineItemDetails = await Promise.all(
          lineItemIds.map(async (lineItemId: string) => {
            try {
              return await request(
                `/crm/v3/objects/line_items/${lineItemId}?properties=name,description,price,quantity,amount,hs_recurring_billing_period,hs_product_id`
              );
            } catch {
              return null;
            }
          })
        );
        return lineItemDetails.filter((x) => x !== null);
      },
      { ttl: CacheTTL.TEN_MINUTES }
    );
  }

  // Active subscriptions
  async function getActiveSubscriptions(salesRepHubspotId?: string): Promise<any[]> {
    const cacheKey = `hs:subscriptions:active:${salesRepHubspotId ?? "all"}`;
    return await cache.wrap(
      cacheKey,
      async () => {
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

        if (salesRepHubspotId) {
          searchBody.filterGroups[0].filters.push({
            propertyName: "hubspot_owner_id",
            operator: "EQ",
            value: salesRepHubspotId,
          });
        }

        const searchResult = await request("/crm/v3/objects/subscriptions/search", {
          method: "POST",
          body: JSON.stringify(searchBody),
        });
        return searchResult?.results || [];
      },
      { ttl: CacheTTL.FIFTEEN_MINUTES }
    );
  }

  // Subscription payments in a period
  async function getSubscriptionPaymentsInPeriod(
    subscriptionId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const cacheKey = `hs:subscription:${subscriptionId}:payments:${startDate}:${endDate}`;
    return await cache.wrap(
      cacheKey,
      async () => {
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
        } as const;
        const searchResult = await request("/crm/v3/objects/invoices/search", {
          method: "POST",
          body: JSON.stringify(searchBody),
        });
        return searchResult?.results || [];
      },
      { ttl: CacheTTL.FIFTEEN_MINUTES }
    );
  }

  return {
    listInvoices,
    getPaidInvoicesInPeriod,
    getInvoiceLineItems,
    getActiveSubscriptions,
    getSubscriptionPaymentsInPeriod,
  };
}

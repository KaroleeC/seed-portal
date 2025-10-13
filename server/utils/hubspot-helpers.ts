/**
 * Shared HubSpot utility functions
 */

import { doesHubSpotQuoteExist } from "../hubspot";

/**
 * Verify HubSpot quote existence for an array of quotes with hubspotQuoteId
 * @param items Array of items with id and optional hubspotQuoteId
 * @returns Array with verification results
 */
export async function verifyHubSpotQuotes(
  items: Array<{ id: number; hubspotQuoteId?: string | number | null }>
): Promise<Array<{ id: number; hubspotQuoteId: string | null; existsInHubSpot: boolean }>> {
  return await Promise.all(
    items.map(async ({ id, hubspotQuoteId }) => {
      let existsInHubSpot = false;
      if (hubspotQuoteId) {
        try {
          existsInHubSpot = await doesHubSpotQuoteExist(String(hubspotQuoteId));
        } catch {
          existsInHubSpot = false;
        }
      }
      return {
        id,
        hubspotQuoteId: hubspotQuoteId ? String(hubspotQuoteId) : null,
        existsInHubSpot,
      };
    })
  );
}

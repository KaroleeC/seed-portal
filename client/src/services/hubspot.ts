import { apiRequest } from "@/lib/queryClient";

export interface HubSpotContact {
  id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  [key: string]: unknown;
}

export interface VerifyContactResponse {
  verified: boolean;
  contact?: HubSpotContact;
}

export async function verifyContact(email: string): Promise<VerifyContactResponse> {
  return await apiRequest("POST", "/api/hubspot/verify-contact", { email });
}

export async function searchContacts(searchTerm: string): Promise<{ contacts?: HubSpotContact[] }> {
  return await apiRequest("POST", "/api/hubspot/search-contacts", {
    searchTerm,
  });
}

export interface SyncQuoteResponse {
  success: boolean;
  hubspotQuoteId?: string;
  hubspotDealId?: string;
  message?: string;
  [key: string]: unknown;
}

export async function syncQuote(
  quoteId: number,
  action: "auto" | "create" | "update" = "auto"
): Promise<SyncQuoteResponse> {
  // Prefer the unified queue endpoint; server falls back to direct sync if needed
  return await apiRequest("POST", "/api/hubspot/queue-sync", {
    quoteId,
    action,
  });
}

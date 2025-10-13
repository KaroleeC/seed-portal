import { apiRequest } from "@/lib/queryClient";
import type { Quote, InsertQuote } from "@shared/schema";

export type QuoteSortOrder = "asc" | "desc";

export async function fetchQuotes(params: {
  search?: string;
  sortField?: string;
  sortOrder?: QuoteSortOrder;
}): Promise<Quote[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.append("search", params.search);
  if (params.sortField) qs.append("sortField", params.sortField);
  if (params.sortOrder) qs.append("sortOrder", params.sortOrder);
  const data = await apiRequest<Quote[]>("GET", `/api/quotes?${qs.toString()}`);
  return data || [];
}

export async function createQuote(data: Partial<InsertQuote>): Promise<Quote> {
  return await apiRequest<Quote>("POST", "/api/quotes", data);
}

export async function updateQuote(id: number, data: Partial<Quote>): Promise<Quote> {
  return await apiRequest<Quote>("PUT", `/api/quotes/${id}`, data);
}

export async function archiveQuote(id: number): Promise<{ success: boolean }> {
  return await apiRequest("PATCH", `/api/quotes/${id}/archive`, {});
}

export interface CheckExistingQuotesResponse {
  hasExistingQuotes: boolean;
  quotes: Quote[];
  data?: {
    hasExistingQuotes: boolean;
    quotes: Quote[];
    verified: Array<{
      id: number;
      hubspotQuoteId?: string | null;
      existsInHubSpot: boolean;
    }>;
  };
}

export async function checkExistingQuotes(email: string): Promise<CheckExistingQuotesResponse> {
  return await apiRequest("POST", "/api/quotes/check-existing", { email });
}

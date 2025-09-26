import { useQuery } from "@tanstack/react-query";
import type { Quote } from "@shared/schema";
import { fetchQuotes } from "@/services/quotes";

export interface UseQuotesParams {
  search?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

export function useQuotes(params: UseQuotesParams) {
  const { search, sortField, sortOrder } = params || {};
  return useQuery<Quote[]>({
    queryKey: ["/api/quotes", { search, sortField, sortOrder }],
    queryFn: async () => {
      return await fetchQuotes({ search, sortField, sortOrder });
    },
    retry: false,
  });
}

/**
 * useLeadSearch Hook
 *
 * Debounced search for leads with caching
 * Used in lead association modal
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounced } from "../../leads-inbox/hooks/useDebounced";
import { supabase } from "@/lib/supabaseClient";

interface Lead {
  id: string;
  contactEmail: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactCompanyName: string | null;
  status: string;
  stage: string;
}

interface UseLeadSearchResult {
  leads: Lead[];
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

/**
 * Search leads with debouncing
 * Minimum 2 characters to trigger search
 */
export function useLeadSearch(): UseLeadSearchResult {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounced(searchQuery, 300);

  const { data, isLoading, error } = useQuery<{ leads: Lead[]; total: number }>({
    queryKey: ["/api/crm/leads", { q: debouncedQuery, limit: 20 }],
    queryFn: async () => {
      if (debouncedQuery.length < 2) {
        return { leads: [], total: 0 };
      }

      // Get Supabase access token for Authorization header
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;

      const params = new URLSearchParams({
        q: debouncedQuery,
        limit: "20",
      });

      const response = await fetch(`/api/crm/leads?${params}`, {
        credentials: "include",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to search leads");
      }

      return response.json();
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    leads: data?.leads || [],
    isLoading: isLoading && debouncedQuery.length >= 2,
    error: error as Error | null,
    searchQuery,
    setSearchQuery,
  };
}

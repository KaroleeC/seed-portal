/**
 * useLeadEmails Hook
 * 
 * Fetches all lead email addresses from CRM for filtering email threads
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

interface UseLeadEmailsResult {
  leadEmails: Set<string>;
  isLoading: boolean;
}

/**
 * Fetch all lead email addresses
 * Returns a Set for O(1) lookup performance
 */
export function useLeadEmails(): UseLeadEmailsResult {
  const { data, isLoading } = useQuery<{ emails: string[] }>({
    queryKey: ["/api/crm/leads/emails"],
    queryFn: async () => {
      // Get Supabase access token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch("/api/crm/leads/emails", {
        credentials: "include",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch lead emails");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - leads don't change that frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Convert to Set for fast lookups
  const leadEmails = new Set(
    (data?.emails || []).map((email) => email.toLowerCase())
  );

  return {
    leadEmails,
    isLoading,
  };
}

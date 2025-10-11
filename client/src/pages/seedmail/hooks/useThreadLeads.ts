/**
 * useThreadLeads Hook
 * 
 * Fetches leads linked to an email thread
 * Returns lead IDs and loading/error states
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

interface UseThreadLeadsResult {
  leadIds: string[];
  isLoading: boolean;
  error: Error | null;
  hasLeads: boolean;
  primaryLeadId: string | null;
}

/**
 * Fetch leads linked to a thread
 * Returns empty array if thread has no leads
 */
export function useThreadLeads(threadId: string | undefined | null): UseThreadLeadsResult {
  const { data, isLoading, error } = useQuery<{ leadIds: string[] }>({
    queryKey: ['thread-leads', threadId],
    queryFn: async () => {
      if (!threadId) {
        return { leadIds: [] };
      }

      // Get Supabase access token for Authorization header
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;

      const response = await fetch(
        `/api/email/lead-linking/thread/${threadId}/leads`,
        {
          credentials: 'include',
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch thread leads');
      }

      return response.json();
    },
    enabled: !!threadId,
    staleTime: 5 * 60 * 1000, // 5 minutes - leads don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const leadIds = data?.leadIds || [];
  
  return {
    leadIds,
    isLoading,
    error: error as Error | null,
    hasLeads: leadIds.length > 0,
    primaryLeadId: leadIds[0] || null, // First lead is primary
  };
}

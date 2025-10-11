import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { matchesSearch } from "../lib/emailUtils";
import { usePageVisibility } from "./usePageVisibility";
import type { EmailThread, EmailDraft, EmailFolder } from "@shared/email-types";

interface UseEmailThreadsOptions {
  accountId: string | null;
  folder: EmailFolder;
  searchQuery?: string;
  enablePolling?: boolean; // Enable adaptive background polling
}

interface UseEmailThreadsResult {
  threads: EmailThread[] | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch and filter email threads with adaptive polling
 * 
 * Polling strategy (when enablePolling=true):
 * - 30s when page is active (visible + focused)
 * - 2min when page is visible but not focused
 * - Disabled when page is hidden (battery-friendly)
 * 
 * Handles both regular threads and draft conversion
 */
export function useEmailThreads({
  accountId,
  folder,
  searchQuery = "",
  enablePolling = true,
}: UseEmailThreadsOptions): UseEmailThreadsResult {
  const { isVisible, isActive } = usePageVisibility();
  // Calculate adaptive polling interval based on page state
  const getPollingInterval = () => {
    if (!enablePolling || !isVisible) {
      return false; // Stop polling when hidden (battery-friendly)
    }
    
    if (isActive) {
      return 30 * 1000; // 30 seconds when actively using SEEDMAIL
    }
    
    return 2 * 60 * 1000; // 2 minutes when visible but unfocused
  };

  // Fetch drafts (needed for DRAFT folder and checking existing drafts)
  const { data: drafts } = useQuery<EmailDraft[]>({
    queryKey: ["/api/email/drafts", accountId],
    queryFn: async () => {
      try {
        return await apiRequest(`/api/email/drafts?accountId=${accountId}`);
      } catch (error) {
        console.error("[Drafts] Failed to load drafts:", error);
        return [];
      }
    },
    enabled: !!accountId,
    retry: 1,
    refetchInterval: getPollingInterval(),
    refetchIntervalInBackground: false, // Never poll in background tabs
  });

  // Fetch threads for selected account with adaptive polling
  const {
    data: threadsData,
    isLoading: loadingThreads,
    error,
    refetch: refetchThreads,
  } = useQuery<EmailThread[]>({
    queryKey: ["/api/email/threads", accountId, folder],
    queryFn: () => apiRequest(`/api/email/threads?accountId=${accountId}&label=${folder}`),
    enabled: !!accountId && folder !== "DRAFT",
    refetchInterval: getPollingInterval(),
    refetchIntervalInBackground: false, // Never poll in background tabs
    staleTime: 10 * 1000, // Consider data stale after 10 seconds
  });

  // Convert drafts to thread format or use fetched threads
  const displayThreads: EmailThread[] | undefined = (() => {
    // For DRAFT folder, convert drafts to thread format
    if (folder === "DRAFT") {
      if (!drafts) return undefined;
      return drafts.map(
        (draft: EmailDraft): EmailThread => ({
          id: draft.id,
          subject: draft.subject || "(No Subject)",
          participants: draft.to || [],
          snippet: draft.bodyHtml?.replace(/<[^>]*>/g, "").substring(0, 100) || "",
          messageCount: 1,
          unreadCount: 0,
          hasAttachments: Boolean(draft.attachments && draft.attachments.length > 0),
          labels: ["DRAFT"],
          isStarred: false,
          lastMessageAt: draft.updatedAt,
        })
      );
    }

    // For other folders, return fetched threads
    return threadsData;
  })();

  // Apply client-side search filtering
  const filteredThreads = displayThreads?.filter((thread) => matchesSearch(thread, searchQuery));

  return {
    threads: searchQuery ? filteredThreads : displayThreads,
    loading: loadingThreads,
    error: error as Error | null,
    refetch: refetchThreads,
  };
}

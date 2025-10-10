import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { matchesSearch } from "../lib/emailUtils";
import type { EmailThread, EmailDraft, EmailFolder } from "@shared/email-types";

interface UseEmailThreadsOptions {
  accountId: string | null;
  folder: EmailFolder;
  searchQuery?: string;
}

interface UseEmailThreadsResult {
  threads: EmailThread[] | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch and filter email threads
 * Handles both regular threads and draft conversion
 */
export function useEmailThreads({
  accountId,
  folder,
  searchQuery = "",
}: UseEmailThreadsOptions): UseEmailThreadsResult {
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
  });

  // Fetch threads for selected account
  const {
    data: threadsData,
    isLoading: loadingThreads,
    error,
    refetch: refetchThreads,
  } = useQuery<EmailThread[]>({
    queryKey: ["/api/email/threads", accountId, folder],
    queryFn: () => apiRequest(`/api/email/threads?accountId=${accountId}&label=${folder}`),
    enabled: !!accountId && folder !== "DRAFT",
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

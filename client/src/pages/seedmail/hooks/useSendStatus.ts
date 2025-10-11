import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SendStatus {
  id: string;
  messageId: string | null;
  draftId: string | null;
  status: "sending" | "sent" | "delivered" | "failed" | "bounced";
  gmailMessageId: string | null;
  gmailThreadId: string | null;
  errorMessage: string | null;
  bounceType: "hard" | "soft" | "complaint" | null;
  bounceReason: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  bouncedAt: string | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useSendStatus(messageId: string | undefined | null, enabled = true) {
  return useQuery<SendStatus | null>({
    queryKey: ["/api/email/send-status", messageId],
    queryFn: async () => {
      if (!messageId) return null;
      
      try {
        const status = await apiRequest(`/api/email/send-status/${messageId}`);
        return status;
      } catch (error) {
        // 404 is expected if no send status exists (e.g., for received emails)
        return null;
      }
    },
    enabled: enabled && !!messageId,
    retry: false, // Don't retry 404s
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

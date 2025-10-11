import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

interface UseEmailEventsOptions {
  accountId: string | null;
  enabled?: boolean;
}

interface SyncCompletedEvent {
  syncType: "full" | "incremental";
  threadsProcessed: number;
  messagesProcessed: number;
  duration: number;
}

interface EmailReceivedEvent {
  messageId: string;
  threadId: string;
  from: string;
  subject: string;
}

interface DraftSavedEvent {
  draftId: string;
  subject: string;
}

interface EmailDeletedEvent {
  messageId: string;
  threadId: string;
}

/**
 * Hook to listen for real-time email sync events via Server-Sent Events (SSE)
 * 
 * Features:
 * - Automatic reconnection on connection loss
 * - Invalidates React Query cache on sync completion
 * - Falls back gracefully if SSE not supported
 * - Cleans up connection on unmount
 * 
 * Usage:
 * ```tsx
 * const { isConnected, lastSync } = useEmailEvents({ 
 *   accountId: selectedAccount?.id 
 * });
 * ```
 */
export function useEmailEvents({ accountId, enabled = true }: UseEmailEventsOptions) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<SyncCompletedEvent | null>(null);
  const [lastEmailReceived, setLastEmailReceived] = useState<EmailReceivedEvent | null>(null);
  const [lastDraftSaved, setLastDraftSaved] = useState<DraftSavedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't connect if disabled or no account selected
    if (!enabled || !accountId) {
      return;
    }

    // Check if browser supports SSE
    if (typeof EventSource === "undefined") {
      console.warn("[SSE] EventSource not supported, falling back to polling");
      setError("SSE not supported");
      return;
    }

    console.log(`[SSE] Connecting to events for account ${accountId}...`);

    // Get Supabase access token for auth
    const connectSSE = async () => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;

      if (!accessToken) {
        console.warn("[SSE] No auth token available, skipping SSE connection");
        setError("Not authenticated");
        return;
      }

      // Create SSE connection with token in query param (EventSource doesn't support headers)
      const eventSource = new EventSource(`/api/email/events/${accountId}?token=${encodeURIComponent(accessToken)}`);
      eventSourceRef.current = eventSource;

    // Connection established
    eventSource.addEventListener("connected", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data);
      console.log("[SSE] Connected:", data);
      setIsConnected(true);
      setError(null);
    });

    // Sync completed event
    eventSource.addEventListener("sync-completed", (event: MessageEvent<string>) => {
      const data: SyncCompletedEvent = JSON.parse(event.data);
      console.log("[SSE] Sync completed:", data);
      
      setLastSync(data);

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads", accountId] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/drafts", accountId] });
      
      console.log("[SSE] Invalidated email queries after sync completion");
    });

    // Email received event (Phase 3.1)
    eventSource.addEventListener("email-received", (event: MessageEvent<string>) => {
      const data: EmailReceivedEvent = JSON.parse(event.data);
      console.log("[SSE] New email received:", data);
      
      setLastEmailReceived(data);

      // Invalidate queries to show new email
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads", accountId] });
      
      console.log("[SSE] Invalidated queries after new email");
    });

    // Draft saved event (Phase 3.1)
    eventSource.addEventListener("draft-saved", (event: MessageEvent<string>) => {
      const data: DraftSavedEvent = JSON.parse(event.data);
      console.log("[SSE] Draft saved:", data);
      
      setLastDraftSaved(data);

      // Invalidate drafts query
      queryClient.invalidateQueries({ queryKey: ["/api/email/drafts", accountId] });
      
      console.log("[SSE] Invalidated drafts after save");
    });

    // Email deleted event (Phase 3.1)
    eventSource.addEventListener("email-deleted", (event: MessageEvent<string>) => {
      const data: EmailDeletedEvent = JSON.parse(event.data);
      console.log("[SSE] Email deleted:", data);

      // Invalidate queries to remove deleted email
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads", accountId] });
      
      console.log("[SSE] Invalidated queries after email deletion");
    });

    // Connection opened
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eventSource.onopen = (_event) => {
      console.log("[SSE] Connection opened");
      setIsConnected(true);
      setError(null);
    };

    // Error handling
    eventSource.onerror = (err: Event) => {
      console.error("[SSE] Connection error:", err);
      setIsConnected(false);
      
      // EventSource automatically reconnects, but we track state
      if (eventSource.readyState === EventSource.CLOSED) {
        setError("Connection closed");
        console.log("[SSE] Connection closed, will attempt to reconnect...");
      } else if (eventSource.readyState === EventSource.CONNECTING) {
        console.log("[SSE] Reconnecting...");
      }
    };

      // Cleanup on unmount or account change
      return () => {
        console.log(`[SSE] Closing connection for account ${accountId}`);
        eventSource.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      };
    };

    // Start the SSE connection
    connectSSE();

    // Cleanup function for useEffect
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
    };
  }, [accountId, enabled, queryClient]);

  return {
    isConnected,
    lastSync,
    lastEmailReceived,
    lastDraftSaved,
    error,
    /** Manually close the SSE connection */
    disconnect: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
    },
  };
}

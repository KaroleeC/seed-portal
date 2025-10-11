import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, MailPlus, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { sendDraft, DraftParamsSchema, type DraftParams } from "./lib/sendDraft";
import { UnifiedEmailComposer } from "./components/UnifiedEmailComposer";
import { getGoogleAuthUrl, handleGoogleOAuthCallback } from "@/lib/auth/googleAuth";
import { useLeadEmails } from "./hooks/useLeadEmails";
import { EmailDetail } from "./components/EmailDetail";
import { Sidebar } from "./components/Sidebar";
import { ThreadList } from "./components/ThreadList";
import { useEmailThreads } from "./hooks/useEmailThreads";
import { useEmailEvents } from "./hooks/useEmailEvents";
import type { EmailAccount, EmailThread, EmailDraft, EmailFolder } from "@shared/email-types";

export default function SeedMailPage() {
  // Opt-in to SeedKB theme variant for this app route
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("theme-seedkb");
    return () => {
      root.classList.remove("theme-seedkb");
    };
  }, []);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState("INBOX");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyToMessageId, setReplyToMessageId] = useState<string | undefined>(undefined);
  const [draftToLoad, setDraftToLoad] = useState<EmailDraft | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch all lead emails for filtering
  const { leadEmails } = useLeadEmails();

  // Check for existing draft and show non-blocking toast
  const checkAndPromptForDraft = (inReplyToMessageId?: string, recipientEmail?: string) => {
    if (!drafts) return false;

    // Find matching draft
    let existingDraft: EmailDraft | undefined;

    if (inReplyToMessageId) {
      // For replies: match by inReplyToMessageId
      existingDraft = drafts.find((d) => d.inReplyToMessageId === inReplyToMessageId);
    } else if (recipientEmail) {
      // For new messages: match by recipient email (no inReplyToMessageId)
      existingDraft = drafts.find(
        (d) =>
          !d.inReplyToMessageId &&
          d.to?.some((recipient) => recipient.email.toLowerCase() === recipientEmail.toLowerCase())
      );
    }

    if (existingDraft) {
      toast({
        title: "📝 Draft found",
        description: `You have a draft for this ${inReplyToMessageId ? "conversation" : "recipient"}`,
        action: (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setDraftToLoad(existingDraft);
                // Don't close/reopen anything, just load the draft
              }}
            >
              Load Draft
            </Button>
          </div>
        ),
        duration: 8000, // 8 seconds
      });
      return true;
    }
    return false;
  };

  // Handler for clicking a thread/draft
  const handleThreadClick = async (threadId: string) => {
    if (selectedFolder === "DRAFT") {
      // Load draft based on type (new message vs reply)
      const draft = drafts?.find((d: EmailDraft) => d.id === threadId);
      if (draft) {
        if (draft.inReplyToMessageId) {
          // Reply draft - find the thread containing the message we're replying to
          try {
            const allThreads = await apiRequest<EmailThread[]>(
              `/api/email/threads?accountId=${selectedAccount}&label=INBOX`
            );
            // Find thread containing the message we're replying to
            for (const thread of allThreads) {
              const threadDetail = await apiRequest<{ thread: EmailThread; messages: any[] }>(
                `/api/email/threads/${thread.id}`
              );
              if (threadDetail.messages.some((m) => m.id === draft.inReplyToMessageId)) {
                // Found the thread - open it with reply and load draft
                setSelectedThread(thread.id);
                setReplyToMessageId(draft.inReplyToMessageId);
                setDraftToLoad(draft);
                setSelectedFolder("INBOX");
                return;
              }
            }
            // If thread not found, fall back to compose modal
            setDraftToLoad(draft);
            setIsComposeOpen(true);
          } catch (error) {
            console.error("[Draft] Failed to find reply thread:", error);
            // Fall back to compose modal
            setDraftToLoad(draft);
            setIsComposeOpen(true);
          }
        } else {
          // New message draft - open compose modal
          setDraftToLoad(draft);
          setIsComposeOpen(true);
        }
      }
    } else {
      // Regular thread - show in detail view
      setSelectedThread(threadId);
    }
  };

  // Clear reply state when switching threads
  useEffect(() => {
    setReplyToMessageId(undefined);
    setDraftToLoad(null); // Clear draft when switching threads
  }, [selectedThread]);

  // Optional: known customer domains to identify Clients; comma-separated in env
  const viteEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
  const CUSTOMER_DOMAINS: string[] = (viteEnv.VITE_CUSTOMER_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  const getSenderDomain = (t: EmailThread): string => {
    const sender = t.participants?.[0];
    return sender?.email?.split("@")[1]?.toLowerCase() || "";
  };
  
  const getSenderEmail = (t: EmailThread): string => {
    const sender = t.participants?.[0];
    return sender?.email?.toLowerCase() || "";
  };
  
  const isClientThread = (t: EmailThread) => {
    const d = getSenderDomain(t);
    return d && CUSTOMER_DOMAINS.includes(d);
  };
  
  // A thread is a "Lead" if the sender's email matches a lead in the database
  const isLeadThread = (t: EmailThread) => {
    const senderEmail = getSenderEmail(t);
    return senderEmail && leadEmails.has(senderEmail);
  };

  // Helpers
  const starThread = async (threadId: string, starred: boolean) => {
    try {
      const detail = await apiRequest(`/api/email/threads/${threadId}`);
      const latest = (detail?.messages || []).slice(-1)[0];
      if (!latest) return;
      await apiRequest(`/api/email/messages/${latest.id}/star`, {
        method: "POST",
        body: { starred },
      });
      queryClient.setQueryData<EmailThread[]>(
        ["/api/email/threads", selectedAccount, selectedFolder],
        (prev) =>
          prev ? prev.map((t) => (t.id === threadId ? { ...t, isStarred: starred } : t)) : prev
      );
    } catch (e) {
      console.error("Failed to star thread", e);
    }
  };

  const archiveThread = async (threadId: string) => {
    try {
      await apiRequest(`/api/email/threads/${threadId}/archive`, { method: "POST" });
      if (selectedFolder === "INBOX") {
        queryClient.setQueryData<EmailThread[]>(
          ["/api/email/threads", selectedAccount, selectedFolder],
          (prev) => (prev ? prev.filter((t) => t.id !== threadId) : prev)
        );
      }
    } catch (e) {
      console.error("Failed to archive thread", e);
    }
  };

  const deleteThread = async (threadId: string) => {
    try {
      await apiRequest(`/api/email/threads/${threadId}`, { method: "DELETE" });
      queryClient.setQueryData<EmailThread[]>(
        ["/api/email/threads", selectedAccount, selectedFolder],
        (prev) => (prev ? prev.filter((t) => t.id !== threadId) : prev)
      );
      if (selectedThread === threadId) setSelectedThread(null);
    } catch (e) {
      console.error("Failed to delete thread", e);
    }
  };

  // Fetch connected accounts
  const { data: accounts, isLoading: loadingAccounts } = useQuery<EmailAccount[]>({
    queryKey: ["/api/email/accounts"],
    queryFn: () => apiRequest("/api/email/accounts"),
  });

  // Mark an entire thread as read by marking all unread messages as read
  const markThreadAsRead = async (threadId: string) => {
    try {
      const detail = await apiRequest(`/api/email/threads/${threadId}`);
      type MinimalMessage = { id: string; isRead: boolean };
      const unread = ((detail?.messages || []) as MinimalMessage[]).filter((m) => !m.isRead);
      if (unread.length === 0) return;
      await Promise.all(
        unread.map((m: MinimalMessage) =>
          apiRequest(`/api/email/messages/${m.id}/read`, {
            method: "POST",
            body: { isRead: true },
          })
        )
      );
      // Optimistically update cache
      queryClient.setQueryData<EmailThread[]>(
        ["/api/email/threads", selectedAccount, selectedFolder],
        (prev) =>
          prev ? prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t)) : prev
      );
    } catch (e) {
      console.error("Failed to mark thread read", e);
    }
  };

  // Auto-select first account
  if (accounts && accounts.length > 0 && !selectedAccount) {
    setSelectedAccount(accounts[0]!.id);
  }

  // Fetch drafts separately from threads (always fetch to check for existing drafts)
  const { data: drafts, refetch: refetchDrafts } = useQuery<EmailDraft[]>({
    queryKey: ["/api/email/drafts", selectedAccount],
    queryFn: async () => {
      try {
        return await apiRequest(`/api/email/drafts?accountId=${selectedAccount}`);
      } catch (error) {
        console.error("[Drafts] Failed to load drafts:", error);
        return []; // Return empty array on error to prevent breaking
      }
    },
    enabled: !!selectedAccount,
    retry: 1,
  });

  // Use the useEmailThreads hook for fetching and filtering
  const {
    threads: displayThreads,
    loading: loadingThreads,
    refetch: refetchThreads,
  } = useEmailThreads({
    accountId: selectedAccount,
    folder: selectedFolder as EmailFolder,
    searchQuery,
  });

  // Enable SSE for real-time sync notifications (Phase 3)
  const { lastSync } = useEmailEvents({
    accountId: selectedAccount,
    enabled: !!selectedAccount, // Only connect when account is selected
  });

  // Show toast when sync completes via SSE
  useEffect(() => {
    if (lastSync) {
      toast({
        title: "✅ Inbox synced",
        description: `${lastSync.messagesProcessed} messages processed in ${(lastSync.duration / 1000).toFixed(1)}s`,
        duration: 3000,
      });
    }
  }, [lastSync, toast]);

  // Trigger initial sync when account is first selected
  useEffect(() => {
    if (!selectedAccount) return;
    
    // Trigger background sync (no await, runs async)
    apiRequest("/api/email/sync", {
      method: "POST",
      body: { accountId: selectedAccount },
    }).catch((error) => {
      console.error("[AutoSync] Initial sync failed:", error);
    });
  }, [selectedAccount]);

  // Keyboard shortcuts (list navigation and actions)
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      if (isComposeOpen) return;

      const list = displayThreads || [];
      const idx = selectedThread ? list.findIndex((t) => t.id === selectedThread) : -1;
      const current = selectedThread ? list.find((t) => t.id === selectedThread) : undefined;

      switch (e.key) {
        case "j":
          if (idx >= -1 && idx < list.length - 1) setSelectedThread(list[idx + 1]!.id);
          break;
        case "k":
          if (idx > 0) setSelectedThread(list[idx - 1]!.id);
          break;
        case "s":
          if (current) starThread(current.id, !current.isStarred);
          break;
        case "e":
          if (current) markThreadAsRead(current.id);
          break;
        case "a":
          if (current) archiveThread(current.id);
          break;
        case "Delete":
        case "Backspace":
          if (current) deleteThread(current.id);
          break;
        case "r":
          if (selectedThread) {
            try {
              const detail = await apiRequest(`/api/email/threads/${selectedThread}`);
              const latest = (detail?.messages || []).slice(-1)[0];
              if (latest?.id) {
                setReplyToMessageId(latest.id); // triggers inline composer in EmailDetail
              }
            } catch {}
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayThreads, selectedThread, isComposeOpen]);

  const handleConnectAccount = async () => {
    try {
      const response = await apiRequest("/api/email/oauth/start");
      window.location.href = response.authUrl;
    } catch (error) {
      console.error("Failed to start OAuth:", error);
    }
  };

  const handleSync = async () => {
    if (!selectedAccount) return;
    try {
      await apiRequest("/api/email/sync", {
        method: "POST",
        body: { accountId: selectedAccount },
      });
      refetchThreads();
    } catch (error) {
      console.error("Failed to sync:", error);
    }
  };

  const handleArchive = async () => {
    if (!selectedThread) return;
    try {
      await apiRequest(`/api/email/threads/${selectedThread}/archive`, {
        method: "POST",
      });
      toast({ title: "Archived", description: "Email has been archived" });
      setSelectedThread(null);
      refetchThreads();
    } catch (error) {
      console.error("Failed to archive:", error);
      toast({
        title: "Error",
        description: "Failed to archive email",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedThread) return;
    const threadId = selectedThread;

    try {
      await apiRequest(`/api/email/threads/${threadId}`, {
        method: "DELETE",
      });

      // Show undo toast
      toast({
        title: "Moved to trash",
        description: "Email moved to trash",
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await apiRequest(`/api/email/threads/${threadId}/restore`, {
                method: "POST",
              });
              toast({ title: "Restored", description: "Email restored from trash" });
              refetchThreads();
            } catch (error) {
              console.error("Failed to restore:", error);
              toast({
                title: "Error",
                description: "Failed to restore email",
                variant: "destructive",
              });
            }
          },
        },
      });

      setSelectedThread(null);
      refetchThreads();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast({
        title: "Error",
        description: "Failed to delete email",
        variant: "destructive",
      });
    }
  };

  const handleStar = async (starred: boolean) => {
    if (!selectedThread) return;
    try {
      await apiRequest(`/api/email/threads/${selectedThread}/star`, {
        method: "POST",
        body: { starred },
      });
      refetchThreads();
    } catch (error) {
      console.error("Failed to star:", error);
      toast({
        title: "Error",
        description: "Failed to star email",
        variant: "destructive",
      });
    }
  };

  const handleRestore = async () => {
    if (!selectedThread) return;
    try {
      await apiRequest(`/api/email/threads/${selectedThread}/restore`, {
        method: "POST",
      });
      toast({ title: "Restored", description: "Email restored from trash" });
      setSelectedThread(null);
      refetchThreads();
    } catch (error) {
      console.error("Failed to restore:", error);
      toast({
        title: "Error",
        description: "Failed to restore email",
        variant: "destructive",
      });
    }
  };

  if (loadingAccounts) {
    return (
      <DashboardLayout maxWidthClassName="max-w-full">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-muted-foreground">Loading SeedMail...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // No accounts connected
  if (!accounts || accounts.length === 0) {
    return (
      <DashboardLayout maxWidthClassName="max-w-full">
        <div className="flex flex-col items-center justify-center h-screen gap-6 px-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 flex items-center justify-center">
            <Mail className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-3xl font-bold mb-3">Welcome to SeedMail</h2>
            <p className="text-muted-foreground text-lg">
              Connect your Google Workspace email to get started with your professional email
              client.
            </p>
          </div>
          <Button onClick={handleConnectAccount} size="lg" className="text-base px-8">
            <MailPlus className="h-5 w-5 mr-2" />
            Connect Gmail Account
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      header={<></>}
      maxWidthClassName="max-w-full"
      contentClassName="max-w-full mx-0 !px-0 !pt-0 !pb-0 h-full"
      className="h-screen overflow-hidden"
    >
      <div className="relative h-full page-bg p-0">
        <div className="flex h-full min-h-0 relative z-10 gap-4">
          <Sidebar
            accounts={accounts || []}
            selectedAccount={selectedAccount}
            onAccountChange={setSelectedAccount}
            selectedFolder={selectedFolder as EmailFolder}
            onFolderChange={(folder) => setSelectedFolder(folder)}
            threads={displayThreads}
            drafts={drafts}
            onCompose={() => setIsComposeOpen(true)}
            onSync={handleSync}
          />

          <ThreadList
            threads={displayThreads}
            selectedThread={selectedThread}
            selectedFolder={selectedFolder as EmailFolder}
            loading={loadingThreads}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onThreadClick={handleThreadClick}
            onMarkRead={markThreadAsRead}
            onStar={starThread}
            onDelete={deleteThread}
          />

          {/* Right - Email Detail */}
          <div className="flex-1 min-h-0 min-w-0 bg-card border border-border rounded-xl overflow-hidden">
            {selectedThread ? (
              <EmailDetail
                threadId={selectedThread}
                accountId={selectedAccount}
                replyToMessageId={replyToMessageId}
                draft={draftToLoad}
                onCheckDraft={checkAndPromptForDraft}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onStar={handleStar}
                onRestore={handleRestore}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-sm px-6">
                  <h2 className="text-2xl font-semibold mb-2 text-foreground">
                    Welcome to SeedMail
                  </h2>
                  <p className="text-muted-foreground">
                    Select an email from the list to start reading, or compose a new message
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

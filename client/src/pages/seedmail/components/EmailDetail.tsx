import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useAttachmentUpload } from "../hooks/useAttachmentUpload";
import {
  Reply,
  ReplyAll,
  Forward,
  Star,
  Archive,
  Trash2,
  Paperclip,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/time-utils";
import { RichTextEditor } from "./RichTextEditor";
import { useEmailComposer } from "../hooks/useEmailComposer";
import { DraftStatusIndicator } from "./DraftStatusIndicator";
import { FailedSendAlert } from "./FailedSendAlert";
import { useSendStatus } from "../hooks/useSendStatus";
import { EmailThreadMenu } from "./EmailThreadMenu";
import { LeadAssociationModal } from "./LeadAssociationModal";

interface EmailMessage {
  id: string;
  from: { name?: string; email: string };
  to: Array<{ name?: string; email: string }>;
  cc?: Array<{ name?: string; email: string }>;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  isRead: boolean;
  isStarred: boolean;
  sentAt: string;
  labels?: string[];
  trackingEnabled?: boolean;
  trackingPixelId?: string;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  openCount?: number;
}

interface EmailThread {
  id: string;
  subject: string;
  participants: Array<{ name?: string; email: string }>;
  messageCount: number;
}

interface EmailDetailProps {
  threadId: string;
  accountId: string | null;
  replyToMessageId?: string;
  draft?: {
    id: string;
    to: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }> | null;
    bcc?: Array<{ email: string; name?: string }> | null;
    subject: string;
    bodyHtml: string;
    attachments?: Array<{ filename: string; contentBase64: string; contentType?: string }> | null;
  } | null;
  onCheckDraft?: (inReplyToMessageId: string, recipientEmail?: string) => boolean;
  onArchive?: () => void;
  onDelete?: () => void;
  onStar?: (starred: boolean) => void;
  onRestore?: () => void;
}

// Separate component to use hooks inside map
function MessageWithStatus({
  message,
  isLast,
  isSentMessage,
  loadImages,
  sanitizeHtml,
}: {
  message: EmailMessage;
  isLast: boolean;
  isSentMessage: boolean;
  loadImages: boolean;
  sanitizeHtml: (html: string, loadImages: boolean) => string;
}) {
  const { data: sendStatus } = useSendStatus(message.id, isSentMessage);
  const showFailedAlert =
    sendStatus && (sendStatus.status === "failed" || sendStatus.status === "bounced");

  return (
    <div
      className={cn(
        "space-y-4 rounded-lg border border-border bg-card p-4",
        !isLast && "mb-2"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarFallback className="bg-muted text-muted-foreground">
            {(message.from.name ?? message.from.email).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-foreground">
              {message.from.name || message.from.email}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.sentAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            to {message.to.map((r) => r.email).join(", ")}
            {message.cc && message.cc.length > 0 && (
              <span className="ml-1">cc {message.cc.map((r) => r.email).join(", ")}</span>
            )}
          </div>

          {/* Tracking Status - Show for messages with tracking enabled */}
          {message.trackingEnabled && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {message.firstOpenedAt ? (
                <>
                  <span className="text-green-600 dark:text-green-400">📬</span>
                  <span className="text-muted-foreground">
                    Opened {formatRelativeTime(message.firstOpenedAt)}
                    {message.openCount && message.openCount > 1 && (
                      <span className="ml-1">({message.openCount} times)</span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-yellow-600 dark:text-yellow-400">📭</span>
                  <span className="text-muted-foreground">Not opened yet</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Failed Send Alert */}
      {showFailedAlert && (
        <FailedSendAlert
          statusId={sendStatus.id}
          errorMessage={sendStatus.errorMessage}
          bounceType={sendStatus.bounceType}
          bounceReason={sendStatus.bounceReason}
          retryCount={sendStatus.retryCount}
          maxRetries={sendStatus.maxRetries}
        />
      )}

      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(message.bodyHtml || message.bodyText || "", loadImages),
        }}
      />
    </div>
  );
}

export function EmailDetail({
  threadId,
  accountId,
  replyToMessageId,
  draft,
  onCheckDraft,
  onArchive,
  onDelete,
  onStar,
  onRestore,
}: EmailDetailProps) {
  const [loadImages, setLoadImages] = useState(false);
  const [showLeadAssociation, setShowLeadAssociation] = useState(false);
  const { data, isLoading } = useQuery<{ thread: EmailThread; messages: EmailMessage[] }>({
    queryKey: ["/api/email/threads", threadId],
    queryFn: () => apiRequest(`/api/email/threads/${threadId}`),
  });
  const [showReply, setShowReply] = useState(false);
  const [replyCollapsed, setReplyCollapsed] = useState(false);
  const latestMessage = useMemo(
    () => (data?.messages || [])[Math.max(0, (data?.messages?.length || 1) - 1)],
    [data]
  );
  const replyRef = useRef<HTMLDivElement | null>(null);

  // Use shared composer hook for inline reply
  const composer = useEmailComposer({
    accountId,
    inReplyToMessageId: latestMessage?.id,
    enabled: showReply,
    draft: draft || undefined,
  });

  // Attachment upload hook
  const { uploadFiles, uploadProgress } = useAttachmentUpload(composer.draftId);

  // Prefill inline reply when requested
  useEffect(() => {
    if (!data) return;
    if (replyToMessageId) {
      const msg = data.messages.find((m) => m.id === replyToMessageId) || latestMessage;
      const to = msg?.from?.email || "";
      composer.setTo(to);
      composer.setSubject(data.thread?.subject ? `Re: ${data.thread.subject}` : "");
      setShowReply(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyToMessageId, data?.thread?.subject]);

  // When reply box becomes visible, scroll it into view
  useEffect(() => {
    if (showReply) {
      requestAnimationFrame(() => {
        replyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [showReply]);

  const sanitizeHtml = (html: string, allowImages: boolean): string => {
    // Configure DOMPurify for email rendering
    const config: DOMPurify.Config = {
      ALLOWED_TAGS: [
        "a",
        "abbr",
        "b",
        "blockquote",
        "br",
        "code",
        "div",
        "em",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "hr",
        "i",
        "img",
        "li",
        "ol",
        "p",
        "pre",
        "span",
        "strong",
        "table",
        "tbody",
        "td",
        "th",
        "thead",
        "tr",
        "ul",
      ],
      ALLOWED_ATTR: [
        "href",
        "title",
        "target",
        "rel",
        "class",
        "style",
        ...(allowImages ? ["src", "alt", "width", "height"] : []),
      ],
      ALLOW_DATA_ATTR: false,
      WHOLE_DOCUMENT: false,
      RETURN_TRUSTED_TYPE: false,
      FORBID_TAGS: ["script", "iframe", "object", "embed", "link", "style"],
      FORBID_ATTR: ["srcdoc"],
    };

    let sanitized = DOMPurify.sanitize(html || "", config);

    // Enforce anchor safety
    sanitized = sanitized.replace(
      /<a\s+([^>]*href=["'][^"']+["'][^>]*)>/gi,
      (_match, attrs) => `<a ${attrs} target="_blank" rel="noopener noreferrer nofollow">`
    );

    // If images are not allowed, replace <img> with placeholder
    if (!allowImages) {
      sanitized = sanitized.replace(
        /<img\b[^>]*>/gi,
        '<span class="text-muted-foreground">[image blocked]</span>'
      );
    }

    return sanitized;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Email not found</p>
      </div>
    );
  }

  const { thread, messages } = data;

  const handleReply = (mode: "reply" | "reply_all") => {
    if (!data) return;

    const msg = latestMessage;
    const to =
      mode === "reply_all"
        ? Array.from(
            new Set(
              [msg?.from?.email, ...(msg?.to?.map((r: any) => r.email) || [])].filter(Boolean)
            )
          ).join(", ")
        : msg?.from?.email || "";

    // Set up reply (will be overridden if draft is loaded)
    composer.setTo(to);
    composer.setSubject(data.thread?.subject ? `Re: ${data.thread.subject}` : "");
    setShowReply(true);

    // Check for existing draft (non-blocking)
    const messageId = latestMessage?.id;
    if (messageId && onCheckDraft) {
      onCheckDraft(messageId);
    }

    // Scroll reply box into view on next frame
    requestAnimationFrame(() => {
      replyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const sendInlineReply = async () => {
    const success = await composer.sendEmail();
    if (success) {
      setShowReply(false);
      composer.resetForm();
    }
  };

  const handleAttachFiles = async (files: FileList | null) => {
    if (!files) return;
    const newAttachments = await uploadFiles(files);
    composer.setAttachments((prev) => [...prev, ...newAttachments]);
  };

  // For inline images in the editor (always use base64 for inline content)
  const handleImageUpload = async (file: File): Promise<string> => {
    const buf = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]
      );
    }
    const b64 = btoa(binary);
    return `data:${file.type || "image/jpeg"};base64,${b64}`;
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border surface-glass no-surface-lift">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-xl font-semibold flex-1 text-foreground">{thread.subject}</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              title={thread.isStarred ? "Unstar" : "Star"}
              onClick={() => onStar && onStar(!thread.isStarred)}
            >
              <Star
                className={cn("h-4 w-4", thread.isStarred && "fill-orange-500 text-orange-500")}
              />
            </Button>
            {!thread.labels?.includes("TRASH") ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Archive"
                  onClick={() => onArchive && onArchive()}
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  onClick={() => onDelete && onDelete()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                title="Restore from trash"
                onClick={() => onRestore && onRestore()}
              >
                Restore
              </Button>
            )}
            <EmailThreadMenu
              threadId={threadId}
              onCreateLead={() => {
                // TODO: Implement create lead modal
                console.log("Create lead for thread:", threadId);
              }}
              onAssociateLead={() => setShowLeadAssociation(true)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLoadImages((v) => !v)}
              className="ml-2"
            >
              {loadImages ? "Hide images" : "Load images"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleReply("reply")}>
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleReply("reply_all")}>
            <ReplyAll className="h-4 w-4 mr-2" />
            Reply All
          </Button>
          <Button variant="outline" size="sm">
            <Forward className="h-4 w-4 mr-2" />
            Forward
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 space-y-6">
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1;
            const isSentMessage = message.labels?.includes("SENT");
            
            return (
              <MessageWithStatus
                key={message.id}
                message={message}
                isLast={isLast}
                isSentMessage={isSentMessage}
                loadImages={loadImages}
                sanitizeHtml={sanitizeHtml}
              />
            );
          })}
        </div>
      </ScrollArea>

      {/* Inline Reply Composer outside scroll area */}
      {showReply && (
        <div
          ref={replyRef}
          className="border-t border-border p-4 space-y-2 bg-card"
          onWheel={(e) => {
            const root = e.currentTarget.previousElementSibling as HTMLElement | null;
            const vp = root?.querySelector(
              "[data-radix-scroll-area-viewport]"
            ) as HTMLElement | null;
            if (vp) vp.scrollTop += e.deltaY;
          }}
        >
          <div className="flex items-center justify-center mb-2 relative">
            <div className="absolute left-0 flex items-center gap-3">
              <span className="font-medium text-sm text-foreground">Reply</span>
              <DraftStatusIndicator
                isSaving={composer.isSaving}
                lastSaved={composer.lastSaved}
                show={showReply}
              />
            </div>
            <button
              onClick={() => setReplyCollapsed(!replyCollapsed)}
              className="flex items-center justify-center h-6 w-6 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 transition-all duration-200"
            >
              {replyCollapsed ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <div className={replyCollapsed ? "hidden" : "block"}>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-12">To</span>
              <input
                value={composer.to}
                onChange={(e) => composer.setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => composer.setShowCc((v) => !v)}
              >
                Cc
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => composer.setShowBcc((v) => !v)}
              >
                Bcc
              </Button>
            </div>
            {composer.showCc && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-12">Cc</span>
                <input
                  value={composer.cc}
                  onChange={(e) => composer.setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    composer.setCc("");
                    composer.setShowCc(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            {composer.showBcc && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-12">Bcc</span>
                <input
                  value={composer.bcc}
                  onChange={(e) => composer.setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    composer.setBcc("");
                    composer.setShowBcc(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-12">Subject</span>
              <input
                value={composer.subject}
                onChange={(e) => composer.setSubject(e.target.value)}
                placeholder="Re: Subject"
                className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
              />
            </div>
            <RichTextEditor
              content={composer.body}
              onChange={composer.setBody}
              placeholder="Write your reply..."
              minHeight="140px"
              onImageUpload={handleImageUpload}
              onInsertSignature={undefined}
            />
            <div className="flex items-center gap-2 px-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (document.getElementById("reply-file") as HTMLInputElement)?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" /> Attach files
              </Button>
            </div>
            <input
              id="reply-file"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleAttachFiles(e.target.files)}
            />

            {/* Upload progress indicators */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="space-y-2">
                {Object.entries(uploadProgress).map(([key, progress]) => {
                  const filename = key.split("-")[0];
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{filename}</span>
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {progress}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {composer.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {composer.attachments.map((att, idx) => (
                  <div
                    key={`${att.filename}-${idx}`}
                    className="px-2 py-1 text-xs border border-input rounded bg-background flex items-center gap-2"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="max-w-[220px] truncate">{att.filename}</span>
                    <button
                      className="ml-1 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        composer.setAttachments((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={sendInlineReply}
                disabled={composer.isSending || !accountId}
              >
                Send
              </Button>

              {/* Tracking checkbox */}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={composer.trackingEnabled}
                  onCheckedChange={(checked) => composer.setTrackingEnabled(checked as boolean)}
                />
                <span className="text-muted-foreground">Enable read receipts</span>
              </label>

              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => composer.setScheduleOpen((v) => !v)}
                >
                  <Clock className="h-4 w-4 mr-2" />{" "}
                  {composer.sendAt ? "Scheduled" : "Schedule send"}
                </Button>
                {composer.scheduleOpen && (
                  <div className="absolute right-24 bottom-10 w-56 rounded-md border border-border bg-popover p-2 shadow-md z-50">
                    <button
                      className="w-full text-left px-2 py-1.5 hover:bg-accent rounded"
                      onClick={() => {
                        const d = new Date(Date.now() + 5 * 60000);
                        composer.setSendAt(d.toISOString());
                        composer.setScheduleOpen(false);
                      }}
                    >
                      In 5 minutes
                    </button>
                    <button
                      className="w-full text-left px-2 py-1.5 hover:bg-accent rounded"
                      onClick={() => {
                        const d = new Date(Date.now() + 60 * 60000);
                        composer.setSendAt(d.toISOString());
                        composer.setScheduleOpen(false);
                      }}
                    >
                      In 1 hour
                    </button>
                    <button
                      className="w-full text-left px-2 py-1.5 hover:bg-accent rounded"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        d.setHours(9, 0, 0, 0);
                        composer.setSendAt(d.toISOString());
                        composer.setScheduleOpen(false);
                      }}
                    >
                      Tomorrow 9:00 AM
                    </button>
                    <div className="px-2 py-2">
                      <div className="text-xs text-muted-foreground mb-1">Pick date & time</div>
                      <input
                        type="datetime-local"
                        className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background"
                        onChange={(e) =>
                          composer.setSendAt(
                            e.target.value ? new Date(e.target.value).toISOString() : undefined
                          )
                        }
                      />
                    </div>
                    {composer.sendAt && (
                      <div className="px-2 pb-2 text-xs text-muted-foreground">
                        Scheduled: {new Date(composer.sendAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Cancel and Discard */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowReply(false)}>
                Cancel
              </Button>
              {composer.draftId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={async () => {
                    await composer.discardDraft();
                    setShowReply(false);
                  }}
                >
                  Discard Draft
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lead Association Modal */}
      <LeadAssociationModal
        threadId={threadId}
        open={showLeadAssociation}
        onOpenChange={setShowLeadAssociation}
      />
    </div>
  );
}

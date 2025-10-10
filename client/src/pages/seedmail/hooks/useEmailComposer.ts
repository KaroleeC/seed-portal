import { useState, useEffect, useRef } from "react";
import { useDraftAutoSave } from "./useDraftAutoSave";
import { useEmailSignature } from "./useEmailSignature";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EmailComposerOptions {
  accountId: string | null;
  inReplyToMessageId?: string;
  enabled: boolean; // Whether composer is active/open
  draft?: {
    id: string;
    to: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }> | null;
    bcc?: Array<{ email: string; name?: string }> | null;
    subject: string;
    bodyHtml: string;
    inReplyToMessageId?: string | null;
    attachments?: Array<{ filename: string; contentBase64: string; contentType?: string }> | null;
  } | null;
}

export function useEmailComposer({
  accountId,
  inReplyToMessageId,
  enabled,
  draft,
}: EmailComposerOptions) {
  const { toast } = useToast();
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<
    Array<{ filename: string; contentBase64: string; contentType?: string }>
  >([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [sendAt, setSendAt] = useState<string | undefined>(undefined);
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  const { signature, enabled: signatureEnabled, isLoading: signatureLoading } = useEmailSignature();
  const [signatureInserted, setSignatureInserted] = useState(false);
  const previousMessageIdRef = useRef<string | undefined>(undefined);
  const previousEnabledRef = useRef<boolean>(false);

  // Auto-save draft
  const { draftId, isSaving, lastSaved, deleteDraft, loadDraft } = useDraftAutoSave({
    accountId,
    to,
    cc,
    bcc,
    subject,
    body,
    inReplyToMessageId,
    attachments,
    enabled,
  });

  // Reset form when composer opens or when switching between different emails
  useEffect(() => {
    const messageIdChanged = previousMessageIdRef.current !== inReplyToMessageId;
    const justEnabled = !previousEnabledRef.current && enabled;

    previousMessageIdRef.current = inReplyToMessageId;
    previousEnabledRef.current = enabled;

    // Reset when:
    // 1. Composer just opened (enabled changed from false to true)
    // 2. Message ID changed while enabled (switching emails)
    // Only reset if not loading a draft
    if (!draft && ((justEnabled && enabled) || (messageIdChanged && enabled))) {
      setTo("");
      setCc("");
      setBcc("");
      setSubject("");
      setBody("");
      setAttachments([]);
      setShowCc(false);
      setShowBcc(false);
      setSendAt(undefined);
      setSignatureInserted(false);
    }
  }, [inReplyToMessageId, draft, enabled]);

  // Load draft data when provided
  useEffect(() => {
    if (draft && enabled) {
      const toStr = draft.to?.map((r) => r.email).join(", ") || "";
      const ccStr = draft.cc?.map((r) => r.email).join(", ") || "";
      const bccStr = draft.bcc?.map((r) => r.email).join(", ") || "";

      setTo(toStr);
      setCc(ccStr);
      setBcc(bccStr);
      setSubject(draft.subject || "");
      setBody(draft.bodyHtml || "");
      setAttachments(draft.attachments || []);
      if (draft.cc && draft.cc.length > 0) setShowCc(true);
      if (draft.bcc && draft.bcc.length > 0) setShowBcc(true);

      // Load draft with data to prevent immediate re-save
      if (draft.id) {
        loadDraft(draft.id, {
          accountId,
          to: toStr,
          cc: ccStr,
          bcc: bccStr,
          subject: draft.subject || "",
          bodyHtml: draft.bodyHtml || "",
          inReplyToMessageId: draft.inReplyToMessageId || undefined,
          attachments: draft.attachments || [],
        });
      }
    }
  }, [draft, enabled, loadDraft, accountId]);

  // Auto-insert signature when enabled
  useEffect(() => {
    if (
      enabled &&
      signatureEnabled &&
      signature &&
      !signatureInserted &&
      !signatureLoading &&
      !body
    ) {
      const timer = setTimeout(() => {
        const separator = "<p><br></p><p>--</p>";
        const wrappedSignature = `<div data-signature="true" class="signature-container">${signature}</div>`;
        setBody(`${separator}${wrappedSignature}`);
        setSignatureInserted(true);
      }, 150);
      return () => clearTimeout(timer);
    }
    if (!enabled) {
      setSignatureInserted(false);
    }
  }, [enabled, signature, signatureEnabled, signatureLoading, signatureInserted, body]);

  // Send email
  const sendEmail = async () => {
    if (!accountId) {
      toast({ title: "Error", description: "No account selected", variant: "destructive" });
      return false;
    }

    if (!to || !subject) {
      toast({ title: "Error", description: "To and Subject are required", variant: "destructive" });
      return false;
    }

    setIsSending(true);
    try {
      await apiRequest("/api/email/send", {
        method: "POST",
        body: {
          accountId,
          to: to.split(",").map((e) => e.trim()),
          cc: cc ? cc.split(",").map((e) => e.trim()) : undefined,
          bcc: bcc ? bcc.split(",").map((e) => e.trim()) : undefined,
          subject,
          html: body,
          inReplyToMessageId,
          attachments,
          sendAt,
          trackingEnabled,
        },
      });

      // Delete draft on successful send
      if (draftId) {
        await deleteDraft();
      }

      toast({ title: "Sent!", description: "Your email has been sent" });
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      toast({ title: "Error", description: "Failed to send email", variant: "destructive" });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setTo("");
    setCc("");
    setBcc("");
    setSubject("");
    setBody("");
    setAttachments([]);
    setShowCc(false);
    setShowBcc(false);
    setSendAt(undefined);
    setTrackingEnabled(false);
    setSignatureInserted(false);
  };

  // Discard draft and reset form
  const discardDraft = async () => {
    if (draftId) {
      await deleteDraft();
    }
    resetForm();
    return true;
  };

  return {
    // Form state
    to,
    setTo,
    cc,
    setCc,
    bcc,
    setBcc,
    subject,
    setSubject,
    body,
    setBody,
    showCc,
    setShowCc,
    showBcc,
    setShowBcc,
    attachments,
    setAttachments,
    scheduleOpen,
    setScheduleOpen,
    sendAt,
    setSendAt,
    trackingEnabled,
    setTrackingEnabled,

    // Draft state
    draftId,
    isSaving,
    lastSaved,
    deleteDraft,

    // Actions
    sendEmail,
    resetForm,
    discardDraft,
    isSending,
  };
}

import { useEffect, useRef, useCallback, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface DraftData {
  accountId: string | null;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  bodyHtml: string;
  inReplyToMessageId?: string;
  attachments?: Array<{ filename: string; contentBase64: string; contentType?: string }>;
}

interface UseDraftAutoSaveOptions {
  accountId: string | null;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  inReplyToMessageId?: string;
  attachments: Array<{ filename: string; contentBase64: string; contentType?: string }>;
  enabled: boolean; // Only auto-save when compose is open
  debounceMs?: number;
}

export function useDraftAutoSave({
  accountId,
  to,
  cc,
  bcc,
  subject,
  body,
  inReplyToMessageId,
  attachments,
  enabled,
  debounceMs = 3000,
}: UseDraftAutoSaveOptions) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<string>("");

  const saveDraft = useCallback(
    async (data: DraftData) => {
      if (!data.accountId) return;

      // Don't save empty drafts
      if (!data.to && !data.subject && !data.bodyHtml) {
        return;
      }

      setIsSaving(true);
      try {
        const payload = {
          id: draftId || undefined,
          accountId: data.accountId,
          to: data.to ? data.to.split(",").map((e) => ({ email: e.trim() })) : [],
          cc: data.cc ? data.cc.split(",").map((e) => ({ email: e.trim() })) : null,
          bcc: data.bcc ? data.bcc.split(",").map((e) => ({ email: e.trim() })) : null,
          subject: data.subject,
          bodyHtml: data.bodyHtml,
          bodyText: null,
          inReplyToMessageId: data.inReplyToMessageId || null,
          attachments: data.attachments || null,
        };

        const result = await apiRequest("/api/email/drafts", {
          method: "POST",
          body: payload,
        });

        if (result.id && !draftId) {
          setDraftId(result.id);
        }

        setLastSaved(new Date());
      } catch (error) {
        console.error("[Draft] Auto-save failed:", error);
        // Silently fail - don't interrupt user's workflow
      } finally {
        setIsSaving(false);
      }
    },
    [draftId]
  );

  // Debounced auto-save
  useEffect(() => {
    if (!enabled) {
      // Clear timeout if compose is closed
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      return;
    }

    const currentData = JSON.stringify({
      accountId,
      to,
      cc,
      bcc,
      subject,
      bodyHtml: body,
      inReplyToMessageId,
      attachments,
    });

    // Only save if data changed
    if (currentData === previousDataRef.current) {
      return;
    }

    previousDataRef.current = currentData;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft({
        accountId,
        to,
        cc,
        bcc,
        subject,
        bodyHtml: body,
        inReplyToMessageId,
        attachments,
      });
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    enabled,
    accountId,
    to,
    cc,
    bcc,
    subject,
    body,
    inReplyToMessageId,
    attachments,
    debounceMs,
    saveDraft,
  ]);

  const deleteDraft = useCallback(async () => {
    if (!draftId) return;

    try {
      await apiRequest(`/api/email/drafts/${draftId}`, {
        method: "DELETE",
      });
      setDraftId(null);
    } catch (error) {
      console.error("[Draft] Delete failed:", error);
    }
  }, [draftId]);

  const loadDraft = useCallback((id: string, draftData?: DraftData) => {
    setDraftId(id);
    // Mark current draft data as "already saved" to prevent immediate re-save
    if (draftData) {
      previousDataRef.current = JSON.stringify({
        accountId: draftData.accountId,
        to: draftData.to,
        cc: draftData.cc,
        bcc: draftData.bcc,
        subject: draftData.subject,
        bodyHtml: draftData.bodyHtml,
        inReplyToMessageId: draftData.inReplyToMessageId,
        attachments: draftData.attachments,
      });
    }
  }, []);

  return {
    draftId,
    isSaving,
    lastSaved,
    deleteDraft,
    loadDraft,
  };
}

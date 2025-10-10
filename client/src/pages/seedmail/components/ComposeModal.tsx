import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, X, Paperclip, Clock, Image as ImageIcon, FileText } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { useEmailComposer } from "../hooks/useEmailComposer";
import { DraftStatusIndicator } from "./DraftStatusIndicator";
import { useEffect, useRef, useState } from "react";
import { useAttachmentUpload } from "../hooks/useAttachmentUpload";

interface Draft {
  id: string;
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }> | null;
  bcc?: Array<{ email: string; name?: string }> | null;
  subject: string;
  bodyHtml: string;
  attachments?: Array<{ filename: string; contentBase64: string; contentType?: string }> | null;
}

interface ComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string | null;
  replyToThreadId?: string;
  draft?: Draft | null;
  onCheckDraft?: (recipientEmail: string) => void;
}

export function ComposeModal({
  open,
  onOpenChange,
  accountId,
  replyToThreadId,
  draft,
  onCheckDraft,
}: ComposeModalProps) {
  const composer = useEmailComposer({
    accountId,
    inReplyToMessageId: replyToThreadId,
    enabled: open,
    draft,
  });

  const hasCheckedDraftRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  // Attachment upload hook
  const { uploadFiles, uploadProgress } = useAttachmentUpload(composer.draftId);

  // Watch the "to" field and check for drafts when email is entered
  useEffect(() => {
    if (!open || !onCheckDraft || hasCheckedDraftRef.current) return;

    const toEmail = composer.to.trim();
    // Check if it's a valid email format
    if (toEmail && toEmail.includes("@")) {
      hasCheckedDraftRef.current = true;
      onCheckDraft(toEmail);
    }
  }, [composer.to, open, onCheckDraft]);

  // Reset check flag when modal closes
  useEffect(() => {
    if (!open) {
      hasCheckedDraftRef.current = false;
    }
  }, [open]);

  const handleAttachFiles = async (files: FileList | null) => {
    if (!files) return;
    const newAttachments = await uploadFiles(files);
    composer.setAttachments((prev) => [...prev, ...newAttachments]);
  };

  // Reset drag counter when modal closes
  useEffect(() => {
    if (!open) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, [open]);

  // Drag and drop handlers - using counter to prevent flashing
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only show overlay if dragging files
    if (e.dataTransfer.types && e.dataTransfer.types.includes("Files")) {
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) {
        setIsDragging(true);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Reset state
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleAttachFiles(files);
    }
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
    return `data:${file.type};base64,${b64}`;
  };

  const handleSend = async () => {
    const success = await composer.sendEmail();
    if (success) {
      composer.resetForm();
      onOpenChange(false);
    }
  };

  // Helper to get file icon
  const getFileIcon = (contentType?: string) => {
    if (!contentType) return FileText;
    if (contentType.startsWith("image/")) return ImageIcon;
    if (contentType.includes("pdf")) return FileText;
    return FileText;
  };

  // Helper to get preview URL for images
  const getPreviewUrl = (att: {
    filename: string;
    contentBase64: string;
    contentType?: string;
    storageUrl?: string;
  }): string | null => {
    if (att.contentType?.startsWith("image/")) {
      // Use storage URL if available, otherwise fall back to base64
      if (att.storageUrl) {
        return att.storageUrl;
      }
      if (att.contentBase64) {
        return `data:${att.contentType};base64,${att.contentBase64}`;
      }
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dropZoneRef}
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl border border-border bg-card shadow-xl relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay - pointer-events-none allows drag events to pass through */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Paperclip className="h-12 w-12 mx-auto mb-2 text-primary" />
              <p className="text-lg font-medium text-foreground">Drop files here to attach</p>
            </div>
          </div>
        )}

        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">New Message</DialogTitle>
            {/* Save status indicator */}
            <DraftStatusIndicator
              isSaving={composer.isSaving}
              lastSaved={composer.lastSaved}
              show={open}
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* hidden input for file attachments */}
          <input
            id="compose-file"
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleAttachFiles(e.target.files)}
          />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-sm font-medium w-12">To</Label>
              <Input
                value={composer.to}
                onChange={(e) => composer.setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => composer.setShowCc(!composer.showCc)}
                className="text-xs"
              >
                Cc
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => composer.setShowBcc(!composer.showBcc)}
                className="text-xs"
              >
                Bcc
              </Button>
            </div>
          </div>

          {/* Cc */}
          {composer.showCc && (
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium w-12">Cc</Label>
              <Input
                value={composer.cc}
                onChange={(e) => composer.setCc(e.target.value)}
                placeholder="cc@example.com"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  composer.setCc("");
                  composer.setShowCc(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Bcc */}
          {composer.showBcc && (
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium w-12">Bcc</Label>
              <Input
                value={composer.bcc}
                onChange={(e) => composer.setBcc(e.target.value)}
                placeholder="bcc@example.com"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  composer.setBcc("");
                  composer.setShowBcc(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium w-12">Subject</Label>
            <Input
              value={composer.subject}
              onChange={(e) => composer.setSubject(e.target.value)}
              placeholder="Email subject"
              className="flex-1"
            />
          </div>

          {/* Body - Rich Text Editor */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Message</Label>
            <RichTextEditor
              content={composer.body}
              onChange={composer.setBody}
              placeholder="Compose your message..."
              minHeight="300px"
              onImageUpload={handleImageUpload}
              onInsertSignature={undefined}
            />
          </div>

          {/* Attachments Toolbar */}
          <div className="flex items-center gap-2 px-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (document.getElementById("compose-file") as HTMLInputElement)?.click()}
            >
              <Paperclip className="h-4 w-4 mr-2" /> Attach files
            </Button>
          </div>

          {/* Upload progress indicators */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Uploading...</Label>
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
            </div>
          )}

          {/* Attachments preview with thumbnails */}
          {composer.attachments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Attachments ({composer.attachments.length})
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {composer.attachments.map((att, idx) => {
                  const previewUrl = getPreviewUrl(att);
                  const Icon = getFileIcon(att.contentType);

                  return (
                    <div
                      key={`${att.filename}-${idx}`}
                      className="relative group border border-input rounded-lg overflow-hidden bg-background hover:bg-accent transition-colors"
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={att.filename}
                          className="w-full h-24 object-cover"
                        />
                      ) : (
                        <div className="w-full h-24 flex items-center justify-center bg-muted">
                          <Icon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs truncate">{att.filename}</p>
                      </div>
                      <button
                        className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() =>
                          composer.setAttachments((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {composer.draftId && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={async () => {
                  await composer.discardDraft();
                  onOpenChange(false);
                }}
              >
                Discard Draft
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 relative">
            {/* Tracking checkbox */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={composer.trackingEnabled}
                onCheckedChange={(checked) => composer.setTrackingEnabled(checked as boolean)}
              />
              <span className="text-muted-foreground">Enable read receipts</span>
            </label>

            <Button variant="outline" size="sm" onClick={() => composer.setScheduleOpen((v) => !v)}>
              <Clock className="h-4 w-4 mr-2" /> {composer.sendAt ? "Scheduled" : "Schedule send"}
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

            <Button onClick={handleSend} disabled={composer.isSending}>
              <Send className="h-4 w-4 mr-2" />
              {composer.isSending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

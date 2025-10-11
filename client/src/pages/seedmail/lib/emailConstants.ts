/**
 * Email Constants
 * Shared constants for email client
 */

import { Inbox, Send, Star, FileText, Trash2, Archive, Users } from "lucide-react";
import type { EmailFolder } from "@shared/email-types";

/**
 * System email folders with metadata
 */
export const SYSTEM_FOLDERS = [
  { id: "INBOX" as EmailFolder, label: "Inbox", icon: Inbox },
  { id: "SENT" as EmailFolder, label: "Sent", icon: Send },
  { id: "STARRED" as EmailFolder, label: "Starred", icon: Star },
  { id: "DRAFT" as EmailFolder, label: "Drafts", icon: FileText },
  { id: "TRASH" as EmailFolder, label: "Trash", icon: Trash2 },
  { id: "ARCHIVE" as EmailFolder, label: "Archive", icon: Archive },
  { id: "LEADS" as EmailFolder, label: "Leads", icon: Users },
] as const;

export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB
export const SYNC_INTERVAL_MS = 30 * 1000; // 30 seconds
export const DRAFT_AUTOSAVE_DELAY_MS = 2000; // 2 seconds

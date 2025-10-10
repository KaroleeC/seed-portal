/**
 * Email Constants
 * Shared constants for email client
 */

import { Inbox, Send, Star, Mail, Trash2, Archive } from "lucide-react";
import type { FolderConfig } from "@/shared/email-types";

export const SYSTEM_FOLDERS: FolderConfig[] = [
  { id: "INBOX", label: "Inbox", icon: Inbox, color: "text-blue-500" },
  { id: "SENT", label: "Sent", icon: Send, color: "text-green-500" },
  { id: "STARRED", label: "Starred", icon: Star, color: "text-yellow-500" },
  { id: "DRAFT", label: "Drafts", icon: Mail, color: "text-gray-500" },
  { id: "TRASH", label: "Trash", icon: Trash2, color: "text-red-500" },
  { id: "ARCHIVE", label: "Archive", icon: Archive, color: "text-purple-500" },
];

export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB
export const SYNC_INTERVAL_MS = 30 * 1000; // 30 seconds
export const DRAFT_AUTOSAVE_DELAY_MS = 2000; // 2 seconds

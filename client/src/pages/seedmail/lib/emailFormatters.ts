/**
 * Email Formatting Utilities
 * Functions for formatting dates, sizes, and display text
 */

import { format } from "date-fns";

/**
 * Format a timestamp as relative time (e.g., "2h ago", "Yesterday", "Dec 1")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return format(d, "h:mm a");
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return format(d, "EEEE");
  if (diffDays < 365) return format(d, "MMM d");
  return format(d, "MMM d, yyyy");
}

/**
 * Format file size in human-readable format (e.g., "1.2 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Format email subject for display (truncate if too long)
 */
export function formatSubject(subject: string, maxLength: number = 50): string {
  if (!subject || subject.trim() === "") return "(No Subject)";
  if (subject.length <= maxLength) return subject;
  return `${subject.substring(0, maxLength)}...`;
}

/**
 * Format snippet text (remove HTML, truncate)
 */
export function formatSnippet(snippet: string, maxLength: number = 100): string {
  // Remove HTML tags
  const text = snippet.replace(/<[^>]*>/g, "").trim();
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Format participant list for display (e.g., "John, Jane, and 3 others")
 */
export function formatParticipants(
  participants: Array<{ name?: string; email: string }>,
  maxShow: number = 2
): string {
  if (participants.length === 0) return "";
  if (participants.length === 1) {
    return participants[0]!.name || participants[0]!.email;
  }

  const shown = participants.slice(0, maxShow);
  const remaining = participants.length - maxShow;

  const names = shown.map((p) => p.name || p.email);

  if (remaining > 0) {
    return `${names.join(", ")}, and ${remaining} other${remaining > 1 ? "s" : ""}`;
  }

  return names.join(", ");
}

/**
 * Email Utility Functions
 * General helper functions for email operations
 */

import type { EmailParticipant, EmailThread, EmailFolder } from "@/shared/email-types";

/**
 * Get initials from name or email
 */
export function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
  return email ? email.substring(0, 2).toUpperCase() : "?";
}

/**
 * Get primary sender from participants
 */
export function getPrimarySender(participants: EmailParticipant[]): EmailParticipant {
  return participants[0] || { email: "unknown@example.com" };
}

/**
 * Check if thread has label
 */
export function hasLabel(thread: EmailThread, label: EmailFolder): boolean {
  return thread.labels.includes(label);
}

/**
 * Extract email address from string (handles "Name <email>" format)
 */
export function extractEmail(emailString: string): string {
  const match = emailString.match(/<(.+)>/);
  return match ? match[1]! : emailString.trim();
}

/**
 * Parse comma-separated email string into participant array
 */
export function parseEmailString(emailString: string): EmailParticipant[] {
  return emailString
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0)
    .map((e) => {
      const match = e.match(/^(.+)<(.+)>$/);
      if (match) {
        return { name: match[1]!.trim(), email: match[2]!.trim() };
      }
      return { email: e };
    });
}

/**
 * Check if thread matches search query
 */
export function matchesSearch(thread: EmailThread, query: string): boolean {
  if (!query) return true;

  const q = query.toLowerCase();
  return (
    thread.subject.toLowerCase().includes(q) ||
    thread.snippet.toLowerCase().includes(q) ||
    thread.participants.some(
      (p) => p.email.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
    )
  );
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get color class for folder
 */
export function getFolderColor(folder: EmailFolder): string {
  const colors: Record<EmailFolder, string> = {
    INBOX: "text-blue-500",
    SENT: "text-green-500",
    STARRED: "text-yellow-500",
    DRAFT: "text-gray-500",
    TRASH: "text-red-500",
    ARCHIVE: "text-purple-500",
  };
  return colors[folder] || "text-gray-500";
}

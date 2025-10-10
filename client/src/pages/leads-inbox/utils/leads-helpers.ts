import {
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
} from "date-fns";
import type { CRMLead } from "@shared/contracts";

/**
 * Formats US phone number: +1 (XXX) XXX-XXXX
 * Falls back to input if not 10/11 digits
 */
export function formatPhoneUS(input?: string | null): string {
  if (!input) return "-";
  const digits = String(input).replace(/\D/g, "");
  let d = digits;
  if (digits.length === 11 && digits.startsWith("1")) d = digits.slice(1);
  if (d.length !== 10) return input;
  const area = d.slice(0, 3);
  const central = d.slice(3, 6);
  const line = d.slice(6);
  return `+1 (${area}) ${central}-${line}`;
}

/**
 * Converts ISO date string to relative time (e.g., "3h ago", "Yesterday", "2 Weeks Ago")
 */
export function toRelativeTime(dateIso: string): string {
  const d = new Date(dateIso);
  const now = new Date();
  const mins = Math.max(0, differenceInMinutes(now, d));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = differenceInHours(now, d);
  if (hours < 24) return `${hours}h ago`;
  const days = differenceInDays(now, d);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = differenceInWeeks(now, d);
  if (weeks < 5) return `${weeks} Week${weeks > 1 ? "s" : ""} Ago`;
  const months = differenceInMonths(now, d);
  if (months < 12) return `${months} Month${months > 1 ? "s" : ""} Ago`;
  const years = differenceInYears(now, d);
  return `${years} Year${years > 1 ? "s" : ""} Ago`;
}

/**
 * Gets dialog title from lead details
 */
export function getDialogTitle(leadDetails: CRMLead | undefined): string {
  if (!leadDetails) return "Lead";
  if (leadDetails.contactCompanyName) {
    return `Lead - ${leadDetails.contactCompanyName}`;
  }
  if (leadDetails.contactFirstName || leadDetails.contactLastName) {
    return `Lead - ${leadDetails.contactFirstName || ""} ${leadDetails.contactLastName || ""}`.trim();
  }
  return "Lead";
}

/**
 * Tailwind class for table cell motion effects
 */
export const cellMotion =
  "transition-all duration-200 transform group-hover:-translate-y-px group-hover:bg-accent/35 group-hover:shadow-sm truncate";

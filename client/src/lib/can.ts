import type { CurrentUser } from "@/hooks/useCurrentUser";

// Very simple client-side affordance helper.
// Server remains the source of truth; this only hides UI.
export function can(user: CurrentUser | null, action: string): boolean {
  if (!user) return false;

  // If we later enrich /api/user to include permissions, check them here
  // For now, basic affordances based on role
  if (user.role === "admin") return true;

  // Example specific checks
  if (action === "commissions.sync") {
    return user.role === "admin";
  }

  return false;
}

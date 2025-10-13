import type { CurrentUser } from "@/hooks/useCurrentUser";

/**
 * Client-side permission checking helper
 *
 * IMPORTANT: This is for UI affordances only. Server remains the source of truth.
 * Always validate permissions on the backend.
 *
 * @deprecated Use `usePermissions()` hook instead for better RBAC support
 *
 * @param user - Current user object
 * @param action - Permission action to check (e.g., "commissions.sync", "users.view:system")
 * @returns true if user has permission, false otherwise
 */
export function can(user: CurrentUser | null, action: string): boolean {
  if (!user) return false;

  // Legacy: Admin role has all permissions
  if (user.role === "admin") return true;

  // TODO: Once RBAC is fully rolled out, fetch user permissions from context
  // and check against the action string. For now, use role-based checks.

  // Example specific checks (legacy)
  if (action === "commissions.sync") {
    return user.role === "admin";
  }

  // Default: deny access
  return false;
}

/**
 * Check if user has ANY of the specified permissions
 * @deprecated Use `usePermissions().hasAnyPermission()` instead
 */
export function canAny(user: CurrentUser | null, actions: string[]): boolean {
  return actions.some((action) => can(user, action));
}

/**
 * Check if user has ALL of the specified permissions
 * @deprecated Use `usePermissions().hasAllPermissions()` instead
 */
export function canAll(user: CurrentUser | null, actions: string[]): boolean {
  return actions.every((action) => can(user, action));
}

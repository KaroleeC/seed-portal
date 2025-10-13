import { useAuth } from "./use-auth";
import { useUserPermissions } from "./use-user-permissions";
import {
  hasPermission as hasLegacyPermission,
  hasAnyPermission as hasAnyLegacyPermission,
  hasAllPermissions as hasAllLegacyPermissions,
  getDefaultDashboard,
  getAvailableDashboards,
  type UserRole,
  type Permission,
} from "@shared/permissions";

/**
 * Enhanced permissions hook with RBAC support
 *
 * This hook provides a unified interface for permission checking that works with both:
 * 1. Legacy static permissions (from shared/permissions.ts)
 * 2. New RBAC dynamic permissions (from database)
 *
 * It gracefully falls back to legacy permissions when RBAC data is loading or unavailable.
 */
export function usePermissions() {
  const { user: currentUser } = useAuth();
  const userRole = (currentUser?.role as UserRole) || "employee";

  // Fetch RBAC permissions (will use cache if available)
  const rbac = useUserPermissions();

  // Determine if we should use RBAC or fall back to legacy
  const useRBAC = !rbac.isLoading && rbac.permissionsData && rbac.permissions.length > 0;

  /**
   * Check if user has a specific permission
   * Supports both legacy Permission type and RBAC permission strings
   */
  const hasPermission = (permission: Permission | string): boolean => {
    if (useRBAC) {
      // RBAC mode: check dynamic permissions
      return rbac.hasPermission(permission);
    }
    // Legacy mode: check static role-based permissions
    return hasLegacyPermission(userRole, permission as Permission);
  };

  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAnyPermission = (permissions: (Permission | string)[]): boolean => {
    if (useRBAC) {
      return rbac.hasAnyPermission(permissions as string[]);
    }
    return hasAnyLegacyPermission(userRole, permissions as Permission[]);
  };

  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAllPermissions = (permissions: (Permission | string)[]): boolean => {
    if (useRBAC) {
      return rbac.hasAllPermissions(permissions as string[]);
    }
    return hasAllLegacyPermissions(userRole, permissions as Permission[]);
  };

  return {
    // User info
    userRole,
    isAdmin: userRole === "admin",
    isEmployee: userRole === "employee",

    // Permission checking (unified interface)
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // RBAC-specific features
    rbac: {
      isEnabled: useRBAC,
      isLoading: rbac.isLoading,
      hasRole: rbac.hasRole,
      isInDepartment: rbac.isInDepartment,
      roles: rbac.roles,
      departments: rbac.departments,
      permissions: rbac.permissions,
      refetch: rbac.refetch,
    },

    // Navigation helpers (use legacy for now, can be enhanced later)
    getDefaultDashboard: () => getDefaultDashboard(userRole, currentUser?.defaultDashboard),
    getAvailableDashboards: () => getAvailableDashboards(userRole),
  };
}

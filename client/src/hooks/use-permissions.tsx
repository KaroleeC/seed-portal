import { useAuth } from "./use-auth";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getDefaultDashboard,
  getAvailableDashboards,
  type UserRole,
  type Permission,
} from "@shared/permissions";

export function usePermissions() {
  const { user: currentUser } = useAuth();
  const userRole = (currentUser?.role as UserRole) || "employee";

  return {
    userRole,
    hasPermission: (permission: Permission) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(userRole, permissions),
    getDefaultDashboard: () => getDefaultDashboard(userRole, currentUser?.defaultDashboard),
    getAvailableDashboards: () => getAvailableDashboards(userRole),
    isAdmin: userRole === "admin",
    isEmployee: userRole === "employee",
  };
}

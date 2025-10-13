import { useQuery } from "@tanstack/react-query";
import { getUserPermissions, type UserPermissionsResponse } from "@/lib/rbac-api";
import { useAuth } from "./use-auth";

/**
 * Hook to fetch and manage user RBAC permissions
 *
 * Fetches the user's roles and computed permissions from the backend.
 * This replaces the static role-based permission checking with dynamic
 * database-driven RBAC.
 *
 * @returns User permissions data and query state
 */
export function useUserPermissions() {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    data: permissionsData,
    isLoading,
    error,
    refetch,
  } = useQuery<UserPermissionsResponse, Error>({
    queryKey: ["/api/admin/rbac/user-permissions", userId],
    queryFn: () => {
      if (!userId) throw new Error("User ID is required");
      return getUserPermissions(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes (formerly cacheTime)
  });

  /**
   * Check if user has a specific permission
   * Format: "action:resource" (e.g., "users.view:system", "quotes.edit:own")
   */
  const hasPermission = (permission: string): boolean => {
    if (!permissionsData) return false;
    return permissionsData.permissions.includes(permission);
  };

  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!permissionsData) return false;
    return permissions.some((perm) => permissionsData.permissions.includes(perm));
  };

  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!permissionsData) return false;
    return permissions.every((perm) => permissionsData.permissions.includes(perm));
  };

  /**
   * Check if user has a specific role
   */
  const hasRole = (roleName: string): boolean => {
    if (!permissionsData) return false;
    return permissionsData.roles.some((role) => role.name === roleName);
  };

  /**
   * Check if user is in a specific department
   */
  const isInDepartment = (departmentName: string): boolean => {
    if (!permissionsData) return false;
    return permissionsData.departments.some((dept) => dept.name === departmentName);
  };

  /**
   * Get all permission strings for the user
   */
  const getAllPermissions = (): string[] => {
    return permissionsData?.permissions || [];
  };

  /**
   * Get all roles for the user
   */
  const getRoles = () => {
    return permissionsData?.roles || [];
  };

  /**
   * Get all departments for the user
   */
  const getDepartments = () => {
    return permissionsData?.departments || [];
  };

  return {
    // Data
    permissionsData,
    permissions: permissionsData?.permissions || [],
    roles: permissionsData?.roles || [],
    departments: permissionsData?.departments || [],

    // Query state
    isLoading,
    error,
    refetch,

    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isInDepartment,

    // Helpers
    getAllPermissions,
    getRoles,
    getDepartments,
  };
}

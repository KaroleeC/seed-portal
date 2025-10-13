import { apiFetch } from "./api";

// ============================================================================
// RBAC API Client
// Provides type-safe API calls for RBAC management
// ============================================================================

// Types from backend
export interface RBACRole {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RBACPermission {
  id: number;
  action: string;
  resource: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RBACUserRole {
  id: number;
  userId: number;
  roleId: number;
  assignedBy: number | null;
  assignedAt: string;
  expiresAt: string | null;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserDepartment {
  id: number;
  userId: number;
  departmentId: number;
  assignedAt: string;
}

export interface UserPermissionsResponse {
  userId: number;
  roles: Array<{
    id: number;
    name: string;
    description: string | null;
  }>;
  permissions: string[]; // Array of "action:resource" strings
  departments: Array<{
    id: number;
    name: string;
  }>;
}

// ============================================================================
// Role Management
// ============================================================================

export async function getRoles(): Promise<{ roles: RBACRole[] }> {
  return apiFetch("GET", "/api/admin/rbac/roles");
}

export async function getRole(roleId: number): Promise<RBACRole> {
  return apiFetch("GET", `/api/admin/rbac/roles/${roleId}`);
}

export async function createRole(data: { name: string; description?: string }): Promise<RBACRole> {
  return apiFetch("POST", "/api/admin/rbac/roles", data);
}

export async function updateRole(
  roleId: number,
  data: { name?: string; description?: string }
): Promise<RBACRole> {
  return apiFetch("PUT", `/api/admin/rbac/roles/${roleId}`, data);
}

export async function deleteRole(roleId: number): Promise<void> {
  return apiFetch("DELETE", `/api/admin/rbac/roles/${roleId}`);
}

// ============================================================================
// Permission Management
// ============================================================================

export async function getPermissions(): Promise<{ permissions: RBACPermission[] }> {
  return apiFetch("GET", "/api/admin/rbac/permissions");
}

export async function getRolePermissions(roleId: number): Promise<{
  role: RBACRole;
  permissions: RBACPermission[];
}> {
  return apiFetch("GET", `/api/admin/rbac/roles/${roleId}/permissions`);
}

export async function assignPermissionToRole(roleId: number, permissionId: number): Promise<void> {
  return apiFetch("POST", `/api/admin/rbac/roles/${roleId}/permissions`, {
    permissionId,
  });
}

export async function removePermissionFromRole(
  roleId: number,
  permissionId: number
): Promise<void> {
  return apiFetch("DELETE", `/api/admin/rbac/roles/${roleId}/permissions/${permissionId}`);
}

// ============================================================================
// User Role Management
// ============================================================================

export async function getUserRoles(userId: number): Promise<{
  user: { id: number; email: string };
  roles: RBACRole[];
}> {
  return apiFetch("GET", `/api/admin/rbac/users/${userId}/roles`);
}

export async function assignRoleToUser(
  userId: number,
  roleId: number,
  expiresAt?: string | null
): Promise<RBACUserRole> {
  return apiFetch("POST", `/api/admin/rbac/users/${userId}/roles`, {
    roleId,
    expiresAt,
  });
}

export async function removeRoleFromUser(userId: number, roleId: number): Promise<void> {
  return apiFetch("DELETE", `/api/admin/rbac/users/${userId}/roles/${roleId}`);
}

// ============================================================================
// User Permissions (Computed)
// ============================================================================

export async function getUserPermissions(userId: number): Promise<UserPermissionsResponse> {
  return apiFetch("GET", `/api/admin/rbac/user-permissions/${userId}`);
}

// ============================================================================
// Department Management
// ============================================================================

export async function getDepartments(): Promise<{ departments: Department[] }> {
  return apiFetch("GET", "/api/admin/rbac/departments");
}

export async function createDepartment(data: {
  name: string;
  description?: string;
  isActive?: boolean;
}): Promise<Department> {
  return apiFetch("POST", "/api/admin/rbac/departments", data);
}

export async function updateDepartment(
  departmentId: number,
  data: {
    name?: string;
    description?: string;
    isActive?: boolean;
  }
): Promise<Department> {
  return apiFetch("PUT", `/api/admin/rbac/departments/${departmentId}`, data);
}

export async function deactivateDepartment(departmentId: number): Promise<void> {
  return apiFetch("DELETE", `/api/admin/rbac/departments/${departmentId}`);
}

// ============================================================================
// User Department Assignment
// ============================================================================

export async function assignUserToDepartment(
  userId: number,
  departmentId: number
): Promise<UserDepartment> {
  return apiFetch("POST", "/api/admin/rbac/user-departments", {
    userId,
    departmentId,
  });
}

export async function removeUserFromDepartment(
  userId: number,
  departmentId: number
): Promise<void> {
  return apiFetch("DELETE", `/api/admin/rbac/user-departments/${userId}/${departmentId}`);
}

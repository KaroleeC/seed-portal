import { z } from "zod";

// Define user roles
export const USER_ROLES = {
  ADMIN: "admin",
  EMPLOYEE: "employee",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Define permissions for each dashboard/feature
export const PERMISSIONS = {
  // Dashboard access
  VIEW_ADMIN_DASHBOARD: "view_admin_dashboard",
  VIEW_SALES_DASHBOARD: "view_sales_dashboard",
  VIEW_SERVICE_DASHBOARD: "view_service_dashboard",

  // Quote calculator
  VIEW_QUOTE_CALCULATOR: "view_quote_calculator",
  CREATE_QUOTES: "create_quotes",
  EDIT_QUOTES: "edit_quotes",
  DELETE_QUOTES: "delete_quotes",

  // Commission tracking
  VIEW_COMMISSION_TRACKER: "view_commission_tracker",
  MANAGE_COMMISSIONS: "manage_commissions",

  // Client intelligence
  VIEW_CLIENT_INTEL: "view_client_intel",
  EDIT_CLIENT_INTEL: "edit_client_intel",

  // System management
  MANAGE_USERS: "manage_users",
  MANAGE_INTEGRATIONS: "manage_integrations",
  VIEW_SYSTEM_HEALTH: "view_system_health",
  MANAGE_PRICING: "manage_pricing",

  // Knowledge base
  VIEW_KNOWLEDGE_BASE: "view_knowledge_base",
  EDIT_KNOWLEDGE_BASE: "edit_knowledge_base",
  MANAGE_KB_CONTENT: "manage_kb_content",

  // Sales operations
  VIEW_SALES_PIPELINE: "view_sales_pipeline",
  MANAGE_LEADS: "manage_leads",
  VIEW_SALES_INBOX: "view_sales_inbox",

  // Service operations
  VIEW_SERVICE_TICKETS: "view_service_tickets",
  MANAGE_CLIENT_ACCOUNTS: "manage_client_accounts",
  VIEW_SERVICE_METRICS: "view_service_metrics",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [USER_ROLES.ADMIN]: [
    // Admins have access to everything
    PERMISSIONS.VIEW_ADMIN_DASHBOARD,
    PERMISSIONS.VIEW_SALES_DASHBOARD,
    PERMISSIONS.VIEW_SERVICE_DASHBOARD,
    PERMISSIONS.VIEW_QUOTE_CALCULATOR,
    PERMISSIONS.CREATE_QUOTES,
    PERMISSIONS.EDIT_QUOTES,
    PERMISSIONS.DELETE_QUOTES,
    PERMISSIONS.VIEW_COMMISSION_TRACKER,
    PERMISSIONS.MANAGE_COMMISSIONS,
    PERMISSIONS.VIEW_CLIENT_INTEL,
    PERMISSIONS.EDIT_CLIENT_INTEL,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_INTEGRATIONS,
    PERMISSIONS.VIEW_SYSTEM_HEALTH,
    PERMISSIONS.MANAGE_PRICING,
    PERMISSIONS.VIEW_KNOWLEDGE_BASE,
    PERMISSIONS.EDIT_KNOWLEDGE_BASE,
    PERMISSIONS.MANAGE_KB_CONTENT,
    PERMISSIONS.VIEW_SALES_PIPELINE,
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.VIEW_SALES_INBOX,
    PERMISSIONS.VIEW_SERVICE_TICKETS,
    PERMISSIONS.MANAGE_CLIENT_ACCOUNTS,
    PERMISSIONS.VIEW_SERVICE_METRICS,
  ],

  [USER_ROLES.EMPLOYEE]: [
    // Employee permissions (combines previous sales and service permissions)
    PERMISSIONS.VIEW_SALES_DASHBOARD,
    PERMISSIONS.VIEW_SERVICE_DASHBOARD,
    PERMISSIONS.VIEW_QUOTE_CALCULATOR,
    PERMISSIONS.CREATE_QUOTES,
    PERMISSIONS.EDIT_QUOTES,
    PERMISSIONS.VIEW_COMMISSION_TRACKER,
    PERMISSIONS.VIEW_CLIENT_INTEL,
    PERMISSIONS.EDIT_CLIENT_INTEL,
    PERMISSIONS.VIEW_KNOWLEDGE_BASE,
    PERMISSIONS.EDIT_KNOWLEDGE_BASE,
    PERMISSIONS.VIEW_SALES_PIPELINE,
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.VIEW_SALES_INBOX,
    PERMISSIONS.VIEW_SERVICE_TICKETS,
    PERMISSIONS.MANAGE_CLIENT_ACCOUNTS,
    PERMISSIONS.VIEW_SERVICE_METRICS,
  ],
};

// Helper functions for permission checking
export function hasPermission(
  userRole: UserRole,
  permission: Permission,
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions.includes(permission);
}

export function hasAnyPermission(
  userRole: UserRole,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(userRole, permission));
}

export function hasAllPermissions(
  userRole: UserRole,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(userRole, permission));
}

// Get default dashboard route based on user's preference or role
export function getDefaultDashboard(
  userRole: UserRole,
  userDashboardPreference?: string,
): string {
  // If user has a specific dashboard preference, use that
  if (userDashboardPreference) {
    switch (userDashboardPreference) {
      case "admin":
        return "/admin";
      case "sales":
        return "/sales-dashboard";
      case "service":
        return "/service-dashboard";
    }
  }

  // Fallback to role-based default
  switch (userRole) {
    case USER_ROLES.ADMIN:
      return "/admin";
    case USER_ROLES.EMPLOYEE:
      return "/sales-dashboard"; // Default employee dashboard
    default:
      return "/sales-dashboard"; // Default fallback
  }
}

// Get available dashboard routes for a user (for admin testing)
export function getAvailableDashboards(
  userRole: UserRole,
): Array<{ route: string; name: string }> {
  const dashboards = [];

  if (hasPermission(userRole, PERMISSIONS.VIEW_ADMIN_DASHBOARD)) {
    dashboards.push({ route: "/admin", name: "Admin Dashboard" });
  }

  if (hasPermission(userRole, PERMISSIONS.VIEW_SALES_DASHBOARD)) {
    dashboards.push({ route: "/sales-dashboard", name: "Sales Dashboard" });
  }

  if (hasPermission(userRole, PERMISSIONS.VIEW_SERVICE_DASHBOARD)) {
    dashboards.push({ route: "/service-dashboard", name: "Service Dashboard" });
  }

  return dashboards;
}

// Schema for role updates
export const updateUserRoleSchema = z.object({
  userId: z.number(),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.EMPLOYEE]),
});

export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>;

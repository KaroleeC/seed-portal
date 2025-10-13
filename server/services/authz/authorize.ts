import type { Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { safeDbQuery } from "../../db-utils";
import { logger } from "../../logger";
import {
  roles,
  permissions,
  userRoles,
  rolePermissions,
  type Role,
  type Permission,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

// Principal interface - represents the authenticated user with their context
export interface Principal {
  userId: number;
  authUserId?: string;
  email: string;
  role?: string; // Legacy role field for backward compatibility
  roles?: Role[]; // New RBAC roles
  permissions?: Permission[]; // Cached permissions
}

// Resource interface - represents the resource being accessed
export interface Resource {
  type: string; // 'commission', 'quote', 'deal', etc.
  id?: string | number; // Resource ID if applicable
  attrs?: Record<string, unknown>; // Additional resource attributes
}

// Authorization result
export interface AuthzResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: string[];
}

// Cache for user permissions to avoid repeated DB queries
const permissionCache = new Map<number, { permissions: Permission[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Main authorization function
 * Checks if a principal has permission to perform an action on a resource
 * Supports both Cerbos (policy-as-code) and RBAC (database) backends
 */
export async function authorize(
  principal: Principal,
  action: string,
  resource?: Resource
): Promise<AuthzResult> {
  try {
    logger.debug(
      {
        userId: principal.userId,
        email: principal.email,
        action,
        resourceType: resource?.type,
        resourceId: resource?.id,
      },
      "🔐 [Authz] Authorization check"
    );

    // Special case: Super admin bypass via allowlist
    const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allowlist.includes(String(principal.email || "").toLowerCase())) {
      logger.info({ email: principal.email }, "✅ [Authz] Super admin bypass granted (allowlist)");
      return { allowed: true, reason: "super_admin" };
    }

    // Feature flag: Use Cerbos if enabled and available
    const useCerbos = process.env.USE_CERBOS === "true";

    if (useCerbos) {
      try {
        const cerbosResult = await authorizeWithCerbos(principal, action, resource);
        // If Cerbos returned a transport/config error indicator, fall back to RBAC seamlessly
        if (cerbosResult.reason === "cerbos_error" || cerbosResult.reason === "cerbos_disabled") {
          console.warn("⚠️ [Authz] Cerbos returned", cerbosResult.reason, "- falling back to RBAC");
        } else {
          return cerbosResult;
        }
      } catch (error) {
        console.warn("⚠️ [Authz] Cerbos authorization threw, falling back to RBAC:", error);
        // Fall through to RBAC authorization
      }
    }

    // Fallback to RBAC authorization
    return await authorizeWithRBAC(principal, action, resource);
  } catch (error) {
    console.error("❌ [Authz] Authorization error:", error);
    return {
      allowed: false,
      reason: "authorization_error",
    };
  }
}

/**
 * Authorization using Cerbos policies
 */
async function authorizeWithCerbos(
  principal: Principal,
  action: string,
  resource?: Resource
): Promise<AuthzResult> {
  const { checkWithCerbos, toCerbosPrincipal, toCerbosResource } = await import("./cerbos-client");
  const { loadPrincipalAttributes, loadResourceAttributes } = await import("./attribute-loader");

  logger.debug("🎯 [Authz] Using Cerbos authorization");

  // Load enriched attributes from database
  const principalAttributes = await loadPrincipalAttributes(principal);
  const cerbosPrincipal = toCerbosPrincipal(principal, principalAttributes);

  if (resource) {
    const resourceAttributes = await loadResourceAttributes(resource);
    const cerbosResource = toCerbosResource(resource, resourceAttributes);
    const result = await checkWithCerbos(cerbosPrincipal, cerbosResource, action);
    // If Cerbos signals internal error/disabled, let caller fall back to RBAC
    if (result.reason === "cerbos_error" || result.reason === "cerbos_disabled") {
      return result; // caller will handle fallback
    }
    return result;
  } else {
    // For non-resource actions, create a generic resource
    const genericResource = toCerbosResource({ type: "system", attrs: {} });
    const result = await checkWithCerbos(cerbosPrincipal, genericResource, action);
    if (result.reason === "cerbos_error" || result.reason === "cerbos_disabled") {
      return result; // caller will handle fallback
    }
    return result;
  }
}

/**
 * Authorization using RBAC database queries (legacy/fallback)
 */
async function authorizeWithRBAC(
  principal: Principal,
  action: string,
  resource?: Resource
): Promise<AuthzResult> {
  logger.debug("🗄️ [Authz] Using RBAC authorization");

  // Load user permissions if not cached or expired
  const userPermissions = await getUserPermissions(principal.userId);

  // Check if user has the required permission
  const hasPermission = userPermissions.some(
    (permission) => permission.key === action && permission.isActive
  );

  if (hasPermission) {
    logger.debug({ action }, "✅ [Authz] Permission granted");
    return { allowed: true, reason: "permission_granted" };
  }

  // Check for wildcard permissions (e.g., admin.* grants admin.anything)
  const wildcardPermission = getWildcardPermission(action);
  if (wildcardPermission) {
    const hasWildcard = userPermissions.some(
      (permission) => permission.key === wildcardPermission && permission.isActive
    );

    if (hasWildcard) {
      logger.debug({ wildcardPermission }, "✅ [Authz] Wildcard permission granted");
      return { allowed: true, reason: "wildcard_permission" };
    }
  }

  // Resource-specific authorization logic
  if (resource) {
    const resourceAuthz = await checkResourceAuthorization(
      principal,
      action,
      resource,
      userPermissions
    );
    if (resourceAuthz.allowed) {
      return resourceAuthz;
    }
  }

  logger.warn(
    {
      action,
      userPermissions: userPermissions.map((p) => p.key),
      reason: "insufficient_permissions",
    },
    "❌ [Authz] Permission denied"
  );

  return {
    allowed: false,
    reason: "insufficient_permissions",
    requiredPermissions: [action],
  };
}

/**
 * Load user permissions from database with caching
 */
async function getUserPermissions(userId: number): Promise<Permission[]> {
  // Check cache first
  const cached = permissionCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }

  const userPermissions: Permission[] =
    (await safeDbQuery(async () => {
      // Get user's roles and their permissions
      const result = await db
        .select({
          permission: permissions,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(roles.isActive, true),
            eq(permissions.isActive, true),
            // Only include non-expired roles (null means no expiration)
            sql`${userRoles.expiresAt} IS NULL OR ${userRoles.expiresAt} > NOW()`
          )
        );

      return result.map((row: { permission: string }) => row.permission);
    }, "getUserPermissions")) || [];

  // Cache the result
  permissionCache.set(userId, {
    permissions: userPermissions,
    timestamp: Date.now(),
  });

  return userPermissions;
}

/**
 * Get wildcard permission for an action
 * e.g., 'commissions.sync' -> 'commissions.*' or 'admin.*'
 */
function getWildcardPermission(action: string): string | null {
  const parts = action.split(".");
  if (parts.length > 1) {
    return `${parts[0]}.*`;
  }
  return null;
}

/**
 * Resource-specific authorization logic
 */
async function checkResourceAuthorization(
  principal: Principal,
  action: string,
  resource: Resource,
  userPermissions: Permission[]
): Promise<AuthzResult> {
  // Commission-specific authorization
  if (resource.type === "commission") {
    return checkCommissionAuthorization(principal, action, resource, userPermissions);
  }

  // Quote-specific authorization
  if (resource.type === "quote") {
    return checkQuoteAuthorization(principal, action, resource, userPermissions);
  }

  // Deal-specific authorization
  if (resource.type === "deal") {
    return checkDealAuthorization(principal, action, resource, userPermissions);
  }

  // Default: no additional authorization
  return { allowed: false, reason: "unknown_resource_type" };
}

/**
 * Commission-specific authorization rules
 */
async function checkCommissionAuthorization(
  principal: Principal,
  action: string,
  resource: Resource,
  userPermissions: Permission[]
): Promise<AuthzResult> {
  // Sales reps can only view their own commissions
  if (action === "commissions.view") {
    const hasViewOwn = userPermissions.some((p) => p.key === "commissions.view_own");
    if (hasViewOwn && resource.attrs?.ownerId === principal.userId) {
      return { allowed: true, reason: "owner_access" };
    }
  }

  // Managers can view their team's commissions
  if (action === "commissions.view" || action === "commissions.sync") {
    const hasManageTeam = userPermissions.some((p) => p.key === "commissions.manage_team");
    if (hasManageTeam) {
      // TODO: Check if user is manager of the commission owner
      return { allowed: true, reason: "manager_access" };
    }
  }

  return { allowed: false, reason: "insufficient_commission_permissions" };
}

/**
 * Quote-specific authorization rules
 */
async function checkQuoteAuthorization(
  principal: Principal,
  action: string,
  resource: Resource,
  _userPermissions: Permission[]
): Promise<AuthzResult> {
  // Users can edit their own quotes
  if (action === "quotes.update" || action === "quotes.delete") {
    if (resource.attrs?.ownerId === principal.userId) {
      return { allowed: true, reason: "owner_access" };
    }
  }

  return { allowed: false, reason: "insufficient_quote_permissions" };
}

/**
 * Deal-specific authorization rules
 */
async function checkDealAuthorization(
  principal: Principal,
  action: string,
  resource: Resource,
  _userPermissions: Permission[]
): Promise<AuthzResult> {
  // Sales reps can manage their own deals
  if (action === "deals.update" || action === "deals.sync") {
    if (resource.attrs?.ownerId === principal.userId) {
      return { allowed: true, reason: "owner_access" };
    }
  }

  return { allowed: false, reason: "insufficient_deal_permissions" };
}

/**
 * Clear permission cache for a user (call when roles change)
 */
export function clearUserPermissionCache(userId: number): void {
  permissionCache.delete(userId);
}

/**
 * Clear all permission caches (call when permissions/roles change globally)
 */
export function clearAllPermissionCaches(): void {
  permissionCache.clear();
}

/**
 * Get user's roles and permissions for debugging
 */
export async function getUserAuthzInfo(userId: number): Promise<{
  roles: Role[];
  permissions: Permission[];
}> {
  const [userRolesResult, userPermissions] = await Promise.all([
    safeDbQuery(async () => {
      const result = await db
        .select({ role: roles })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(userRoles.userId, userId), eq(roles.isActive, true)));
      return result.map((row: { role: { name: string } }) => row.role);
    }, "getUserRoles"),
    getUserPermissions(userId),
  ]);

  return {
    roles: userRolesResult || [],
    permissions: userPermissions,
  };
}

/**
 * Express middleware wrapper for authorization
 */
export function requirePermission(action: string, resourceType?: string) {
  return async (
    req: Request & { principal?: Principal },
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const principal = req.principal as Principal;
      if (!principal) {
        void res.status(401).json({ message: "Authentication required" });
        return;
      }

      const resource = resourceType ? { type: resourceType } : undefined;
      const authzResult = await authorize(principal, action, resource);

      if (!authzResult.allowed) {
        void res.status(403).json({
          message: "Insufficient permissions",
          required: authzResult.requiredPermissions,
          reason: authzResult.reason,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error({ error }, "Authorization middleware error");
      void res.status(500).json({ message: "Authorization error" });
    }
  };
}

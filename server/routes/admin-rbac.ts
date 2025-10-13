import { Router } from "express";
import { requirePermission } from "./_shared";
import { requireAuth } from "../middleware/supabase-auth";
import { storage } from "../storage";
import type { User, Role } from "@shared/schema";

const router = Router();

/**
 * GET /api/admin/rbac/users
 * Action: users.view
 * List all users with their RBAC roles
 */
router.get(
  "/api/admin/rbac/users",
  requireAuth,
  requirePermission("users.view", "system"),
  async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      const result = await Promise.all(
        users.map(async (u: User) => {
          const roles = await storage.getUserRoles(u.id);
          return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            roles: roles.map((r: Role) => ({ id: r.id, name: r.name })),
          };
        })
      );
      res.json({ users: result });
    } catch (error) {
      console.error("Error fetching users with roles:", error);
      res.status(500).json({ error: String(error) });
    }
  }
);

/**
 * GET /api/admin/rbac/roles
 * Action: roles.view
 * List all roles with their permissions
 */
router.get(
  "/api/admin/rbac/roles",
  requireAuth,
  requirePermission("roles.view", "system"),
  async (_req, res) => {
    try {
      const roles = await storage.getAllRoles();
      const result = await Promise.all(
        roles.map(async (r: Role) => {
          const perms = await storage.getRolePermissions(r.id);
          return {
            id: r.id,
            name: r.name,
            description: r.description,
            permissions: perms.map((p) => ({
              id: p.id,
              key: p.key,
              category: p.category,
            })),
          };
        })
      );
      res.json({ roles: result });
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: String(error) });
    }
  }
);

/**
 * GET /api/admin/rbac/permissions
 * Action: permissions.view
 * List all permissions
 */
router.get(
  "/api/admin/rbac/permissions",
  requireAuth,
  requirePermission("permissions.view", "system"),
  async (_req, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json({ permissions });
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ error: String(error) });
    }
  }
);

/**
 * POST /api/admin/rbac/assign-role
 * Action: roles.assign
 * Assign a role to a user
 */
router.post(
  "/api/admin/rbac/assign-role",
  requireAuth,
  requirePermission("roles.assign", "system"),
  async (req, res) => {
    try {
      const { userId, roleId } = req.body || {};
      if (!userId || !roleId) {
        return res.status(400).json({ error: "userId and roleId are required" });
      }
      await storage.assignRoleToUser(userId, roleId);
      res.json({ success: true, message: "Role assigned successfully" });
    } catch (error) {
      console.error("Error assigning role:", error);
      res.status(500).json({ error: String(error) });
    }
  }
);

/**
 * DELETE /api/admin/rbac/user/:userId/role/:roleId
 * Action: roles.remove
 * Remove a role from a user
 */
router.delete(
  "/api/admin/rbac/user/:userId/role/:roleId",
  requireAuth,
  requirePermission("roles.remove", "system"),
  async (req, res) => {
    try {
      const { userId, roleId } = req.params;
      if (!userId || !roleId) {
        return res.status(400).json({ error: "userId and roleId are required" });
      }
      await storage.removeRoleFromUser(parseInt(userId, 10), parseInt(roleId, 10));
      res.json({ success: true, message: "Role removed successfully" });
    } catch (error) {
      console.error("Error removing role:", error);
      res.status(500).json({ error: String(error) });
    }
  }
);

/**
 * GET /api/admin/rbac/user-permissions/:userId
 * Action: users.view
 * Get a user's computed permissions (roles, permissions, departments)
 */
router.get(
  "/api/admin/rbac/user-permissions/:userId",
  requireAuth,
  requirePermission("users.view", "system"),
  async (req, res) => {
    try {
      const userId = req.params.userId;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const parsedUserId = parseInt(userId, 10);

      if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      // Get user to verify they exist
      const user = await storage.getUser(parsedUserId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user's roles
      const roles = await storage.getUserRoles(parsedUserId);

      // Deduplicate roles by ID (in case of duplicate assignments)
      const uniqueRoles = Array.from(new Map(roles.map((r) => [r.id, r])).values());

      // Get all permissions from all roles
      const permissionsSet = new Set<string>();
      for (const role of uniqueRoles) {
        const rolePerms = await storage.getRolePermissions(role.id);
        for (const perm of rolePerms) {
          // Permission key is already in the correct format (e.g., "users.view", "quotes.update")
          permissionsSet.add(perm.key);
        }
      }

      // Get user's departments
      const userDepartments = await storage.getUserDepartments(parsedUserId);

      res.json({
        userId: parsedUserId,
        roles: uniqueRoles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
        })),
        permissions: Array.from(permissionsSet),
        departments: userDepartments.map((d) => ({
          id: d.id,
          name: d.name,
        })),
      });
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ error: String(error) });
    }
  }
);

/**
 * POST /api/admin/rbac/test-authz
 * Action: admin.debug
 * Test authorization for a user
 */
router.post(
  "/api/admin/rbac/test-authz",
  requireAuth,
  requirePermission("admin.debug", "system"),
  async (req, res) => {
    try {
      const { userEmail, action, resourceType, resourceId } = req.body || {};
      if (!userEmail || !action) {
        return res.status(400).json({ error: "userEmail and action are required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const userRoles = await storage.getUserRoles(user.id);

      const testPrincipal = {
        userId: user.id,
        email: user.email,
        // eslint-disable-next-line rbac/no-direct-role-checks -- Reading role from database to construct test principal, not for authorization
        role: user.role,
        roles: userRoles,
        authUserId: user.authUserId,
      };

      const testResource = resourceType
        ? { type: resourceType, id: resourceId, attrs: {} }
        : undefined;

      const { authorize } = await import("../services/authz/authorize");
      const result = await authorize(testPrincipal, action, testResource);

      res.json({
        action,
        resource: resourceType,
        allowed: result.allowed,
        reason: result.reason,
        timestamp: new Date().toISOString(),
        principal: {
          userId: user.id,
          email: user.email,
          roles: userRoles.map((r) => r.name),
        },
      });
    } catch (error) {
      console.error("Error testing authorization:", error);
      res.status(500).json({ error: String(error) });
    }
  }
);

export default router;

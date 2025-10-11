import { Router } from "express";
import { requireAuth } from "../middleware/supabase-auth";
import { getErrorMessage } from "../utils/error-handling";
import { storage } from "../storage";

const router = Router();

router.get("/api/admin/rbac/users", requireAuth, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    const result = await Promise.all(
      users.map(async (u: any) => {
        const roles = await storage.getUserRoles(u.id);
        return {
          id: u.id,
          email: u.email,
          firstName: (u as any).firstName,
          lastName: (u as any).lastName,
          roles: roles.map((r: any) => ({ id: r.id, name: r.name })),
        };
      })
    );
    res.json({ users: result });
  } catch (error) {
    console.error("Error fetching users with roles:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/api/admin/rbac/roles", requireAuth, async (req, res) => {
  try {
    const roles = await storage.getAllRoles();
    const result = await Promise.all(
      roles.map(async (r: any) => {
        const perms = await storage.getRolePermissions(r.id);
        return {
          id: r.id,
          name: r.name,
          description: (r as any).description,
          permissions: perms.map((p: any) => ({ id: p.id, key: p.key, category: (p as any).category })),
        };
      })
    );
    res.json({ roles: result });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

router.get("/api/admin/rbac/permissions", requireAuth, async (req, res) => {
  try {
    const permissions = await storage.getAllPermissions();
    res.json({ permissions });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

router.post("/api/admin/rbac/assign-role", requireAuth, async (req, res) => {
  try {
    const { userId, roleId } = req.body || {};
    await storage.assignRoleToUser(userId, roleId);
    res.json({ success: true, message: "Role assigned successfully" });
  } catch (error) {
    console.error("Error assigning role:", error);
    res.status(500).json({ error: "Failed to assign role" });
  }
});

router.delete("/api/admin/rbac/user/:userId/role/:roleId", requireAuth, async (req, res) => {
  try {
    const { userId, roleId } = req.params;
    await storage.removeRoleFromUser(parseInt(userId, 10), parseInt(roleId, 10));
    res.json({ success: true, message: "Role removed successfully" });
  } catch (error) {
    console.error("Error removing role:", error);
    res.status(500).json({ error: "Failed to remove role" });
  }
});

router.post("/api/admin/rbac/test-authz", requireAuth, async (req, res) => {
  try {
    const { userEmail, action, resourceType, resourceId } = req.body || {};
    const user = await storage.getUserByEmail(userEmail);
    if (!user) return res.status(404).json({ error: "User not found" });
    const userRoles = await storage.getUserRoles(user.id);

    const testPrincipal = {
      userId: user.id,
      email: user.email,
      role: user.role,
      roles: userRoles,
      authUserId: user.authUserId,
    };

    const testResource = { type: resourceType, id: resourceId, attrs: {} };

    const mod: any = await import("../services/authz/authorize");
    const authorize = mod.authorize as any;
    const result = await authorize(testPrincipal, action, testResource);

    res.json({
      action,
      resource: resourceType,
      allowed: result.allowed,
      reason: result.reason,
      timestamp: new Date().toISOString(),
      principal: { userId: user.id, email: user.email, roles: userRoles.map((r: any) => r.name) },
    });
  } catch (error) {
    console.error("Error testing authorization:", error);
    res.status(500).json({ error: "Failed to test authorization" });
  }
});

export default router;

import { Router } from "express";
import { requireAuth, requirePermission } from "./_shared";
import { getErrorMessage } from "../utils/error-handling";

const router = Router();

/**
 * GET /api/_authz-check
 * Action: admin.debug
 * Check authorization for a given action and user
 */
router.get(
  "/api/_authz-check",
  requireAuth,
  requirePermission("admin.debug", "system"),
  async (req: any, res) => {
    try {
      const mod: any = await import("../services/authz/authorize");
      const authorize = mod.authorize as any;
      const getUserAuthzInfo = mod.getUserAuthzInfo as any;

      const action = req.query.action as string;
      const resourceType = req.query.resource as string;
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : req.user?.id;

      if (!action) return res.status(400).json({ message: "action parameter is required" });
      if (!userId)
        return res
          .status(400)
          .json({ message: "userId parameter is required or user not authenticated" });

      const authzInfo = await getUserAuthzInfo(userId);
      const principal = {
        userId,
        email: req.user?.email || "unknown",
        roles: authzInfo.roles,
        permissions: authzInfo.permissions,
      };
      const resource = resourceType ? { type: resourceType } : undefined;
      const authzResult = await authorize(principal, action, resource);

      res.json({
        userId,
        action,
        resource: resourceType || null,
        result: authzResult,
        userInfo: {
          email: principal.email,
          roles: authzInfo.roles.map((r: any) => ({ id: r.id, name: r.name })),
          permissions: authzInfo.permissions.map((p: any) => ({
            id: p.id,
            key: p.key,
            category: p.category,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Authorization check error:", error);
      res
        .status(500)
        .json({
          message: "Authorization check failed",
          error: getErrorMessage(error),
          timestamp: new Date().toISOString(),
        });
    }
  }
);

/**
 * GET /api/_cerbos-explain
 * Action: admin.debug
 * Explain Cerbos authorization decision
 */
router.get(
  "/api/_cerbos-explain",
  requireAuth,
  requirePermission("admin.debug", "system"),
  async (req: any, res) => {
    try {
      const cerbosMod: any = await import("../services/authz/cerbos-client");
      const explainDecision = cerbosMod.explainDecision as any;
      const toCerbosPrincipal = cerbosMod.toCerbosPrincipal as any;
      const toCerbosResource = cerbosMod.toCerbosResource as any;
      const attrMod: any = await import("../services/authz/attribute-loader");
      const loadPrincipalAttributes = attrMod.loadPrincipalAttributes as any;
      const loadResourceAttributes = attrMod.loadResourceAttributes as any;

      const action = req.query.action as string;
      const resourceType = req.query.resourceType as string;
      const resourceId = req.query.resourceId as string;
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : req.user?.id;

      if (!action || !resourceType)
        return res.status(400).json({ message: "action and resourceType parameters are required" });
      if (!userId)
        return res
          .status(400)
          .json({ message: "userId parameter is required or user not authenticated" });

      const principal = { userId, email: req.user?.email || "unknown" };
      const principalAttributes = await loadPrincipalAttributes(principal);
      const cerbosPrincipal = toCerbosPrincipal(principal, principalAttributes);

      const resource = { type: resourceType, id: resourceId, attrs: {} };
      const resourceAttributes = await loadResourceAttributes(resource);
      const cerbosResource = toCerbosResource(resource, resourceAttributes);

      const explanation = await explainDecision(cerbosPrincipal, cerbosResource, action);

      res.json({
        userId,
        action,
        resource: { type: resourceType, id: resourceId, attributes: resourceAttributes },
        principal: {
          id: cerbosPrincipal.id,
          roles: cerbosPrincipal.roles,
          departments: cerbosPrincipal.departments,
          isManager: cerbosPrincipal.isManager,
        },
        explanation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Cerbos explanation error:", error);
      res
        .status(500)
        .json({
          message: "Failed to get Cerbos decision explanation",
          error: getErrorMessage(error),
          timestamp: new Date().toISOString(),
        });
    }
  }
);

/**
 * GET /api/admin/cerbos/policy/:policyName
 * Action: admin.policies
 * Read a Cerbos policy file
 */
router.get(
  "/api/admin/cerbos/policy/:policyName",
  requireAuth,
  requirePermission("admin.policies", "system"),
  async (req, res) => {
    try {
      const { policyName } = req.params;
      const fs = await import("fs");
      const path = await import("path");
      const policyPath = path.join(process.cwd(), "cerbos", "policies", `${policyName}.yaml`);
      if (!fs.existsSync(policyPath)) return res.status(404).json({ error: "Policy not found" });
      const content = fs.readFileSync(policyPath, "utf8");
      res.json({ content });
    } catch (error) {
      console.error("Error reading policy:", error);
      res.status(500).json({ error: "Failed to read policy" });
    }
  }
);

/**
 * PUT /api/admin/cerbos/policy/:policyName
 * Action: admin.policies
 * Update a Cerbos policy file
 */
router.put(
  "/api/admin/cerbos/policy/:policyName",
  requireAuth,
  requirePermission("admin.policies", "system"),
  async (req, res) => {
    try {
      const { policyName } = req.params;
      const { content } = req.body;
      const fs = await import("fs");
      const path = await import("path");
      const policyPath = path.join(process.cwd(), "cerbos", "policies", `${policyName}.yaml`);
      fs.writeFileSync(policyPath, content, "utf8");
      console.log(`📝 [Policy] Updated ${policyName}.yaml policy`);
      res.json({ success: true, message: "Policy updated successfully" });
    } catch (error) {
      console.error("Error updating policy:", error);
      res.status(500).json({ error: "Failed to update policy" });
    }
  }
);

export default router;

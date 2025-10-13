import type { Express, Request } from "express";
import type { Session } from "express-session";
import { storage } from "./storage";
import { requireAuth } from "./middleware/supabase-auth";
import { requirePermission } from "./routes/_shared";

// Extend Express Request to include user property and Passport methods
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    defaultDashboard?: string;
  };
  login?(user: unknown, callback: (err: Error | null) => void): void;
}
import { hubSpotService } from "./hubspot";
import {
  CalculatorContentResponseSchema,
  CalculatorContentItemResponseSchema,
} from "@shared/contracts";

// Helper function to safely get error messages from unknown error types
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "An unknown error occurred";
}

// Type for HubSpot pipeline stage
interface HubSpotStage {
  id: string | number;
  label?: string;
}

// Type for HubSpot pipeline
interface HubSpotPipeline {
  id: string | number;
  label?: string;
  stages?: HubSpotStage[];
}

// Type for database query result
interface DbQueryResult<T = unknown> {
  rows?: T[];
}

// Type for session with impersonation data
interface ImpersonationSession extends Session {
  originalUser?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    defaultDashboard: string | null;
  };
  isImpersonating?: boolean;
}

// Type for HubSpot service on global
interface GlobalWithHubSpot {
  hubSpotService?: {
    getOwnerByEmail(email: string): Promise<string | null>;
  };
}

export async function registerAdminRoutes(app: Express): Promise<void> {
  // ============================================================================
  // RBAC REFACTORED: All routes use granular permissions
  // See docs/RBAC_REFACTOR_PLAN.md for full permission mapping
  // ============================================================================

  // =============================
  // User Management Routes
  // =============================

  /**
   * POST /api/admin/users/:userId/link-hubspot-owner
   * Action: users.update
   * Link a user to their HubSpot owner record
   */
  app.post(
    "/api/admin/users/:userId/link-hubspot-owner",
    requireAuth,
    requirePermission("users.update", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId: userIdParam } = req.params;
        if (!userIdParam) return res.status(400).json({ message: "userId is required" });
        const userId = parseInt(userIdParam);
        if (Number.isNaN(userId)) return res.status(400).json({ message: "invalid user id" });
        const { db } = await import("./db");
        const { sql } = await import("drizzle-orm");

        const [userRow] = (await db.execute(
          sql`SELECT id, email FROM users WHERE id = ${userId} LIMIT 1`
        )) as DbQueryResult<{ id: number; email: string }>[];
        const userRec = userRow?.rows?.[0];
        if (!userRec) return res.status(404).json({ message: "user not found" });

        // Ensure HubSpot service is available
        const globalWithHubSpot = global as unknown as GlobalWithHubSpot;
        const hs = globalWithHubSpot.hubSpotService || null;
        if (!hs) return res.status(503).json({ message: "HubSpot service not configured" });

        const ownerId = await hs.getOwnerByEmail(userRec.email);
        if (!ownerId) return res.status(404).json({ message: "No HubSpot owner found for email" });

        const updated = await db.execute(
          sql`UPDATE users SET hubspot_user_id = ${ownerId}, updated_at = now(), last_hubspot_sync = now() WHERE id = ${userId} RETURNING *`
        );
        await writeAudit(req.user?.id, "user.link_hubspot_owner", "user", userId, {
          email: userRec.email,
          ownerId,
        });
        const updatedResult = updated as DbQueryResult<{
          id: number;
          hubspot_user_id: string | null;
        }>;
        res.json(updatedResult.rows?.[0] ?? null);
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to link HubSpot owner", error: getErrorMessage(error) });
      }
    }
  );

  // =============================
  // HubSpot Integration Routes
  // =============================

  /**
   * GET /api/admin/hubspot/pipelines
   * Action: hubspot.view
   * Get HubSpot pipeline configuration
   */
  app.get(
    "/api/admin/hubspot/pipelines",
    requireAuth,
    requirePermission("hubspot.view", "system"),
    async (_req, res) => {
      try {
        if (!hubSpotService)
          return res.status(400).json({ message: "HubSpot integration not configured" });
        const raw = await hubSpotService.getPipelines();
        const results = (raw as { results?: HubSpotPipeline[] })?.results || [];
        const pipelines = results.map((p) => ({
          id: String(p.id),
          label: p.label || String(p.id),
          stages: (p.stages || []).map((s) => ({
            id: String(s.id),
            label: s.label || String(s.id),
          })),
        }));
        return res.json({ pipelines });
      } catch (error: unknown) {
        console.error("Failed to fetch HubSpot pipelines:", error);
        return res
          .status(500)
          .json({ message: `Failed to fetch pipelines: ${getErrorMessage(error)}` });
      }
    }
  );

  // =============================
  // CRM Configuration Routes
  // =============================

  /**
   * GET /api/admin/crm/lead-config
   * Action: crm.config.view
   * Get CRM lead configuration (sources, statuses, stages)
   */
  app.get(
    "/api/admin/crm/lead-config",
    requireAuth,
    requirePermission("crm.config.view", "system"),
    async (_req, res) => {
      try {
        const { getLeadConfig } = await import("./services/crm/config");
        const cfg = await getLeadConfig();
        res.json(cfg);
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to load lead config", error: getErrorMessage(error) });
      }
    }
  );

  async function upsertConfigRow(
    table: string,
    key: string,
    label?: string | null,
    isActive?: boolean,
    sortOrder?: number | null
  ) {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const k = String(key).trim().toLowerCase();
    await db.execute(sql`
      INSERT INTO ${sql.raw(table)} (key, label, is_active, sort_order)
      VALUES (${k}, ${label ?? k}, ${isActive ?? true}, ${sortOrder ?? null})
      ON CONFLICT (key) DO UPDATE SET
        label = COALESCE(${label}, ${sql.raw(table)}.label),
        is_active = COALESCE(${isActive ?? null}, ${sql.raw(table)}.is_active),
        sort_order = COALESCE(${sortOrder ?? null}, ${sql.raw(table)}.sort_order),
        updated_at = now()
    `);
    const { invalidateLeadConfigCache } = await import("./services/crm/config");
    await invalidateLeadConfigCache();
  }

  async function deactivateConfigRow(table: string, key: string) {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const k = String(key).trim().toLowerCase();
    await db.execute(
      sql`UPDATE ${sql.raw(table)} SET is_active = false, updated_at = now() WHERE key = ${k}`
    );
    const { invalidateLeadConfigCache } = await import("./services/crm/config");
    await invalidateLeadConfigCache();
  }

  // Upsert endpoints
  /**
   * PUT /api/admin/crm/lead-config/sources/:key
   * Action: crm.config.manage
   * Update CRM lead source configuration
   */
  app.put(
    "/api/admin/crm/lead-config/sources/:key",
    requireAuth,
    requirePermission("crm.config.manage", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { key } = req.params;
        if (!key) return res.status(400).json({ message: "key is required" });
        const { label, isActive, sortOrder } = req.body || {};
        await upsertConfigRow("crm_lead_sources", key, label, isActive, sortOrder ?? null);
        res.json({ success: true });
      } catch (error: unknown) {
        res.status(500).json({ message: "Failed to save source", error: getErrorMessage(error) });
      }
    }
  );

  /**
   * PUT /api/admin/crm/lead-config/statuses/:key
   * Action: crm.config.manage
   * Update CRM lead status configuration
   */
  app.put(
    "/api/admin/crm/lead-config/statuses/:key",
    requireAuth,
    requirePermission("crm.config.manage", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { key } = req.params;
        if (!key) return res.status(400).json({ message: "key is required" });
        const { label, isActive, sortOrder } = req.body || {};
        await upsertConfigRow("crm_lead_statuses", key, label, isActive, sortOrder ?? null);
        res.json({ success: true });
      } catch (error: unknown) {
        res.status(500).json({ message: "Failed to save status", error: getErrorMessage(error) });
      }
    }
  );

  /**
   * PUT /api/admin/crm/lead-config/stages/:key
   * Action: crm.config.manage
   * Update CRM lead stage configuration
   */
  app.put(
    "/api/admin/crm/lead-config/stages/:key",
    requireAuth,
    requirePermission("crm.config.manage", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { key } = req.params;
        if (!key) return res.status(400).json({ message: "key is required" });
        const { label, isActive, sortOrder } = req.body || {};
        await upsertConfigRow("crm_lead_stages", key, label, isActive, sortOrder ?? null);
        res.json({ success: true });
      } catch (error: unknown) {
        res.status(500).json({ message: "Failed to save stage", error: getErrorMessage(error) });
      }
    }
  );

  // Deactivate endpoints
  /**
   * DELETE /api/admin/crm/lead-config/sources/:key
   * Action: crm.config.manage
   * Delete CRM lead source configuration
   */
  app.delete(
    "/api/admin/crm/lead-config/sources/:key",
    requireAuth,
    requirePermission("crm.config.manage", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { key } = req.params;
        if (!key) return res.status(400).json({ message: "key is required" });
        await deactivateConfigRow("crm_lead_sources", key);
        res.json({ success: true });
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to deactivate source", error: getErrorMessage(error) });
      }
    }
  );

  /**
   * DELETE /api/admin/crm/lead-config/statuses/:key
   * Action: crm.config.manage
   * Delete CRM lead status configuration
   */
  app.delete(
    "/api/admin/crm/lead-config/statuses/:key",
    requireAuth,
    requirePermission("crm.config.manage", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { key } = req.params;
        if (!key) return res.status(400).json({ message: "key is required" });
        await deactivateConfigRow("crm_lead_statuses", key);
        res.json({ success: true });
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to deactivate status", error: getErrorMessage(error) });
      }
    }
  );

  /**
   * DELETE /api/admin/crm/lead-config/stages/:key
   * Action: crm.config.manage
   * Delete CRM lead stage configuration
   */
  app.delete(
    "/api/admin/crm/lead-config/stages/:key",
    requireAuth,
    requirePermission("crm.config.manage", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { key } = req.params;
        if (!key) return res.status(400).json({ message: "key is required" });
        await deactivateConfigRow("crm_lead_stages", key);
        res.json({ success: true });
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to deactivate stage", error: getErrorMessage(error) });
      }
    }
  );

  // =============================
  // RBAC Attributes & Audit (Phase 2)
  // =============================

  async function writeAudit(
    actorUserId: number | undefined,
    action: string,
    entityType: string,
    entityId: string | number | null,
    diff: Record<string, unknown>
  ) {
    try {
      const { db } = await import("./db");
      await db.execute((await import("drizzle-orm")).sql`
        INSERT INTO auth_audit_log (actor_user_id, action, entity_type, entity_id, diff_json)
        VALUES (${actorUserId ?? null}, ${action}, ${entityType}, ${entityId !== null ? String(entityId) : null}, ${JSON.stringify(diff)})
      `);
    } catch (e) {
      console.warn("[Audit] write failed:", e instanceof Error ? e.message : String(e));
    }
  }

  // =============================
  // Department Management Routes
  // =============================

  /**
   * GET /api/admin/rbac/departments
   * Action: departments.view
   * Get all departments
   */
  app.get(
    "/api/admin/rbac/departments",
    requireAuth,
    requirePermission("departments.view", "system"),
    async (_req, res) => {
      try {
        const { db } = await import("./db");
        const { departments } = await import("@shared/schema");
        const rows = await db.select().from(departments).orderBy(departments.name);
        res.json({ departments: rows });
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to list departments", error: getErrorMessage(error) });
      }
    }
  );

  /**
   * POST /api/admin/rbac/departments
   * Action: departments.manage
   * Create a new department
   */
  app.post(
    "/api/admin/rbac/departments",
    requireAuth,
    requirePermission("departments.manage", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { name, description, isActive = true } = req.body || {};
        if (!name || String(name).trim().length === 0)
          return res.status(400).json({ message: "name is required" });
        const { db } = await import("./db");
        const { sql } = await import("drizzle-orm");
        const [row] = await db.execute(
          sql`INSERT INTO departments (name, description, is_active) VALUES (${name}, ${description ?? null}, ${!!isActive}) RETURNING *`
        );
        const result = row as DbQueryResult<{ id: number }>;
        await writeAudit(
          req.user?.id,
          "department.create",
          "department",
          result.rows?.[0]?.id ?? null,
          { name, description, isActive }
        );
        res.json(result.rows?.[0] ?? null);
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to create department", error: getErrorMessage(error) });
      }
    }
  );

  /**
   * PUT /api/admin/rbac/departments/:id
   * Action: departments.manage
   * Update a department
   */
  app.put(
    "/api/admin/rbac/departments/:id",
    requireAuth,
    requirePermission("departments.manage", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id: idParam } = req.params;
        if (!idParam) return res.status(400).json({ message: "missing id" });
        const id = parseInt(idParam);
        if (Number.isNaN(id)) return res.status(400).json({ message: "invalid id" });
        const { name, description, isActive } = req.body || {};
        const { db } = await import("./db");
        const { sql } = await import("drizzle-orm");
        const [row] = await db.execute(
          sql`UPDATE departments SET name = COALESCE(${name}, name), description = COALESCE(${description}, description), is_active = COALESCE(${isActive}, is_active), updated_at = now() WHERE id = ${id} RETURNING *`
        );
        await writeAudit(req.user?.id, "department.update", "department", id, {
          name,
          description,
          isActive,
        });
        const result = row as DbQueryResult;
        res.json(result.rows?.[0] ?? null);
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to update department", error: getErrorMessage(error) });
      }
    }
  );

  /**
   * DELETE /api/admin/rbac/departments/:id
   * Action: departments.manage
   * Soft delete a department (set is_active=false)
   */
  app.delete(
    "/api/admin/rbac/departments/:id",
    requireAuth,
    requirePermission("departments.manage", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id: idParam } = req.params;
        if (!idParam) return res.status(400).json({ message: "id is required" });
        const id = parseInt(idParam);
        if (Number.isNaN(id)) return res.status(400).json({ message: "invalid id" });
        const { db } = await import("./db");
        const { sql } = await import("drizzle-orm");
        await db.execute(
          sql`UPDATE departments SET is_active = false, updated_at = now() WHERE id = ${id}`
        );
        await writeAudit(req.user?.id, "department.deactivate", "department", id, {});
        res.json({ success: true });
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to deactivate department", error: getErrorMessage(error) });
      }
    }
  );

  // ----- User-Department assignment -----
  /**
   * POST /api/admin/rbac/users/:userId/departments/:deptId
   * Action: departments.manage
   * Assign a user to a department
   */
  app.post(
    "/api/admin/rbac/users/:userId/departments/:deptId",
    requireAuth,
    requirePermission("departments.manage", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId: userIdParam, deptId: deptIdParam } = req.params;
        if (!userIdParam || !deptIdParam)
          return res.status(400).json({ message: "missing params" });
        const userId = parseInt(userIdParam);
        const deptId = parseInt(deptIdParam);
        if (Number.isNaN(userId) || Number.isNaN(deptId))
          return res.status(400).json({ message: "invalid ids" });
        const { db } = await import("./db");
        const { sql } = await import("drizzle-orm");

        // If department is Sales, require HubSpot owner mapping; attempt auto-link by email
        const deptRow = await db.execute(sql`SELECT name FROM departments WHERE id = ${deptId}`);
        const deptResult = deptRow as DbQueryResult<{ name: string }>;
        const deptName: string | undefined = deptResult.rows?.[0]?.name;

        if (deptName && deptName.toLowerCase() === "sales") {
          // Load user email
          const userRow = await db.execute(
            sql`SELECT id, email, hubspot_user_id FROM users WHERE id = ${userId}`
          );
          const userResult = userRow as DbQueryResult<{
            id: number;
            email: string;
            hubspot_user_id: string | null;
          }>;
          const u = userResult.rows?.[0];
          if (!u) return res.status(404).json({ message: "user not found" });
          let hubspotId = u.hubspot_user_id;

          if (!hubspotId && (global as Record<string, unknown>).hubSpotService) {
            try {
              const hs = (global as Record<string, unknown>).hubSpotService as {
                getOwnerByEmail: (email: string) => Promise<string | null>;
              };
              const ownerId = await hs.getOwnerByEmail(u.email);
              if (ownerId) {
                await db.execute(
                  sql`UPDATE users SET hubspot_user_id = ${ownerId}, updated_at = now(), last_hubspot_sync = now() WHERE id = ${userId}`
                );
                hubspotId = ownerId;
                await writeAudit(req.user?.id, "user.link_hubspot_owner", "user", userId, {
                  email: u.email,
                  ownerId,
                });
              }
            } catch (e) {
              console.warn(
                "[SalesDept] auto-link hubspot failed:",
                e instanceof Error ? e.message : String(e)
              );
            }
          }

          if (!hubspotId) {
            return res.status(400).json({
              message:
                "Sales department users must have a HubSpot owner mapping. Use Link HubSpot Owner or ensure email exists as an owner in HubSpot.",
            });
          }
        }

        const [row] = await db.execute(
          sql`INSERT INTO user_departments (user_id, department_id) VALUES (${userId}, ${deptId}) ON CONFLICT DO NOTHING RETURNING *`
        );
        await writeAudit(req.user?.id, "user.assign_department", "user", userId, { deptId });
        const result = row as DbQueryResult;
        res.json(result.rows?.[0] ?? null);
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to assign department", error: getErrorMessage(error) });
      }
    }
  );

  /**
   * DELETE /api/admin/rbac/users/:userId/departments/:deptId
   * Action: departments.manage
   * Remove a user from a department
   */
  app.delete(
    "/api/admin/rbac/users/:userId/departments/:deptId",
    requireAuth,
    requirePermission("departments.manage", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId: userIdParam, deptId: deptIdParam } = req.params;
        if (!userIdParam || !deptIdParam)
          return res.status(400).json({ message: "missing params" });
        const userId = parseInt(userIdParam);
        const deptId = parseInt(deptIdParam);
        if (Number.isNaN(userId) || Number.isNaN(deptId))
          return res.status(400).json({ message: "invalid ids" });
        const { db } = await import("./db");
        const { sql } = await import("drizzle-orm");
        const [row] = await db.execute(
          sql`DELETE FROM user_departments WHERE user_id = ${userId} AND department_id = ${deptId} RETURNING *`
        );
        await writeAudit(req.user?.id, "user.remove_department", "user", userId, { deptId });
        const result = row as DbQueryResult;
        res.json(result.rows?.[0] ?? null);
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to remove department", error: getErrorMessage(error) });
      }
    }
  );

  /**
   * GET /api/admin/rbac/manager-edges
   * Action: departments.view
   * Get manager-member relationships
   */
  app.get(
    "/api/admin/rbac/manager-edges",
    requireAuth,
    requirePermission("departments.view", "system"),
    async (_req, res) => {
      try {
        const { db } = await import("./db");
        const { sql } = await import("drizzle-orm");
        const rows = await db.execute(
          sql`SELECT me.id, me.manager_user_id, me.member_user_id,
               mu.email as manager_email, uu.email as member_email
        FROM manager_edges me
        LEFT JOIN users mu ON me.manager_user_id = mu.id
        LEFT JOIN users uu ON me.member_user_id = uu.id
        ORDER BY manager_email, member_email`
        );
        const result = rows as DbQueryResult;
        res.json({ edges: result.rows || [] });
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to list manager edges", error: getErrorMessage(error) });
      }
    }
  );

  /**
   * POST /api/admin/rbac/manager-edges
   * Action: departments.manage
   * Create manager-member relationship
   */
  app.post(
    "/api/admin/rbac/manager-edges",
    requireAuth,
    requirePermission("departments.manage", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { managerUserId, memberUserId } = req.body || {};
        const m = parseInt(managerUserId);
        const u = parseInt(memberUserId);
        if (Number.isNaN(m) || Number.isNaN(u))
          return res.status(400).json({ message: "invalid ids" });
        const { db } = await import("./db");
        const { sql } = await import("drizzle-orm");
        await db.execute(
          sql`INSERT INTO manager_edges (manager_user_id, member_user_id) VALUES (${m}, ${u}) ON CONFLICT DO NOTHING`
        );
        await writeAudit(req.user?.id, "manager_edge.add", "manager_edge", `${m}->${u}`, {});
        res.json({ success: true });
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to add manager edge", error: getErrorMessage(error) });
      }
    }
  );

  /**
   * DELETE /api/admin/rbac/manager-edges
   * Action: departments.manage
   * Remove manager-member relationship
   */
  app.delete(
    "/api/admin/rbac/manager-edges",
    requireAuth,
    requirePermission("departments.manage", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { managerUserId, memberUserId } = req.body || {};
        const m = parseInt(managerUserId);
        const u = parseInt(memberUserId);
        if (Number.isNaN(m) || Number.isNaN(u))
          return res.status(400).json({ message: "invalid ids" });
        const { db } = await import("./db");
        const { sql } = await import("drizzle-orm");
        await db.execute(
          sql`DELETE FROM manager_edges WHERE manager_user_id = ${m} AND member_user_id = ${u}`
        );
        await writeAudit(req.user?.id, "manager_edge.remove", "manager_edge", `${m}->${u}`, {});
        res.json({ success: true });
      } catch (error: unknown) {
        res
          .status(500)
          .json({ message: "Failed to remove manager edge", error: getErrorMessage(error) });
      }
    }
  );

  /**
   * GET /api/admin/rbac/audit
   * Action: admin.audit
   * Get audit log of RBAC changes
   */
  app.get(
    "/api/admin/rbac/audit",
    requireAuth,
    requirePermission("admin.audit", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const limit = Math.min(parseInt(String(req.query.limit || "100")), 500) || 100;
        const { db } = await import("./db");
        const { sql } = await import("drizzle-orm");
        const rows = await db.execute(
          sql`SELECT a.*, u.email as actor_email FROM auth_audit_log a LEFT JOIN users u ON a.actor_user_id = u.id ORDER BY a.created_at DESC LIMIT ${limit}`
        );
        const result = rows as DbQueryResult;
        res.json({ items: result.rows || [] });
      } catch (error: unknown) {
        res.status(500).json({ message: "Failed to list audit", error: getErrorMessage(error) });
      }
    }
  );

  // =============================
  // User Management Routes (continued)
  // =============================

  /**
   * GET /api/admin/users
   * Action: users.view
   * Get all users from the database
   */
  app.get(
    "/api/admin/users",
    requireAuth,
    requirePermission("users.view", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const users = await storage.getAllUsers();
        void res.json({ users: users || [] });
      } catch (error: unknown) {
        void res.status(500).json({
          message: `Failed to fetch users: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * PATCH /api/admin/users/:userId/role
   * Action: users.update + roles.assign
   * Update user's role (legacy - prefer RBAC role assignment)
   */
  app.patch(
    "/api/admin/users/:userId/role",
    requireAuth,
    requirePermission("users.update", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId: userIdParam } = req.params;
        if (!userIdParam) return res.status(400).json({ message: "userId is required" });
        const userId = parseInt(userIdParam);
        const { role } = req.body;
        const adminUserId = req.user?.id;
        if (!adminUserId) {
          return res.status(401).json({ message: "User ID required" });
        }

        if (!role || !["admin", "employee"].includes(role)) {
          return res.status(400).json({
            message: "Invalid role. Must be admin or employee",
          });
        }

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        const updatedUser = await storage.updateUserRole(userId, role, adminUserId);

        res.json({
          message: "User role updated successfully",
          user: updatedUser,
        });
      } catch (error: unknown) {
        console.error("Error updating user role:", error);
        res.status(500).json({
          message: `Failed to update user role: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * POST /api/admin/users
   * Action: users.create
   * Create a new user account
   */
  app.post(
    "/api/admin/users",
    requireAuth,
    requirePermission("users.create", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const {
          firstName,
          lastName,
          email,
          role = "employee",
          defaultDashboard = "sales",
        } = req.body;
        const adminUserId = req.user?.id;
        if (!adminUserId) {
          return res.status(401).json({ message: "User ID required" });
        }

        if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
          return res.status(400).json({
            message: "First name, last name, and email are required",
          });
        }

        if (!email.endsWith("@seedfinancial.io")) {
          return res.status(400).json({
            message: "Email must be a @seedfinancial.io address",
          });
        }

        if (!["admin", "employee"].includes(role)) {
          return res.status(400).json({
            message: "Invalid role. Must be admin or employee",
          });
        }

        if (
          typeof defaultDashboard !== "string" ||
          !["admin", "sales", "service"].includes(defaultDashboard)
        ) {
          return res.status(400).json({
            message: "Invalid default dashboard. Must be admin, sales, or service",
          });
        }

        // Check if user already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({
            message: "A user with this email already exists",
          });
        }

        // Generate a random password
        const generatedPassword = generatePassword();

        // Create new user with plain password; storage will hash
        let user = await storage.createUser({
          email,
          password: generatedPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          hubspotUserId: null,
          role,
          defaultDashboard,
        } as any);

        // Ensure role assignment metadata is set consistently
        user = await storage.updateUserRole(user.id, role, adminUserId);

        res.json({
          message: "User created successfully",
          user,
          generatedPassword, // Return the password so admin can share it
        });
      } catch (error: unknown) {
        console.error("Error creating user:", error);
        res.status(500).json({
          message: `Failed to create user: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * DELETE /api/admin/users/:userId
   * Action: users.delete
   * Delete a user account
   */
  app.delete(
    "/api/admin/users/:userId",
    requireAuth,
    requirePermission("users.delete", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId: userIdParam } = req.params;
        if (!userIdParam) return res.status(400).json({ message: "userId is required" });
        const userId = parseInt(userIdParam);
        const currentUserId = req.user?.id;
        if (!currentUserId) {
          return res.status(401).json({ message: "User ID required" });
        }

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        // Prevent user from deleting themselves
        if (userId === currentUserId) {
          return res.status(400).json({
            message: "You cannot delete your own account",
          });
        }

        const user = await storage.getUser(userId);
        // eslint-disable-next-line rbac/no-inline-auth-checks -- Checking database entity existence, not authentication
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        await storage.deleteUser(userId);

        res.json({
          message: "User deleted successfully",
          deletedUser: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });
      } catch (error: unknown) {
        console.error("Error deleting user:", error);
        res.status(500).json({
          message: `Failed to delete user: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  // Generate password reset for a user
  /**
   * POST /api/admin/users/:userId/reset-password
   * Action: users.update
   * Reset a user's password
   */
  app.post(
    "/api/admin/users/:userId/reset-password",
    requireAuth,
    requirePermission("users.update", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId: userIdParam } = req.params;
        if (!userIdParam) return res.status(400).json({ message: "userId is required" });
        const userId = parseInt(userIdParam);

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await storage.getUser(userId);
        // eslint-disable-next-line rbac/no-inline-auth-checks -- Checking database entity existence, not authentication
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Generate a new password
        const newPassword = generatePassword();
        const hashedPassword = await hashPassword(newPassword);

        // Update user's password
        await storage.updateUserPassword(userId, hashedPassword);

        res.json({
          message: "Password reset successfully",
          newPassword,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });
      } catch (error: unknown) {
        console.error("Error resetting password:", error);
        res.status(500).json({
          message: `Failed to reset password: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * POST /api/admin/impersonate/:userId
   * Action: admin.impersonate
   * Impersonate another user (admin only)
   */
  app.post(
    "/api/admin/impersonate/:userId",
    requireAuth,
    requirePermission("admin.impersonate", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId: userIdParam } = req.params;
        if (!userIdParam) return res.status(400).json({ message: "userId is required" });
        const userId = parseInt(userIdParam);

        if (!userId || isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        // Get the user to impersonate
        const userToImpersonate = await storage.getUser(userId);
        if (!userToImpersonate) {
          return res.status(404).json({ message: "User not found" });
        }

        // Store original user info in session for later restoration
        // req.user is guaranteed by requireAuth middleware
        const impSession = req.session as ImpersonationSession;
        const currentUser = req.user!; // Non-null assertion: requireAuth middleware guarantees this
        impSession.originalUser = {
          id: currentUser.id,
          email: currentUser.email,
          firstName: currentUser.firstName ?? "",
          lastName: currentUser.lastName ?? "",
          // eslint-disable-next-line no-restricted-syntax, rbac/no-direct-role-checks -- Reading role for session, not authorization
          role: currentUser.role ?? "employee",
          defaultDashboard: currentUser.defaultDashboard ?? null,
        };
        impSession.isImpersonating = true;

        // Debug: Impersonation started
        // console.log("🎭 IMPERSONATION STARTED:");
        // console.log("🎭 Original admin:", req.user.email, `(${req.user.id})`);
        // console.log("🎭 Impersonating:", userToImpersonate.email, `(${userToImpersonate.id})`);
        // console.log("🎭 Session ID:", req.sessionID);
        // console.log("🎭 Session isImpersonating:", impSession.isImpersonating);

        // Update session with impersonated user - use passport's login method
        if (!req.login) {
          return res.status(500).json({ message: "Login method not available" });
        }

        req.login(userToImpersonate, (err) => {
          if (err) {
            console.error("Error logging in as impersonated user:", err);
            return res.status(500).json({
              message: `Failed to start impersonation: ${err.message}`,
            });
          }

          res.json({
            message: "Impersonation started successfully",
            user: userToImpersonate,
            isImpersonating: true,
          });
        });
      } catch (error: unknown) {
        console.error("Error starting impersonation:", error);
        res.status(500).json({
          message: `Failed to start impersonation: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * POST /api/admin/stop-impersonation
   * Action: admin.impersonate
   * Stop impersonating and return to original admin user
   */
  app.post(
    "/api/admin/stop-impersonation",
    requireAuth,
    requirePermission("admin.impersonate", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        // Debug: Stop impersonation called
        // console.log("🛑 STOP IMPERSONATION CALLED:");
        // console.log("🛑 Session ID:", req.sessionID);

        // Check original user info stored in session
        const impSession = req.session as ImpersonationSession;
        const impersonationData = impSession.originalUser;
        if (!impersonationData) {
          // Debug: Not currently impersonating
          return res.status(400).json({
            message: "Not currently impersonating a user",
          });
        }

        // Debug: Found impersonation data
        // console.log("🛑 Found impersonation data:", impersonationData.email);

        // Get the full original admin user data from database
        const fullOriginalUser = await storage.getUser(impersonationData.id);
        if (!fullOriginalUser) {
          return res.status(404).json({
            message: "Original admin user not found",
          });
        }

        // Clear impersonation data from session
        delete impSession.originalUser;
        delete impSession.isImpersonating;

        // Restore original user session using passport's login method
        if (!req.login) {
          return res.status(500).json({ message: "Login method not available" });
        }

        req.login(fullOriginalUser, (err) => {
          if (err) {
            console.error("Error restoring original user session:", err);
            return res.status(500).json({
              message: `Failed to stop impersonation: ${err.message}`,
            });
          }

          res.json({
            message: "Impersonation stopped successfully",
            user: fullOriginalUser,
            isImpersonating: false,
          });
        });
      } catch (error: unknown) {
        console.error("Error stopping impersonation:", error);
        res.status(500).json({
          message: `Failed to stop impersonation: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  // =============================
  // Pricing Configuration Routes
  // =============================

  // Import pricing services
  const { pricingConfigService } = await import("./pricing-config");
  const {
    insertPricingBaseSchema,
    insertPricingIndustryMultiplierSchema,
    insertPricingRevenueMultiplierSchema,
    insertPricingTransactionSurchargeSchema,
    insertPricingServiceSettingSchema,
    insertPricingTierSchema,
  } = await import("@shared/schema");

  /**
   * GET /api/admin/pricing/config
   * Action: pricing.view
   * Get all pricing configurations
   */
  app.get(
    "/api/admin/pricing/config",
    requireAuth,
    requirePermission("pricing.view", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const config = await pricingConfigService.loadPricingConfig();
        res.json(config);
      } catch (error: unknown) {
        console.error("Error loading pricing config:", error);
        res.status(500).json({
          message: `Failed to load pricing configuration: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * GET /api/admin/pricing/base
   * Action: pricing.view
   * Get base pricing for all services
   */
  app.get(
    "/api/admin/pricing/base",
    requireAuth,
    requirePermission("pricing.view", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const basePricing = await storage.getAllPricingBase();
        res.json(basePricing);
      } catch (error: unknown) {
        console.error("Error fetching base pricing:", error);
        res
          .status(500)
          .json({ message: `Failed to fetch base pricing: ${getErrorMessage(error)}` });
      }
    }
  );

  /**
   * PUT /api/admin/pricing/base/:id
   * Action: pricing.update
   * Update base pricing
   */
  app.put(
    "/api/admin/pricing/base/:id",
    requireAuth,
    requirePermission("pricing.update", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "id is required" });
        const updateData = insertPricingBaseSchema.partial().parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ message: "User ID required" });
        }

        const updated = await storage.updatePricingBase(parseInt(id), updateData, userId);

        // Clear cache after update
        await pricingConfigService.clearCache();

        res.json(updated);
      } catch (error: unknown) {
        console.error("Error updating base pricing:", error);
        res
          .status(500)
          .json({ message: `Failed to update base pricing: ${getErrorMessage(error)}` });
      }
    }
  );

  /**
   * GET /api/admin/pricing/industry-multipliers
   * Action: pricing.view
   * Get industry multipliers
   */
  app.get(
    "/api/admin/pricing/industry-multipliers",
    requireAuth,
    requirePermission("pricing.view", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const multipliers = await storage.getAllIndustryMultipliers();
        res.json(multipliers);
      } catch (error: unknown) {
        console.error("Error fetching industry multipliers:", error);
        res.status(500).json({
          message: `Failed to fetch industry multipliers: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * PUT /api/admin/pricing/industry-multipliers/:id
   * Action: pricing.update
   * Update industry multiplier
   */
  app.put(
    "/api/admin/pricing/industry-multipliers/:id",
    requireAuth,
    requirePermission("pricing.update", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "id is required" });
        const updateData = insertPricingIndustryMultiplierSchema.partial().parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ message: "User ID required" });
        }

        const updated = await storage.updateIndustryMultiplier(parseInt(id), updateData, userId);

        // Clear cache after update
        await pricingConfigService.clearCache();

        res.json(updated);
      } catch (error: unknown) {
        console.error("Error updating industry multiplier:", error);
        res.status(500).json({
          message: `Failed to update industry multiplier: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * GET /api/admin/pricing/revenue-multipliers
   * Action: pricing.view
   * Get revenue multipliers
   */
  app.get(
    "/api/admin/pricing/revenue-multipliers",
    requireAuth,
    requirePermission("pricing.view", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const multipliers = await storage.getAllRevenueMultipliers();
        res.json(multipliers);
      } catch (error: unknown) {
        console.error("Error fetching revenue multipliers:", error);
        res.status(500).json({
          message: `Failed to fetch revenue multipliers: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * PUT /api/admin/pricing/revenue-multipliers/:id
   * Action: pricing.update
   * Update revenue multiplier
   */
  app.put(
    "/api/admin/pricing/revenue-multipliers/:id",
    requireAuth,
    requirePermission("pricing.update", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "id is required" });
        const updateData = insertPricingRevenueMultiplierSchema.partial().parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ message: "User ID required" });
        }

        const updated = await storage.updateRevenueMultiplier(parseInt(id), updateData, userId);

        // Clear cache after update
        await pricingConfigService.clearCache();

        res.json(updated);
      } catch (error: unknown) {
        console.error("Error updating revenue multiplier:", error);
        res.status(500).json({
          message: `Failed to update revenue multiplier: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * GET /api/admin/pricing/transaction-surcharges
   * Action: pricing.view
   * Get transaction surcharges
   */
  app.get(
    "/api/admin/pricing/transaction-surcharges",
    requireAuth,
    requirePermission("pricing.view", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const surcharges = await storage.getAllTransactionSurcharges();
        res.json(surcharges);
      } catch (error: unknown) {
        console.error("Error fetching transaction surcharges:", error);
        res.status(500).json({
          message: `Failed to fetch transaction surcharges: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * PUT /api/admin/pricing/transaction-surcharges/:id
   * Action: pricing.update
   * Update transaction surcharge
   */
  app.put(
    "/api/admin/pricing/transaction-surcharges/:id",
    requireAuth,
    requirePermission("pricing.update", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "id is required" });
        const updateData = insertPricingTransactionSurchargeSchema.partial().parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ message: "User ID required" });
        }

        const updated = await storage.updateTransactionSurcharge(parseInt(id), updateData, userId);

        // Clear cache after update
        await pricingConfigService.clearCache();

        res.json(updated);
      } catch (error: unknown) {
        console.error("Error updating transaction surcharge:", error);
        res.status(500).json({
          message: `Failed to update transaction surcharge: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * GET /api/admin/pricing/service-settings
   * Action: pricing.view
   * Get service settings
   */
  app.get(
    "/api/admin/pricing/service-settings",
    requireAuth,
    requirePermission("pricing.view", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { service } = req.query;
        let settings;

        if (service && typeof service === "string") {
          settings = await storage.getServiceSettingsByService(service);
        } else {
          settings = await storage.getAllServiceSettings();
        }

        res.json(settings);
      } catch (error: unknown) {
        console.error("Error fetching service settings:", error);
        res.status(500).json({
          message: `Failed to fetch service settings: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * PUT /api/admin/pricing/service-settings/:id
   * Action: pricing.update
   * Update service setting
   */
  app.put(
    "/api/admin/pricing/service-settings/:id",
    requireAuth,
    requirePermission("pricing.update", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "id is required" });
        const updateData = insertPricingServiceSettingSchema.partial().parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ message: "User ID required" });
        }

        const updated = await storage.updateServiceSetting(parseInt(id), updateData, userId);

        // Clear cache after update
        await pricingConfigService.clearCache();

        res.json(updated);
      } catch (error: unknown) {
        console.error("Error updating service setting:", error);
        res.status(500).json({
          message: `Failed to update service setting: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * GET /api/admin/pricing/tiers
   * Action: pricing.view
   * Get pricing tiers
   */
  app.get(
    "/api/admin/pricing/tiers",
    requireAuth,
    requirePermission("pricing.view", "system"),
    async (req, res) => {
      try {
        const { service } = req.query;
        let tiers;

        if (service && typeof service === "string") {
          tiers = await storage.getPricingTiersByService(service);
        } else {
          tiers = await storage.getAllPricingTiers();
        }

        res.json(tiers);
      } catch (error: unknown) {
        console.error("Error fetching pricing tiers:", error);
        res
          .status(500)
          .json({ message: `Failed to fetch pricing tiers: ${getErrorMessage(error)}` });
      }
    }
  );

  /**
   * PUT /api/admin/pricing/tiers/:id
   * Action: pricing.update
   * Update pricing tier
   */
  app.put(
    "/api/admin/pricing/tiers/:id",
    requireAuth,
    requirePermission("pricing.update", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "id is required" });
        const updateData = insertPricingTierSchema.partial().parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ message: "User ID required" });
        }

        const updated = await storage.updatePricingTier(parseInt(id), updateData, userId);

        // Clear cache after update
        await pricingConfigService.clearCache();

        res.json(updated);
      } catch (error: unknown) {
        console.error("Error updating pricing tier:", error);
        res
          .status(500)
          .json({ message: `Failed to update pricing tier: ${getErrorMessage(error)}` });
      }
    }
  );

  /**
   * GET /api/admin/pricing/history
   * Action: pricing.view
   * Get pricing history
   */
  app.get(
    "/api/admin/pricing/history",
    requireAuth,
    requirePermission("pricing.view", "system"),
    async (req, res) => {
      try {
        const { table, recordId } = req.query;

        const history = await storage.getPricingHistory(
          table as string | undefined,
          recordId ? parseInt(recordId as string) : undefined
        );

        res.json(history);
      } catch (error: unknown) {
        console.error("Error fetching pricing history:", error);
        res.status(500).json({
          message: `Failed to fetch pricing history: ${getErrorMessage(error)}`,
        });
      }
    }
  );

  /**
   * POST /api/admin/pricing/clear-cache
   * Action: admin.cache
   * Clear pricing cache (useful for testing or forced refresh)
   */
  app.post(
    "/api/admin/pricing/clear-cache",
    requireAuth,
    requirePermission("admin.cache", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        await pricingConfigService.clearCache();
        res.json({ message: "Pricing cache cleared successfully" });
      } catch (error: unknown) {
        console.error("Error clearing pricing cache:", error);
        res
          .status(500)
          .json({ message: `Failed to clear pricing cache: ${getErrorMessage(error)}` });
      }
    }
  );

  // ===== CALCULATOR MANAGER: SERVICE CONTENT =====
  {
    const { insertCalculatorServiceContentSchema } = await import("@shared/schema");
    const {
      DEFAULT_AGREEMENT_LINKS,
      DEFAULT_MSA_LINK,
      SERVICE_KEYS_DB,
      getDefaultSowTitle,
      getDefaultSowTemplate,
    } = await import("./calculator-defaults");

    const safeParse = (s?: string | null): Record<string, unknown> => {
      if (!s) return {};
      try {
        const parsed: unknown = JSON.parse(s);
        return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : {};
      } catch {
        return {};
      }
    };

    type ServiceKey =
      | "bookkeeping"
      | "taas"
      | "payroll"
      | "ap"
      | "ar"
      | "agent_of_service"
      | "cfo_advisory";

    const withDefaults = (existing: Record<string, unknown> | undefined, service: string) => {
      const included = JSON.stringify(
        safeParse(existing?.includedFieldsJson as string | null | undefined)
      );
      if (existing) {
        return {
          ...existing,
          sowTitle: existing.sowTitle ?? getDefaultSowTitle(service as ServiceKey),
          sowTemplate: existing.sowTemplate ?? getDefaultSowTemplate(service as ServiceKey),
          agreementLink:
            existing.agreementLink ?? DEFAULT_AGREEMENT_LINKS[service as ServiceKey] ?? null,
          includedFieldsJson: included,
        };
      }
      return {
        id: 0,
        service,
        sowTitle: getDefaultSowTitle(service as ServiceKey),
        sowTemplate: getDefaultSowTemplate(service as ServiceKey),
        agreementLink: DEFAULT_AGREEMENT_LINKS[service as ServiceKey] ?? null,
        includedFieldsJson: included,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    };

    // =============================
    // Calculator Management Routes
    // =============================

    /**
     * GET /api/admin/calculator/content
     * Action: calculator.admin
     * List all service content entries
     */
    app.get(
      "/api/admin/calculator/content",
      requireAuth,
      requirePermission("calculator.admin", "system"),
      async (req, res) => {
        try {
          const { db } = await import("./db");
          const { sql } = await import("drizzle-orm");
          const allRows = await db.execute(sql`SELECT * FROM calculator_service_content`);
          const rowsResult = allRows as DbQueryResult;
          const items = (rowsResult.rows || []) as Array<Record<string, unknown>>;
          const map = new Map<string, Record<string, unknown>>(
            items.map((i) => [String(i.service), i])
          );
          const merged = SERVICE_KEYS_DB.map((svc) => withDefaults(map.get(svc), svc));
          const payload = { items: merged, msaLink: DEFAULT_MSA_LINK };
          const parsed = CalculatorContentResponseSchema.safeParse(payload);
          if (!parsed.success) {
            console.error("[AdminCalculatorContent] invalid payload", parsed.error.issues);
            return res.status(500).json({
              status: "error",
              message: "Invalid calculator content payload",
            });
          }
          res.json(parsed.data);
        } catch (error: unknown) {
          res.status(500).json({
            message: `Failed to fetch calculator service content: ${getErrorMessage(error)}`,
          });
        }
      }
    );

    // Get content for a specific service
    /**
     * GET /api/admin/calculator/content/:service
     * Action: calculator.admin
     * Get service content by service name
     */
    app.get(
      "/api/admin/calculator/content/:service",
      requireAuth,
      requirePermission("calculator.admin", "system"),
      async (req: AuthenticatedRequest, res) => {
        try {
          const { service } = req.params;
          if (!service) return res.status(400).json({ message: "service is required" });
          const existing = await storage.getCalculatorServiceContent(service);
          const payload = {
            item: withDefaults(existing, service),
            msaLink: DEFAULT_MSA_LINK,
          };
          const parsed = CalculatorContentItemResponseSchema.safeParse(payload);
          if (!parsed.success) {
            console.error("[AdminCalculatorContent:item] invalid payload", parsed.error.issues);
            return res.status(500).json({
              status: "error",
              message: "Invalid calculator content payload",
            });
          }
          res.json(parsed.data);
        } catch (error: unknown) {
          res.status(500).json({
            message: `Failed to fetch calculator service content: ${getErrorMessage(error)}`,
          });
        }
      }
    );

    // Upsert content for a specific service
    /**
     * PUT /api/admin/calculator/content/:service
     * Action: calculator.admin
     * Update service content
     */
    app.put(
      "/api/admin/calculator/content/:service",
      requireAuth,
      requirePermission("calculator.admin", "system"),
      async (req: AuthenticatedRequest, res) => {
        try {
          const { service } = req.params;
          if (!service) return res.status(400).json({ message: "service is required" });
          const payload = insertCalculatorServiceContentSchema.partial().parse(req.body);
          const userId = req.user?.id;
          if (!userId) {
            return res.status(401).json({ message: "User ID required" });
          }
          const updated = await storage.upsertCalculatorServiceContent({
            ...payload,
            service,
            updatedBy: userId,
          });
          const resp = { item: updated };
          const parsed = CalculatorContentItemResponseSchema.safeParse({
            item: {
              ...resp.item,
              createdAt: resp.item.createdAt?.toISOString?.() ?? undefined,
              updatedAt: resp.item.updatedAt?.toISOString?.() ?? undefined,
            },
          });
          if (!parsed.success) {
            console.error("[AdminCalculatorContent:put] invalid payload", parsed.error.issues);
            return res.status(500).json({
              status: "error",
              message: "Invalid calculator content payload",
            });
          }
          res.json(parsed.data);
        } catch (error: unknown) {
          res.status(500).json({
            message: `Failed to update calculator service content: ${getErrorMessage(error)}`,
          });
        }
      }
    );
  }
}

// Helper function for password hashing (reused from auth.ts)
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Password generation function
function generatePassword(): string {
  const adjectives = [
    "Quick",
    "Bright",
    "Swift",
    "Smart",
    "Bold",
    "Sharp",
    "Clear",
    "Fresh",
    "Strong",
    "Wise",
  ];
  const nouns = [
    "Tiger",
    "Eagle",
    "Wolf",
    "Falcon",
    "Lion",
    "Shark",
    "Bear",
    "Fox",
    "Hawk",
    "Lynx",
  ];
  const numbers = Math.floor(Math.random() * 900) + 100; // 3-digit number

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adjective}${noun}${numbers}!`;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
import type { Express } from "express";
import { GoogleAdminService } from "./google-admin";
import { storage } from "./storage";
import { requireAuth } from "./middleware/supabase-auth";
// DISABLED: BullMQ jobs removed (migrated to Graphile Worker)
// import { scheduleWorkspaceSync } from "./jobs";
import { hubSpotService } from "./hubspot";
// DISABLED: Redis removed
// import { getRedisAsync } from "./redis";
import {
  CalculatorContentResponseSchema,
  CalculatorContentItemResponseSchema,
} from "@shared/contracts";

export async function registerAdminRoutes(app: Express): Promise<void> {
  let googleAdminService: GoogleAdminService | null = null;

  // Initialize Google Admin service if configured
  try {
    googleAdminService = new GoogleAdminService();
    // Wait for initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const isConfigured = await googleAdminService.isConfigured();
    if (!isConfigured) {
      // Don't log as warning - this is optional
      googleAdminService = null;
    } else {
      console.log("Google Admin API configured successfully");
    }
  } catch (error) {
    // Don't log as warning - this is optional functionality
    googleAdminService = null;
  }

  // Middleware to check admin access after authentication
  const requireAdmin = (req: any, res: any, next: any) => {
    console.log("Admin access check:", {
      hasUser: !!req.user,
      userEmail: req.user?.email,
      userRole: req.user?.role,
    });

    // Optional allowlist for break-glass access (comma-separated emails)
    const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (req.user?.email && allowlist.includes(String(req.user.email).toLowerCase())) {
      return next();
    }

    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  };

  // ----- Link HubSpot owner by user email -----
  app.post(
    "/api/admin/users/:userId/link-hubspot-owner",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        if (Number.isNaN(userId)) return res.status(400).json({ message: "invalid user id" });
        const { db } = await import("./db");
        const { sql } = await import("drizzle-orm");

        const [userRow] = (await db.execute(
          sql`SELECT id, email FROM users WHERE id = ${userId} LIMIT 1`
        )) as any;
        const userRec = userRow?.rows?.[0];
        if (!userRec) return res.status(404).json({ message: "user not found" });

        // Ensure HubSpot service is available
        const hs = (global as any).hubSpotService || null;
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
        res.json((updated as any).rows?.[0] ?? null);
      } catch (e: any) {
        res.status(500).json({ message: "Failed to link HubSpot owner", error: e.message });
      }
    }
  );

  // -----------------------------
  // HubSpot Pipeline Configuration
  // -----------------------------
  app.get("/api/admin/hubspot/pipelines", requireAuth, requireAdmin, async (_req, res) => {
    try {
      if (!hubSpotService)
        return res.status(400).json({ message: "HubSpot integration not configured" });
      const raw = await hubSpotService.getPipelines();
      const pipelines = (raw?.results || []).map((p: any) => ({
        id: String(p.id),
        label: p.label || String(p.id),
        stages: (p.stages || []).map((s: any) => ({
          id: String(s.id),
          label: s.label || String(s.id),
        })),
      }));
      return res.json({ pipelines });
    } catch (error: any) {
      console.error("Failed to fetch HubSpot pipelines:", error);
      return res.status(500).json({ message: `Failed to fetch pipelines: ${error.message}` });
    }
  });

  // =============================
  // CRM Lead Config (sources/statuses/stages)
  // =============================
  app.get("/api/admin/crm/lead-config", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const { getLeadConfig } = await import("./services/crm/config");
      const cfg = await getLeadConfig();
      res.json(cfg);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to load lead config", error: e.message });
    }
  });

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
  app.put(
    "/api/admin/crm/lead-config/sources/:key",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const { key } = req.params;
        const { label, isActive, sortOrder } = req.body || {};
        await upsertConfigRow("crm_lead_sources", key, label, isActive, sortOrder ?? null);
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ message: "Failed to save source", error: e.message });
      }
    }
  );

  app.put(
    "/api/admin/crm/lead-config/statuses/:key",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const { key } = req.params;
        const { label, isActive, sortOrder } = req.body || {};
        await upsertConfigRow("crm_lead_statuses", key, label, isActive, sortOrder ?? null);
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ message: "Failed to save status", error: e.message });
      }
    }
  );

  app.put("/api/admin/crm/lead-config/stages/:key", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const { label, isActive, sortOrder } = req.body || {};
      await upsertConfigRow("crm_lead_stages", key, label, isActive, sortOrder ?? null);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to save stage", error: e.message });
    }
  });

  // Deactivate endpoints
  app.delete(
    "/api/admin/crm/lead-config/sources/:key",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        await deactivateConfigRow("crm_lead_sources", req.params.key);
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ message: "Failed to deactivate source", error: e.message });
      }
    }
  );

  app.delete(
    "/api/admin/crm/lead-config/statuses/:key",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        await deactivateConfigRow("crm_lead_statuses", req.params.key);
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ message: "Failed to deactivate status", error: e.message });
      }
    }
  );

  app.delete(
    "/api/admin/crm/lead-config/stages/:key",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        await deactivateConfigRow("crm_lead_stages", req.params.key);
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ message: "Failed to deactivate stage", error: e.message });
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
    diff: any
  ) {
    try {
      const { db } = await import("./db");
      await db.execute((await import("drizzle-orm")).sql`
        INSERT INTO auth_audit_log (actor_user_id, action, entity_type, entity_id, diff_json)
        VALUES (${actorUserId ?? null}, ${action}, ${entityType}, ${entityId !== null ? String(entityId) : null}, ${JSON.stringify(diff)})
      `);
    } catch (e) {
      console.warn("[Audit] write failed:", (e as any)?.message);
    }
  }

  // ----- Departments CRUD -----
  app.get("/api/admin/rbac/departments", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { departments } = await import("@shared/schema");
      const rows = await db.select().from(departments).orderBy(departments.name);
      res.json({ departments: rows });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to list departments", error: e.message });
    }
  });

  app.post("/api/admin/rbac/departments", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { name, description, isActive = true } = req.body || {};
      if (!name || String(name).trim().length === 0)
        return res.status(400).json({ message: "name is required" });
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const [row] = await db.execute(
        sql`INSERT INTO departments (name, description, is_active) VALUES (${name}, ${description ?? null}, ${!!isActive}) RETURNING *`
      );
      await writeAudit(
        req.user?.id,
        "department.create",
        "department",
        (row as any)?.rows?.[0]?.id ?? null,
        { name, description, isActive }
      );
      res.json((row as any)?.rows?.[0] ?? null);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create department", error: e.message });
    }
  });

  app.put("/api/admin/rbac/departments/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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
      res.json((row as any)?.rows?.[0] ?? null);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update department", error: e.message });
    }
  });

  // Soft delete: set is_active=false
  app.delete("/api/admin/rbac/departments/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "invalid id" });
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      await db.execute(
        sql`UPDATE departments SET is_active = false, updated_at = now() WHERE id = ${id}`
      );
      await writeAudit(req.user?.id, "department.deactivate", "department", id, {});
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to deactivate department", error: e.message });
    }
  });

  // ----- User-Department assignment -----
  app.post(
    "/api/admin/rbac/users/:userId/departments/:deptId",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        const deptId = parseInt(req.params.deptId);
        if (Number.isNaN(userId) || Number.isNaN(deptId))
          return res.status(400).json({ message: "invalid ids" });
        const { db } = await import("./db");
        const { sql } = await import("drizzle-orm");

        // If department is Sales, require HubSpot owner mapping; attempt auto-link by email
        const deptRow = await db.execute(sql`SELECT name FROM departments WHERE id = ${deptId}`);
        const deptName: string | undefined = (deptRow as any)?.rows?.[0]?.name;

        if (deptName && deptName.toLowerCase() === "sales") {
          // Load user email
          const userRow = await db.execute(
            sql`SELECT id, email, hubspot_user_id FROM users WHERE id = ${userId}`
          );
          const u = (userRow as any)?.rows?.[0];
          if (!u) return res.status(404).json({ message: "user not found" });
          let hubspotId = u.hubspot_user_id;

          if (!hubspotId && (global as any).hubSpotService) {
            try {
              const hs = (global as any).hubSpotService as any;
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
              console.warn("[SalesDept] auto-link hubspot failed:", (e as any)?.message);
            }
          }

          if (!hubspotId) {
            return res.status(400).json({
              message:
                "Sales department users must have a HubSpot owner mapping. Use Link HubSpot Owner or ensure email exists as an owner in HubSpot.",
            });
          }
        }

        await db.execute(
          sql`INSERT INTO user_departments (user_id, department_id) VALUES (${userId}, ${deptId}) ON CONFLICT DO NOTHING`
        );
        await writeAudit(req.user?.id, "user_department.add", "user", userId, { deptId });
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ message: "Failed to assign department", error: e.message });
      }
    }
  );

  app.delete(
    "/api/admin/rbac/users/:userId/departments/:deptId",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        const deptId = parseInt(req.params.deptId);
        if (Number.isNaN(userId) || Number.isNaN(deptId))
          return res.status(400).json({ message: "invalid ids" });
        const { db } = await import("./db");
        const { sql } = await import("drizzle-orm");
        await db.execute(
          sql`DELETE FROM user_departments WHERE user_id = ${userId} AND department_id = ${deptId}`
        );
        await writeAudit(req.user?.id, "user_department.remove", "user", userId, { deptId });
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ message: "Failed to remove department", error: e.message });
      }
    }
  );

  // ----- Manager edges -----
  app.get("/api/admin/rbac/manager-edges", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const rows = await db.execute(sql`
        SELECT me.id, me.manager_user_id, me.member_user_id,
               mu.email as manager_email, uu.email as member_email
        FROM manager_edges me
        LEFT JOIN users mu ON me.manager_user_id = mu.id
        LEFT JOIN users uu ON me.member_user_id = uu.id
        ORDER BY manager_email, member_email
      `);
      res.json({ edges: (rows as any).rows || [] });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to list manager edges", error: e.message });
    }
  });

  app.post("/api/admin/rbac/manager-edges", requireAuth, requireAdmin, async (req, res) => {
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
    } catch (e: any) {
      res.status(500).json({ message: "Failed to add manager edge", error: e.message });
    }
  });

  app.delete("/api/admin/rbac/manager-edges", requireAuth, requireAdmin, async (req, res) => {
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
    } catch (e: any) {
      res.status(500).json({ message: "Failed to remove manager edge", error: e.message });
    }
  });

  // ----- Audit list -----
  app.get("/api/admin/rbac/audit", requireAuth, requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || "100")), 500) || 100;
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const rows = await db.execute(
        sql`SELECT a.*, u.email as actor_email FROM auth_audit_log a LEFT JOIN users u ON a.actor_user_id = u.id ORDER BY a.created_at DESC LIMIT ${limit}`
      );
      res.json({ items: (rows as any).rows || [] });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to list audit", error: e.message });
    }
  });

  // DISABLED: Redis-based HubSpot pipeline config (Redis removed)
  // Pipeline/stage IDs now auto-detected from HubSpot API
  // app.get("/api/admin/hubspot/pipeline-config", requireAuth, requireAdmin, async (_req, res) => {
  //   return res.status(501).json({ message: "Pipeline config endpoints disabled (Redis removed)" });
  // });

  // app.put("/api/admin/hubspot/pipeline-config", requireAuth, requireAdmin, async (req, res) => {
  //   return res.status(501).json({ message: "Pipeline config endpoints disabled (Redis removed)" });
  // });

  // Get all Google Workspace users
  app.get("/api/admin/workspace-users", requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!googleAdminService) {
        return res.status(503).json({
          message: "Google Admin API not configured",
          configured: false,
          setupInstructions: {
            issue: "ADC file missing or invalid refresh token",
            steps: [
              "1. On your local machine, run:",
              "   gcloud auth application-default login --scopes=https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.group.readonly",
              "2. This will open a browser to authenticate with your @seedfinancial.io admin account",
              "3. Copy the generated file from your local machine:",
              "   Mac/Linux: ~/.config/gcloud/application_default_credentials.json",
              "   Windows: %APPDATA%\\gcloud\\application_default_credentials.json",
              "4. In Replit, create the file at: ~/.config/gcloud/application_default_credentials.json",
              "5. Restart the application",
            ],
          },
        });
      }

      const workspaceUsers = await googleAdminService.getAllDomainUsers();
      res.json({
        users: workspaceUsers,
        configured: true,
      });
    } catch (error: any) {
      console.error("Error fetching workspace users:", error);

      // Handle various Google Admin API errors
      if (error.code === 403) {
        if (
          error.message?.includes("Insufficient Permission") ||
          error.message?.includes("Request had insufficient authentication scopes")
        ) {
          return res.status(500).json({
            message: "Insufficient Permissions",
            error: "The credential lacks required Admin SDK scopes",
            setupInstructions: {
              currentIssue: "The credential does not have Admin Directory API access",
              solution: "Re-create the ADC file with proper Admin SDK scopes",
              step1: "Run: gcloud auth application-default revoke",
              step2:
                "Run: gcloud auth application-default login --scopes=https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.group.readonly",
              step3:
                "Copy the new ADC file to ~/.config/gcloud/application_default_credentials.json in Replit",
              step4: "Ensure the user account has Google Workspace Admin role",
              note: "For development, use authorized_user ADC with Admin Directory scopes",
            },
          });
        }

        if (error.message?.includes("Not Authorized to access this resource/api")) {
          return res.status(500).json({
            message: "API Access Denied",
            error: "Admin SDK API not enabled or user lacks Workspace admin privileges",
            setupInstructions: {
              currentIssue:
                "Either the Admin SDK API is not enabled or the user lacks admin permissions",
              solution: "Enable Admin SDK API and ensure user is a Workspace admin",
              step1: "Go to Google Cloud Console → APIs & Services → Library",
              step2: 'Search for "Admin SDK API" and enable it',
              step3: "Ensure the authenticated user has Google Workspace Super Admin role",
              step4: "Re-run: gcloud auth application-default login with admin user",
              note: "Only Workspace Super Admins can access the Directory API",
            },
          });
        }
      }

      if (error.message?.includes("iam.serviceAccounts.getAccessToken")) {
        return res.status(500).json({
          message: "Google Workspace Admin API Setup Issue",
          error: "Impersonated service account requires complex setup",
          setupInstructions: {
            currentIssue:
              "Impersonated service accounts need additional IAM permissions that can be complex to configure",
            recommendedSolution: "Create a direct service account instead (much simpler setup)",
            step1: "Go to Google Cloud Console → IAM & Admin → Service Accounts",
            step2: 'Create a new service account (e.g., "seedos-admin-direct")',
            step3: "Download the JSON key file",
            step4:
              "Replace the current GOOGLE_SERVICE_ACCOUNT_JSON secret with the new direct service account JSON",
            step5:
              "In Google Workspace Admin Console → Security → API Controls → Domain-wide Delegation",
            step6: "Add the new service account client ID with these scopes:",
            scopes: [
              "https://www.googleapis.com/auth/admin.directory.user.readonly",
              "https://www.googleapis.com/auth/admin.directory.group.readonly",
              "https://www.googleapis.com/auth/admin.directory.group.member.readonly",
            ],
            note: "Direct service accounts are much more reliable than impersonated ones for this use case",
          },
        });
      }

      res.status(500).json({
        message: `Failed to fetch workspace users: ${error.message}`,
      });
    }
  });

  // Get all users from our database
  app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        message: `Failed to fetch users: ${error.message}`,
      });
    }
  });

  // Update user role
  app.patch("/api/admin/users/:userId/role", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
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
    } catch (error: any) {
      console.error("Error updating user role:", error);
      res.status(500).json({
        message: `Failed to update user role: ${error.message}`,
      });
    }
  });

  // Sync a Google Workspace user to our database
  app.post("/api/admin/sync-workspace-user", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { email, role = "employee" } = req.body;
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ message: "User ID required" });
      }

      if (!email || !email.endsWith("@seedfinancial.io")) {
        return res.status(400).json({
          message: "Invalid email or not a Seed Financial email",
        });
      }

      // Check if user already exists
      let user = await storage.getUserByEmail(email);

      if (user) {
        // Update existing user's role
        user = await storage.updateUserRole(user.id, role, adminUserId);
        return res.json({
          message: "Existing user role updated",
          user,
          action: "updated",
        });
      }

      // Create new user with plain password; storage will hash
      user = await storage.createUser({
        email,
        password: "SeedAdmin1!", // Default password; hashed in storage.createUser
        firstName: "",
        lastName: "",
        hubspotUserId: null,
        role,
      } as any);

      // Ensure role assignment metadata is set consistently
      user = await storage.updateUserRole(user.id, role, adminUserId);

      res.json({
        message: "User created successfully",
        user,
        action: "created",
      });
    } catch (error: any) {
      console.error("Error syncing workspace user:", error);
      res.status(500).json({
        message: `Failed to sync workspace user: ${error.message}`,
      });
    }
  });

  // Create a new user
  app.post("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
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

      if (!["admin", "sales", "service"].includes(defaultDashboard)) {
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
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({
        message: `Failed to create user: ${error.message}`,
      });
    }
  });

  // Delete a user
  app.delete("/api/admin/users/:userId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
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
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        message: `Failed to delete user: ${error.message}`,
      });
    }
  });

  // Generate password reset for a user
  app.post(
    "/api/admin/users/:userId/reset-password",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await storage.getUser(userId);
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
      } catch (error: any) {
        console.error("Error resetting password:", error);
        res.status(500).json({
          message: `Failed to reset password: ${error.message}`,
        });
      }
    }
  );

  // DISABLED: Workspace sync (BullMQ removed, migrate to Graphile Worker if needed)
  app.post("/api/admin/sync-workspace", requireAuth, requireAdmin, async (req, res) => {
    return res.status(501).json({
      message: "Workspace sync disabled (BullMQ removed). Migrate to Graphile Worker if needed.",
    });
  });

  // Test Google Admin API connection
  app.get("/api/admin/test-google-admin", requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!googleAdminService) {
        return res.json({
          connected: false,
          configured: false,
          message: "Google Admin API not configured",
        });
      }

      const testResult = await googleAdminService.testConnection();
      res.json({
        connected: testResult.connected,
        configured: true,
        message: testResult.connected
          ? "Connection successful"
          : testResult.error || "Connection failed",
      });
    } catch (error: any) {
      res.json({
        connected: false,
        configured: true,
        message: `Connection test failed: ${error.message}`,
      });
    }
  });

  // Impersonate user
  app.post("/api/admin/impersonate/:userId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Get the user to impersonate
      const userToImpersonate = await storage.getUser(userId);
      if (!userToImpersonate) {
        return res.status(404).json({ message: "User not found" });
      }

      // Ensure current user is present
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      // Store original user info in session for later restoration
      (req.session as any).originalUser = {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        defaultDashboard: req.user.defaultDashboard,
      };
      (req.session as any).isImpersonating = true;

      console.log("🎭 IMPERSONATION STARTED:");
      console.log("🎭 Original admin:", req.user.email, `(${req.user.id})`);
      console.log("🎭 Impersonating:", userToImpersonate.email, `(${userToImpersonate.id})`);
      console.log("🎭 Session ID:", req.sessionID);
      console.log("🎭 Session isImpersonating:", (req.session as any).isImpersonating);

      // Update session with impersonated user - use passport's login method
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
    } catch (error: any) {
      console.error("Error starting impersonation:", error);
      res.status(500).json({
        message: `Failed to start impersonation: ${error.message}`,
      });
    }
  });

  // Stop impersonation and return to original admin user
  app.post("/api/admin/stop-impersonation", requireAuth, async (req, res) => {
    try {
      console.log("🛑 STOP IMPERSONATION CALLED:");
      console.log("🛑 Session ID:", req.sessionID);

      // Check original user info stored in session
      const impersonationData = (req.session as any).originalUser;
      if (!impersonationData) {
        console.log("🛑 ERROR: Not currently impersonating");
        return res.status(400).json({
          message: "Not currently impersonating a user",
        });
      }

      console.log(
        "🛑 Found impersonation data:",
        impersonationData.email || impersonationData.adminEmail
      );

      // Get the full original admin user data from database
      const fullOriginalUser = await storage.getUser(
        impersonationData.id || impersonationData.adminUserId
      );
      if (!fullOriginalUser) {
        return res.status(404).json({
          message: "Original admin user not found",
        });
      }

      // Clear impersonation data from session
      delete (req.session as any).originalUser;
      delete (req.session as any).isImpersonating;

      // Restore original user session using passport's login method
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
    } catch (error: any) {
      console.error("Error stopping impersonation:", error);
      res.status(500).json({
        message: `Failed to stop impersonation: ${error.message}`,
      });
    }
  });

  // ===== PRICING CONFIGURATION ENDPOINTS =====

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

  // Get all pricing configurations
  app.get("/api/admin/pricing/config", requireAuth, requireAdmin, async (req, res) => {
    try {
      const config = await pricingConfigService.loadPricingConfig();
      res.json(config);
    } catch (error: any) {
      console.error("Error loading pricing config:", error);
      res.status(500).json({
        message: `Failed to load pricing configuration: ${error.message}`,
      });
    }
  });

  // Get base pricing for all services
  app.get("/api/admin/pricing/base", requireAuth, requireAdmin, async (req, res) => {
    try {
      const basePricing = await storage.getAllPricingBase();
      res.json(basePricing);
    } catch (error: any) {
      console.error("Error fetching base pricing:", error);
      res.status(500).json({ message: `Failed to fetch base pricing: ${error.message}` });
    }
  });

  // Update base pricing
  app.put("/api/admin/pricing/base/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertPricingBaseSchema.partial().parse(req.body);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      const updated = await storage.updatePricingBase(parseInt(id), updateData, userId);

      // Clear cache after update
      await pricingConfigService.clearCache();

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating base pricing:", error);
      res.status(500).json({ message: `Failed to update base pricing: ${error.message}` });
    }
  });

  // Get industry multipliers
  app.get(
    "/api/admin/pricing/industry-multipliers",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const multipliers = await storage.getAllIndustryMultipliers();
        res.json(multipliers);
      } catch (error: any) {
        console.error("Error fetching industry multipliers:", error);
        res.status(500).json({
          message: `Failed to fetch industry multipliers: ${error.message}`,
        });
      }
    }
  );

  // Update industry multiplier
  app.put(
    "/api/admin/pricing/industry-multipliers/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = insertPricingIndustryMultiplierSchema.partial().parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ message: "User ID required" });
        }

        const updated = await storage.updateIndustryMultiplier(parseInt(id), updateData, userId);

        // Clear cache after update
        await pricingConfigService.clearCache();

        res.json(updated);
      } catch (error: any) {
        console.error("Error updating industry multiplier:", error);
        res.status(500).json({
          message: `Failed to update industry multiplier: ${error.message}`,
        });
      }
    }
  );

  // Get revenue multipliers
  app.get("/api/admin/pricing/revenue-multipliers", requireAuth, requireAdmin, async (req, res) => {
    try {
      const multipliers = await storage.getAllRevenueMultipliers();
      res.json(multipliers);
    } catch (error: any) {
      console.error("Error fetching revenue multipliers:", error);
      res.status(500).json({
        message: `Failed to fetch revenue multipliers: ${error.message}`,
      });
    }
  });

  // Update revenue multiplier
  app.put(
    "/api/admin/pricing/revenue-multipliers/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = insertPricingRevenueMultiplierSchema.partial().parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ message: "User ID required" });
        }

        const updated = await storage.updateRevenueMultiplier(parseInt(id), updateData, userId);

        // Clear cache after update
        await pricingConfigService.clearCache();

        res.json(updated);
      } catch (error: any) {
        console.error("Error updating revenue multiplier:", error);
        res.status(500).json({
          message: `Failed to update revenue multiplier: ${error.message}`,
        });
      }
    }
  );

  // Get transaction surcharges
  app.get(
    "/api/admin/pricing/transaction-surcharges",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const surcharges = await storage.getAllTransactionSurcharges();
        res.json(surcharges);
      } catch (error: any) {
        console.error("Error fetching transaction surcharges:", error);
        res.status(500).json({
          message: `Failed to fetch transaction surcharges: ${error.message}`,
        });
      }
    }
  );

  // Update transaction surcharge
  app.put(
    "/api/admin/pricing/transaction-surcharges/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = insertPricingTransactionSurchargeSchema.partial().parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ message: "User ID required" });
        }

        const updated = await storage.updateTransactionSurcharge(parseInt(id), updateData, userId);

        // Clear cache after update
        await pricingConfigService.clearCache();

        res.json(updated);
      } catch (error: any) {
        console.error("Error updating transaction surcharge:", error);
        res.status(500).json({
          message: `Failed to update transaction surcharge: ${error.message}`,
        });
      }
    }
  );

  // Get service settings
  app.get("/api/admin/pricing/service-settings", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { service } = req.query;
      let settings;

      if (service && typeof service === "string") {
        settings = await storage.getServiceSettingsByService(service);
      } else {
        settings = await storage.getAllServiceSettings();
      }

      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching service settings:", error);
      res.status(500).json({
        message: `Failed to fetch service settings: ${error.message}`,
      });
    }
  });

  // Update service setting
  app.put(
    "/api/admin/pricing/service-settings/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = insertPricingServiceSettingSchema.partial().parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ message: "User ID required" });
        }

        const updated = await storage.updateServiceSetting(parseInt(id), updateData, userId);

        // Clear cache after update
        await pricingConfigService.clearCache();

        res.json(updated);
      } catch (error: any) {
        console.error("Error updating service setting:", error);
        res.status(500).json({
          message: `Failed to update service setting: ${error.message}`,
        });
      }
    }
  );

  // Get pricing tiers
  app.get("/api/admin/pricing/tiers", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { service } = req.query;
      let tiers;

      if (service && typeof service === "string") {
        tiers = await storage.getPricingTiersByService(service);
      } else {
        tiers = await storage.getAllPricingTiers();
      }

      res.json(tiers);
    } catch (error: any) {
      console.error("Error fetching pricing tiers:", error);
      res.status(500).json({ message: `Failed to fetch pricing tiers: ${error.message}` });
    }
  });

  // Update pricing tier
  app.put("/api/admin/pricing/tiers/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertPricingTierSchema.partial().parse(req.body);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      const updated = await storage.updatePricingTier(parseInt(id), updateData, userId);

      // Clear cache after update
      await pricingConfigService.clearCache();

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating pricing tier:", error);
      res.status(500).json({ message: `Failed to update pricing tier: ${error.message}` });
    }
  });

  // Get pricing history
  app.get("/api/admin/pricing/history", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { table, recordId } = req.query;

      const history = await storage.getPricingHistory(
        table as string | undefined,
        recordId ? parseInt(recordId as string) : undefined
      );

      res.json(history);
    } catch (error: any) {
      console.error("Error fetching pricing history:", error);
      res.status(500).json({
        message: `Failed to fetch pricing history: ${error.message}`,
      });
    }
  });

  // Clear pricing cache (useful for testing or forced refresh)
  app.post("/api/admin/pricing/clear-cache", requireAuth, requireAdmin, async (req, res) => {
    try {
      await pricingConfigService.clearCache();
      res.json({ message: "Pricing cache cleared successfully" });
    } catch (error: any) {
      console.error("Error clearing pricing cache:", error);
      res.status(500).json({ message: `Failed to clear pricing cache: ${error.message}` });
    }
  });

  // ===== CALCULATOR MANAGER: SERVICE CONTENT =====
  {
    const { insertCalculatorServiceContentSchema } = await import("@shared/schema");
    const {
      DEFAULT_INCLUDED_FIELDS,
      DEFAULT_AGREEMENT_LINKS,
      DEFAULT_MSA_LINK,
      SERVICE_KEYS_DB,
      getDefaultSowTitle,
      getDefaultSowTemplate,
    } = await import("./calculator-defaults");

    const safeParse = (s?: string | null): any => {
      if (!s) return {};
      try {
        return JSON.parse(s);
      } catch {
        return {};
      }
    };

    const deepMerge = (base: any, override: any): any => {
      if (!override || typeof override !== "object") return base;
      const result: any = Array.isArray(base) ? [...base] : { ...base };
      for (const key of Object.keys(override)) {
        const o = override[key];
        if (o && typeof o === "object" && !Array.isArray(o)) {
          result[key] = deepMerge(base?.[key] || {}, o);
        } else {
          result[key] = o;
        }
      }
      return result;
    };

    const isBlank = (v: any) => typeof v === "string" && v.trim() === "";
    const norm = (v: any) => (v === undefined || v === null || isBlank(v) ? undefined : v);
    const asDbKey = (svc: string) =>
      svc as "bookkeeping" | "taas" | "payroll" | "ap" | "ar" | "agent_of_service" | "cfo_advisory";
    const withDefaults = (existing: any | undefined, service: string) => {
      const included = JSON.stringify(
        deepMerge(DEFAULT_INCLUDED_FIELDS, safeParse(existing?.includedFieldsJson))
      );
      if (existing) {
        return {
          ...existing,
          sowTitle: norm(existing.sowTitle) ?? getDefaultSowTitle(service as any),
          sowTemplate: norm(existing.sowTemplate) ?? getDefaultSowTemplate(service as any),
          agreementLink:
            norm(existing.agreementLink) ?? DEFAULT_AGREEMENT_LINKS[asDbKey(service)] ?? null,
          includedFieldsJson: included,
        };
      }
      return {
        id: 0,
        service,
        sowTitle: getDefaultSowTitle(service as any),
        sowTemplate: getDefaultSowTemplate(service as any),
        agreementLink: DEFAULT_AGREEMENT_LINKS[asDbKey(service)] ?? null,
        includedFieldsJson: included,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    };

    // List all service content entries
    app.get("/api/admin/calculator/content", requireAuth, requireAdmin, async (req, res) => {
      try {
        const items = await storage.getAllCalculatorServiceContent();
        const map = new Map<string, any>((items || []).map((i) => [i.service, i]));
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
      } catch (error: any) {
        res.status(500).json({
          message: `Failed to fetch calculator service content: ${error.message}`,
        });
      }
    });

    // Get content for a specific service
    app.get(
      "/api/admin/calculator/content/:service",
      requireAuth,
      requireAdmin,
      async (req, res) => {
        try {
          const { service } = req.params;
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
        } catch (error: any) {
          res.status(500).json({
            message: `Failed to fetch calculator service content: ${error.message}`,
          });
        }
      }
    );

    // Upsert content for a specific service
    app.put(
      "/api/admin/calculator/content/:service",
      requireAuth,
      requireAdmin,
      async (req, res) => {
        try {
          const { service } = req.params;
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
        } catch (error: any) {
          res.status(500).json({
            message: `Failed to update calculator service content: ${error.message}`,
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

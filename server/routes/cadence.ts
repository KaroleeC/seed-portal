import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/supabase-auth";
import { apiRateLimit } from "../middleware/rate-limiter";
import { db } from "../db";
import { eq, inArray } from "drizzle-orm";
import { crmCadences, crmCadenceDays, crmCadenceActions } from "@shared/schema";
import {
  CadenceSchema,
  CadenceSummarySchema,
  UpsertCadenceRequestSchema,
} from "@shared/contracts/cadence";

type CadenceRow = typeof crmCadences.$inferSelect;
type CadenceDayRow = typeof crmCadenceDays.$inferSelect;
type CadenceActionRow = typeof crmCadenceActions.$inferSelect;
type InsertCadenceRow = typeof crmCadences.$inferInsert;
type InsertCadenceDayRow = typeof crmCadenceDays.$inferInsert;
type InsertCadenceActionRow = typeof crmCadenceActions.$inferInsert;

function getPrincipal(req: Request): { userId: number; role: string } | null {
  // Try Supabase auth principal first
  const principal = (req as any).principal as { userId: number; role: string } | undefined;
  if (principal && typeof principal.userId === "number") {
    return { userId: principal.userId, role: principal.role || "employee" };
  }

  // Fallback to legacy session user
  const user = (req as any).user as { id: number; role: string } | undefined;
  if (user && typeof user.id === "number") {
    return { userId: user.id, role: user.role || "employee" };
  }

  return null;
}

function isAdmin(role: string | undefined): boolean {
  return String(role || "").toLowerCase() === "admin";
}

const router = Router();

// GET /api/cadence — list
router.get("/api/cadence", requireAuth, async (_req: Request, res: Response) => {
  try {
    const rows = (await db
      .select()
      .from(crmCadences)
      .orderBy(crmCadences.updatedAt)) as CadenceRow[];
    const payload = rows.map(
      (
        r
      ): {
        id: string;
        name: string;
        isActive: boolean;
        ownerUserId?: string;
        timezone: string;
      } => ({
        id: r.id,
        name: r.name,
        isActive: r.isActive,
        ownerUserId: r.ownerUserId || undefined,
        timezone: r.timezone,
      })
    );
    const parsed = z.array(CadenceSummarySchema).safeParse(payload);
    return res.json(parsed.success ? parsed.data : payload);
  } catch (error: unknown) {
    const msg = (error as any)?.message || "Failed to list cadences";
    return res.status(500).json({ message: msg });
  }
});

// GET /api/cadence/:id — read full definition
router.get("/api/cadence/:id", requireAuth, async (req: Request, res: Response) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ message: "id is required" });
  try {
    const [cadence] = (await db
      .select()
      .from(crmCadences)
      .where(eq(crmCadences.id, id))
      .limit(1)) as [CadenceRow?];
    if (!cadence) return res.status(404).json({ message: "Not found" });
    const days = (await db
      .select()
      .from(crmCadenceDays)
      .where(eq(crmCadenceDays.cadenceId, id))) as CadenceDayRow[];
    const dayIds = days.map((d) => d.id);
    const actions: CadenceActionRow[] = dayIds.length
      ? ((await db
          .select()
          .from(crmCadenceActions)
          .where(inArray(crmCadenceActions.dayId, dayIds))) as CadenceActionRow[])
      : [];

    const grouped: Record<string, CadenceActionRow[]> = {};
    for (const a of actions) {
      const bucket = grouped[a.dayId] ?? (grouped[a.dayId] = []);
      bucket.push(a);
    }

    const model = {
      id: cadence.id,
      name: cadence.name,
      isActive: cadence.isActive,
      ownerUserId: cadence.ownerUserId || undefined,
      timezone: cadence.timezone,
      trigger: cadence.trigger || { type: "lead_assigned", config: {} },
      days: days
        .sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0))
        .map((d) => ({
          dayNumber: d.dayNumber,
          actions: (grouped[d.id] || [])
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map((a) => ({
              id: a.id,
              type: a.actionType as "sms" | "email" | "call_task",
              scheduleRule: a.scheduleRule as unknown,
              config: (a.config as unknown) || {},
            })),
        })),
    };
    const parsed = CadenceSchema.safeParse(model);
    return res.json(parsed.success ? parsed.data : model);
  } catch (error: unknown) {
    const msg = (error as any)?.message || "Failed to load cadence";
    return res.status(500).json({ message: msg });
  }
});

// POST /api/cadence — upsert full definition (replace days/actions)
router.post("/api/cadence", requireAuth, apiRateLimit, async (req: Request, res: Response) => {
  const parsed = UpsertCadenceRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
  }
  const m = parsed.data;

  try {
    // RBAC: require principal
    const principal = getPrincipal(req);
    if (!principal) return res.status(401).json({ message: "Unauthorized" });

    // Upsert cadence row
    const now = new Date();
    const [existing] = (await db
      .select()
      .from(crmCadences)
      .where(eq(crmCadences.id, m.id))
      .limit(1)) as [CadenceRow?];
    if (existing) {
      // RBAC: only owner or admin can modify
      if (!isAdmin(principal.role) && existing.ownerUserId !== String(principal.userId)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await db
        .update(crmCadences)
        .set({
          name: m.name,
          isActive: Boolean(m.isActive),
          ownerUserId: m.ownerUserId || existing.ownerUserId || String(principal.userId),
          timezone: m.timezone || existing.timezone,
          trigger: m.trigger as unknown,
          updatedAt: now,
        } as InsertCadenceRow)
        .where(eq(crmCadences.id, m.id));
    } else {
      const row: InsertCadenceRow = {
        id: m.id,
        name: m.name || "New Cadence",
        isActive: Boolean(m.isActive),
        ownerUserId: m.ownerUserId || String(principal.userId),
        timezone: m.timezone || "America/Los_Angeles",
        trigger: m.trigger as unknown,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(crmCadences).values(row);
    }

    // Replace days/actions
    const prevDays = (await db
      .select()
      .from(crmCadenceDays)
      .where(eq(crmCadenceDays.cadenceId, m.id))) as CadenceDayRow[];
    const prevDayIds = prevDays.map((d) => d.id);
    if (prevDayIds.length) {
      await db.delete(crmCadenceActions).where(inArray(crmCadenceActions.dayId, prevDayIds));
      await db.delete(crmCadenceDays).where(eq(crmCadenceDays.cadenceId, m.id));
    }

    // Insert new days/actions
    for (const d of m.days || []) {
      const dayId = `${m.id}-day-${d.dayNumber}`;
      const dayRow: InsertCadenceDayRow = {
        id: dayId,
        cadenceId: m.id,
        dayNumber: d.dayNumber,
        sortOrder: d.dayNumber,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(crmCadenceDays).values(dayRow);
      let sort = 0;
      for (const a of d.actions || []) {
        const actionRow: InsertCadenceActionRow = {
          id: a.id,
          cadenceId: m.id,
          dayId,
          actionType: a.type,
          scheduleRule: a.scheduleRule as unknown,
          config: a.config as unknown,
          sortOrder: sort++,
          createdAt: now,
          updatedAt: now,
        };
        await db.insert(crmCadenceActions).values(actionRow);
      }
    }

    // Return the saved model directly
    const [saved] = await db.select().from(crmCadences).where(eq(crmCadences.id, m.id)).limit(1);
    const days = await db.select().from(crmCadenceDays).where(eq(crmCadenceDays.cadenceId, m.id));
    const dayIds = days.map((d) => d.id);
    const actions = dayIds.length
      ? await db.select().from(crmCadenceActions).where(inArray(crmCadenceActions.dayId, dayIds))
      : [];
    const grouped: Record<string, typeof actions> = {};
    for (const a of actions) {
      if (!grouped[a.dayId]) grouped[a.dayId] = [] as any;
      grouped[a.dayId].push(a);
    }
    const model = {
      id: saved.id,
      name: saved.name,
      isActive: saved.isActive,
      ownerUserId: saved.ownerUserId || undefined,
      timezone: saved.timezone,
      trigger: saved.trigger || { type: "lead_assigned", config: {} },
      days: days
        .sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0))
        .map((d) => ({
          dayNumber: d.dayNumber,
          actions: (grouped[d.id] || [])
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map((a) => ({
              id: a.id,
              type: a.actionType as any,
              scheduleRule: a.scheduleRule as any,
              config: (a.config as any) || {},
            })),
        })),
    };
    const parsed = CadenceSchema.safeParse(model);
    return res.json(parsed.success ? parsed.data : model);
  } catch (error: unknown) {
    const msg = (error as any)?.message || "Failed to save cadence";
    return res.status(500).json({ message: msg });
  }
});

// POST /api/cadence/:id/activate
router.post("/api/cadence/:id/activate", requireAuth, async (req: Request, res: Response) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ message: "id is required" });
  try {
    const principal = getPrincipal(req);
    if (!principal) return res.status(401).json({ message: "Unauthorized" });
    const [cad] = (await db.select().from(crmCadences).where(eq(crmCadences.id, id)).limit(1)) as [
      CadenceRow?,
    ];
    if (!cad) return res.status(404).json({ message: "Not found" });
    if (!isAdmin(principal.role) && cad.ownerUserId !== String(principal.userId))
      return res.status(403).json({ message: "Forbidden" });
    await db
      .update(crmCadences)
      .set({ isActive: true, updatedAt: new Date() } as InsertCadenceRow)
      .where(eq(crmCadences.id, id));
    return res.json({ success: true });
  } catch (error: unknown) {
    const msg = (error as any)?.message || "Failed to activate cadence";
    return res.status(500).json({ message: msg });
  }
});

// POST /api/cadence/:id/deactivate
router.post("/api/cadence/:id/deactivate", requireAuth, async (req: Request, res: Response) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ message: "id is required" });
  try {
    const principal = getPrincipal(req);
    if (!principal) return res.status(401).json({ message: "Unauthorized" });
    const [cad] = (await db.select().from(crmCadences).where(eq(crmCadences.id, id)).limit(1)) as [
      CadenceRow?,
    ];
    if (!cad) return res.status(404).json({ message: "Not found" });
    if (!isAdmin(principal.role) && cad.ownerUserId !== String(principal.userId))
      return res.status(403).json({ message: "Forbidden" });
    await db
      .update(crmCadences)
      .set({ isActive: false, updatedAt: new Date() } as InsertCadenceRow)
      .where(eq(crmCadences.id, id));
    return res.json({ success: true });
  } catch (error: unknown) {
    const msg = (error as any)?.message || "Failed to deactivate cadence";
    return res.status(500).json({ message: msg });
  }
});

export default router;

import { addMinutes } from "date-fns";
import { db } from "../../db";
import { eq, inArray } from "drizzle-orm";
import {
  crmCadences,
  crmCadenceDays,
  crmCadenceActions,
  crmCadenceRuns,
  crmCadenceScheduledActions,
} from "@shared/schema";

type CadenceRow = typeof crmCadences.$inferSelect;
type CadenceDayRow = typeof crmCadenceDays.$inferSelect;
type CadenceActionRow = typeof crmCadenceActions.$inferSelect;
type InsertCadenceRunRow = typeof crmCadenceRuns.$inferInsert;
type InsertScheduledActionRow = typeof crmCadenceScheduledActions.$inferInsert;

function parseTimeOfDay(time?: string): { hours: number; minutes: number } {
  const m = (time ?? "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { hours: 9, minutes: 0 };
  const h = Math.max(0, Math.min(23, parseInt(m?.[1] ?? "9", 10)));
  const min = Math.max(0, Math.min(59, parseInt(m?.[2] ?? "00", 10)));
  return { hours: h, minutes: min };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function withTimeOfDay(d: Date, timeOfDay: string): Date {
  const { hours, minutes } = parseTimeOfDay(timeOfDay);
  const x = new Date(d);
  x.setHours(hours, minutes, 0, 0);
  return x;
}

export interface PlanRunParams {
  cadenceId: string;
  leadId: string;
  triggerAt?: Date;
}

/**
 * Materialize a cadence run and its scheduled actions for a given lead.
 * NOTE: Timezone handling is simplified; adjust with date-fns-tz if needed.
 */
export async function planRunForLead({
  cadenceId,
  leadId,
  triggerAt,
}: PlanRunParams): Promise<{ runId: string }> {
  const now = new Date();
  const t0 = triggerAt || now;

  // Load cadence days/actions
  const [cadence] = (await db
    .select()
    .from(crmCadences)
    .where(eq(crmCadences.id, cadenceId))
    .limit(1)) as [CadenceRow?];
  if (!cadence) throw new Error("Cadence not found");
  const days = (await db
    .select()
    .from(crmCadenceDays)
    .where(eq(crmCadenceDays.cadenceId, cadenceId))) as CadenceDayRow[];
  const dayIds = days.map((d) => d.id);
  const actions: CadenceActionRow[] = dayIds.length
    ? ((await db
        .select()
        .from(crmCadenceActions)
        .where(inArray(crmCadenceActions.dayId, dayIds))) as CadenceActionRow[])
    : [];

  // Create run
  const runId = `${cadenceId}:${leadId}:${Date.now()}`;
  const runRow: InsertCadenceRunRow = {
    id: runId,
    cadenceId,
    leadId,
    status: "active",
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(crmCadenceRuns).values(runRow);

  // Group actions by dayId
  const grouped: Record<string, CadenceActionRow[]> = {};
  for (const a of actions) {
    const bucket = grouped[a.dayId] ?? (grouped[a.dayId] = []);
    bucket.push(a);
  }

  // Compute dueAt for each action
  for (const d of [...days].sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0))) {
    const baseDay = addDays(startOfDay(t0), (d.dayNumber || 1) - 1);
    let prevDue: Date | null = null;
    const list = (grouped[d.id] || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    for (const a of list) {
      const rule = (a.scheduleRule as unknown as {
        kind: "immediately" | "timeOfDay" | "afterPrevious";
        timeOfDay?: string;
        minutesAfterPrev?: number;
      }) || { kind: "timeOfDay", timeOfDay: "09:00" };
      let dueAt: Date;
      if (rule.kind === "immediately") {
        if (prevDue) {
          dueAt = prevDue;
        } else if (d.dayNumber === 1) {
          dueAt = t0;
        } else {
          dueAt = baseDay;
        }
      } else if (rule.kind === "afterPrevious") {
        const mins = Number(rule.minutesAfterPrev || 0);
        dueAt = addMinutes(prevDue || baseDay, isFinite(mins) ? mins : 0);
      } else {
        // timeOfDay
        const tod = String(rule.timeOfDay ?? "09:00");
        dueAt = withTimeOfDay(baseDay, tod);
      }
      prevDue = dueAt;

      const schedRow: InsertScheduledActionRow = {
        id: `${runId}:${a.id}`,
        runId,
        actionId: a.id,
        dueAt,
        status: "scheduled",
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(crmCadenceScheduledActions).values(schedRow);
    }
  }

  return { runId };
}

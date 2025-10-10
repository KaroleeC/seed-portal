import { db } from "../../db";
import { eq } from "drizzle-orm";
import { crmCadences, crmCadenceEvents } from "@shared/schema";
import { planRunForLead } from "./planner";
import { logger } from "../../logger";

type CadenceRow = typeof crmCadences.$inferSelect;
type InsertCadenceEventRow = typeof crmCadenceEvents.$inferInsert;

export interface LeadAssignedEvent {
  leadId: string;
  assignedTo?: string;
  triggerAt?: Date;
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Enqueue (MVP: synchronously handle) a lead_assigned event.
 * - Records the event in `crm_cadence_events`
 * - Finds all active cadences with trigger.type === 'lead_assigned'
 *   and optional trigger.config.assignedTo matching the assignee
 * - Plans a cadence run for the lead for each matching cadence
 */
export async function enqueueLeadAssigned(
  evt: LeadAssignedEvent
): Promise<{ planned: number; runIds: string[] }> {
  const now = new Date();

  // Persist event for audit
  try {
    const row: InsertCadenceEventRow = {
      id: uid(),
      type: "lead_assigned",
      payload: {
        leadId: evt.leadId,
        assignedTo: evt.assignedTo,
        triggerAt: evt.triggerAt || now,
      } as unknown as object,
      createdAt: now,
    };
    await db.insert(crmCadenceEvents).values(row);
  } catch (e) {
    logger.warn({ err: e }, "cadence: failed to persist event");
  }

  // Load active cadences
  const cadences = (await db
    .select()
    .from(crmCadences)
    .where(eq(crmCadences.isActive, true))) as CadenceRow[];

  const runIds: string[] = [];
  for (const c of cadences) {
    const trig = (c as any)?.trigger || { type: "lead_assigned", config: {} };
    if (trig?.type !== "lead_assigned") continue;
    const filterAssignee: string | undefined = trig?.config?.assignedTo || undefined;
    if (filterAssignee && filterAssignee !== (evt.assignedTo || undefined)) continue;

    try {
      const { runId } = await planRunForLead({
        cadenceId: c.id as string,
        leadId: evt.leadId,
        triggerAt: evt.triggerAt,
      });
      runIds.push(runId);
    } catch (e) {
      logger.warn(
        { err: e, cadenceId: c.id, leadId: evt.leadId },
        "cadence: planRunForLead failed"
      );
    }
  }

  return { planned: runIds.length, runIds };
}

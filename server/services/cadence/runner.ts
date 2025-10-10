import { db } from "../../db";
import { and, eq, inArray, lte } from "drizzle-orm";
import { crmCadenceScheduledActions, crmCadenceActions, crmCadenceRuns } from "@shared/schema";
import { getLead } from "../crm/leads";
import { sendSMS } from "../sms-provider";
import { sendEmail } from "../email-provider";
import { createTask } from "../crm/tasks";
import { logger } from "../../logger";

type SchedRow = typeof crmCadenceScheduledActions.$inferSelect;
type UpdateSchedRow = typeof crmCadenceScheduledActions.$inferInsert;
type ActionRow = typeof crmCadenceActions.$inferSelect;
type RunRow = typeof crmCadenceRuns.$inferSelect;

export interface RunDueActionsOptions {
  limit?: number;
}

export interface RunDueActionsResult {
  checked: number;
  sent: number;
  failed: number;
  skipped: number;
}

export async function runDueActions(opts: RunDueActionsOptions = {}): Promise<RunDueActionsResult> {
  const limit = Math.max(1, Math.min(200, opts.limit ?? 50));
  const now = new Date();

  // 1) Load due scheduled actions
  const due = (await db
    .select()
    .from(crmCadenceScheduledActions)
    .where(
      and(
        lte(crmCadenceScheduledActions.dueAt, now),
        eq(crmCadenceScheduledActions.status, "scheduled")
      )
    )
    .orderBy(crmCadenceScheduledActions.dueAt)
    .limit(limit)) as SchedRow[];

  if (!due.length) {
    return { checked: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const actionIds = Array.from(new Set(due.map((s) => s.actionId)));
  const runIds = Array.from(new Set(due.map((s) => s.runId)));

  const actions = actionIds.length
    ? ((await db
        .select()
        .from(crmCadenceActions)
        .where(inArray(crmCadenceActions.id, actionIds))) as ActionRow[])
    : [];
  const runs = runIds.length
    ? ((await db
        .select()
        .from(crmCadenceRuns)
        .where(inArray(crmCadenceRuns.id, runIds))) as RunRow[])
    : [];

  const actionMap = new Map(actions.map((a) => [a.id, a] as const));
  const runMap = new Map(runs.map((r) => [r.id, r] as const));

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const s of due) {
    const a = actionMap.get(s.actionId);
    const r = runMap.get(s.runId);

    // Guard: missing references
    if (!a || !r) {
      await db
        .update(crmCadenceScheduledActions)
        .set({
          status: "skipped",
          meta: { reason: !a ? "missing_action" : "missing_run" },
          updatedAt: new Date(),
        } as UpdateSchedRow)
        .where(eq(crmCadenceScheduledActions.id, s.id));
      skipped++;
      continue;
    }

    try {
      // Load lead for contact info
      const lead = await getLead(String(r.leadId));
      if (!lead) {
        await db
          .update(crmCadenceScheduledActions)
          .set({
            status: "skipped",
            meta: { reason: "lead_not_found" },
            updatedAt: new Date(),
          } as UpdateSchedRow)
          .where(eq(crmCadenceScheduledActions.id, s.id));
        skipped++;
        continue;
      }

      const cfg = (a.config as any) || {};
      const type = String(a.actionType);

      if (type === "sms") {
        const to = lead.contactPhone || (lead.payload as any)?.phone || null;
        const body = (cfg.sms?.body as string | undefined) || "";
        if (!to || !body) {
          await db
            .update(crmCadenceScheduledActions)
            .set({
              status: "skipped",
              meta: { reason: !to ? "no_phone" : "no_body" },
              updatedAt: new Date(),
            } as UpdateSchedRow)
            .where(eq(crmCadenceScheduledActions.id, s.id));
          skipped++;
          continue;
        }
        const resp = await sendSMS({ to, body });
        await db
          .update(crmCadenceScheduledActions)
          .set({
            status: "sent",
            meta: { provider: "twilio", response: resp },
            updatedAt: new Date(),
          } as UpdateSchedRow)
          .where(eq(crmCadenceScheduledActions.id, s.id));
        sent++;
      } else if (type === "email") {
        const to = lead.contactEmail || (lead.payload as any)?.email || null;
        const subject = (cfg.email?.subject as string | undefined) || "";
        const html = (cfg.email?.bodyHtml as string | undefined) || undefined;
        if (!to || !subject) {
          await db
            .update(crmCadenceScheduledActions)
            .set({
              status: "skipped",
              meta: { reason: !to ? "no_email" : "no_subject" },
              updatedAt: new Date(),
            } as UpdateSchedRow)
            .where(eq(crmCadenceScheduledActions.id, s.id));
          skipped++;
          continue;
        }
        const resp = await sendEmail({ to, subject, html });
        await db
          .update(crmCadenceScheduledActions)
          .set({
            status: "sent",
            meta: { provider: "mailgun", response: resp },
            updatedAt: new Date(),
          } as UpdateSchedRow)
          .where(eq(crmCadenceScheduledActions.id, s.id));
        sent++;
      } else if (type === "call_task") {
        const title = (cfg.call_task?.title as string | undefined) || "Call lead";
        const assigneeId =
          (cfg.call_task?.watcherUserId as string | undefined) || lead.assignedTo || undefined;
        const contactId = lead.contactId;
        if (!contactId) {
          await db
            .update(crmCadenceScheduledActions)
            .set({
              status: "skipped",
              meta: { reason: "no_contact_id" },
              updatedAt: new Date(),
            } as UpdateSchedRow)
            .where(eq(crmCadenceScheduledActions.id, s.id));
          skipped++;
          continue;
        }
        await createTask({
          contactId,
          title,
          assigneeId: assigneeId ?? null,
          dueDate: new Date().toISOString(),
        });
        await db
          .update(crmCadenceScheduledActions)
          .set({
            status: "sent",
            meta: { provider: "crm_task" },
            updatedAt: new Date(),
          } as UpdateSchedRow)
          .where(eq(crmCadenceScheduledActions.id, s.id));
        sent++;
      } else {
        await db
          .update(crmCadenceScheduledActions)
          .set({
            status: "skipped",
            meta: { reason: "unknown_action_type", actionType: type },
            updatedAt: new Date(),
          } as UpdateSchedRow)
          .where(eq(crmCadenceScheduledActions.id, s.id));
        skipped++;
      }
    } catch (err) {
      logger.warn(
        { err, scheduledActionId: s.id, actionId: s.actionId, runId: s.runId },
        "cadence.runner: dispatch failed"
      );
      await db
        .update(crmCadenceScheduledActions)
        .set({
          status: "failed",
          meta: { error: err instanceof Error ? err.message : String(err) },
          updatedAt: new Date(),
        } as UpdateSchedRow)
        .where(eq(crmCadenceScheduledActions.id, s.id));
      failed++;
    }
  }

  return { checked: due.length, sent, failed, skipped };
}

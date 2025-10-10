import { db } from "../../db";
import { crmTasks } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface CreateTaskInput {
  contactId: string;
  title: string;
  assigneeId?: string | null;
  dueDate?: string | null; // ISO string
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  status?: "open" | "done" | "skipped";
  assigneeId?: string | null;
  dueDate?: string | null;
}

export interface TaskItem {
  id: string;
  contactId: string;
  assigneeId: string | null;
  title: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt?: string;
}

async function resolveUserRef(userRef?: string | null): Promise<string | null> {
  const s = String(userRef ?? "").trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const rs = await db.execute(sql`SELECT id FROM users WHERE id = ${parseInt(s, 10)} LIMIT 1`);
    const row = (rs as { rows?: Array<{ id?: string | number }> }).rows?.[0];
    if (row?.id !== undefined && row?.id !== null) return String(row.id);
    throw new Error("assigneeId not found");
  }
  if (s.includes("@")) {
    const emailLc = s.toLowerCase();
    const rs = await db.execute(sql`SELECT id FROM users WHERE lower(email) = ${emailLc} LIMIT 1`);
    const row = (rs as { rows?: Array<{ id?: string | number }> }).rows?.[0];
    if (row?.id !== undefined && row?.id !== null) return String(row.id);
    throw new Error("assignee email not recognized");
  }
  throw new Error("assignee must be a user id or email");
}

export async function createTask(input: CreateTaskInput): Promise<TaskItem> {
  if (!db) throw new Error("Database not initialized");
  const assigneeId = await resolveUserRef(input.assigneeId ?? null);
  const due = input.dueDate ? new Date(input.dueDate) : null;
  const id = randomUUID();
  const values: typeof crmTasks.$inferInsert = {
    id,
    contactId: input.contactId,
    assigneeId: assigneeId ?? null,
    title: input.title,
    dueDate: due,
    status: "open",
  };
  await db.insert(crmTasks).values(values);
  return {
    id,
    contactId: input.contactId,
    assigneeId: assigneeId ?? null,
    title: input.title,
    status: "open",
    dueDate: due ? due.toISOString() : null,
    createdAt: new Date().toISOString(),
  };
}

export async function updateTask(patch: UpdateTaskInput): Promise<TaskItem | null> {
  if (!db) throw new Error("Database not initialized");
  const updates: Partial<typeof crmTasks.$inferInsert> = {};
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.dueDate !== undefined) updates.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;
  if (patch.assigneeId !== undefined) updates.assigneeId = await resolveUserRef(patch.assigneeId);
  if (Object.keys(updates).length === 0) return null;

  await db
    .update(crmTasks)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(crmTasks.id, patch.id));

  const [row] = await db.select().from(crmTasks).where(eq(crmTasks.id, patch.id)).limit(1);
  if (!row) return null;
  return {
    id: String(row.id),
    contactId: String(row.contactId),
    assigneeId: row.assigneeId ? String(row.assigneeId) : null,
    title: String(row.title),
    status: String(row.status),
    dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  };
}

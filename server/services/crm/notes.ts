import { db } from "../../db";
import { crmNotes } from "@shared/schema";
import { randomUUID } from "crypto";

export interface CreateNoteInput {
  contactId: string;
  authorId: string; // users.id as string
  body: string;
}

export interface NoteItem {
  id: string;
  contactId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export async function createNote(input: CreateNoteInput): Promise<NoteItem> {
  if (!db) throw new Error("Database not initialized");
  const id = randomUUID();
  const values: typeof crmNotes.$inferInsert = {
    id,
    contactId: input.contactId,
    authorId: input.authorId,
    body: input.body,
    // createdAt will default in DB
  };
  await db.insert(crmNotes).values(values);
  return {
    id,
    contactId: input.contactId,
    authorId: input.authorId,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
}

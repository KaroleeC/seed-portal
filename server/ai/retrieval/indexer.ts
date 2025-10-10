import { db } from "../../db";
import { aiDocuments, aiChunks } from "../../../shared/schema";
import { eq, inArray } from "drizzle-orm";
import { boxService } from "../../box-integration";
import { chunkText } from "./chunker";
import { embedTextList } from "./embed";

function makeVersion(info: any): string | null {
  if (!info) return null;
  const id = String(info.id ?? "");
  const sha1 = info.sha1 ? String(info.sha1) : null;
  const etag = info.etag ? String(info.etag) : null;
  const size = info.size != null ? String(info.size) : null;
  const modified = info.modified_at ? String(info.modified_at) : null;
  const ver = sha1 || etag || (size && modified ? `${size}:${modified}` : null);
  if (!id || !ver) return null;
  return `${id}:${ver}`;
}

async function getFileText(fileId: string): Promise<{ name: string; text: string } | null> {
  // Use fresh variant to bypass Redis/in-memory cache (avoid stale or binary text)
  const mod = await import("../../doc-extract");
  if ((mod as any).extractTextFromBoxFileFresh) {
    return await (mod as any).extractTextFromBoxFileFresh(fileId);
  }
  return await (mod as any).extractTextFromBoxFile(fileId);
}

export async function indexBoxFile(fileId: string): Promise<number | null> {
  try {
    const info = await boxService.getFileInfo(fileId);
    if (!info) return null;
    const version = makeVersion(info);
    const name = String(info.name || fileId);
    // Check existing doc
    const existing = await db.select().from(aiDocuments).where(eq(aiDocuments.fileId, fileId));
    if (existing.length && existing[0].version === version) {
      return existing[0].id as number;
    }
    // (Re)extract text
    const one = await getFileText(fileId);
    // Sanitize text: remove null bytes that Postgres can't handle
    const text = String(one?.text || "").replace(/\x00/g, "");
    // Upsert document
    let docId: number;
    if (existing.length) {
      docId = existing[0].id as number;
      await db
        .update(aiDocuments)
        .set({
          name,
          sha1: info.sha1 || null,
          etag: info.etag || null,
          size: info.size || null,
          modifiedAt: info.modified_at ? new Date(info.modified_at) : null,
          version,
        })
        .where(eq(aiDocuments.id, docId));
      // Remove old chunks
      await db.delete(aiChunks).where(eq(aiChunks.documentId, docId));
    } else {
      const inserted = await db
        .insert(aiDocuments)
        .values({
          fileId,
          name,
          sha1: info.sha1 || null,
          etag: info.etag || null,
          size: info.size || null,
          modifiedAt: info.modified_at ? new Date(info.modified_at) : null,
          version,
        })
        .returning({ id: aiDocuments.id });
      docId = inserted[0].id as number;
    }
    // Chunk and embed
    console.log(`[Indexer] Extracted ${text.length} chars from ${name}`);
    const chunks = chunkText(text, { maxChars: 3000, overlap: 200 });
    console.log(`[Indexer] Created ${chunks.length} chunks for ${name}`);
    if (!chunks.length) {
      console.warn(`[Indexer] No chunks created for ${name} (text was empty or too short)`);
      return docId;
    }
    const embeddings = await embedTextList(chunks.map((c) => c.text));
    console.log(`[Indexer] Generated ${embeddings.length} embeddings for ${name}`);
    const rows = chunks.map((c, i) => ({
      documentId: docId,
      chunkIndex: c.index,
      text: c.text,
      embedding: embeddings[i],
    }));
    // Insert in batches
    const BATCH = 100;
    for (let i = 0; i < rows.length; i += BATCH) {
      await db.insert(aiChunks).values(rows.slice(i, i + BATCH));
    }
    console.log(`[Indexer] Inserted ${rows.length} chunks for ${name}`);
    return docId;
  } catch (e: any) {
    // If tables or DB are unavailable, no-op gracefully
    console.warn(`[Indexer] Failed to index file ${fileId}:`, e?.message);
    return null;
  }
}

export async function indexFiles(fileIds: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const fid of fileIds) {
    const id = await indexBoxFile(fid);
    if (id != null) ids.push(id);
  }
  return ids;
}

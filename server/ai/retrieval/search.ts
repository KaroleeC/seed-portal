import { db } from "../../db";
import { aiChunks, aiDocuments } from "../../../shared/schema";
import { inArray, sql } from "drizzle-orm";
import { embedQuery } from "./embed";

export async function searchTopChunksForFiles(
  query: string,
  fileIds: string[],
  topK: number
): Promise<{
  chunks: Array<{ docName: string; index: number; text: string; score: number }>;
  citations: string[];
}> {
  try {
    if (!fileIds.length) return { chunks: [], citations: [] };

    // Map fileIds -> document ids
    const docs = await db.select().from(aiDocuments).where(inArray(aiDocuments.fileId, fileIds));
    const docById = new Map<number, (typeof docs)[number]>();
    for (const d of docs) {
      docById.set(d.id as number, d);
    }
    const docIds = Array.from(docById.keys());
    if (!docIds.length) return { chunks: [], citations: [] };

    // Embed query
    const qvec = await embedQuery(query);
    const vecStr = JSON.stringify(qvec);
    const vecParam = sql`${vecStr}::vector`;

    // Use pgvector cosine distance operator (<=>)
    // Lower distance = more similar; convert to similarity score (1 - distance)
    const rows = await db
      .select({
        id: aiChunks.id,
        documentId: aiChunks.documentId,
        chunkIndex: aiChunks.chunkIndex,
        text: aiChunks.text,
        distance: sql<number>`${aiChunks.embedding} <=> ${vecParam}`,
      })
      .from(aiChunks)
      .where(inArray(aiChunks.documentId, docIds))
      .orderBy(sql`${aiChunks.embedding} <=> ${vecParam}`)
      .limit(topK);

    const chunks: Array<{ docName: string; index: number; text: string; score: number }> = [];
    for (const r of rows) {
      const doc = docById.get(r.documentId as number);
      const name = String(doc?.name || "file");
      const score = Math.max(0, 1 - (r.distance ?? 1)); // convert distance to similarity
      chunks.push({ docName: name, index: r.chunkIndex ?? 0, text: String(r.text || ""), score });
    }
    // Debug: log retrieval results size
    console.log(
      `[Retrieval] fileIds=${fileIds.length} docIds=${docIds.length} results=${chunks.length} topK=${topK}`
    );

    const citations = Array.from(new Set(chunks.map((c) => c.docName)));
    return { chunks, citations };
  } catch (e: any) {
    console.warn(`[Retrieval] searchTopChunksForFiles failed: ${e?.message}`);
    return { chunks: [], citations: [] };
  }
}

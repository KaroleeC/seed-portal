import { boxService } from "../box-integration";
import { cache, CachePrefix, CacheTTL } from "../cache";
import { Limits, type ClientKind } from "./config";
import { selectTopRelevantFiles, type CandidateFile } from "./relevance";
import { extractTextFromBoxAttachments } from "../doc-extract";

export type BoxAttachment = { type: "box_file" | "box_folder"; id: string };
export type ResolvedFile = { id: string; name: string; size?: number; type: "file" };

// Internal: BFS collector with caching
async function collectFilesUnderFolderBFS(
  folderId: string,
  maxDepth: number,
  maxItems: number
): Promise<CandidateFile[]> {
  const out: CandidateFile[] = [];
  const queue: Array<{ id: string; depth: number }> = [{ id: folderId, depth: 0 }];
  const seen = new Set<string>();
  while (queue.length && out.length < maxItems) {
    const { id, depth } = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const items = await cache.wrap(
      cache.generateKey(CachePrefix.AI_BOX_LIST, { folderId: id }),
      () => boxService.listFolderItems(id),
      { ttl: CacheTTL.FIFTEEN_MINUTES }
    );
    for (const it of items) {
      if (out.length >= maxItems) break;
      if (it.type === "file")
        out.push({ id: it.id, name: it.name, size: it.size, modified_at: it.modified_at });
      else if (depth < maxDepth) queue.push({ id: it.id, depth: depth + 1 });
    }
  }
  return out;
}

export async function resolveBoxAttachmentsForClient(
  question: string,
  attachments: BoxAttachment[],
  clientKind: ClientKind
): Promise<{ files: ResolvedFile[] }> {
  const limits = Limits[clientKind];
  const files: ResolvedFile[] = [];
  const selected = new Set<string>();
  const candidates: CandidateFile[] = [];

  for (const a of attachments || []) {
    const type = a?.type === "box_folder" ? "folder" : "file";
    const id = String(a?.id || "");
    if (!id) continue;
    const ok = await boxService.isUnderClientsRoot(id, type);
    if (!ok) continue;

    if (type === "file") {
      const info = await boxService.getFileInfo(id);
      if (info) {
        files.push({ id: info.id, name: info.name, size: info.size, type: "file" });
        selected.add(String(info.id));
      }
    } else {
      const remainingScan = Math.max(0, limits.maxScan - candidates.length);
      if (remainingScan > 0) {
        const rec = await collectFilesUnderFolderBFS(id, limits.maxDepth, remainingScan);
        for (const f of rec) {
          if (selected.has(f.id)) continue;
          candidates.push(f);
        }
      }
    }
  }

  const remainingOut = Math.max(0, limits.maxFiles - files.length);
  if (remainingOut > 0 && candidates.length) {
    const ranked = selectTopRelevantFiles(question, candidates, remainingOut);
    for (const r of ranked) {
      if (selected.has(r.id)) continue;
      files.push({ id: r.id, name: r.name, size: r.size, type: "file" });
      selected.add(r.id);
    }
  }
  return { files };
}

export async function extractTextForClient(
  question: string,
  attachments: BoxAttachment[],
  clientKind: ClientKind
): Promise<{ combinedText: string; citations: string[] }> {
  const limits = Limits[clientKind];

  // Try retrieval first (pgvector search)
  try {
    const { searchTopChunksForFiles } = await import("./retrieval/search");
    const fileIds: string[] = [];
    for (const a of attachments || []) {
      if (a.type === "box_file") fileIds.push(a.id);
      // For folders, we'd need to expand them first - skip retrieval for folders for now
    }

    if (fileIds.length) {
      console.log(`[Pipeline] Retrieval start: files=${fileIds.length} topK=${limits.topK}`);
      const { chunks, citations } = await searchTopChunksForFiles(question, fileIds, limits.topK);
      console.log(
        `[Pipeline] Retrieval done: chunks=${chunks.length} citations=${citations.length}`
      );
      if (chunks.length) {
        // Build combined text from top chunks
        const parts = chunks.map((c) => `### Source: ${c.docName}\n${c.text}`);
        const combined = parts.join("\n\n");
        console.log(`[Pipeline] KB from retrieval length=${combined.length}`);
        return { combinedText: combined, citations };
      }
    }
  } catch (e) {
    // Retrieval failed or not available, fall back to full extraction
    console.warn(
      "[Pipeline] Retrieval failed, falling back to full extraction:",
      (e as any)?.message
    );
  }

  // Fallback: full document extraction
  const fb = await extractTextFromBoxAttachments(attachments, {
    maxFiles: limits.maxFiles,
    maxTotalChars: limits.maxTotalChars,
    perDocChars: limits.perDocChars,
  });
  console.log(
    `[Pipeline] Fallback extraction: kbLen=${fb.combinedText.length} citations=${fb.citations.length}`
  );
  return fb;
}

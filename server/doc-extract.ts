import { boxService } from "./box-integration";
import { logger } from "./logger";
import type { Readable } from "stream";
import { cache, CachePrefix, CacheTTL } from "./cache";

const MAX_TOTAL_SOURCE_CHARS = 30_000; // default total text cap across all docs
const MAX_PER_DOC_CHARS = 10_000; // default per doc cap
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB read cap per file
const MAX_FILES = 5; // max files per request

// Simple in-memory cache for extracted text per file version
type CacheEntry = { name: string; text: string; ts: number };
const EXTRACT_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function makeFileCacheKey(info: any): string | null {
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

// Fresh (no-cache) variant used by indexer when cached text looks unreadable
export async function extractTextFromBoxFileFresh(
  fileId: string
): Promise<{ name: string; text: string } | null> {
  try {
    const info = await boxService.getFileInfo(fileId);
    if (!info) return null;
    const stream = await boxService.getFileReadStream(fileId);
    if (!stream) return null;
    const buf = await readStreamToBuffer(stream as Readable);
    const raw = await extractTextFromBuffer(info.name, buf);
    const text = String(raw || "").slice(0, MAX_PER_DOC_CHARS);
    return { name: info.name, text };
  } catch (e: any) {
    logger.warn("[DocExtract] extractTextFromBoxFileFresh failed", {
      e: e?.message,
      fileId,
    });
    return null;
  }
}

// List files recursively under a folder (BFS), with limits
async function listFilesRecursiveBFS(
  rootFolderId: string,
  maxDepth: number,
  maxFiles: number
): Promise<string[]> {
  const out: string[] = [];
  const queue: Array<{ id: string; depth: number }> = [{ id: rootFolderId, depth: 0 }];
  const visited = new Set<string>();
  while (queue.length && out.length < maxFiles) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const items = await cache.wrap(
      cache.generateKey(CachePrefix.AI_BOX_LIST, { folderId: id }),
      () => boxService.listFolderItems(id),
      { ttl: CacheTTL.FIFTEEN_MINUTES }
    );
    for (const it of items) {
      if (out.length >= maxFiles) break;
      if (it.type === "file") out.push(it.id);
      else if (depth < maxDepth) queue.push({ id: it.id, depth: depth + 1 });
    }
  }
  return out;
}

async function readStreamToBuffer(stream: Readable, maxBytes = MAX_FILE_BYTES): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        // Truncate
        chunks.push(chunk.slice(0, Math.max(0, maxBytes - (total - chunk.length))));
        stream.destroy();
        resolve(Buffer.concat(chunks));
        return;
      }
      chunks.push(chunk);
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(err));
  });
}

function extOf(name?: string): string {
  const n = (name || "").toLowerCase();
  const i = n.lastIndexOf(".");
  return i >= 0 ? n.slice(i + 1) : "";
}

async function extractTextFromBuffer(fileName: string, buf: Buffer): Promise<string> {
  const ext = extOf(fileName);
  try {
    if (ext === "pdf") {
      try {
        const mod = await import("pdf-parse");
        const pdfParse: any = (mod as any).default || (mod as any);
        const out = await pdfParse(buf);
        const text = String(out?.text || "").trim();

        // Check if this appears to be a scanned PDF (very little text extracted)
        const { isLikelyScannedPDF, extractTextWithOCR } = await import("./services/ocr");
        if (isLikelyScannedPDF(text, buf.length)) {
          logger.info(`[DocExtract] ${fileName} appears to be scanned, attempting OCR`);
          const ocrText = await extractTextWithOCR(buf, fileName);
          if (ocrText && ocrText.length > text.length) {
            logger.info(`[DocExtract] OCR successful for ${fileName}, using OCR text`);
            return ocrText;
          }
        }

        return text;
      } catch (e: any) {
        logger.warn("[DocExtract] pdf-parse unavailable or failed", {
          e: e?.message,
        });
        // Try OCR as last resort
        try {
          const { extractTextWithOCR } = await import("./services/ocr");
          const ocrText = await extractTextWithOCR(buf, fileName);
          if (ocrText) {
            logger.info(`[DocExtract] OCR fallback successful for ${fileName}`);
            return ocrText;
          }
        } catch {}
        return "";
      }
    }
    if (ext === "docx") {
      try {
        const mammoth = await import("mammoth");
        const out = await (mammoth as any).extractRawText({ buffer: buf });
        return String(out.value || "").trim();
      } catch (e: any) {
        logger.warn("[DocExtract] mammoth unavailable or failed", {
          e: e?.message,
        });
      }
    }
    if (ext === "xlsx" || ext === "xls") {
      try {
        const mod = await import("xlsx");
        const XLSX: any = (mod as any).default || mod;
        const wb = XLSX.read(buf, { type: "buffer" });
        const sheetNames: string[] = wb.SheetNames || [];
        const parts: string[] = [];
        for (const s of sheetNames) {
          const ws = wb.Sheets[s];
          if (!ws) continue;
          const csv = XLSX.utils.sheet_to_csv(ws);
          parts.push(`# Sheet: ${s}\n${csv}`);
        }
        return parts.join("\n\n");
      } catch (e: any) {
        logger.warn("[DocExtract] xlsx unavailable or failed", {
          e: e?.message,
        });
      }
    }
    if (ext === "csv" || ext === "txt" || ext === "md" || ext === "json") {
      return buf.toString("utf-8");
    }
    // Fallback: attempt utf-8 decode for generic files only (not PDFs)
    return buf.toString("utf-8");
  } catch (e: any) {
    logger.warn("[DocExtract] generic extraction failed", {
      e: e?.message,
      fileName,
    });
    return "";
  }
}

export async function extractTextFromBoxFile(
  fileId: string
): Promise<{ name: string; text: string } | null> {
  try {
    const info = await boxService.getFileInfo(fileId);
    if (!info) return null;
    // Build versioned cache key
    const versionKey = makeFileCacheKey(info);
    const redisKey = versionKey ? cache.generateKey(CachePrefix.AI_BOX_TEXT, versionKey) : null;
    // Check Redis cache first (cross-process)
    if (redisKey) {
      const cached = await cache.get<{ name: string; text: string }>(redisKey);
      if (cached) return cached;
    }
    // Fallback local in-memory cache
    if (versionKey) {
      const hit = EXTRACT_CACHE.get(versionKey);
      if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
        return { name: hit.name, text: hit.text };
      }
    }
    const stream = await boxService.getFileReadStream(fileId);
    if (!stream) return null;
    const buf = await readStreamToBuffer(stream as Readable);
    const raw = await extractTextFromBuffer(info.name, buf);
    const text = String(raw || "").slice(0, MAX_PER_DOC_CHARS);
    const out = { name: info.name, text };
    if (versionKey) EXTRACT_CACHE.set(versionKey, { ...out, ts: Date.now() });
    if (redisKey) await cache.set(redisKey, out, CacheTTL.ONE_DAY);
    return out;
  } catch (e: any) {
    logger.warn("[DocExtract] extractTextFromBoxFile failed", {
      e: e?.message,
      fileId,
    });
    return null;
  }
}

export async function extractTextFromBoxAttachments(
  attachments: Array<{ type: "box_file" | "box_folder"; id: string }>,
  options?: { maxFiles?: number; maxTotalChars?: number; perDocChars?: number }
): Promise<{ combinedText: string; citations: string[] }> {
  const files: { id: string }[] = [];
  const maxFiles = Math.max(1, Math.min(1000, options?.maxFiles ?? 5));
  const maxTotalChars = Math.max(
    10_000,
    Math.min(1_000_000, options?.maxTotalChars ?? MAX_TOTAL_SOURCE_CHARS)
  );
  const perDocChars = Math.max(2_000, Math.min(50_000, options?.perDocChars ?? MAX_PER_DOC_CHARS));

  // Expand to files (folders are listed, cached)
  for (const a of attachments || []) {
    if (!a?.id) continue;
    if (a.type === "box_file") {
      files.push({ id: a.id });
    } else if (a.type === "box_folder") {
      try {
        const remaining = Math.max(0, maxFiles - files.length);
        if (remaining > 0) {
          const ids = await listFilesRecursiveBFS(a.id, 5, remaining);
          for (const id of ids) files.push({ id });
        }
      } catch {}
    }
  }

  // Deduplicate and limit
  const seen = new Set<string>();
  const unique = files
    .filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    })
    .slice(0, maxFiles);

  const parts: string[] = [];
  const citations: string[] = [];
  let total = 0;

  for (const f of unique) {
    // Use fresh extractor to avoid stale cached empty strings
    const one = await extractTextFromBoxFileFresh(f.id);
    if (!one) continue;
    const header = `### Source: ${one.name}`;
    const text = one.text;
    const chunk = `${header}\n${text}`;
    const remaining = maxTotalChars - total;
    if (remaining <= 0) break;
    const clipped = chunk.slice(0, remaining);
    parts.push(clipped);
    citations.push(one.name);
    total += clipped.length;
  }

  const combined = parts.join("\n\n");
  console.log(
    `[DocExtract] attachments extracted: files=${unique.length} citations=${citations.length} kbLen=${combined.length}`
  );
  return { combinedText: combined, citations };
}

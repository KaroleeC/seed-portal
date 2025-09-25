import { boxService } from "./box-integration";
import { logger } from "./logger";
import type { Readable } from "stream";

const MAX_TOTAL_SOURCE_CHARS = 50_000; // total text cap across all docs
const MAX_PER_DOC_CHARS = 10_000; // per doc cap
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

async function readStreamToBuffer(
  stream: Readable,
  maxBytes = MAX_FILE_BYTES,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        // Truncate
        chunks.push(
          chunk.slice(0, Math.max(0, maxBytes - (total - chunk.length))),
        );
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

async function extractTextFromBuffer(
  fileName: string,
  buf: Buffer,
): Promise<string> {
  const ext = extOf(fileName);
  try {
    if (ext === "pdf") {
      try {
        const pdfParse = await import("pdf-parse");
        const out = await (pdfParse as any).default(buf);
        return String(out.text || "").trim();
      } catch (e: any) {
        logger.warn("[DocExtract] pdf-parse unavailable or failed", {
          e: e?.message,
        });
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
    // Fallback: attempt utf-8 decode
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
  fileId: string,
): Promise<{ name: string; text: string } | null> {
  try {
    const info = await boxService.getFileInfo(fileId);
    if (!info) return null;
    // Check cache by file version
    const key = makeFileCacheKey(info);
    if (key) {
      const hit = EXTRACT_CACHE.get(key);
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
    if (key) EXTRACT_CACHE.set(key, { ...out, ts: Date.now() });
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
): Promise<{ combinedText: string; citations: string[] }> {
  const files: { id: string; name?: string }[] = [];

  // Expand to files within subtree with enforcement already performed at call site if needed
  for (const a of attachments || []) {
    if (!a?.id) continue;
    if (a.type === "box_file") {
      files.push({ id: a.id });
    } else if (a.type === "box_folder") {
      try {
        const items = await boxService.listFolderItems(a.id);
        for (const it of items) {
          if (it.type === "file") files.push({ id: it.id });
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
    .slice(0, MAX_FILES);

  const parts: string[] = [];
  const citations: string[] = [];
  let total = 0;

  for (const f of unique) {
    const one = await extractTextFromBoxFile(f.id);
    if (!one) continue;
    const header = `### Source: ${one.name}`;
    const text = one.text;
    const chunk = `${header}\n${text}`;
    const remaining = MAX_TOTAL_SOURCE_CHARS - total;
    if (remaining <= 0) break;
    const clipped = chunk.slice(0, remaining);
    parts.push(clipped);
    citations.push(one.name);
    total += clipped.length;
  }

  return { combinedText: parts.join("\n\n"), citations };
}

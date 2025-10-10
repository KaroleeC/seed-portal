export type Chunk = { index: number; text: string };

// Simple character-based chunker with overlap. Later replace with token-aware chunking.
export function chunkText(
  text: string,
  options?: { maxChars?: number; overlap?: number }
): Chunk[] {
  const maxChars = Math.max(1000, Math.min(8000, options?.maxChars ?? 3000));
  const overlap = Math.max(0, Math.min(maxChars / 2, options?.overlap ?? 200));
  const out: Chunk[] = [];
  if (!text) return out;
  let i = 0;
  let idx = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + maxChars);
    out.push({ index: idx++, text: text.slice(i, end) });
    if (end >= text.length) break;
    i = end - overlap;
  }
  return out;
}

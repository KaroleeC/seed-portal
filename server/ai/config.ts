// Central limits for AI assistant behavior per client surface
export type ClientKind = "widget" | "assistant";

export const Limits: Record<
  ClientKind,
  {
    maxFiles: number;
    maxDepth: number; // folder traversal depth for resolve
    maxScan: number; // max candidates to scan before ranking
    maxTotalChars: number;
    perDocChars: number;
    topK: number; // retrieval top-k chunks
  }
> = {
  widget: {
    maxFiles: 15,
    maxDepth: 3,
    maxScan: 60, // ~4x files
    maxTotalChars: 30000,
    perDocChars: 10000,
    topK: 8,
  },
  assistant: {
    maxFiles: 100,
    maxDepth: 5,
    maxScan: 400,
    maxTotalChars: 30000, // can raise later to 80k-120k
    perDocChars: 10000,
    topK: 16,
  },
};

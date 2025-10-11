import { Router } from "express";
import { z } from "zod";
import { requireAuth, asyncHandler, validateBody, handleError, createRateLimiter } from "./_shared";
import { cache, CacheTTL, CachePrefix } from "../cache";
import { boxService } from "../box-integration";
import { AIService } from "../services/ai-service";
import { extractTextForClient, resolveBoxAttachmentsForClient } from "../ai/pipeline";
import type { ClientKind } from "../ai/config";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { aiConversations, aiMessages } from "@shared/schema";
import { randomUUID } from "crypto";

const router = Router();

// Rate limit AI endpoints more aggressively
const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: "Too many AI requests, please try again later",
});

const aiService = new AIService();

const getPersona = (user: any): "sales" | "service" | "admin" => {
  const pref = String(user?.defaultDashboard || "").toLowerCase();
  if (pref.includes("admin")) return "admin";
  if (pref.includes("service")) return "service";
  if (pref.includes("sales")) return "sales";
  return user?.role === "admin" ? "admin" : "sales";
};

// ============================================================================
// SCHEMAS
// ============================================================================

const extractDocumentSchema = z.object({
  documentUrl: z.string().url(),
  documentType: z.enum(["bank_statement", "invoice", "receipt", "other"]),
});

const chatSchema = z.object({
  message: z.string().min(1).max(1000),
  context: z.record(z.any()).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

router.get(
  "/api/ai/box/list",
  requireAuth,
  asyncHandler(async (req: any, res) => {
    const probe = await boxService.getFolderInfo("0");
    if (!probe) {
      return res.status(500).json({ message: "Box is not configured (App Auth credentials missing/invalid)" });
    }
    const rootId = process.env.BOX_CLIENT_FOLDERS_PARENT_ID;
    if (!rootId || rootId === "0") {
      return res.status(500).json({ message: "BOX_CLIENT_FOLDERS_PARENT_ID is not set to the CLIENTS folder id" });
    }
    const folderId = typeof req.query.folderId === "string" && req.query.folderId.trim().length ? String(req.query.folderId) : String(rootId);
    const ok = String(folderId) === String(rootId) || (await boxService.isUnderClientsRoot(folderId, "folder"));
    if (!ok) return res.status(403).json({ message: "Folder not within CLIENTS root" });
    const items = await boxService.listFolderItems(folderId);
    return res.json({ folderId, items });
  })
);

router.post(
  "/api/ai/box/resolve",
  requireAuth,
  asyncHandler(async (req: any, res) => {
    const clientKind: ClientKind = req.body?.client === "widget" ? "widget" : "assistant";
    const question = typeof req.body?.question === "string" ? req.body.question : "";
    const raw = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
    const { files } = await resolveBoxAttachmentsForClient(question, raw, clientKind);
    if (files.length) {
      const mod: any = await import("../queue.js");
      const getAIIndexQueue = mod.getAIIndexQueue as any;
      const queue = typeof getAIIndexQueue === "function" ? getAIIndexQueue() : null;
      if (queue) {
        await queue
          .add(
            "index-files",
            { fileIds: files.map((f: any) => f.id), userId: Number(req.user?.id) || 0, timestamp: Date.now() },
            { priority: 5 }
          )
          .catch(() => {});
      }
    }
    return res.json({ files });
  })
);

router.post(
  "/api/ai/extract",
  requireAuth,
  aiRateLimiter,
  validateBody(extractDocumentSchema),
  asyncHandler(async (req, res) => {
    const { documentUrl, documentType } = req.body;
    try {
      res.json({ success: true, message: "Document extraction coming soon", documentUrl, documentType });
    } catch (error) {
      console.error("🚨 Document extraction failed:", error);
      handleError(error, res, "Document Extraction");
    }
  })
);

router.post(
  "/api/ai/chat",
  requireAuth,
  aiRateLimiter,
  validateBody(chatSchema),
  asyncHandler(async (req, res) => {
    const { message } = req.body;
    try {
      res.json({ success: true, response: "AI chat feature coming soon!", message });
    } catch (error) {
      console.error("🚨 AI chat failed:", error);
      handleError(error, res, "AI Chat");
    }
  })
);

router.post(
  "/api/ai/analyze-quote",
  requireAuth,
  aiRateLimiter,
  asyncHandler(async (req, res) => {
    const { quoteId } = req.body;
    if (!quoteId || typeof quoteId !== "number") {
      return res.status(400).json({ message: "Invalid quote ID" });
    }
    try {
      res.json({ success: true, analysis: { quoteId, recommendations: ["Quote looks good!", "Consider adding TaaS service for tax compliance"], confidence: 0.85 } });
    } catch (error) {
      console.error("🚨 Quote analysis failed:", error);
      handleError(error, res, "Quote Analysis");
    }
  })
);

router.post(
  "/api/ai/query",
  requireAuth,
  asyncHandler(async (req: any, res) => {
    const mode: "sell" | "support" = req.body?.mode === "support" ? "support" : "sell";
    const question = (req.body?.question || "").toString().trim();
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
    const providedConversationId = typeof req.body?.conversationId === "string" ? req.body.conversationId.trim() : "";
    if (!question) return res.status(400).json({ message: "question is required" });
    if (attachments.length > 0 && mode !== "support") {
      return res.status(403).json({ message: "Box attachments are only permitted in support mode" });
    }
    let fileNames: string[] = [];
    let combinedText = "";
    if (attachments.length > 0 && mode === "support") {
      const valid: Array<{ type: "box_file" | "box_folder"; id: string }> = [];
      for (const a of attachments) {
        const type = a?.type === "box_folder" ? "folder" : "file";
        const id = String(a?.id || "");
        if (!id) continue;
        const ok = await cache.wrap(
          cache.generateKey(CachePrefix.AI_BOX_CHECK, { id, type }),
          () => boxService.isUnderClientsRoot(id, type as any),
          { ttl: CacheTTL.FIFTEEN_MINUTES }
        );
        if (!ok) continue;
        valid.push({ type: type === "file" ? "box_file" : "box_folder", id });
      }
      if (valid.length) {
        const clientKind: ClientKind = req.body?.client === "widget" ? "widget" : "assistant";
        const extracted = await extractTextForClient(question, valid, clientKind);
        combinedText = extracted.combinedText || "";
        fileNames = extracted.citations || [];
      }
    }
    const promptClientKind: ClientKind = req.body?.client === "widget" ? "widget" : "assistant";
    let systemSell = `You are Seed Assistant (Sell Mode).
You are a real-time sales conversation copilot. Your output helps a sales rep speak directly to a client/prospect during a live call.
Be concise, natural, and client-safe. Use real-talk phrasing. Never fabricate facts or specific numbers.

Output format:
- Opener (1 line) — a neutral, professional way to begin the topic.
- Talk Tracks (3–6 bullets) — short, say-this-now lines. Use patterns like "Say:" and "If they mention <X>, try:".
- Discovery Questions (5–7 bullets) — open-ended, grouped across: process, pains, decision criteria, timeline/budget, stakeholders, current tools.
- Objections & Responses (3–5 bullets) — likely objections with one-line counters using "Prospect:" and "You:".
- Guardrails — remind the rep to avoid promises, discounts, or tax/legal advice without approval.

Do not include CTAs or next-step scheduling language. Focus only on in-call guidance.`;
    if (promptClientKind === "widget") {
      systemSell = `You are Seed Assistant (Sell Mode, Widget).
Condensed, skimmable call coaching. No fabrication.

Output format (short):
- Opener (1 line)
- Talk Tracks (3 bullets)
- Discovery Questions (4 bullets)
- Objections & Responses (2 bullets)
- Guardrails (1 bullet)

No CTAs.`;
    }
    const systemSupport = `You are Seed Assistant (Support Mode).
Use ONLY the provided Knowledge Base (KB) from attached files. Do NOT generalize. If a fact is not present in the KB, say "Not found in sources".
Tasks:
- Extract concrete figures and dates (revenue, gross profit, operating income, net income, cash, AR, AP, debt, equity) from the KB.
- After each fact, include the source file in square brackets, e.g. [file].
- Structure the answer:
  1) Executive summary (2–3 bullets)
  2) Financial highlights with exact figures and deltas (if prior values exist)
  3) Balance sheet snapshot
  4) Income statement snapshot
  5) Risks / notes
  6) Open questions
Rules:
- Short quotes and exact numbers are allowed; avoid long verbatim passages.
- If the KB is empty or unreadable, respond exactly with: "No readable data extracted from the attached files. Please attach text-based PDFs/CSV/XLSX or OCR the documents." and stop.`;
    const sys = mode === "support" ? systemSupport : systemSell;
    const sourceNote = fileNames.length ? `\n\nWhen stating a fact, append the file in brackets [name]. Files available:\n- ${fileNames.slice(0, 20).join("\n- ")}` : "";
    const kb = combinedText ? `\n\nKnowledge Base:\n${combinedText}` : "";
    const fullPrompt = `${sys}\n\nUser question:\n${question}${sourceNote}${kb}`;
    const model = mode === "support" ? "gpt-4o" : "gpt-4o-mini";
    const maxTokens = mode === "support" ? 900 : 600;
    const temperature = mode === "sell" ? 0.25 : 0.35;
    const conversationId = providedConversationId || randomUUID();
    if (db) {
      try {
        await db.insert(aiConversations).values({ id: conversationId, userId: Number(req.user?.id) || 0, mode, startedAt: new Date(), lastActivityAt: new Date() }).onConflictDoNothing?.({ target: aiConversations.id });
        await db.insert(aiMessages).values({ conversationId, role: "user", content: question, attachments: attachments && attachments.length ? (attachments as any) : null });
      } catch (e) {
        console.warn("[AI] DB persist (query, user msg) failed:", (e as any)?.message);
      }
    }
    const answer = await aiService.generateContent(fullPrompt, { model, maxTokens, temperature });
    if (db) {
      try {
        await db.insert(aiMessages).values({ conversationId, role: "assistant", content: answer, attachments: null });
        await db.update(aiConversations).set({ lastActivityAt: new Date() }).where(eq(aiConversations.id, conversationId));
      } catch (e) {
        console.warn("[AI] DB persist (query, assistant msg) failed:", (e as any)?.message);
      }
    }
    return res.json({ conversationId, answer, citations: fileNames });
  })
);

router.post(
  "/api/ai/query/stream",
  requireAuth,
  asyncHandler(async (req: any, res) => {
    const mode: "sell" | "support" = req.body?.mode === "support" ? "support" : "sell";
    const question = (req.body?.question || "").toString().trim();
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
    const providedConversationId = typeof req.body?.conversationId === "string" ? req.body.conversationId.trim() : "";
    if (!question) {
      res.status(400);
      return res.end();
    }
    if (attachments.length > 0 && mode !== "support") {
      res.status(403);
      return res.end();
    }
    let fileNames: string[] = [];
    let combinedText = "";
    if (attachments.length > 0 && mode === "support") {
      const valid: Array<{ type: "box_file" | "box_folder"; id: string }> = [];
      for (const a of attachments) {
        const type = a?.type === "box_folder" ? "folder" : "file";
        const id = String(a?.id || "");
        if (!id) continue;
        const ok = await cache.wrap(
          cache.generateKey(CachePrefix.AI_BOX_CHECK, { id, type }),
          () => boxService.isUnderClientsRoot(id, type as any),
          { ttl: CacheTTL.FIFTEEN_MINUTES }
        );
        if (!ok) continue;
        valid.push({ type: type === "file" ? "box_file" : "box_folder", id });
      }
      if (valid.length) {
        const clientKind: ClientKind = req.body?.client === "widget" ? "widget" : "assistant";
        const extracted = await extractTextForClient(question, valid, clientKind);
        combinedText = extracted.combinedText || "";
        fileNames = extracted.citations || [];
      }
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Connection", "keep-alive");
    (res as any).flushHeaders?.();
    const write = (obj: any) => {
      try {
        res.write(`data: ${JSON.stringify(obj)}\n\n`);
      } catch {}
    };
    const conversationId = providedConversationId || randomUUID();
    write({ meta: { citations: fileNames, conversationId } });
    let assistantText = "";
    await aiService.streamChat(`${question}${combinedText ? `\n\nKnowledge Base:\n${combinedText}` : ""}`, {
      model: mode === "support" ? "gpt-4o" : "gpt-4o-mini",
      maxTokens: mode === "support" ? 900 : 600,
      temperature: mode === "sell" ? 0.25 : 0.35,
      onDelta: (delta: string) => {
        assistantText += delta || "";
        write({ delta });
      },
    });
    res.write("data: [DONE]\n\n");
    res.end();
    if (db) {
      try {
        await db.insert(aiMessages).values({ conversationId, role: "assistant", content: assistantText, attachments: null });
        await db.update(aiConversations).set({ lastActivityAt: new Date() }).where(eq(aiConversations.id, conversationId));
      } catch (e) {
        console.warn("[AI] DB persist (stream, assistant msg) failed:", (e as any)?.message);
      }
    }
  })
);

router.post(
  "/api/ai/conversations/end",
  requireAuth,
  asyncHandler(async (req: any, res) => {
    const conversationId = String(req.body?.conversationId || "").trim();
    if (!conversationId) return res.status(400).json({ ok: false, message: "conversationId is required" });
    if (!db) return res.json({ ok: true });
    await db.update(aiConversations).set({ endedAt: new Date(), lastActivityAt: new Date() }).where(eq(aiConversations.id, conversationId));
    res.json({ ok: true });
  })
);

router.get(
  "/api/ai/health",
  asyncHandler(async (_req, res) => {
    res.json({ status: "healthy", services: { ocr: "available", chat: "coming_soon", analysis: "coming_soon" }, timestamp: new Date().toISOString() });
  })
);

export default router;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "./_shared";
import { requireAuth } from "../middleware/supabase-auth";
import { storage } from "../storage";
import { db } from "../db";
import { kbCategories, insertKbArticleSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Default categories (used for dev auto-seed and admin seed)
const DEFAULT_CATEGORIES = [
  {
    name: "Getting Started Hub",
    slug: "getting-started",
    description: "Quick-start guides for clients, partners, and internal teams",
    icon: "compass",
    color: "from-blue-500 to-cyan-500",
    sortOrder: 1,
    isActive: true,
  },
  {
    name: "Tax-as-a-Service (TaaS)",
    slug: "taas",
    description: "Playbooks, FAQs, and tax strategy explainers",
    icon: "calculator",
    color: "from-green-500 to-emerald-500",
    sortOrder: 2,
    isActive: true,
  },
  {
    name: "Bookkeeping Academy",
    slug: "bookkeeping",
    description: "Best practices, QBO hacks, and monthly close checklists",
    icon: "book-open",
    color: "from-purple-500 to-indigo-500",
    sortOrder: 3,
    isActive: true,
  },
];

// GET /api/kb/categories — list active categories
router.get(
  "/api/kb/categories",
  requireAuth,
  asyncHandler(async (_req, res) => {
    let categories = await storage.getKbCategories();
    // Auto-seed in non-production if empty
    if (!categories.length && (process.env.NODE_ENV || "development") !== "production") {
      for (const cat of DEFAULT_CATEGORIES) {
        const existing = await db
          .select({ id: kbCategories.id })
          .from(kbCategories)
          .where(eq(kbCategories.slug, cat.slug))
          .limit(1);
        if (!existing.length) {
          await db.insert(kbCategories).values(cat as any);
        } else {
          // Reactivate and sync metadata
          await db
            .update(kbCategories)
            .set({
              name: cat.name,
              description: cat.description as any,
              icon: cat.icon,
              color: cat.color,
              sortOrder: cat.sortOrder,
              isActive: true,
              updatedAt: new Date() as any,
            } as any)
            .where(eq(kbCategories.slug, cat.slug));
        }
      }
      categories = await storage.getKbCategories();
    }
    return res.json(categories);
  })
);

// GET /api/kb/articles — list articles with optional filters
const ArticlesQuerySchema = z.object({
  categoryId: z.string().optional(),
  status: z.string().optional(),
  featured: z.string().optional(),
  title: z.string().optional(),
});

router.get(
  "/api/kb/articles",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = ArticlesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid query", errors: parsed.error.errors });
    }

    const { categoryId, status, featured, title } = parsed.data;
    const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
    const featuredBool =
      featured !== undefined ? featured === "true" || featured === "1" : undefined;

    const articles = await storage.getKbArticles(categoryIdNum, status, featuredBool, title);

    return res.json(articles);
  })
);

// GET /api/kb/search?q=...
const SearchQuerySchema = z.object({ q: z.string().min(1) });
router.get(
  "/api/kb/search",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = SearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid query", errors: parsed.error.errors });
    }

    const q = parsed.data.q.trim();
    if (q.length < 2) return res.json([]);

    const results = await storage.searchKbArticles(q);

    // Best-effort: record search history if user available
    try {
      const rawId = (req as any).user?.id;
      let userId: number | undefined = undefined;
      if (typeof rawId === "string") {
        const parsed = parseInt(rawId, 10);
        if (Number.isFinite(parsed)) userId = parsed;
      } else if (typeof rawId === "number") {
        userId = rawId;
      }
      await storage.recordKbSearch({
        ...(userId ? { userId } : {}),
        query: q,
        resultsCount: results.length,
      } as any);
    } catch (err) {
      console.warn("[KB] Failed to record search:", (err as any)?.message || err);
    }

    return res.json(results);
  })
);

export default router;

// Admin-only: seed default KB categories (idempotent)
router.post(
  "/api/admin/kb/seed-defaults",
  requireAuth,
  asyncHandler(async (req, res) => {
    const role = (req as any).user?.role || (req as any).principal?.role;
    if (role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const defaults = DEFAULT_CATEGORIES;

    let created = 0;
    let skipped = 0;

    for (const cat of defaults) {
      const existing = await db
        .select({ id: kbCategories.id })
        .from(kbCategories)
        .where(eq(kbCategories.slug, cat.slug))
        .limit(1);
      if (existing.length > 0) {
        // Reactivate and sync metadata
        await db
          .update(kbCategories)
          .set({
            name: cat.name,
            description: cat.description as any,
            icon: cat.icon,
            color: cat.color,
            sortOrder: cat.sortOrder,
            isActive: true,
            updatedAt: new Date() as any,
          } as any)
          .where(eq(kbCategories.slug, cat.slug));
        skipped++;
      } else {
        await db.insert(kbCategories).values(cat as any);
        created++;
      }
    }

    return res.json({ status: "ok", created, skipped });
  })
);

// =============================
// KB Article CRUD (admin-only)
// =============================

// Helper to parse numeric user id from req.user
function getUserId(req: any): number | undefined {
  const rawId = req?.user?.id;
  if (typeof rawId === "number") return rawId;
  if (typeof rawId === "string") {
    const n = parseInt(rawId, 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function ensureAdmin(req: any, res: any): boolean {
  const role = req?.user?.role || req?.principal?.role;
  if (role !== "admin") {
    res.status(403).json({ message: "Admin only" });
    return false;
  }
  return true;
}

// Create article
router.post(
  "/api/kb/articles",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    // Accept body and validate minimal fields; authorId enforced from session
    const schema = insertKbArticleSchema.pick({
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      categoryId: true,
      status: true,
      featured: true,
      tags: true,
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.errors });
    }
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ message: "Missing user id" });

    const payload = {
      ...parsed.data,
      authorId: userId,
    } as any;

    const article = await storage.createKbArticle(payload);
    return res.status(201).json(article);
  })
);

// Update article
router.patch(
  "/api/kb/articles/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    // Allow partial updates but prevent authorId changes via API
    const partial = insertKbArticleSchema.omit({ authorId: true }).partial();
    const parsed = partial.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.errors });
    }

    const updated = await storage.updateKbArticle(id, parsed.data as any);
    return res.json(updated);
  })
);

// Archive article
router.patch(
  "/api/kb/articles/:id/archive",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }
    await storage.archiveKbArticle(id);
    return res.json({ success: true });
  })
);

// Delete article
router.delete(
  "/api/kb/articles/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }
    await storage.deleteKbArticle(id);
    return res.json({ success: true });
  })
);

// AI metadata generation (lightweight heuristic; no external calls)
router.post(
  "/api/kb/ai/generate-metadata",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    const content = String(req.body?.content || "");
    const title = String(req.body?.title || "");
    if (!content || !title) {
      return res.status(400).json({ message: "content and title are required" });
    }
    const strip = (html: string) =>
      html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const text = strip(content);
    const excerpt = (text || title).slice(0, 220).trim();
    const words = text.toLowerCase().match(/[a-z0-9-]{3,}/g) || [];
    const stop = new Set([
      "the",
      "and",
      "for",
      "with",
      "that",
      "this",
      "from",
      "into",
      "your",
      "you",
      "are",
      "our",
      "one",
      "two",
      "three",
      "best",
      "how",
      "what",
      "when",
      "where",
      "why",
      "can",
      "will",
      "have",
      "has",
      "was",
      "were",
      "not",
      "all",
      "any",
      "use",
      "using",
      "based",
    ]);
    const count = new Map<string, number>();
    for (const w of words) {
      if (stop.has(w)) continue;
      count.set(w, (count.get(w) || 0) + 1);
    }
    const tags = Array.from(count.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w]) => w);
    return res.json({ excerpt, tags });
  })
);

// Admin-only demo content seeder (articles)
router.post(
  "/api/admin/kb/seed-demo-articles",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    const userId = getUserId(req) || 1;
    const cats = await storage.getKbCategories();

    let created = 0;
    for (const c of cats) {
      const existing = await storage.getKbArticles(c.id);
      if (existing && existing.length > 0) continue;
      const now = Date.now();
      const samples = [
        {
          title: `${c.name}: Overview`,
          slug: `${c.slug}-overview-${now}`,
          excerpt: `Overview of ${c.name}.`,
          content: `<h1>${c.name} Overview</h1><p>Welcome to the ${c.name} category. This article provides a quick introduction and links to helpful resources.</p>`,
          categoryId: c.id,
          authorId: userId,
          status: "published",
          featured: true,
          tags: [c.slug, "overview"],
        },
        {
          title: `${c.name}: Getting Started`,
          slug: `${c.slug}-getting-started-${now + 1}`,
          excerpt: `Getting started guide for ${c.name}.`,
          content: `<h1>Getting Started</h1><p>This guide will help you get started with ${c.name} quickly.</p>`,
          categoryId: c.id,
          authorId: userId,
          status: "published",
          featured: false,
          tags: [c.slug, "guide"],
        },
      ];
      for (const s of samples) {
        await storage.createKbArticle(s as any);
        created++;
      }
    }
    return res.json({ status: "ok", created });
  })
);

/**
 * Router Index
 *
 * Mounts all domain routers under their respective paths.
 * This is the main entry point for all API routes.
 */

import type { Express } from "express";
import { logger } from "../logger";
import webhooksRouter from "./webhooks";
import userRouter from "./user";
import appAliasesRouter from "./app-aliases";
import approvalCodesRouter from "./approval-codes";
import dealsRouter from "./deals";
import salesRepsRouter from "./sales-reps";
import adminRouter from "./admin";
import crmRouter from "./crm";
import calculatorRouter from "./calculator";
import approvalRouter from "./approval";
import aiRouter from "./ai";
import kbRouter from "./kb";
import schedulerRouter from "./scheduler";
import cadenceRouter from "./cadence";
import emailRouter from "./email";
import emailEventsRouter from "./email-events.routes";
import jobsRouter from "./jobs.routes";
import authRouter from "./auth";
import stripeRouter from "./stripe";
import cdnRouter from "./cdn";
import clientIntelRouter from "./client-intel";
import infraRouter from "./infra";
import adminAuthzRouter from "./admin-authz";
import adminRbacRouter from "./admin-rbac";
import debugRouter from "./debug";
import commissionsRouter from "./commissions";

/**
 * Mount all domain routers
 *
 * Each router handles a specific domain of the application:
 * - webhooks: External service webhooks (Stripe, etc.)
 * - user: User profile, preferences, and email signatures
 * - app-aliases: Backward-compatible app namespace redirects
 * - approval-codes: Cleanup override approval codes
 * - deals: HubSpot deal/quote sync operations
 * - calculator: Pricing calculations and quote management
 * - approval: Quote approval workflows
 * - ai: AI-powered features
 *
 * @param app - Express application instance
 */
export function mountRouters(app: Express): void {
  // Webhooks (must be early for raw body middleware)
  app.use(webhooksRouter);

  // Authentication and session helpers
  app.use(authRouter);

  // User management (profile, preferences, signatures)
  app.use(userRouter);

  // App namespace aliases (SeedQC, SeedPay redirects)
  app.use(appAliasesRouter);

  // Approval codes (cleanup overrides)
  app.use(approvalCodesRouter);

  // HubSpot deals and quote sync
  app.use(dealsRouter);

  // Sales reps and bonuses
  app.use(salesRepsRouter);

  // Commissions tracking and approval
  app.use(commissionsRouter);

  // Client Intelligence
  app.use(clientIntelRouter);

  // Admin diagnostics and management
  app.use(adminRouter);

  // Admin authorization diagnostics and policy
  app.use(adminAuthzRouter);
  app.use(adminRbacRouter);

  // Calculator and quote management
  app.use(calculatorRouter);

  // Quote approval workflows
  app.use(approvalRouter);

  // AI-powered features
  app.use(aiRouter);

  // Infrastructure (queue metrics, cache, job status)
  app.use(infraRouter);

  // Stripe
  app.use(stripeRouter);

  // CDN & Assets
  app.use(cdnRouter);

  // CRM (Client Profiles v2)
  app.use(crmRouter);

  // Knowledge Base (SEEDKB)
  app.use(kbRouter);

  // Scheduler (Phase 4A)
  app.use(schedulerRouter);

  // Sales Cadence (Phase A.2)
  app.use(cadenceRouter);

  // Email SSE Events (Real-time sync notifications) - MUST be before emailRouter
  // Uses absolute path /api/email/events/:accountId (consistent with other email routes)
  app.use(emailEventsRouter);

  // Email Client (SeedMail)
  app.use(emailRouter);

  // Job Queue Management
  app.use("/api/jobs", jobsRouter);

  // Debug/Test endpoints
  app.use(debugRouter);

  logger.info("✅ All domain routers mounted successfully");
}

/**
 * Get router statistics
 * Useful for monitoring and debugging
 */
interface RouterStats {
  routers: {
    user: string;
    deals: string;
    calculator: string;
    approval: string;
    ai: string;
    crm: string;
    auth: string;
    clientIntel: string;
    infra: string;
    stripe: string;
    cdn: string;
    adminAuthz: string;
    adminRbac: string;
    debug: string;
    commissions: string;
    scheduler: string;
    cadence: string;
    email: string;
  };
  mounted: boolean;
  timestamp: string;
}

export function getRouterStats(): RouterStats {
  return {
    routers: {
      user: "User management",
      deals: "HubSpot operations",
      calculator: "Pricing & quotes",
      approval: "Quote approvals",
      ai: "AI features",
      crm: "Client Profiles v2",
      auth: "Auth helpers",
      clientIntel: "Client Intelligence",
      infra: "Queue & Cache metrics",
      stripe: "Stripe analytics",
      cdn: "CDN & Assets",
      adminAuthz: "Authorization diagnostics",
      adminRbac: "RBAC management",
      commissions: "Commission tracking & approval",
      scheduler: "Scheduling APIs",
      cadence: "Sales Cadence APIs",
      email: "Email Client (SeedMail)",
    },
    mounted: true,
    timestamp: new Date().toISOString(),
  };
}

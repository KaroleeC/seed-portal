/**
 * Router Index
 *
 * Mounts all domain routers under their respective paths.
 * This is the main entry point for all API routes.
 */

import type { Express } from "express";
import { logger } from "../logger";
import dealsRouter from "./deals";
import crmRouter from "./crm";
import calculatorRouter from "./calculator";
import approvalRouter from "./approval";
import aiRouter from "./ai";
import kbRouter from "./kb";
import schedulerRouter from "./scheduler";
import cadenceRouter from "./cadence";
import emailRouter from "./email";
import jobsRouter from "./jobs.routes";

/**
 * Mount all domain routers
 *
 * Each router handles a specific domain of the application:
 * - deals: HubSpot deal/quote sync operations
 * - calculator: Pricing calculations and quote management
 * - approval: Quote approval workflows
 * - ai: AI-powered features
 *
 * @param app - Express application instance
 */
export function mountRouters(app: Express): void {
  // HubSpot deals and quote sync
  app.use(dealsRouter);

  // Calculator and quote management
  app.use(calculatorRouter);

  // Quote approval workflows
  app.use(approvalRouter);

  // AI-powered features
  app.use(aiRouter);

  // CRM (Client Profiles v2)
  app.use(crmRouter);

  // Knowledge Base (SEEDKB)
  app.use(kbRouter);

  // Scheduler (Phase 4A)
  app.use(schedulerRouter);

  // Sales Cadence (Phase A.2)
  app.use(cadenceRouter);

  // Email Client (SeedMail)
  app.use(emailRouter);

  // Job Queue Management
  app.use("/api/jobs", jobsRouter);

  logger.info("✅ All domain routers mounted successfully");
}

/**
 * Get router statistics
 * Useful for monitoring and debugging
 */
interface RouterStats {
  routers: {
    deals: string;
    calculator: string;
    approval: string;
    ai: string;
    crm: string;
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
      deals: "HubSpot operations",
      calculator: "Pricing & quotes",
      approval: "Quote approvals",
      ai: "AI features",
      crm: "Client Profiles v2",
      scheduler: "Scheduling APIs",
      cadence: "Sales Cadence APIs",
      email: "Email Client (SeedMail)",
    },
    mounted: true,
    timestamp: new Date().toISOString(),
  };
}

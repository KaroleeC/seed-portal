import { Router } from "express";
import { requireAuth } from "../middleware/supabase-auth";
import { storage } from "../storage";
import { getErrorMessage } from "../utils/error-handling";

const router = Router();

// PRODUCTION DEBUG ENDPOINT - Critical for debugging auth issues
router.get("/api/production-debug", async (req: any, res) => {
  console.log("[ProductionDebug] 🔍 COMPREHENSIVE PRODUCTION DEBUG REQUEST");

  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.REPLIT_DEPLOYMENT === "1" ||
    (process.env.REPL_ID && !process.env.REPL_SLUG?.includes("workspace"));

  let dbHealth = "UNKNOWN";
  try {
    await storage.getUserByEmail("test@test.com");
    dbHealth = "CONNECTED";
  } catch (error: unknown) {
    dbHealth = `ERROR: ${getErrorMessage(error)}`;
  }

  const debugInfo = {
    timestamp: new Date().toISOString(),
    criticalEnvironment: {
      nodeEnv: process.env.NODE_ENV || "NOT_SET",
      replitDeployment: process.env.REPLIT_DEPLOYMENT || "NOT_SET",
      replId: process.env.REPL_ID ? "EXISTS" : "NOT_SET",
      replSlug: process.env.REPL_SLUG || "NOT_SET",
      isProduction,
      port: process.env.PORT || "NOT_SET",
    },
    authentication: {
      sessionSecret: !!process.env.SESSION_SECRET,
      sessionSecretLength: process.env.SESSION_SECRET ? process.env.SESSION_SECRET.length : 0,
      hasCurrentSession: !!req.session,
      sessionId: req.sessionID || "NO_SESSION",
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      currentUser: req.user?.email || "NOT_AUTHENTICATED",
      sessionKeys: req.session ? Object.keys(req.session) : [],
      passportInSession: !!(req.session as any)?.passport,
    },
    storage: {
      databaseUrl: !!process.env.DATABASE_URL,
      databaseHealth: dbHealth,
      sessionStore: (req.sessionStore as any)?.constructor?.name || "UNKNOWN",
    },
    cookieConfig: {
      secure: isProduction,
      sameSite: "lax",
      httpOnly: true,
      maxAge: "24h",
    },
    requestContext: {
      origin: req.headers.origin || "NO_ORIGIN",
      host: req.headers.host,
      userAgent: `${req.headers["user-agent"]?.substring(0, 50)}...`,
      cookies: !!req.headers.cookie,
      cookieCount: req.headers.cookie ? req.headers.cookie.split(";").length : 0,
    },
  };

  console.log("[ProductionDebug] 🔍 Complete debug info:", JSON.stringify(debugInfo, null, 2));
  res.json(debugInfo);
});

// Test endpoint to check global variables
router.get("/api/test/globals", (req: any, res) => {
  console.log("[GlobalTest] Checking global variables...");
  console.log("[GlobalTest] sessionStoreType:", (global as any).sessionStoreType);
  console.log("[GlobalTest] sessionStore exists:", !!(global as any).sessionStore);

  res.json({
    globalStoreType: (global as any).sessionStoreType || "NOT SET",
    globalStoreExists: !!(global as any).sessionStore,
    sessionStoreFromReq: (req.session as any)?.store?.constructor?.name || "NOT DETECTED",
    timestamp: new Date().toISOString(),
  });
});

// Cookie verification endpoint
router.get("/api/test/cookie-verification", (req: any, res) => {
  console.log("[CookieTest] Testing cookie transmission...");
  console.log("[CookieTest] Incoming cookies:", req.headers.cookie || "NONE");
  console.log("[CookieTest] Session ID:", req.sessionID);
  console.log("[CookieTest] Session exists:", !!req.session);

  res.cookie("test-cookie", "cookie-works", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1",
    sameSite: "lax",
    maxAge: 60000,
  });

  res.json({ ok: true });
});

// Test endpoint for database operations
router.get("/api/test/db-quote", requireAuth, async (req: any, res) => {
  console.log("🔵 TEST DB ENDPOINT - Testing direct database operations");
  try {
    const testQuote = {
      contactEmail: "test@example.com",
      companyName: "Test Company",
      monthlyFee: "100.00",
      setupFee: "200.00",
      taasMonthlyFee: "0.00",
      taasPriorYearsFee: "0.00",
      ownerId: req.user!.id,
      includesBookkeeping: true,
      includesTaas: false,
      archived: false,
      quoteType: "bookkeeping",
      entityType: "LLC",
      numEntities: 1,
      customNumEntities: null,
      statesFiled: 1,
      customStatesFiled: null,
      internationalFiling: false,
      numBusinessOwners: 1,
      customNumBusinessOwners: null,
      monthlyRevenueRange: "10K-25K",
      monthlyTransactions: "100-300",
      industry: "Professional Services",
      cleanupMonths: 8,
      cleanupComplexity: "0.25",
      cleanupOverride: false,
      overrideReason: "",
      customOverrideReason: "",
      customSetupFee: "",
      serviceBookkeeping: true,
      serviceTaas: false,
      servicePayroll: false,
      serviceApLite: false,
      serviceArLite: false,
      contactFirstName: "Test",
      contactLastName: "User",
      clientStreetAddress: "",
      clientCity: "",
      clientState: "CO",
      clientZipCode: "",
      accountingBasis: "Cash",
    } as any;

    const result = await storage.createQuote(testQuote);
    res.json({ success: true, testResult: result, message: "Database test completed" });
  } catch (error) {
    console.error("🚨 TEST ERROR:", error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

export default router;

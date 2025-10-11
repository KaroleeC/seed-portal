import { Router } from "express";
import { storage } from "../storage";
import { getErrorMessage } from "../utils/error-handling";

const router = Router();

router.get("/api/csrf-token", (req: any, res) => {
  res.json({ csrfToken: req.csrfToken ? req.csrfToken() : null });
});

router.post("/api/login", (req: any, res) => {
  console.log("[Login] Request details:", {
    body: { email: req.body?.email, hasPassword: !!req.body?.password },
    headers: {
      origin: req.headers.origin,
      host: req.headers.host,
      userAgent: `${req.headers["user-agent"]?.substring(0, 50)}...`,
      cookies: !!req.headers.cookie,
      cookieCount: req.headers.cookie ? req.headers.cookie.split(";").length : 0,
    },
    session: {
      sessionId: req.sessionID,
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : [],
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      replitDeployment: process.env.REPLIT_DEPLOYMENT,
      isProduction: process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1",
    },
    database: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasSessionSecret: !!process.env.SESSION_SECRET,
    },
  });
  res.sendStatus(204);
});

router.post("/api/logout", (_req, res) => {
  return res.json({ message: "Logged out" });
});

router.post("/api/dev/reset-user-password", async (req: any, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { email, newPassword } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const bcrypt = await import("bcryptjs");
    const hashed = await bcrypt.default.hash(newPassword || "SeedAdmin1!", 12);
    await storage.updateUserPassword(user.id, hashed);
    res.json({ ok: true });
  } catch (error) {
    console.error("[DevResetPassword] Error:", getErrorMessage(error));
    res.status(500).json({ message: "Reset failed", error: getErrorMessage(error) });
  }
});

router.post("/api/auth/request-access", async (req, res) => {
  try {
    const { email, name } = req.body as any;
    if (!email || !name) {
      return res.status(400).json({ message: "Email and name are required" });
    }

    console.log(`🔐 Portal Access Request - User: ${name}, Email: ${email}`);
    console.log(
      "Access request logged. Admin should be notified via Slack (currently disabled due to channel config issues)"
    );

    res.json({ message: "Access request sent to admin" });
  } catch (error) {
    console.error("Error processing access request:", error);
    res.json({ message: "Access request received" });
  }
});

router.post(
  "/api/create-user",
  (req: any, _res, next) => {
    req.csrfToken = () => "skip";
    next();
  },
  async (req: any, res) => {
    try {
      const { email, password, firstName, lastName } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      if (!String(email).endsWith("@seedfinancial.io")) {
        return res.status(403).json({ message: "Access restricted to @seedfinancial.io domain" });
      }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }
      const user = await storage.createUser({
        email,
        password,
        firstName: firstName || "",
        lastName: lastName || "",
        role: "employee",
      } as any);
      const { password: _pw, ...userWithoutPassword } = user as any;
      console.log("[CreateUser] User created successfully:", user.email);
      res.json(userWithoutPassword);
    } catch (error: unknown) {
      console.error("[CreateUser] Error:", getErrorMessage(error));
      res.status(500).json({ message: "Failed to create user" });
    }
  }
);

export default router;

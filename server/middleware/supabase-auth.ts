import { createClient } from "@supabase/supabase-js";
import { storage } from "../storage";
import { logger } from "../logger";
import { db } from "../db";
import type { Request, Response, NextFunction } from "express";
import type { Role, Permission } from "@shared/schema";

// Initialize Supabase client for server-side auth verification
const supabaseUrl = process.env.SUPABASE_URL;
// Prefer the correct Supabase service role key name, fall back to legacy name for compatibility
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.warn(
    "Supabase Auth: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
}

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

// Extended request interface for Supabase Auth
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface AuthenticatedRequest extends Request {
  principal?: {
    userId: number;
    authUserId: string;
    email: string;
    role: string;
    roles?: Role[];
    permissions?: Permission[];
  };
  user?: {
    id: number;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    profilePhoto?: string | null;
    defaultDashboard?: string;
    authUserId?: string | null;
    authProvider?: string | null;
  };
}

/**
 * Supabase Auth middleware for JWT verification
 * Extracts and verifies JWT tokens from Authorization header or sb-access-token cookie
 * Maps Supabase auth users to our app users table
 * Enforces @seedfinancial.io domain restriction
 */
export async function requireSupabaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  try {
    // E2E Test Bypass: Allow test users with special header
    if (process.env.NODE_ENV !== "production" && req.headers["x-e2e-test-user"]) {
      const testEmail = req.headers["x-e2e-test-user"] as string;
      logger.debug(`E2E Test: Bypassing auth for ${testEmail}`);

      // Look up user by email
      const user = await db
        .selectFrom("users")
        .selectAll()
        .where("email", "=", testEmail)
        .executeTakeFirst();

      if (user) {
        req.principal = {
          userId: user.id,
          authUserId: user.auth_user_id || "",
          email: user.email,
          // eslint-disable-next-line rbac/no-direct-role-checks -- Reading role from database for session, not for authorization
          role: user.role || "employee",
          roles: [],
          permissions: [],
        };
        logger.debug(`E2E Test: Authenticated as user ${user.id}`);
        return next();
      }
    }

    logger.debug(
      {
        url: req.originalUrl,
        method: req.method,
        hasAuthHeader: !!req.headers.authorization,
        hasCookie: !!req.headers.cookie,
        timestamp: new Date().toISOString(),
      },
      "SupabaseAuth: processing request"
    );

    if (!supabase) {
      logger.error("SupabaseAuth: Supabase client not initialized");
      return res.status(500).json({
        message: "Authentication service unavailable",
      });
    }

    // Extract token from Authorization header or cookie
    let token: string | null = null;

    // Try Authorization header first (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
      logger.debug("SupabaseAuth: token extracted from Authorization header");
    }

    // Fallback to sb-access-token cookie
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(";");
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split("=");
        if (name === "sb-access-token" && value) {
          token = value;
          logger.debug("SupabaseAuth: token extracted from cookie");
          break;
        }
      }
    }

    if (!token) {
      logger.warn("SupabaseAuth: no token found in request");
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Verify token with Supabase Auth
    logger.debug("SupabaseAuth: verifying token with Supabase");
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !authUser) {
      logger.warn({ err: error }, "SupabaseAuth: token verification failed");
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    logger.debug(
      {
        authUserId: authUser.id,
        email: authUser.email,
        emailVerified: !!authUser.email_confirmed_at,
      },
      "SupabaseAuth: token verified"
    );

    // Enforce @seedfinancial.io domain restriction
    if (!authUser.email || !authUser.email.endsWith("@seedfinancial.io")) {
      logger.warn({ email: authUser.email }, "SupabaseAuth: domain restriction failed");
      return res.status(403).json({
        message: "Access restricted to @seedfinancial.io domain",
      });
    }

    // Load or create app user by auth_user_id (with email fallback)
    logger.debug("SupabaseAuth: loading app user");
    let appUser = await storage.getUserByAuthUserId(authUser.id);

    if (!appUser) {
      // Fallback: try to find by email and link the accounts
      logger.debug("SupabaseAuth: no user found by auth_user_id, trying email fallback");
      appUser = await storage.getUserByEmail(authUser.email);

      if (appUser) {
        // Link existing user to Supabase Auth
        logger.debug("SupabaseAuth: linking existing user to Supabase Auth");
        appUser = await storage.updateUserAuthUserId(appUser.id, authUser.id);
      } else {
        // Create new user
        logger.info("SupabaseAuth: creating new user");

        // Determine role - admin for allowlisted emails, employee for others
        const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST || "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const role = allowlist.includes(String(authUser.email || "").toLowerCase())
          ? "admin"
          : "employee";

        appUser = await storage.createUser({
          email: authUser.email,
          password: null, // No password needed for Supabase Auth users
          firstName: authUser.user_metadata?.first_name || "",
          lastName: authUser.user_metadata?.last_name || "",
          authUserId: authUser.id,
          authProvider: "supabase",
          role,
          profilePhoto: authUser.user_metadata?.avatar_url ?? null,
        } as unknown as Parameters<typeof storage.createUser>[0]);

        logger.info(
          { userId: appUser.id, email: appUser.email, role: appUser.role },
          "SupabaseAuth: created new user"
        );
      }
    }

    // Update last login timestamp
    await storage.updateUserLastLogin(appUser.id);

    // Load user's RBAC information
    let userRoles: Role[] = [];
    let userPermissions: Permission[] = [];
    try {
      const { getUserAuthzInfo } = await import("../services/authz/authorize");
      const authzInfo = await getUserAuthzInfo(appUser.id);
      userRoles = authzInfo.roles;
      userPermissions = authzInfo.permissions;
    } catch (error) {
      logger.warn({ err: error }, "SupabaseAuth: failed to load RBAC info");
    }

    // Attach principal to request
    // eslint-disable-next-line no-param-reassign
    req.principal = {
      userId: appUser.id,
      authUserId: authUser.id,
      email: appUser.email,
      role: appUser.role || "employee",
      roles: userRoles,
      permissions: userPermissions,
    };

    // For backward compatibility, also attach user to req.user
    // eslint-disable-next-line no-param-reassign
    (req as AuthenticatedRequest).user = appUser;

    logger.info(
      { userId: appUser.id, email: appUser.email, role: appUser.role },
      "SupabaseAuth: authentication successful"
    );

    next();
  } catch (error: unknown) {
    logger.error({ err: error, url: req.originalUrl }, "SupabaseAuth: authentication error");

    return res.status(500).json({
      message: "Authentication service error",
    });
  }
}

/**
 * Main authentication middleware - uses Supabase Auth for all requests
 * This is the canonical requireAuth export used by all routes
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  return requireSupabaseAuth(req as AuthenticatedRequest, res, next);
}

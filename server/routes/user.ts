/**
 * User Routes
 *
 * Handles user profile, preferences, and email signature management.
 *
 * Routes:
 * - GET    /api/user                        Get current user profile
 * - GET    /api/user/preferences/:scope     Get user preferences by scope
 * - PUT    /api/user/preferences/:scope     Update user preferences
 * - GET    /api/user/signature              Get email signature config
 * - PUT    /api/user/signature              Update email signature
 * - POST   /api/upload/signature-image      Upload signature image
 */

import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import { db } from "../db";
import { users, userPreferences } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/supabase-auth";

const router = Router();

// =============================
// Current User Profile
// =============================

/**
 * GET /api/user
 * Returns the currently authenticated user's profile
 */
router.get("/api/user", requireAuth, (req: any, res) => {
  const u = req.user || {};
  res.json({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    profilePhoto: u.profilePhoto,
    phoneNumber: u.phoneNumber,
    address: u.address,
    city: u.city,
    state: u.state,
    zipCode: u.zipCode,
    country: u.country,
    latitude: u.latitude,
    longitude: u.longitude,
    lastWeatherUpdate: u.lastWeatherUpdate,
    lastHubspotSync: u.lastHubspotSync,
    defaultDashboard: u.defaultDashboard,
    isImpersonating: Boolean((req.session as any)?.isImpersonating) || false,
    originalUser: (req.session as any)?.originalUser || null,
  });
});

// =============================
// User Preferences (Cross-Device)
// =============================

/**
 * GET /api/user/preferences/:scope
 * Loads user preferences for a specific scope (e.g., "seedmail", "calculator")
 *
 * @param scope - Preference namespace (e.g., "seedmail", "calculator")
 * @returns JSON object with preferences or null if not set
 */
router.get("/api/user/preferences/:scope", requireAuth, async (req: any, res) => {
  try {
    const scope = String(req.params.scope || "");
    if (!scope) {
      return res.status(400).json({ message: "scope required" });
    }

    const [row] = await db
      .select()
      .from(userPreferences)
      .where(and(eq(userPreferences.userId, req.user.id), eq(userPreferences.scope, scope)))
      .limit(1);

    return res.json(row?.prefs || null);
  } catch (error) {
    console.error("[UserPrefs] load failed", error);
    return res.status(500).json({ message: "Failed to load preferences" });
  }
});

/**
 * PUT /api/user/preferences/:scope
 * Updates user preferences for a specific scope
 *
 * @param scope - Preference namespace
 * @body prefs - Preference data (JSON object)
 * @returns Updated preferences
 */
router.put("/api/user/preferences/:scope", requireAuth, async (req: any, res) => {
  try {
    const scope = String(req.params.scope || "");
    if (!scope) {
      return res.status(400).json({ message: "scope required" });
    }

    const prefs = (req.body?.prefs ?? req.body) || {};

    // Check if preferences already exist
    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(and(eq(userPreferences.userId, req.user.id), eq(userPreferences.scope, scope)))
      .limit(1);

    if (existing) {
      // Update existing preferences
      const [updated] = await db
        .update(userPreferences)
        .set({ prefs, updatedAt: new Date() })
        .where(and(eq(userPreferences.userId, req.user.id), eq(userPreferences.scope, scope)))
        .returning();

      return res.json(updated?.prefs || prefs);
    }

    // Insert new preferences
    const [inserted] = await db
      .insert(userPreferences)
      .values({ userId: req.user.id, scope, prefs } as any)
      .returning();

    return res.json(inserted?.prefs || prefs);
  } catch (error) {
    console.error("[UserPrefs] save failed", error);
    return res.status(500).json({ message: "Failed to save preferences" });
  }
});

// =============================
// Email Signature Management
// =============================

/**
 * GET /api/user/signature
 * Returns the user's email signature configuration
 *
 * @returns { config: object | null, enabled: boolean }
 */
router.get("/api/user/signature", requireAuth, async (req: any, res) => {
  try {
    const [user] = await db
      .select({
        emailSignature: users.emailSignature,
        emailSignatureEnabled: users.emailSignatureEnabled,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    // Parse the signature config from JSON if it exists
    let config = null;
    if (user?.emailSignature) {
      try {
        config = JSON.parse(user.emailSignature);
      } catch (e) {
        // If it's not JSON, treat it as legacy HTML signature
        config = null;
      }
    }

    return res.json({
      config,
      enabled: user?.emailSignatureEnabled ?? true,
    });
  } catch (error) {
    console.error("[Signature] load failed", error);
    return res.status(500).json({ message: "Failed to load signature" });
  }
});

/**
 * PUT /api/user/signature
 * Updates the user's email signature configuration
 *
 * @body config - Signature configuration object
 * @body enabled - Whether signature is enabled
 * @returns { config, enabled, message }
 */
router.put("/api/user/signature", requireAuth, async (req: any, res) => {
  try {
    const { config, enabled } = req.body;

    // Store the config as JSON string
    const configJson = config ? JSON.stringify(config) : null;

    // Generate HTML from config for email sending
    let signatureHtml = null;
    if (config) {
      const { generateSignatureHTML } = await import("../utils/signature-generator");
      signatureHtml = generateSignatureHTML(config);
    }

    await db
      .update(users)
      .set({
        emailSignature: configJson,
        emailSignatureHtml: signatureHtml,
        emailSignatureEnabled: enabled ?? true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user.id));

    return res.json({
      config,
      enabled: enabled ?? true,
      message: "Signature updated successfully",
    });
  } catch (error) {
    console.error("[Signature] save failed", error);
    return res.status(500).json({ message: "Failed to save signature" });
  }
});

// =============================
// Signature Image Upload
// =============================

// Multer configuration for signature image uploads
const signatureUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/**
 * POST /api/upload/signature-image
 * Uploads an image for use in email signatures
 *
 * @body file - Image file (multipart/form-data)
 * @returns { url: string } - Public URL of uploaded image
 */
router.post(
  "/api/upload/signature-image",
  requireAuth,
  signatureUpload.single("file"),
  async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Create Supabase client
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error("[Upload] Supabase not configured");
        return res.status(500).json({ error: "Storage not configured" });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Upload to Supabase Storage
      const fileName = `signature-${req.user.id}-${Date.now()}-${req.file.originalname}`;
      const { data, error } = await supabase.storage
        .from("seed-portal-assets")
        .upload(`signatures/${fileName}`, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error("[Upload] Supabase storage error:", error);
        return res.status(500).json({ error: "Failed to upload to storage" });
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("seed-portal-assets")
        .getPublicUrl(`signatures/${fileName}`);

      return res.json({ url: publicUrlData.publicUrl });
    } catch (error) {
      console.error("[Upload] signature image failed", error);
      return res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;

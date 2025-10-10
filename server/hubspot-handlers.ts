import type { Request, Response } from "express";
import { cache, CachePrefix, CacheTTL } from "./cache";
import { hubSpotService } from "./hubspot";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export async function verifyContactHandler(req: Request, res: Response) {
  try {
    const { email } = (req.body || {}) as { email?: string };
    if (!email) {
      return res.status(400).json({ success: false, error: { message: "Email is required" } });
    }
    if (!hubSpotService) {
      // Envelope + legacy shape for compatibility
      return res.json({
        success: false,
        data: { verified: false },
        verified: false,
        error: "HubSpot integration not configured",
      });
    }
    const cacheKey = cache.generateKey(CachePrefix.HUBSPOT_CONTACT, email);
    const result = await cache.wrap(
      cacheKey,
      () => (hubSpotService as NonNullable<typeof hubSpotService>).verifyContactByEmail(email),
      { ttl: CacheTTL.HUBSPOT_CONTACT }
    );
    // Envelope + legacy shape
    return res.json({ success: true, data: result, ...result });
  } catch (error) {
    console.error("Error verifying contact:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to verify contact",
        code: getErrorMessage(error),
      },
    });
  }
}

export async function searchContactsHandler(req: Request, res: Response) {
  try {
    const { searchTerm } = (req.body || {}) as { searchTerm?: string };
    if (!searchTerm || searchTerm.length < 2) {
      return res.json({ success: true, data: { contacts: [] }, contacts: [] });
    }
    if (!hubSpotService) {
      return res.status(500).json({
        success: false,
        error: { message: "HubSpot integration not configured" },
      });
    }
    const contacts = await hubSpotService.searchContacts(searchTerm);
    // Envelope + legacy shape
    return res.json({ success: true, data: { contacts }, contacts });
  } catch (error) {
    console.error("HubSpot search contacts error:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to search HubSpot contacts",
        code: getErrorMessage(error),
      },
    });
  }
}

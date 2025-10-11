/**
 * Webhook Routes
 *
 * Handles incoming webhooks from external services.
 *
 * Routes:
 * - POST /api/webhooks/stripe - Stripe event webhook (payment events)
 *
 * Note: Raw body middleware must be applied in server/index.ts
 * for webhook signature verification to work correctly.
 */

import { Router, type Request, type Response } from "express";

const router = Router();

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events (payment_intent.succeeded, etc.)
 *
 * Security:
 * - Verifies webhook signature using STRIPE_WEBHOOK_SECRET
 * - Requires raw body buffer (not JSON parsed)
 *
 * @body Raw buffer - Stripe webhook payload
 * @header stripe-signature - Webhook signature
 * @returns { received: true }
 */
router.post("/api/webhooks/stripe", async (req: Request, res: Response) => {
  try {
    const stripeSignature = req.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSignature) {
      console.warn("[Webhook:Stripe] Missing signature header");
      return res.status(401).json({ error: "Missing signature" });
    }

    if (!webhookSecret) {
      console.error("[Webhook:Stripe] STRIPE_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    // Verify signature (req.body is a Buffer from express.raw())
    const { verifyStripeSignature } = await import("../utils/webhook-verify");
    const isValid = verifyStripeSignature(req.body as Buffer, stripeSignature, webhookSecret);

    if (!isValid) {
      console.warn("[Webhook:Stripe] Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Parse event after verification
    const event = JSON.parse(req.body.toString("utf-8"));
    const eventType = event.type || "unknown";
    const eventId = event.id || "unknown";

    console.log("[Webhook:Stripe] Verified event received", {
      eventType,
      eventId,
    });

    // TODO: Process event based on type
    // - payment_intent.succeeded
    // - payment_intent.failed
    // - customer.subscription.updated
    // etc.

    return res.status(200).json({ received: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "unknown";
    console.error("[Webhook:Stripe] Error:", msg);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;

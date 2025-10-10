/**
 * SMS Provider Service (Twilio)
 * Phase 0: Stub implementation
 * Phase 2+: Full Twilio REST API integration
 */

import type { Request } from "express";

export interface SMSMessage {
  to: string;
  body: string;
  from?: string; // Optional: defaults to TWILIO_PHONE_NUMBER
  mediaUrl?: string[]; // MMS support
}

export interface InboundSMSMessage {
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  messageSid: string;
  numMedia?: number;
  mediaUrls?: string[];
}

/**
 * Send an SMS via Twilio REST API
 * Phase 2: Full implementation with error handling
 */
export async function sendSMS(message: SMSMessage): Promise<{ sid: string; status: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhone) {
    throw new Error("Twilio credentials not configured");
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);

    const result = await client.messages.create({
      body: message.body,
      to: message.to,
      from: message.from || twilioPhone,
      mediaUrl: message.mediaUrl,
    });

    console.log("[SMSProvider] SMS sent successfully:", {
      sid: result.sid,
      to: message.to,
      status: result.status,
    });

    return {
      sid: result.sid,
      status: result.status,
    };
  } catch (error) {
    console.error("[SMSProvider] Failed to send SMS:", {
      error: error instanceof Error ? error.message : String(error),
      to: message.to,
    });
    throw error;
  }
}

/**
 * Parse inbound SMS from Twilio webhook payload
 * Normalizes the webhook body into a standard InboundSMSMessage
 */
export function parseInboundSMS(req: Request): InboundSMSMessage {
  const body = req.body as Record<string, unknown>;

  const numMedia = parseInt(String(body.NumMedia || "0"), 10);
  const mediaUrls: string[] = [];

  if (numMedia > 0) {
    for (let i = 0; i < numMedia; i++) {
      const url = body[`MediaUrl${i}`];
      if (url) mediaUrls.push(String(url));
    }
  }

  return {
    from: String(body.From || ""),
    to: String(body.To || ""),
    body: String(body.Body || ""),
    timestamp: new Date(),
    messageSid: String(body.MessageSid || body.SmsSid || `twilio_${Date.now()}`),
    numMedia,
    mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
  };
}

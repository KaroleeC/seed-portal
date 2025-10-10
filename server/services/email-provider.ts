/**
 * Email Provider Service (Mailgun)
 * Phase 0: Stub implementation
 * Phase 2+: Full Mailgun REST API integration
 */

import type { Request } from "express";

export interface EmailMessage {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface InboundEmailMessage {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  timestamp: Date;
  messageId: string;
  headers: Record<string, string>;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    url?: string;
  }>;
}

/**
 * Send an email via Mailgun REST API
 * Phase 2: Full implementation with error handling
 */
export async function sendEmail(message: EmailMessage): Promise<{ id: string; message: string }> {
  const mailgunDomain = process.env.MAILGUN_DOMAIN;
  const mailgunApiKey = process.env.MAILGUN_API_KEY;
  const mailgunBaseUrl = process.env.MAILGUN_BASE_URL || "https://api.mailgun.net/v3";
  const defaultFrom = process.env.MAIL_FROM_DEFAULT || "noreply@seedfinancial.io";

  if (!mailgunDomain || !mailgunApiKey) {
    throw new Error("Mailgun credentials not configured");
  }

  const FormData = (await import("form-data")).default;
  const form = new FormData();

  form.append("from", message.from || defaultFrom);
  form.append("to", Array.isArray(message.to) ? message.to.join(",") : message.to);
  if (message.cc && (Array.isArray(message.cc) ? message.cc.length > 0 : !!message.cc)) {
    form.append("cc", Array.isArray(message.cc) ? message.cc.join(",") : message.cc);
  }
  if (message.bcc && (Array.isArray(message.bcc) ? message.bcc.length > 0 : !!message.bcc)) {
    form.append("bcc", Array.isArray(message.bcc) ? message.bcc.join(",") : message.bcc);
  }
  form.append("subject", message.subject);

  if (message.html) {
    form.append("html", message.html);
  }
  if (message.text) {
    form.append("text", message.text);
  }

  // Add custom headers
  if (message.headers) {
    Object.entries(message.headers).forEach(([key, value]) => {
      form.append(`h:${key}`, value);
    });
  }

  // Add attachments
  if (message.attachments) {
    message.attachments.forEach((att) => {
      form.append("attachment", att.content, {
        filename: att.filename,
        contentType: att.contentType,
      });
    });
  }

  try {
    const response = await fetch(`${mailgunBaseUrl}/${mailgunDomain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${mailgunApiKey}`).toString("base64")}`,
        ...form.getHeaders(),
      },
      body: form as unknown as BodyInit,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mailgun API error (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as { id: string; message: string };

    console.log("[EmailProvider] Email sent successfully:", {
      messageId: result.id,
      to: message.to,
      subject: message.subject,
    });

    return result;
  } catch (error) {
    console.error("[EmailProvider] Failed to send email:", {
      error: error instanceof Error ? error.message : String(error),
      to: message.to,
      subject: message.subject,
    });
    throw error;
  }
}

/**
 * Parse inbound email from Mailgun webhook payload
 * Normalizes the webhook body into a standard InboundEmailMessage
 */
export function parseInboundEmail(req: Request): InboundEmailMessage {
  const body = req.body as Record<string, unknown>;

  return {
    from: String(body.sender || body.from || ""),
    to: String(body.recipient || body.to || ""),
    subject: String(body.subject || "(no subject)"),
    html: body["body-html"] ? String(body["body-html"]) : body.html ? String(body.html) : undefined,
    text: body["body-plain"]
      ? String(body["body-plain"])
      : body.text
        ? String(body.text)
        : undefined,
    timestamp: body.timestamp ? new Date(parseInt(String(body.timestamp), 10) * 1000) : new Date(),
    messageId: String(body["Message-Id"] || body["message-id"] || `mailgun_${Date.now()}`),
    headers: parseMailgunHeaders(body),
    attachments: parseMailgunAttachments(body),
  };
}

function parseMailgunHeaders(body: Record<string, unknown>): Record<string, string> {
  const headers: Record<string, string> = {};

  // Mailgun sends headers as individual fields
  Object.keys(body).forEach((key) => {
    if (key.startsWith("h:") || key.startsWith("H:")) {
      const headerName = key.substring(2);
      headers[headerName] = String(body[key]);
    }
  });

  return headers;
}

function parseMailgunAttachments(
  body: Record<string, unknown>
): Array<{ filename: string; contentType: string; size: number; url?: string }> {
  const attachments: Array<{ filename: string; contentType: string; size: number; url?: string }> =
    [];

  // Mailgun sends attachments as JSON array in 'attachments' field
  if (body.attachments) {
    try {
      const parsed =
        typeof body.attachments === "string" ? JSON.parse(body.attachments) : body.attachments;

      if (Array.isArray(parsed)) {
        parsed.forEach((att: Record<string, unknown>) => {
          attachments.push({
            filename: String(att.filename || att.name || "attachment"),
            contentType: String(
              att["content-type"] || att.contentType || "application/octet-stream"
            ),
            size: Number(att.size) || 0,
            url: att.url ? String(att.url) : undefined,
          });
        });
      }
    } catch (e) {
      console.error("[EmailProvider] Failed to parse attachments:", e);
    }
  }

  return attachments;
}

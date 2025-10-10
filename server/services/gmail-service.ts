/**
 * Gmail API Service
 * Handles Gmail OAuth, email syncing, and message operations
 * Uses Gmail API for both reading and sending emails
 */

import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";

interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface EmailParticipant {
  name?: string;
  email: string;
}

interface ParsedEmail {
  id: string;
  threadId: string;
  from: EmailParticipant;
  to: EmailParticipant[];
  cc?: EmailParticipant[];
  bcc?: EmailParticipant[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  snippet: string;
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  inReplyTo?: string;
  messageReferences?: string[];
  headers: Record<string, string>;
  sentAt: Date;
  receivedAt: Date;
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
  }>;
}

export class GmailService {
  private oauth2Client: any;
  private gmail: gmail_v1.Gmail | null = null;

  constructor(config: GmailConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Get OAuth authorization URL for user to grant access
   */
  getAuthUrl(state?: string): string {
    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify", // For marking read/unread, starring
      "https://www.googleapis.com/auth/gmail.labels",
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent", // Force consent to get refresh token
      state,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expiry_date: number;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      expiry_date: tokens.expiry_date!,
    };
  }

  /**
   * Set credentials for authenticated requests
   */
  setCredentials(accessToken: string, refreshToken: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials.access_token!;
  }

  /**
   * Get user's Gmail profile
   */
  async getProfile(): Promise<{
    emailAddress: string;
    messagesTotal: number;
    threadsTotal: number;
  }> {
    if (!this.gmail) throw new Error("Gmail client not initialized");

    const response = await this.gmail.users.getProfile({ userId: "me" });
    return {
      emailAddress: response.data.emailAddress!,
      messagesTotal: response.data.messagesTotal || 0,
      threadsTotal: response.data.threadsTotal || 0,
    };
  }

  /**
   * List threads with optional query
   */
  async listThreads(
    options: {
      query?: string;
      maxResults?: number;
      pageToken?: string;
      labelIds?: string[];
    } = {}
  ): Promise<{
    threads: Array<{ id: string; snippet: string }>;
    nextPageToken?: string;
    resultSizeEstimate: number;
  }> {
    if (!this.gmail) throw new Error("Gmail client not initialized");

    const response = await this.gmail.users.threads.list({
      userId: "me",
      q: options.query,
      maxResults: options.maxResults || 50,
      pageToken: options.pageToken,
      labelIds: options.labelIds,
    });

    return {
      threads: (response.data.threads || []).map((t) => ({
        id: t.id!,
        snippet: t.snippet || "",
      })),
      nextPageToken: response.data.nextPageToken || undefined,
      resultSizeEstimate: response.data.resultSizeEstimate || 0,
    };
  }

  /**
   * Get full thread details
   */
  async getThread(threadId: string): Promise<ParsedEmail[]> {
    if (!this.gmail) throw new Error("Gmail client not initialized");

    const response = await this.gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "full",
    });

    const messages = response.data.messages || [];
    return messages.map((msg) => this.parseMessage(msg));
  }

  /**
   * Get single message
   */
  async getMessage(messageId: string): Promise<ParsedEmail> {
    if (!this.gmail) throw new Error("Gmail client not initialized");

    const response = await this.gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    return this.parseMessage(response.data);
  }

  /**
   * List messages with optional query
   */
  async listMessages(
    options: {
      query?: string;
      maxResults?: number;
      pageToken?: string;
      labelIds?: string[];
    } = {}
  ): Promise<ParsedEmail[]> {
    if (!this.gmail) throw new Error("Gmail client not initialized");

    const response = await this.gmail.users.messages.list({
      userId: "me",
      q: options.query,
      maxResults: options.maxResults || 50,
      pageToken: options.pageToken,
      labelIds: options.labelIds,
    });

    const messages = response.data.messages || [];

    // Fetch full details for each message
    const fullMessages = await Promise.all(
      messages.map(async (msg) => {
        const fullMsg = await this.gmail!.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "full",
        });
        return this.parseMessage(fullMsg.data);
      })
    );

    return fullMessages;
  }

  /**
   * Send email via Gmail API
   * Supports HTML, attachments, threading, and appears in user's Sent folder
   */
  async sendEmail(options: {
    to: string | string[];
    from: string;
    subject: string;
    html?: string;
    text?: string;
    inReplyTo?: string;
    references?: string[];
    threadId?: string;
    cc?: string[] | string;
    bcc?: string[] | string;
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
      contentBase64?: string; // Support for base64-encoded attachments from drafts
    }>;
  }): Promise<{ id: string; threadId: string; message: string }> {
    const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });

    // Build MIME message
    const boundary = `----boundary_${Date.now()}`;
    const toAddresses = Array.isArray(options.to) ? options.to.join(", ") : options.to;

    let ccAddresses: string | undefined;
    if (options.cc) {
      ccAddresses = Array.isArray(options.cc) ? options.cc.join(", ") : options.cc;
    }

    let bccAddresses: string | undefined;
    if (options.bcc) {
      bccAddresses = Array.isArray(options.bcc) ? options.bcc.join(", ") : options.bcc;
    }

    // Build email headers
    const headers = [
      `From: ${options.from}`,
      `To: ${toAddresses}`,
      ...(ccAddresses ? [`Cc: ${ccAddresses}`] : []),
      ...(bccAddresses ? [`Bcc: ${bccAddresses}`] : []),
      `Subject: ${options.subject}`,
      `MIME-Version: 1.0`,
      ...(options.inReplyTo ? [`In-Reply-To: ${options.inReplyTo}`] : []),
      ...(options.references ? [`References: ${options.references.join(" ")}`] : []),
    ];

    const messageParts: string[] = [];

    // Determine if we have attachments
    const hasAttachments = options.attachments && options.attachments.length > 0;

    if (hasAttachments && options.attachments) {
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      messageParts.push(...headers, "", `--${boundary}`);

      // Add text/html part
      const bodyBoundary = `----body_${Date.now()}`;
      messageParts.push(`Content-Type: multipart/alternative; boundary="${bodyBoundary}"`, "");

      // Text version
      if (options.text) {
        messageParts.push(
          `--${bodyBoundary}`,
          `Content-Type: text/plain; charset="UTF-8"`,
          `Content-Transfer-Encoding: 7bit`,
          "",
          options.text,
          ""
        );
      }

      // HTML version
      if (options.html) {
        messageParts.push(
          `--${bodyBoundary}`,
          `Content-Type: text/html; charset="UTF-8"`,
          `Content-Transfer-Encoding: 7bit`,
          "",
          options.html,
          ""
        );
      }

      messageParts.push(`--${bodyBoundary}--`, "");

      // Add attachments
      for (const att of options.attachments) {
        const contentType = att.contentType || "application/octet-stream";
        let base64Content: string;

        if (att.contentBase64) {
          // Already base64 encoded
          base64Content = att.contentBase64;
        } else if (typeof att.content === "string") {
          // String content - encode to base64
          base64Content = Buffer.from(att.content).toString("base64");
        } else {
          // Buffer content - encode to base64
          base64Content = att.content.toString("base64");
        }

        messageParts.push(
          `--${boundary}`,
          `Content-Type: ${contentType}; name="${att.filename}"`,
          `Content-Disposition: attachment; filename="${att.filename}"`,
          `Content-Transfer-Encoding: base64`,
          "",
          base64Content,
          ""
        );
      }

      messageParts.push(`--${boundary}--`);
    } else {
      // No attachments - simpler structure
      if (options.html && options.text) {
        headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
        messageParts.push(...headers, "", `--${boundary}`);
        messageParts.push(
          `Content-Type: text/plain; charset="UTF-8"`,
          "",
          options.text,
          "",
          `--${boundary}`,
          `Content-Type: text/html; charset="UTF-8"`,
          "",
          options.html,
          "",
          `--${boundary}--`
        );
      } else if (options.html) {
        headers.push(`Content-Type: text/html; charset="UTF-8"`);
        messageParts.push(...headers, "", options.html);
      } else {
        headers.push(`Content-Type: text/plain; charset="UTF-8"`);
        messageParts.push(...headers, "", options.text || "");
      }
    }

    const rawMessage = messageParts.join("\r\n");
    const encodedMessage = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    try {
      const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
          threadId: options.threadId, // Preserve threading
        },
      });

      return {
        id: response.data.id || "",
        threadId: response.data.threadId || "",
        message: "Email sent successfully via Gmail API",
      };
    } catch (error) {
      console.error("[Gmail] Send failed:", error);
      throw new Error(
        `Failed to send email via Gmail: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Mark message as read/unread
   */
  async markAsRead(messageId: string, read: boolean): Promise<void> {
    if (!this.gmail) throw new Error("Gmail client not initialized");

    await this.gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        addLabelIds: read ? [] : ["UNREAD"],
        removeLabelIds: read ? ["UNREAD"] : [],
      },
    });
  }

  /**
   * Star/unstar message
   */
  async starMessage(messageId: string, starred: boolean): Promise<void> {
    if (!this.gmail) throw new Error("Gmail client not initialized");

    await this.gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        addLabelIds: starred ? ["STARRED"] : [],
        removeLabelIds: starred ? [] : ["STARRED"],
      },
    });
  }

  /** Modify labels for a message (generic helper) */
  async modifyMessageLabels(
    messageId: string,
    addLabelIds: string[] = [],
    removeLabelIds: string[] = []
  ): Promise<void> {
    if (!this.gmail) throw new Error("Gmail client not initialized");
    await this.gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: { addLabelIds, removeLabelIds },
    });
  }

  /** Move a message to Trash */
  async trashMessage(messageId: string): Promise<void> {
    if (!this.gmail) throw new Error("Gmail client not initialized");
    await this.gmail.users.messages.trash({ userId: "me", id: messageId });
  }

  /**
   * Get history for incremental sync
   */
  async getHistory(
    startHistoryId: string,
    maxResults: number = 100
  ): Promise<{
    history: any[];
    historyId: string;
  }> {
    if (!this.gmail) throw new Error("Gmail client not initialized");

    const response = await this.gmail.users.history.list({
      userId: "me",
      startHistoryId,
      maxResults,
    });

    return {
      history: response.data.history || [],
      historyId: response.data.historyId!,
    };
  }

  /**
   * Parse Gmail message into standardized format
   */
  private parseMessage(msg: gmail_v1.Schema$Message): ParsedEmail {
    const headers = this.extractHeaders(msg.payload?.headers || []);
    const parts = this.extractParts(msg.payload);

    return {
      id: msg.id!,
      threadId: msg.threadId!,
      from: this.parseEmailAddress(headers.from || ""),
      to: this.parseEmailAddresses(headers.to || ""),
      cc: headers.cc ? this.parseEmailAddresses(headers.cc) : undefined,
      bcc: headers.bcc ? this.parseEmailAddresses(headers.bcc) : undefined,
      subject: headers.subject || "(No Subject)",
      bodyHtml: parts.html,
      bodyText: parts.text,
      snippet: msg.snippet || "",
      labels: msg.labelIds || [],
      isRead: !msg.labelIds?.includes("UNREAD"),
      isStarred: msg.labelIds?.includes("STARRED") || false,
      inReplyTo: headers["in-reply-to"],
      messageReferences: headers.references?.split(" ").filter(Boolean),
      headers,
      sentAt: new Date(parseInt(msg.internalDate || "0")),
      receivedAt: new Date(parseInt(msg.internalDate || "0")),
      attachments: parts.attachments,
    };
  }

  /**
   * Extract headers from Gmail message
   */
  private extractHeaders(headers: gmail_v1.Schema$MessagePartHeader[]): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((header) => {
      if (header.name && header.value) {
        result[header.name.toLowerCase()] = header.value;
      }
    });
    return result;
  }

  /**
   * Extract body parts and attachments from message payload
   */
  private extractParts(payload?: gmail_v1.Schema$MessagePart): {
    html?: string;
    text?: string;
    attachments: Array<{ id: string; filename: string; mimeType: string; size: number }>;
  } {
    const result = {
      html: undefined as string | undefined,
      text: undefined as string | undefined,
      attachments: [] as Array<{ id: string; filename: string; mimeType: string; size: number }>,
    };

    if (!payload) return result;

    const processPart = (part: gmail_v1.Schema$MessagePart) => {
      // Handle attachments
      if (part.filename && part.body?.attachmentId) {
        result.attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType || "application/octet-stream",
          size: part.body.size || 0,
        });
      }

      // Handle body content
      if (part.mimeType === "text/html" && part.body?.data) {
        result.html = Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.mimeType === "text/plain" && part.body?.data) {
        result.text = Buffer.from(part.body.data, "base64").toString("utf-8");
      }

      // Recursively process multipart
      if (part.parts) {
        part.parts.forEach(processPart);
      }
    };

    processPart(payload);
    return result;
  }

  /**
   * Parse email address string into structured format
   */
  private parseEmailAddress(address: string): EmailParticipant {
    const match = address.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    if (match) {
      const emailVal = (match[2] ?? address).trim();
      const nameVal = match[1]?.trim();
      return {
        name: nameVal && nameVal.length > 0 ? nameVal : undefined,
        email: emailVal,
      };
    }
    return { email: address.trim() };
  }

  /**
   * Parse comma-separated email addresses
   */
  private parseEmailAddresses(addresses: string): EmailParticipant[] {
    return addresses.split(",").map((addr) => this.parseEmailAddress(addr.trim()));
  }
}

/**
 * Create Gmail service instance
 */
export function createGmailService(): GmailService {
  const config = {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:5001/api/email/oauth/callback",
  };

  if (!config.clientId || !config.clientSecret) {
    throw new Error("Gmail service requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
  }

  if (!config.redirectUri || config.redirectUri === "undefined/api/email/oauth/callback") {
    throw new Error("Gmail service requires GOOGLE_OAUTH_REDIRECT_URI");
  }

  console.log("[Gmail Service] Config:", {
    clientId: config.clientId ? `${config.clientId.substring(0, 20)}...` : "MISSING",
    hasClientSecret: !!config.clientSecret,
    redirectUri: config.redirectUri,
  });

  return new GmailService(config);
}

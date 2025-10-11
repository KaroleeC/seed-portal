/**
 * MSW Handlers for Gmail API
 * Mocks Gmail API responses for testing email sync functionality
 */

import { http, HttpResponse } from "msw";

// Mock Gmail message data
export const mockGmailMessages = [
  {
    id: "msg-001",
    threadId: "thread-001",
    labelIds: ["INBOX", "UNREAD"],
    snippet: "This is the first test email...",
    internalDate: "1704067200000", // 2024-01-01
    payload: {
      headers: [
        { name: "From", value: "sender@example.com" },
        { name: "To", value: "recipient@example.com" },
        { name: "Subject", value: "Test Email 1" },
        { name: "Date", value: "Mon, 01 Jan 2024 10:00:00 GMT" },
        { name: "Message-ID", value: "<msg-001@example.com>" },
      ],
      mimeType: "text/html",
      body: {
        data: Buffer.from("<p>This is the first test email</p>").toString("base64"),
      },
    },
  },
  {
    id: "msg-002",
    threadId: "thread-001",
    labelIds: ["INBOX"],
    snippet: "This is a reply to the first email...",
    internalDate: "1704153600000", // 2024-01-02
    payload: {
      headers: [
        { name: "From", value: "recipient@example.com" },
        { name: "To", value: "sender@example.com" },
        { name: "Subject", value: "Re: Test Email 1" },
        { name: "Date", value: "Tue, 02 Jan 2024 10:00:00 GMT" },
        { name: "Message-ID", value: "<msg-002@example.com>" },
        { name: "In-Reply-To", value: "<msg-001@example.com>" },
        { name: "References", value: "<msg-001@example.com>" },
      ],
      mimeType: "text/html",
      body: {
        data: Buffer.from("<p>This is a reply</p>").toString("base64"),
      },
    },
  },
  {
    id: "msg-003",
    threadId: "thread-002",
    labelIds: ["INBOX", "IMPORTANT", "STARRED"],
    snippet: "Important email about the project...",
    internalDate: "1704240000000", // 2024-01-03
    payload: {
      headers: [
        { name: "From", value: "boss@company.com" },
        { name: "To", value: "recipient@example.com" },
        { name: "Subject", value: "Project Update" },
        { name: "Date", value: "Wed, 03 Jan 2024 10:00:00 GMT" },
        { name: "Message-ID", value: "<msg-003@company.com>" },
      ],
      mimeType: "text/html",
      body: {
        data: Buffer.from("<p>Important project update</p>").toString("base64"),
      },
    },
  },
];

// Mock Gmail history data
export const mockGmailHistory = {
  history: [
    {
      id: "12345",
      messages: [
        {
          id: "msg-004",
          threadId: "thread-003",
        },
      ],
      messagesAdded: [
        {
          message: {
            id: "msg-004",
            threadId: "thread-003",
            labelIds: ["INBOX", "UNREAD"],
          },
        },
      ],
    },
    {
      id: "12346",
      labelsAdded: [
        {
          message: {
            id: "msg-001",
            threadId: "thread-001",
            labelIds: ["STARRED"],
          },
          labelIds: ["STARRED"],
        },
      ],
    },
  ],
  historyId: "12346",
};

/**
 * Gmail API MSW Handlers
 */
export const gmailHandlers = [
  // List messages
  http.get("https://gmail.googleapis.com/gmail/v1/users/me/messages", ({ request }) => {
    const url = new URL(request.url);
    const maxResults = parseInt(url.searchParams.get("maxResults") || "50");
    const labelIds = url.searchParams.get("labelIds")?.split(",") || [];

    // Filter messages by labels if specified
    let messages = mockGmailMessages;
    if (labelIds.length > 0) {
      messages = messages.filter((msg) =>
        labelIds.some((label) => msg.labelIds.includes(label))
      );
    }

    return HttpResponse.json({
      messages: messages.slice(0, maxResults).map((msg) => ({
        id: msg.id,
        threadId: msg.threadId,
      })),
      resultSizeEstimate: messages.length,
    });
  }),

  // Get message
  http.get("https://gmail.googleapis.com/gmail/v1/users/me/messages/:messageId", ({ params }) => {
    const { messageId } = params;
    const message = mockGmailMessages.find((msg) => msg.id === messageId);

    if (!message) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(message);
  }),

  // Get user profile
  http.get("https://gmail.googleapis.com/gmail/v1/users/me/profile", () => {
    return HttpResponse.json({
      emailAddress: "test@example.com",
      messagesTotal: 100,
      threadsTotal: 50,
      historyId: "12345",
    });
  }),

  // List threads
  http.get("https://gmail.googleapis.com/gmail/v1/users/me/threads", ({ request }) => {
    const url = new URL(request.url);
    const maxResults = parseInt(url.searchParams.get("maxResults") || "50");

    // Group messages by thread
    const threadMap = new Map<string, typeof mockGmailMessages>();
    mockGmailMessages.forEach((msg) => {
      if (!threadMap.has(msg.threadId)) {
        threadMap.set(msg.threadId, []);
      }
      threadMap.get(msg.threadId)!.push(msg);
    });

    const threads = Array.from(threadMap.entries())
      .slice(0, maxResults)
      .map(([threadId, messages]) => ({
        id: threadId,
        snippet: messages[0].snippet,
      }));

    return HttpResponse.json({
      threads,
      resultSizeEstimate: threadMap.size,
    });
  }),

  // Get thread
  http.get("https://gmail.googleapis.com/gmail/v1/users/me/threads/:threadId", ({ params }) => {
    const { threadId } = params;
    const messages = mockGmailMessages.filter((msg) => msg.threadId === threadId);

    if (messages.length === 0) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({
      id: threadId,
      messages,
    });
  }),

  // Get history
  http.get("https://gmail.googleapis.com/gmail/v1/users/me/history", ({ request }) => {
    const url = new URL(request.url);
    const startHistoryId = url.searchParams.get("startHistoryId");

    if (!startHistoryId) {
      return new HttpResponse(null, { status: 400 });
    }

    return HttpResponse.json(mockGmailHistory);
  }),

  // Modify message labels
  http.post(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/:messageId/modify",
    async ({ params }) => {
      const { messageId } = params;
      const message = mockGmailMessages.find((msg) => msg.id === messageId);

      if (!message) {
        return new HttpResponse(null, { status: 404 });
      }

      return HttpResponse.json(message);
    }
  ),

  // Trash message
  http.post(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/:messageId/trash",
    ({ params }) => {
      const { messageId } = params;
      const message = mockGmailMessages.find((msg) => msg.id === messageId);

      if (!message) {
        return new HttpResponse(null, { status: 404 });
      }

      return HttpResponse.json({
        ...message,
        labelIds: [...message.labelIds, "TRASH"],
      });
    }
  ),

  // Send message
  http.post("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", async () => {
    return HttpResponse.json({
      id: "msg-sent-" + Date.now(),
      threadId: "thread-sent-" + Date.now(),
      labelIds: ["SENT"],
    });
  }),
];

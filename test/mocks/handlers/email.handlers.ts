/**
 * Email API Mock Handlers
 * Used by both Vitest tests and Storybook stories
 */

import { http, HttpResponse, delay } from "msw";
import {
  mockEmailThread,
  mockEmailMessage,
  createMockThread,
} from "@/../../test/fixtures/email-fixtures";

export const emailHandlers = [
  // Get email threads
  http.get("/api/email/threads", async () => {
    await delay(100); // Simulate network delay

    return HttpResponse.json({
      threads: [
        mockEmailThread,
        createMockThread({
          id: "2",
          subject: "Follow-up: Quote Request",
          participants: [
            { email: "client2@example.com", name: "Jane Smith" },
            { email: "sales@seedfinancial.com", name: "Sales Team" },
          ],
          messageCount: 3,
        }),
      ],
      total: 2,
    });
  }),

  // Get single thread
  http.get("/api/email/threads/:threadId", async ({ params }) => {
    await delay(100);

    return HttpResponse.json({
      thread: {
        ...mockEmailThread,
        id: params.threadId,
      },
      messages: [mockEmailMessage],
    });
  }),

  // Send email
  http.post("/api/email/send", async ({ request }) => {
    await delay(200);
    const body = await request.json();

    return HttpResponse.json({
      success: true,
      messageId: `msg-${Date.now()}`,
      threadId: body.threadId || `thread-${Date.now()}`,
    });
  }),

  // Star/unstar thread
  http.post("/api/email/threads/:threadId/star", async () => {
    await delay(100);
    return HttpResponse.json({ success: true, isStarred: true });
  }),

  http.delete("/api/email/threads/:threadId/star", async () => {
    await delay(100);
    return HttpResponse.json({ success: true, isStarred: false });
  }),

  // Archive thread
  http.post("/api/email/threads/:threadId/archive", async () => {
    await delay(100);
    return HttpResponse.json({ success: true });
  }),

  // Get drafts
  http.get("/api/email/drafts", async () => {
    await delay(100);
    return HttpResponse.json({ drafts: [] });
  }),

  // Save draft
  http.post("/api/email/drafts", async ({ request }) => {
    await delay(100);
    const body = await request.json();

    return HttpResponse.json({
      id: `draft-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
    });
  }),
];

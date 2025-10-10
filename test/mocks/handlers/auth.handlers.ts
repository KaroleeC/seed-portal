/**
 * Auth API Mock Handlers
 * Used by both Vitest tests and Storybook stories
 */

import { http, HttpResponse, delay } from "msw";

const mockUser = {
  id: 1,
  email: "test@seedfinancial.com",
  name: "Test User",
  role: "sales",
  department: "sales",
  permissions: ["quotes:read", "quotes:write", "email:read", "email:write"],
};

export const authHandlers = [
  // Get current user
  http.get("/api/auth/me", async () => {
    await delay(50);

    return HttpResponse.json({
      user: mockUser,
    });
  }),

  // Login
  http.post("/api/auth/login", async ({ request }) => {
    await delay(150);
    const body = await request.json();

    // Simple mock validation
    if (body.email && body.password) {
      return HttpResponse.json({
        user: mockUser,
        token: "mock-jwt-token",
      });
    }

    return HttpResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }),

  // Logout
  http.post("/api/auth/logout", async () => {
    await delay(50);
    return HttpResponse.json({ success: true });
  }),

  // Check session
  http.get("/api/auth/session", async () => {
    await delay(50);

    return HttpResponse.json({
      authenticated: true,
      user: mockUser,
    });
  }),
];

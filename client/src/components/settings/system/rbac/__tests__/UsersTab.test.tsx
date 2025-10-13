import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { UsersTab } from "../UsersTab";
import * as api from "@/lib/api";

/**
 * UsersTab Component Tests
 *
 * CRITICAL: These tests verify that the component uses authenticated requests.
 * This prevents bugs where components use raw fetch() without Authorization headers.
 */

describe("UsersTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should use apiFetch with Authorization header", async () => {
    // Spy on apiFetch to verify it's called correctly
    const apiFetchSpy = vi.spyOn(api, "apiFetch").mockResolvedValue({
      users: [
        {
          id: 1,
          email: "test@seedfinancial.io",
          firstName: "Test",
          lastName: "User",
          createdAt: new Date().toISOString(),
          roles: [],
        },
      ],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UsersTab />
      </QueryClientProvider>
    );

    // Wait for the component to call apiFetch
    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalled();
    });

    // Verify it was called with correct parameters
    expect(apiFetchSpy).toHaveBeenCalledWith("GET", "/api/admin/rbac/users");

    // Verify it was NOT called with raw fetch()
    expect(global.fetch).not.toHaveBeenCalledWith("/api/admin/rbac/users");
  });

  it("should NOT use raw fetch() for API calls", async () => {
    // Mock apiFetch to succeed
    vi.spyOn(api, "apiFetch").mockResolvedValue({
      users: [],
    });

    // Spy on global fetch to catch unauthorized usage
    const fetchSpy = vi.spyOn(global, "fetch");

    render(
      <QueryClientProvider client={queryClient}>
        <UsersTab />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalled();
    });

    // Verify raw fetch was NOT used for the RBAC API endpoint
    const fetchCalls = fetchSpy.mock.calls;
    const rbacApiCalls = fetchCalls.filter(
      ([url]) => typeof url === "string" && url.includes("/api/admin/rbac/users")
    );

    expect(rbacApiCalls.length).toBe(0);
  });

  it("should handle 401 errors from apiFetch", async () => {
    // Mock apiFetch to throw 401 error
    vi.spyOn(api, "apiFetch").mockRejectedValue(new Error("Unauthenticated"));

    render(
      <QueryClientProvider client={queryClient}>
        <UsersTab />
      </QueryClientProvider>
    );

    // Component should handle error gracefully
    await waitFor(() => {
      // Query should be in error state
      const queries = queryClient.getQueryCache().getAll();
      const usersQuery = queries.find((q) =>
        JSON.stringify(q.queryKey).includes("/api/admin/rbac/users")
      );
      expect(usersQuery?.state.status).toBe("error");
    });
  });

  it("should handle null/undefined departments gracefully", async () => {
    // Mock API returning user with null departments
    vi.spyOn(api, "apiFetch").mockResolvedValue({
      users: [
        {
          id: 1,
          email: "test@seedfinancial.io",
          firstName: "Test",
          lastName: "User",
          createdAt: new Date().toISOString(),
          roles: [],
          departments: null, // NULL value from backend
        },
      ],
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <UsersTab />
      </QueryClientProvider>
    );

    // Should not crash and should show "None"
    await waitFor(() => {
      expect(screen.getByText("None")).toBeInTheDocument();
    });

    // Verify no errors were thrown
    expect(container).toBeInTheDocument();
  });

  it("should handle invalid createdAt dates gracefully", async () => {
    // Mock API returning user with invalid date
    vi.spyOn(api, "apiFetch").mockResolvedValue({
      users: [
        {
          id: 1,
          email: "test@seedfinancial.io",
          firstName: "Test",
          lastName: "User",
          createdAt: null, // NULL date
          roles: [],
          departments: [],
        },
        {
          id: 2,
          email: "test2@seedfinancial.io",
          firstName: "Test2",
          lastName: "User2",
          createdAt: "invalid-date", // INVALID date string
          roles: [],
          departments: [],
        },
      ],
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <UsersTab />
      </QueryClientProvider>
    );

    // Should not crash and should show fallback text
    await waitFor(() => {
      expect(screen.getByText("Unknown")).toBeInTheDocument();
      expect(screen.getByText("Invalid date")).toBeInTheDocument();
    });

    // Verify no errors were thrown
    expect(container).toBeInTheDocument();
  });

  it("should handle missing required fields without crashing", async () => {
    // Mock API returning incomplete user data
    vi.spyOn(api, "apiFetch").mockResolvedValue({
      users: [
        {
          id: 1,
          email: "test@seedfinancial.io",
          // Missing firstName, lastName, createdAt, roles, departments
        },
      ],
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <UsersTab />
      </QueryClientProvider>
    );

    // Should not crash even with missing data
    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalled();
    });

    // Component should render without throwing errors
    expect(container).toBeInTheDocument();
  });

  it("should pass Supabase token to backend via apiFetch", async () => {
    // Mock apiFetch to capture how it's called
    const apiFetchSpy = vi.spyOn(api, "apiFetch").mockResolvedValue({
      users: [],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UsersTab />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalled();
    });

    // apiFetch internally adds Authorization header with Supabase token
    // This test verifies we're using the RIGHT helper that adds auth
    expect(apiFetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/GET/),
      expect.stringMatching(/\/api\/admin\/rbac\/users/)
    );
  });
});

/**
 * INTEGRATION TEST: Verify auth header is actually sent
 *
 * This test mocks the full chain to ensure Authorization header reaches the server.
 */
describe("UsersTab - Auth Header Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should send Authorization header with Supabase token", async () => {
    // Mock Supabase session
    const mockSession = {
      access_token: "mock-supabase-token",
      user: { id: "user-123", email: "test@seedfinancial.io" },
    };

    // Mock supabase.auth.getSession
    vi.mock("@/lib/supabaseClient", () => ({
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
      },
    }));

    // Spy on global fetch to verify Authorization header
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ users: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    // Don't mock apiFetch - let it run naturally
    vi.unmock("@/lib/api");

    render(
      <QueryClientProvider client={queryClient}>
        <UsersTab />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    // Verify fetch was called with Authorization header
    const fetchCall = fetchSpy.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/api/admin/rbac/users")
    );

    expect(fetchCall).toBeDefined();
    const [, options] = fetchCall!;
    expect(options?.headers).toHaveProperty("Authorization");
    expect((options?.headers as any).Authorization).toBe("Bearer mock-supabase-token");
  });
});

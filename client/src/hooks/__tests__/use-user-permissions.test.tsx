import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useUserPermissions } from "../use-user-permissions";
import type { UserPermissionsResponse } from "@/lib/rbac-api";
import type { ReactNode } from "react";

/**
 * useUserPermissions Hook Test Suite
 *
 * Tests the RBAC permissions hook with MSW for API mocking.
 * Validates:
 * - Data fetching and caching
 * - Permission checking functions
 * - Role checking functions
 * - Error handling
 * - Loading states
 */

// Mock user permissions response
const mockUserPermissions: UserPermissionsResponse = {
  userId: 1,
  roles: [
    {
      id: 1,
      name: "admin",
      description: "System administrator with full access",
    },
  ],
  permissions: ["users.view", "users.manage", "quotes.view", "quotes.update", "admin.*"],
  departments: [
    { id: 1, name: "Engineering" },
    { id: 2, name: "Sales" },
  ],
};

// MSW server setup
const server = setupServer(
  http.get("*/api/admin/rbac/user-permissions/:userId", ({ params }) => {
    const { userId } = params;

    if (userId === "1") {
      return HttpResponse.json(mockUserPermissions);
    }

    if (userId === "999") {
      return HttpResponse.json({ error: "User not found" }, { status: 404 });
    }

    return HttpResponse.json({ error: "Invalid userId" }, { status: 400 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Helper to create wrapper with React Query client
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Mock useAuth hook
vi.mock("../use-auth", () => ({
  useAuth: () => ({
    user: { id: 1, email: "test@test.com", role: "admin" },
    isLoading: false,
  }),
}));

describe("useUserPermissions", () => {
  describe("Data Fetching", () => {
    it("should fetch user permissions successfully", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify data structure
      expect(result.current.permissionsData).toEqual(mockUserPermissions);
      expect(result.current.permissions).toEqual(mockUserPermissions.permissions);
      expect(result.current.roles).toEqual(mockUserPermissions.roles);
      expect(result.current.departments).toEqual(mockUserPermissions.departments);
    });

    it("should handle loading state", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.permissionsData).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle errors gracefully", async () => {
      // Override mock to return error
      server.use(
        http.get("*/api/admin/rbac/user-permissions/:userId", () => {
          return HttpResponse.json({ error: "Internal server error" }, { status: 500 });
        })
      );

      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.permissionsData).toBeUndefined();
      expect(result.current.permissions).toEqual([]);
    });
  });

  describe("Permission Checks", () => {
    it("should check if user has a specific permission", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasPermission("users.view")).toBe(true);
      expect(result.current.hasPermission("users.manage")).toBe(true);
      expect(result.current.hasPermission("nonexistent.permission")).toBe(false);
    });

    it("should check if user has ANY of the specified permissions", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasAnyPermission(["users.view", "users.delete"])).toBe(true);

      expect(result.current.hasAnyPermission(["nonexistent1", "nonexistent2"])).toBe(false);
    });

    it("should check if user has ALL of the specified permissions", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasAllPermissions(["users.view", "users.manage"])).toBe(true);

      expect(result.current.hasAllPermissions(["users.view", "nonexistent.permission"])).toBe(
        false
      );
    });

    it("should return false for permission checks when data is not loaded", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      // Before data loads
      expect(result.current.hasPermission("users.view")).toBe(false);
      expect(result.current.hasAnyPermission(["users.view"])).toBe(false);
      expect(result.current.hasAllPermissions(["users.view"])).toBe(false);
    });
  });

  describe("Role Checks", () => {
    it("should check if user has a specific role", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasRole("admin")).toBe(true);
      expect(result.current.hasRole("employee")).toBe(false);
    });

    it("should return false for role checks when data is not loaded", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasRole("admin")).toBe(false);
    });
  });

  describe("Department Checks", () => {
    it("should check if user is in a specific department", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isInDepartment("Engineering")).toBe(true);
      expect(result.current.isInDepartment("Sales")).toBe(true);
      expect(result.current.isInDepartment("Marketing")).toBe(false);
    });
  });

  describe("Helper Functions", () => {
    it("should return all permissions", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const allPermissions = result.current.getAllPermissions();
      expect(allPermissions).toEqual(mockUserPermissions.permissions);
      expect(allPermissions.length).toBe(5);
    });

    it("should return all roles", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const allRoles = result.current.getRoles();
      expect(allRoles).toEqual(mockUserPermissions.roles);
      expect(allRoles.length).toBe(1);
    });

    it("should return all departments", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const allDepartments = result.current.getDepartments();
      expect(allDepartments).toEqual(mockUserPermissions.departments);
      expect(allDepartments.length).toBe(2);
    });

    it("should return empty arrays when data is not loaded", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.getAllPermissions()).toEqual([]);
      expect(result.current.getRoles()).toEqual([]);
      expect(result.current.getDepartments()).toEqual([]);
    });
  });

  describe("Caching Behavior", () => {
    it("should cache permissions data", async () => {
      const { result, rerender } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstData = result.current.permissionsData;

      // Rerender should use cached data
      rerender();

      expect(result.current.permissionsData).toBe(firstData);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Refetch Functionality", () => {
    it("should allow manual refetch", async () => {
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger refetch
      await result.current.refetch();

      expect(result.current.permissionsData).toEqual(mockUserPermissions);
    });
  });
});

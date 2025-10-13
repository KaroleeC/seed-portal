import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import adminRbacRouter from "../admin-rbac";
import type { User, Role, Permission, Department } from "../../../shared/schema";

/**
 * RBAC Admin Routes Test Suite (Simplified with Mocks)
 *
 * Tests the endpoint logic without requiring a real database.
 * Uses mocked storage layer for faster, isolated tests.
 */

// Mock data
const mockUser: User = {
  id: 1,
  email: "test@test.com",
  firstName: "Test",
  lastName: "User",
  role: "admin",
  profilePhoto: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  defaultDashboard: null,
  hubspotUserId: null,
  authUserId: null,
  authProvider: null,
};

const mockRole: Role = {
  id: 1,
  name: "admin",
  description: "System administrator",
  isSystem: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPermission: Permission = {
  id: 1,
  key: "users.view",
  description: "View users",
  category: "users",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDepartment: Department = {
  id: 1,
  name: "Engineering",
  description: "Engineering team",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock storage
vi.mock("../../storage", () => ({
  storage: {
    getUser: vi.fn(),
    getUserRoles: vi.fn(),
    getRolePermissions: vi.fn(),
    getUserDepartments: vi.fn(),
  },
}));

// Import mocked storage
import { storage } from "../../storage";

describe("Admin RBAC Routes (Mocked)", () => {
  let app: Express;

  beforeEach(() => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req: any, res, next) => {
      req.isAuthenticated = () => true;
      req.principal = {
        userId: 1,
        authUserId: "auth-123",
        email: "test@test.com",
        role: "admin",
        roles: [mockRole],
        permissions: [mockPermission],
      };
      next();
    });

    app.use(adminRbacRouter);

    // Reset mocks
    vi.clearAllMocks();
  });

  describe("GET /api/admin/rbac/user-permissions/:userId", () => {
    it("should return user's roles, permissions, and departments", async () => {
      // Setup mocks
      vi.mocked(storage.getUser).mockResolvedValue(mockUser);
      vi.mocked(storage.getUserRoles).mockResolvedValue([mockRole]);
      vi.mocked(storage.getRolePermissions).mockResolvedValue([mockPermission]);
      vi.mocked(storage.getUserDepartments).mockResolvedValue([mockDepartment]);

      const response = await request(app).get("/api/admin/rbac/user-permissions/1").expect(200);

      expect(response.body).toHaveProperty("userId", 1);
      expect(response.body).toHaveProperty("roles");
      expect(response.body).toHaveProperty("permissions");
      expect(response.body).toHaveProperty("departments");

      // Verify structure
      expect(Array.isArray(response.body.roles)).toBe(true);
      expect(Array.isArray(response.body.permissions)).toBe(true);
      expect(Array.isArray(response.body.departments)).toBe(true);

      // Verify role is present
      expect(response.body.roles[0]).toEqual({
        id: mockRole.id,
        name: mockRole.name,
        description: mockRole.description,
      });

      // Verify permission is present
      expect(response.body.permissions).toContain(mockPermission.key);

      // Verify department is present
      expect(response.body.departments[0]).toEqual({
        id: mockDepartment.id,
        name: mockDepartment.name,
      });
    });

    it("should deduplicate roles", async () => {
      // Mock returns duplicate roles
      vi.mocked(storage.getUser).mockResolvedValue(mockUser);
      vi.mocked(storage.getUserRoles).mockResolvedValue([mockRole, mockRole]); // Duplicate!
      vi.mocked(storage.getRolePermissions).mockResolvedValue([mockPermission]);
      vi.mocked(storage.getUserDepartments).mockResolvedValue([]);

      const response = await request(app).get("/api/admin/rbac/user-permissions/1").expect(200);

      // Should be deduplicated
      expect(response.body.roles.length).toBe(1);
      expect(response.body.roles[0].id).toBe(mockRole.id);
    });

    it("should return 404 for non-existent user", async () => {
      vi.mocked(storage.getUser).mockResolvedValue(null);

      const response = await request(app).get("/api/admin/rbac/user-permissions/999").expect(404);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("not found");
    });

    it("should return 400 for invalid userId", async () => {
      const response = await request(app)
        .get("/api/admin/rbac/user-permissions/invalid")
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid userId");
    });

    it("should handle users with no roles", async () => {
      vi.mocked(storage.getUser).mockResolvedValue(mockUser);
      vi.mocked(storage.getUserRoles).mockResolvedValue([]);
      vi.mocked(storage.getRolePermissions).mockResolvedValue([]);
      vi.mocked(storage.getUserDepartments).mockResolvedValue([]);

      const response = await request(app).get("/api/admin/rbac/user-permissions/1").expect(200);

      expect(response.body.roles).toEqual([]);
      expect(response.body.permissions).toEqual([]);
    });

    it("should handle users with multiple roles", async () => {
      const secondRole: Role = {
        ...mockRole,
        id: 2,
        name: "employee",
        description: "Regular employee",
      };

      const secondPermission: Permission = {
        ...mockPermission,
        id: 2,
        key: "quotes.view",
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser);
      vi.mocked(storage.getUserRoles).mockResolvedValue([mockRole, secondRole]);
      vi.mocked(storage.getRolePermissions)
        .mockResolvedValueOnce([mockPermission])
        .mockResolvedValueOnce([secondPermission]);
      vi.mocked(storage.getUserDepartments).mockResolvedValue([]);

      const response = await request(app).get("/api/admin/rbac/user-permissions/1").expect(200);

      // Should have both roles
      expect(response.body.roles.length).toBe(2);

      // Should have permissions from both roles
      expect(response.body.permissions).toContain(mockPermission.key);
      expect(response.body.permissions).toContain(secondPermission.key);
    });

    it("should aggregate permissions from multiple roles without duplicates", async () => {
      const secondRole: Role = {
        ...mockRole,
        id: 2,
        name: "employee",
      };

      // Both roles have the same permission
      vi.mocked(storage.getUser).mockResolvedValue(mockUser);
      vi.mocked(storage.getUserRoles).mockResolvedValue([mockRole, secondRole]);
      vi.mocked(storage.getRolePermissions)
        .mockResolvedValueOnce([mockPermission])
        .mockResolvedValueOnce([mockPermission]); // Same permission!
      vi.mocked(storage.getUserDepartments).mockResolvedValue([]);

      const response = await request(app).get("/api/admin/rbac/user-permissions/1").expect(200);

      // Permission should only appear once
      const permissionCount = response.body.permissions.filter(
        (p: string) => p === mockPermission.key
      ).length;
      expect(permissionCount).toBe(1);
    });

    it("should verify storage methods are called correctly", async () => {
      vi.mocked(storage.getUser).mockResolvedValue(mockUser);
      vi.mocked(storage.getUserRoles).mockResolvedValue([mockRole]);
      vi.mocked(storage.getRolePermissions).mockResolvedValue([mockPermission]);
      vi.mocked(storage.getUserDepartments).mockResolvedValue([]);

      await request(app).get("/api/admin/rbac/user-permissions/1").expect(200);

      // Verify all storage methods were called with correct params
      expect(storage.getUser).toHaveBeenCalledWith(1);
      expect(storage.getUserRoles).toHaveBeenCalledWith(1);
      expect(storage.getRolePermissions).toHaveBeenCalledWith(mockRole.id);
      expect(storage.getUserDepartments).toHaveBeenCalledWith(1);
    });
  });
});

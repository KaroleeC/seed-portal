import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import adminRbacRouter from "../admin-rbac";
import { storage } from "../../storage";
import type { User, Role, Permission } from "@shared/schema";

/**
 * RBAC Admin Routes Test Suite
 *
 * Tests the RBAC management endpoints with proper authorization checks.
 * Follows testing best practices:
 * - Uses Vitest + supertest for API testing
 * - Tests both happy paths and error cases
 * - Validates authorization (permission checks)
 * - Tests user experience (response format, error messages)
 */

describe("Admin RBAC Routes", () => {
  let app: Express;
  let adminUser: User;
  let regularUser: User;
  let testRole: Role;
  let testPermission: Permission;

  beforeAll(async () => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use(adminRbacRouter);

    // Create test users
    adminUser = await storage.createUser({
      email: "admin@test.com",
      password: "test123",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      hubspotUserId: null,
    });

    regularUser = await storage.createUser({
      email: "user@test.com",
      password: "test123",
      firstName: "Regular",
      lastName: "User",
      role: "employee",
      hubspotUserId: null,
    });

    // Create test role and permission
    testRole = await storage.createRole({
      name: "test_role",
      description: "Test role for testing",
      isActive: true,
    });

    testPermission = await storage.createPermission({
      key: "test.permission",
      description: "Test permission",
      category: "test",
      isActive: true,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (adminUser?.id) await storage.deleteUser(adminUser.id);
    if (regularUser?.id) await storage.deleteUser(regularUser.id);
    if (testRole?.id) await storage.deleteRole(testRole.id);
    if (testPermission?.id) await storage.deletePermission(testPermission.id);
  });

  describe("GET /api/admin/rbac/users", () => {
    it("should return all users with their roles", async () => {
      const response = await request(app)
        .get("/api/admin/rbac/users")
        .set("Authorization", `Bearer ${adminUser.id}`) // Mock auth
        .expect(200);

      expect(response.body).toHaveProperty("users");
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);

      const user = response.body.users[0];
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("firstName");
      expect(user).toHaveProperty("lastName");
      expect(user).toHaveProperty("roles");
      expect(Array.isArray(user.roles)).toBe(true);
    });

    it("should require authentication", async () => {
      await request(app).get("/api/admin/rbac/users").expect(401);
    });

    it("should require users.view permission", async () => {
      // This test would check that users without users.view permission get 403
      // Implementation depends on your auth middleware mock
    });
  });

  describe("GET /api/admin/rbac/roles", () => {
    it("should return all roles with their permissions", async () => {
      const response = await request(app)
        .get("/api/admin/rbac/roles")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("roles");
      expect(Array.isArray(response.body.roles)).toBe(true);

      if (response.body.roles.length > 0) {
        const role = response.body.roles[0];
        expect(role).toHaveProperty("id");
        expect(role).toHaveProperty("name");
        expect(role).toHaveProperty("description");
        expect(role).toHaveProperty("permissions");
        expect(Array.isArray(role.permissions)).toBe(true);
      }
    });

    it("should require authentication", async () => {
      await request(app).get("/api/admin/rbac/roles").expect(401);
    });
  });

  describe("GET /api/admin/rbac/permissions", () => {
    it("should return all permissions", async () => {
      const response = await request(app)
        .get("/api/admin/rbac/permissions")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("permissions");
      expect(Array.isArray(response.body.permissions)).toBe(true);
      expect(response.body.permissions.length).toBeGreaterThan(0);

      const permission = response.body.permissions[0];
      expect(permission).toHaveProperty("id");
      expect(permission).toHaveProperty("key");
      expect(permission).toHaveProperty("description");
      expect(permission).toHaveProperty("category");
    });

    it("should require authentication", async () => {
      await request(app).get("/api/admin/rbac/permissions").expect(401);
    });
  });

  describe("POST /api/admin/rbac/assign-role", () => {
    it("should assign a role to a user", async () => {
      const response = await request(app)
        .post("/api/admin/rbac/assign-role")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({
          userId: regularUser.id,
          roleId: testRole.id,
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("message");

      // Verify the role was assigned
      const userRoles = await storage.getUserRoles(regularUser.id);
      const hasRole = userRoles.some((r) => r.id === testRole.id);
      expect(hasRole).toBe(true);
    });

    it("should require authentication", async () => {
      await request(app)
        .post("/api/admin/rbac/assign-role")
        .send({
          userId: regularUser.id,
          roleId: testRole.id,
        })
        .expect(401);
    });

    it("should validate request body", async () => {
      await request(app)
        .post("/api/admin/rbac/assign-role")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({})
        .expect(500); // Should return error for missing userId/roleId
    });
  });

  describe("DELETE /api/admin/rbac/user/:userId/role/:roleId", () => {
    beforeEach(async () => {
      // Ensure role is assigned before each test
      await storage.assignRoleToUser(regularUser.id, testRole.id);
    });

    it("should remove a role from a user", async () => {
      const response = await request(app)
        .delete(`/api/admin/rbac/user/${regularUser.id}/role/${testRole.id}`)
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("message");

      // Verify the role was removed
      const userRoles = await storage.getUserRoles(regularUser.id);
      const hasRole = userRoles.some((r) => r.id === testRole.id);
      expect(hasRole).toBe(false);
    });

    it("should require authentication", async () => {
      await request(app)
        .delete(`/api/admin/rbac/user/${regularUser.id}/role/${testRole.id}`)
        .expect(401);
    });

    it("should validate userId parameter", async () => {
      await request(app)
        .delete(`/api/admin/rbac/user/invalid/role/${testRole.id}`)
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(500); // Should fail parsing invalid userId
    });
  });

  describe("POST /api/admin/rbac/test-authz", () => {
    it("should test authorization for a user", async () => {
      const response = await request(app)
        .post("/api/admin/rbac/test-authz")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({
          userEmail: adminUser.email,
          action: "users.view",
          resourceType: "system",
        })
        .expect(200);

      expect(response.body).toHaveProperty("action", "users.view");
      expect(response.body).toHaveProperty("resource", "system");
      expect(response.body).toHaveProperty("allowed");
      expect(response.body).toHaveProperty("reason");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("principal");
      expect(response.body.principal).toHaveProperty("userId");
      expect(response.body.principal).toHaveProperty("email");
      expect(response.body.principal).toHaveProperty("roles");
    });

    it("should return 404 for non-existent user", async () => {
      await request(app)
        .post("/api/admin/rbac/test-authz")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({
          userEmail: "nonexistent@test.com",
          action: "users.view",
          resourceType: "system",
        })
        .expect(404);
    });

    it("should require authentication", async () => {
      await request(app)
        .post("/api/admin/rbac/test-authz")
        .send({
          userEmail: adminUser.email,
          action: "users.view",
          resourceType: "system",
        })
        .expect(401);
    });
  });

  describe("GET /api/admin/rbac/user-permissions/:userId", () => {
    beforeEach(async () => {
      // Ensure test role is assigned to regular user
      await storage.assignRoleToUser(regularUser.id, testRole.id);
      await storage.assignPermissionToRole(testRole.id, testPermission.id);
    });

    it("should return user's roles, permissions, and departments", async () => {
      const response = await request(app)
        .get(`/api/admin/rbac/user-permissions/${regularUser.id}`)
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("userId", regularUser.id);
      expect(response.body).toHaveProperty("roles");
      expect(response.body).toHaveProperty("permissions");
      expect(response.body).toHaveProperty("departments");

      // Verify structure
      expect(Array.isArray(response.body.roles)).toBe(true);
      expect(Array.isArray(response.body.permissions)).toBe(true);
      expect(Array.isArray(response.body.departments)).toBe(true);

      // Verify role is present
      const hasTestRole = response.body.roles.some(
        (r: any) => r.id === testRole.id && r.name === testRole.name
      );
      expect(hasTestRole).toBe(true);

      // Verify permission is present
      expect(response.body.permissions).toContain(testPermission.key);
    });

    it("should deduplicate roles", async () => {
      // Assign the same role twice (simulate duplicate data)
      await storage.assignRoleToUser(regularUser.id, testRole.id);

      const response = await request(app)
        .get(`/api/admin/rbac/user-permissions/${regularUser.id}`)
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      // Count occurrences of test role
      const roleCount = response.body.roles.filter((r: any) => r.id === testRole.id).length;

      expect(roleCount).toBe(1); // Should be deduplicated
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(app)
        .get("/api/admin/rbac/user-permissions/999999")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(404);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("not found");
    });

    it("should return 400 for invalid userId", async () => {
      const response = await request(app)
        .get("/api/admin/rbac/user-permissions/invalid")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid userId");
    });

    it("should require authentication", async () => {
      await request(app).get(`/api/admin/rbac/user-permissions/${regularUser.id}`).expect(401);
    });

    it("should require users.view permission", async () => {
      const response = await request(app)
        .get(`/api/admin/rbac/user-permissions/${adminUser.id}`)
        .set("Authorization", `Bearer ${regularUser.id}`)
        .expect(403);

      expect(response.body.message).toContain("Insufficient permissions");
    });

    it("should handle users with no roles", async () => {
      // Create user with no roles
      const noRoleUser = await storage.createUser({
        email: "norole@test.com",
        password: "test123",
        firstName: "No",
        lastName: "Role",
        role: "employee",
        hubspotUserId: null,
      });

      const response = await request(app)
        .get(`/api/admin/rbac/user-permissions/${noRoleUser.id}`)
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body.roles).toEqual([]);
      expect(response.body.permissions).toEqual([]);

      // Cleanup
      await storage.deleteUser(noRoleUser.id);
    });

    it("should handle users with multiple roles", async () => {
      // Create another role
      const secondRole = await storage.createRole({
        name: "test_role_2",
        description: "Second test role",
        isActive: true,
      });

      const secondPermission = await storage.createPermission({
        key: "test.permission2",
        description: "Second test permission",
        category: "test",
        isActive: true,
      });

      await storage.assignPermissionToRole(secondRole.id, secondPermission.id);
      await storage.assignRoleToUser(regularUser.id, secondRole.id);

      const response = await request(app)
        .get(`/api/admin/rbac/user-permissions/${regularUser.id}`)
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      // Should have both roles
      expect(response.body.roles.length).toBeGreaterThanOrEqual(2);

      // Should have permissions from both roles
      expect(response.body.permissions).toContain(testPermission.key);
      expect(response.body.permissions).toContain(secondPermission.key);

      // Cleanup
      await storage.removeRoleFromUser(regularUser.id, secondRole.id);
      await storage.deleteRole(secondRole.id);
      await storage.deletePermission(secondPermission.id);
    });
  });

  describe("User Experience Tests", () => {
    it("should return consistent error format", async () => {
      const response = await request(app).get("/api/admin/rbac/users").expect(401);

      // Verify error response has consistent structure
      expect(response.body).toHaveProperty("error");
      expect(typeof response.body.error).toBe("string");
    });

    it("should return helpful error messages", async () => {
      const response = await request(app)
        .post("/api/admin/rbac/test-authz")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({
          userEmail: "nonexistent@test.com",
          action: "users.view",
        })
        .expect(404);

      expect(response.body.error).toContain("not found");
    });
  });
});

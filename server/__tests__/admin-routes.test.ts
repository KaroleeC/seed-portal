import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Minimal User type for tests
type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  defaultDashboard: string;
};

/**
 * Admin Routes Test Suite
 *
 * Comprehensive tests for admin-routes.ts endpoints with:
 * - Authorization checks (permission-based access control)
 * - User experience validation (error messages, response format)
 * - Integration tests with MSW for external services (HubSpot)
 *
 * Test Coverage:
 * - HubSpot Integration Routes
 * - CRM Configuration Routes
 * - Department Management Routes
 * - User Management Routes
 * - Pricing Configuration Routes
 * - Calculator Management Routes
 */

// Mock auth middleware before imports
vi.mock("../middleware/supabase-auth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    // Set user from test context or default to unauthorized
    if (req.headers.authorization) {
      const userId = parseInt(req.headers.authorization.replace("Bearer ", ""));
      const testUsers: Record<number, any> = {
        1: { id: 1, email: "admin@test.com", role: "admin" },
        2: { id: 2, email: "user@test.com", role: "employee" },
      };
      req.user = testUsers[userId];
      if (req.user) {
        return next();
      }
    }
    res.status(401).json({ message: "Unauthorized" });
  },
}));

// Mock logger
vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

// Mock storage
const mockStorage = {
  getAllUsers: vi.fn().mockResolvedValue([
    { id: 1, email: "admin@test.com", firstName: "Admin", lastName: "User", role: "admin" },
    { id: 2, email: "user@test.com", firstName: "Regular", lastName: "User", role: "employee" },
  ]),
  getUser: vi.fn().mockImplementation((userId: number) => {
    // Return null for non-existent users
    if (userId === 999999) {
      return Promise.resolve(null);
    }
    return Promise.resolve({ id: userId, email: "admin@test.com" });
  }),
  getUserByEmail: vi.fn().mockResolvedValue(null), // No existing user for create tests
  createUser: vi.fn().mockResolvedValue({
    id: 3,
    email: "newuser@seedfinancial.io",
    firstName: "New",
    lastName: "User",
    role: "employee",
    defaultDashboard: "sales",
  }),
  updateUser: vi.fn().mockResolvedValue({ id: 1, email: "updated@test.com" }),
  deleteUser: vi.fn().mockImplementation((userId: number) => {
    // Return success for normal deletes, throw for non-existent users
    if (userId === 999999) {
      throw new Error("User not found");
    }
    return Promise.resolve(undefined);
  }),
  updateUserRole: vi.fn().mockResolvedValue({
    id: 3,
    email: "newuser@seedfinancial.io",
    firstName: "New",
    lastName: "User",
    role: "employee",
    defaultDashboard: "sales",
  }),
  createRole: vi.fn().mockResolvedValue({ id: 1, name: "test-role" }),
  getAllDepartments: vi.fn().mockResolvedValue([{ id: 1, name: "Engineering" }]),
  createDepartment: vi.fn().mockResolvedValue({ id: 1, name: "Test Dept" }),
  getPricingServiceSettings: vi
    .fn()
    .mockResolvedValue([{ id: 1, service: "bookkeeping", basePrice: 500 }]),
  updateServiceSetting: vi
    .fn()
    .mockResolvedValue({ id: 1, service: "bookkeeping", basePrice: 600 }),
  getCalculatorServiceContent: vi.fn().mockResolvedValue({
    service: "bookkeeping",
    title: "Bookkeeping",
    description: "Test content",
  }),
  getAllCalculatorServiceContent: vi.fn().mockResolvedValue([]),
  upsertCalculatorServiceContent: vi.fn().mockResolvedValue({ id: 1, service: "bookkeeping" }),
  getAllPricingBase: vi.fn().mockResolvedValue([
    { id: 1, service: "bookkeeping", basePrice: 500, isActive: true },
    { id: 2, service: "taas", basePrice: 1000, isActive: true },
  ]),
  updatePricingBase: vi.fn().mockResolvedValue({
    id: 1,
    service: "bookkeeping",
    basePrice: 1200,
    isActive: true,
  }),
  getAuditLog: vi.fn().mockResolvedValue([]),
};

// Mock drizzle-orm sql function FIRST (before other mocks that might use db)
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual("drizzle-orm");

  // Create sql function with raw method
  const sqlFunction: any = (strings: any, ...values: any[]) => {
    // Create a simple query object that can be stringified
    const queryString = strings.raw ? strings.raw.join("?") : String(strings);
    return {
      queryChunks: strings.raw || [String(strings)],
      sql: queryString,
      values,
    };
  };

  // Add raw method for sql.raw(table)
  sqlFunction.raw = (str: string) => ({ __raw: str });

  return {
    ...actual,
    sql: sqlFunction,
  };
});

vi.mock("../storage", () => ({
  storage: mockStorage,
}));

// Mock calculator defaults
vi.mock("../calculator-defaults", () => ({
  SERVICE_KEYS_DB: [
    "bookkeeping",
    "taas",
    "payroll",
    "ap",
    "ar",
    "agent_of_service",
    "cfo_advisory",
  ],
  DEFAULT_MSA_LINK: "https://example.com/msa",
  DEFAULT_AGREEMENT_LINKS: {},
  getDefaultSowTitle: vi.fn().mockReturnValue("Default SOW"),
  getDefaultSowTemplate: vi.fn().mockReturnValue("Default Template"),
}));

// Mock database with comprehensive query support
const mockDb = {
  execute: vi.fn().mockImplementation((query) => {
    // Handle both SQL template literals and regular queries
    const sqlString =
      typeof query === "string"
        ? query
        : query?.queryChunks
          ? query.queryChunks.join("")
          : query?.sql || JSON.stringify(query);

    // db.execute() returns an array-like object that ALSO has a .rows property
    // This allows both destructuring [row] and direct access to .rows
    const createResult = (rows: any[]) => {
      const result = (rows.length > 0 ? [{ rows }] : []) as any;
      result.rows = rows;
      return result;
    };

    // Check if it's an INSERT/UPSERT for CRM config tables
    if (
      sqlString.toLowerCase().includes("insert") &&
      (sqlString.includes("crm_lead_sources") || sqlString.includes("crm_lead_statuses"))
    ) {
      return Promise.resolve(createResult([])); // UPSERT doesn't need to return data
    }
    // Check if it's an INSERT query for departments
    if (
      sqlString.toLowerCase().includes("insert") &&
      sqlString.toLowerCase().includes("departments")
    ) {
      return Promise.resolve(
        createResult([{ id: 1, name: "Test Department", description: "Test", is_active: true }])
      );
    }
    // Check if it's a SELECT from calculator_service_content
    if (sqlString.includes("calculator_service_content")) {
      const now = new Date().toISOString();
      return Promise.resolve(
        createResult([
          {
            service: "bookkeeping",
            title: "Bookkeeping",
            description: "Test",
            includedFieldsJson: null,
            sowTitle: "Bookkeeping SOW",
            sowTemplate: "Template",
            agreementLink: "https://example.com/agreement",
            createdAt: now,
            updatedAt: now,
          },
          {
            service: "taas",
            title: "TaaS",
            description: "Test",
            includedFieldsJson: null,
            sowTitle: "TaaS SOW",
            sowTemplate: "Template",
            agreementLink: "https://example.com/agreement",
            createdAt: now,
            updatedAt: now,
          },
        ])
      );
    }
    // UPDATE pricing_base queries
    if (sqlString.includes("pricing_base") || sqlString.includes("UPDATE")) {
      return Promise.resolve(
        createResult([{ id: 1, service: "bookkeeping", basePrice: 1200, isActive: true }])
      );
    }
    // Default empty response
    return Promise.resolve(createResult([]));
  }),
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue([
        { id: 1, name: "Engineering", description: "Engineering team", isActive: true },
        { id: 2, name: "Sales", description: "Sales team", isActive: true },
      ]),
      where: vi.fn().mockResolvedValue([]),
    }),
  }),
};

// Mock audit logging
const writeAudit = vi.fn().mockResolvedValue(undefined);
vi.mock("../audit-log", () => ({
  writeAudit,
}));

vi.mock("../db", () => ({
  db: mockDb,
  checkDatabaseHealth: vi.fn().mockResolvedValue({ healthy: true }),
}));

// Mock HubSpot service
vi.mock("../hubspot", () => ({
  hubSpotService: {
    getPipelines: vi.fn().mockResolvedValue([]),
  },
}));

// Mock pricing config service
vi.mock("../pricing-config", () => ({
  pricingConfigService: {
    loadPricingConfig: vi.fn().mockResolvedValue({}),
    clearCache: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock CRM config service
vi.mock("../services/crm-config", () => ({
  crmConfigService: {
    getConfig: vi.fn().mockResolvedValue({
      leadSources: {},
      dealStatuses: {},
      dealStages: {},
    }),
    updateLeadSourceConfig: vi.fn().mockResolvedValue({}),
  },
}));

// Mock authorize service
vi.mock("../services/authz/authorize", () => ({
  authorize: vi.fn().mockResolvedValue({ allowed: true }),
  requirePermission: () => (req: any, res: any, next: any) => {
    // Check if user has permission based on role
    if (req.user?.role === "admin") {
      return next();
    }
    res.status(403).json({ message: "Forbidden: insufficient permissions" });
  },
}));

describe("Admin Routes", () => {
  let app: Express;
  let adminUser: User;
  let regularUser: User;

  // Mock server for external API calls
  const server = setupServer(
    // Mock HubSpot pipelines endpoint
    http.get("https://api.hubapi.com/crm/v3/pipelines/deals", () => {
      return HttpResponse.json({
        results: [
          {
            id: "default",
            label: "Sales Pipeline",
            stages: [
              { id: "appointmentscheduled", label: "Appointment Scheduled" },
              { id: "qualifiedtobuy", label: "Qualified to Buy" },
              { id: "presentationscheduled", label: "Presentation Scheduled" },
              { id: "decisionmakerboughtin", label: "Decision Maker Bought-In" },
              { id: "contractsent", label: "Contract Sent" },
              { id: "closedwon", label: "Closed Won" },
              { id: "closedlost", label: "Closed Lost" },
            ],
          },
        ],
      });
    })
  );

  beforeAll(async () => {
    // Start MSW server
    server.listen({ onUnhandledRequest: "bypass" });

    // Setup Express app with routes
    app = express();
    app.use(express.json());

    // Import and use admin routes
    const { registerAdminRoutes } = await import("../admin-routes");
    await registerAdminRoutes(app);

    // Setup test users (in-memory, no DB)
    adminUser = {
      id: 1,
      email: "admin@test.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      defaultDashboard: "admin",
    } as User;

    regularUser = {
      id: 2,
      email: "user@test.com",
      firstName: "Regular",
      lastName: "User",
      role: "employee",
      defaultDashboard: "sales",
    } as User;
  });

  afterAll(async () => {
    // Stop MSW server
    server.close();
  });

  // =============================
  // HubSpot Integration Routes
  // =============================

  describe("GET /api/admin/hubspot/pipelines", () => {
    it("should return HubSpot pipelines for authorized users", async () => {
      const response = await request(app)
        .get("/api/admin/hubspot/pipelines")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("pipelines");
      expect(Array.isArray(response.body.pipelines)).toBe(true);

      if (response.body.pipelines.length > 0) {
        const pipeline = response.body.pipelines[0];
        expect(pipeline).toHaveProperty("id");
        expect(pipeline).toHaveProperty("label");
        expect(pipeline).toHaveProperty("stages");
        expect(Array.isArray(pipeline.stages)).toBe(true);
      }
    });

    it("should require authentication", async () => {
      await request(app).get("/api/admin/hubspot/pipelines").expect(401);
    });

    it("should require hubspot.view permission", async () => {
      const response = await request(app)
        .get("/api/admin/hubspot/pipelines")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .expect(403);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("permission");
    });
  });

  // =============================
  // CRM Configuration Routes
  // =============================

  describe("GET /api/admin/crm/lead-config", () => {
    it("should return CRM lead configuration", async () => {
      const response = await request(app)
        .get("/api/admin/crm/lead-config")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("sources");
      expect(response.body).toHaveProperty("statuses");
      expect(response.body).toHaveProperty("stages");
      expect(Array.isArray(response.body.sources)).toBe(true);
      expect(Array.isArray(response.body.statuses)).toBe(true);
      expect(Array.isArray(response.body.stages)).toBe(true);
    });

    it("should require authentication", async () => {
      await request(app).get("/api/admin/crm/lead-config").expect(401);
    });

    it("should require crm.config.view permission", async () => {
      const response = await request(app)
        .get("/api/admin/crm/lead-config")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .expect(403);

      expect(response.body.message).toContain("permission");
    });
  });

  describe("PUT /api/admin/crm/lead-config/sources/:key", () => {
    it("should update lead source configuration", async () => {
      const response = await request(app)
        .put("/api/admin/crm/lead-config/sources/test-source")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({
          label: "Test Source",
          isActive: true,
          sortOrder: 1,
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });

    it("should require authentication", async () => {
      await request(app)
        .put("/api/admin/crm/lead-config/sources/test-source")
        .send({ label: "Test" })
        .expect(401);
    });

    it("should require crm.config.manage permission", async () => {
      const response = await request(app)
        .put("/api/admin/crm/lead-config/sources/test-source")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .send({ label: "Test" })
        .expect(403);

      expect(response.body.message).toContain("permission");
    });

    it("should validate required key parameter", async () => {
      await request(app)
        .put("/api/admin/crm/lead-config/sources/")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({ label: "Test" })
        .expect(404); // Route not found without key
    });
  });

  // =============================
  // Department Management Routes
  // =============================

  describe("GET /api/admin/rbac/departments", () => {
    it("should return all departments", async () => {
      const response = await request(app)
        .get("/api/admin/rbac/departments")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("departments");
      expect(Array.isArray(response.body.departments)).toBe(true);
    });

    it("should require authentication", async () => {
      await request(app).get("/api/admin/rbac/departments").expect(401);
    });

    it("should require departments.view permission", async () => {
      const response = await request(app)
        .get("/api/admin/rbac/departments")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .expect(403);

      expect(response.body.message).toContain("permission");
    });
  });

  describe("POST /api/admin/rbac/departments", () => {
    it("should create a new department", async () => {
      const response = await request(app)
        .post("/api/admin/rbac/departments")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({
          name: "Test Department",
          description: "A test department",
          isActive: true,
        })
        .expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Test Department");
      expect(response.body).toHaveProperty("description");
    });

    it("should require authentication", async () => {
      await request(app).post("/api/admin/rbac/departments").send({ name: "Test" }).expect(401);
    });

    it("should require departments.manage permission", async () => {
      const response = await request(app)
        .post("/api/admin/rbac/departments")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .send({ name: "Test" })
        .expect(403);

      expect(response.body.message).toContain("permission");
    });

    it("should validate required name field", async () => {
      const response = await request(app)
        .post("/api/admin/rbac/departments")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain("name");
    });
  });

  // =============================
  // User Management Routes
  // =============================

  describe("GET /api/admin/users", () => {
    it("should return all users", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("users");
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);

      const user = response.body.users[0];
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("firstName");
      expect(user).toHaveProperty("lastName");
    });

    it("should require authentication", async () => {
      await request(app).get("/api/admin/users").expect(401);
    });

    it("should require users.view permission", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .expect(403);

      expect(response.body.message).toContain("permission");
    });
  });

  describe("POST /api/admin/users", () => {
    it("should create a new user", async () => {
      const response = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({
          firstName: "New",
          lastName: "User",
          email: "newuser@seedfinancial.io",
          role: "employee",
        })
        .expect(200);

      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("email", "newuser@seedfinancial.io");
      expect(response.body).toHaveProperty("generatedPassword");
    });

    it("should require authentication", async () => {
      await request(app)
        .post("/api/admin/users")
        .send({
          firstName: "Test",
          lastName: "User",
          email: "test@test.com",
        })
        .expect(401);
    });

    it("should require users.create permission", async () => {
      const response = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .send({
          firstName: "Test",
          lastName: "User",
          email: "test@test.com",
        })
        .expect(403);

      expect(response.body.message).toContain("permission");
    });

    it("should validate required fields", async () => {
      const response = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({})
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe("DELETE /api/admin/users/:userId", () => {
    const testUser: User = {
      id: 999,
      email: "delete-test@test.com",
      firstName: "Delete",
      lastName: "Test",
      role: "employee",
      defaultDashboard: "sales",
    };

    it("should delete a user", async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${testUser.id}`)
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("deleted");
    });

    it("should require authentication", async () => {
      await request(app).delete(`/api/admin/users/${testUser.id}`).expect(401);
    });

    it("should require users.delete permission", async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${testUser.id}`)
        .set("Authorization", `Bearer ${regularUser.id}`)
        .expect(403);

      expect(response.body.message).toContain("permission");
    });

    it("should prevent self-deletion", async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${adminUser.id}`)
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(400);

      expect(response.body.message).toContain("your own account");
    });
  });

  // =============================
  // Pricing Configuration Routes
  // =============================

  describe("GET /api/admin/pricing/config", () => {
    it("should return pricing configuration", async () => {
      const response = await request(app)
        .get("/api/admin/pricing/config")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toBeDefined();
      // Structure depends on pricing config implementation
    });

    it("should require authentication", async () => {
      await request(app).get("/api/admin/pricing/config").expect(401);
    });

    it("should require pricing.view permission", async () => {
      const response = await request(app)
        .get("/api/admin/pricing/config")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .expect(403);

      expect(response.body.message).toContain("permission");
    });
  });

  describe("GET /api/admin/pricing/base", () => {
    it("should return base pricing for all services", async () => {
      const response = await request(app)
        .get("/api/admin/pricing/base")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should require authentication", async () => {
      await request(app).get("/api/admin/pricing/base").expect(401);
    });

    it("should require pricing.view permission", async () => {
      const response = await request(app)
        .get("/api/admin/pricing/base")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .expect(403);

      expect(response.body.message).toContain("permission");
    });
  });

  describe("PUT /api/admin/pricing/base/:id", () => {
    it("should update base pricing", async () => {
      // First get existing pricing to update
      const getResponse = await request(app)
        .get("/api/admin/pricing/base")
        .set("Authorization", `Bearer ${adminUser.id}`);

      if (getResponse.body.length > 0) {
        const pricingId = getResponse.body[0].id;

        const response = await request(app)
          .put(`/api/admin/pricing/base/${pricingId}`)
          .set("Authorization", `Bearer ${adminUser.id}`)
          .send({
            basePrice: 1000,
          })
          .expect(200);

        expect(response.body).toHaveProperty("id");
      }
    });

    it("should require authentication", async () => {
      await request(app).put("/api/admin/pricing/base/1").send({ basePrice: 1000 }).expect(401);
    });

    it("should require pricing.update permission", async () => {
      const response = await request(app)
        .put("/api/admin/pricing/base/1")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .send({ basePrice: 1000 })
        .expect(403);

      expect(response.body.message).toContain("permission");
    });

    it("should validate id parameter", async () => {
      const response = await request(app)
        .put("/api/admin/pricing/base/")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({ basePrice: 1000 })
        .expect(404); // Route not found
    });
  });

  // =============================
  // Calculator Management Routes
  // =============================

  describe("GET /api/admin/calculator/content", () => {
    it("should return all calculator service content", async () => {
      const response = await request(app)
        .get("/api/admin/calculator/content")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body).toHaveProperty("msaLink");
    });

    it("should require authentication", async () => {
      await request(app).get("/api/admin/calculator/content").expect(401);
    });

    it("should require calculator.admin permission", async () => {
      const response = await request(app)
        .get("/api/admin/calculator/content")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .expect(403);

      expect(response.body.message).toContain("permission");
    });
  });

  describe("GET /api/admin/calculator/content/:service", () => {
    it("should return content for a specific service", async () => {
      const response = await request(app)
        .get("/api/admin/calculator/content/bookkeeping")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("item");
      expect(response.body).toHaveProperty("msaLink");
      expect(response.body.item).toHaveProperty("service", "bookkeeping");
    });

    it("should require authentication", async () => {
      await request(app).get("/api/admin/calculator/content/bookkeeping").expect(401);
    });

    it("should require calculator.admin permission", async () => {
      const response = await request(app)
        .get("/api/admin/calculator/content/bookkeeping")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .expect(403);

      expect(response.body.message).toContain("permission");
    });
  });

  // =============================
  // User Experience Tests
  // =============================

  describe("Error Response Format", () => {
    it("should return consistent error format for authentication failures", async () => {
      const response = await request(app).get("/api/admin/users").expect(401);

      expect(response.body).toHaveProperty("message");
      expect(typeof response.body.message).toBe("string");
    });

    it("should return consistent error format for authorization failures", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .expect(403);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("permission");
    });

    it("should return helpful validation error messages", async () => {
      const response = await request(app)
        .post("/api/admin/rbac/departments")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("name");
    });

    it("should return helpful not found messages", async () => {
      const response = await request(app)
        .delete("/api/admin/users/999999")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(404);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message.toLowerCase()).toContain("not found");
    });
  });

  describe("Response Data Format", () => {
    it("should return consistent success response for list endpoints", async () => {
      const response = await request(app)
        .get("/api/admin/rbac/departments")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("departments");
      expect(Array.isArray(response.body.departments)).toBe(true);
    });

    it("should return consistent success response for create endpoints", async () => {
      const response = await request(app)
        .post("/api/admin/rbac/departments")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .send({
          name: "Test Response Department",
          description: "Testing response format",
        })
        .expect(200);

      expect(response.body).toHaveProperty("id");
    });
  });

  describe("Cache Management", () => {
    it("should clear pricing cache", async () => {
      const response = await request(app)
        .post("/api/admin/pricing/clear-cache")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("cleared");
    });

    it("should require admin.cache permission", async () => {
      const response = await request(app)
        .post("/api/admin/pricing/clear-cache")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .expect(403);

      expect(response.body.message).toContain("permission");
    });
  });

  describe("Audit Trail", () => {
    it("should return audit log", async () => {
      const response = await request(app)
        .get("/api/admin/rbac/audit")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it("should require admin.audit permission", async () => {
      const response = await request(app)
        .get("/api/admin/rbac/audit")
        .set("Authorization", `Bearer ${regularUser.id}`)
        .expect(403);

      expect(response.body.message).toContain("permission");
    });

    it("should support limit query parameter", async () => {
      const response = await request(app)
        .get("/api/admin/rbac/audit?limit=10")
        .set("Authorization", `Bearer ${adminUser.id}`)
        .expect(200);

      expect(response.body.items.length).toBeLessThanOrEqual(10);
    });
  });
});

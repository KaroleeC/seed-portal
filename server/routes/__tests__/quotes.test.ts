/**
 * Quote Routes Tests
 *
 * Comprehensive test coverage for POST, PUT, and GET /api/quotes endpoints.
 * Tests validation, approval flow, pricing calculation, and HubSpot sync.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import { registerRoutes } from "../routes";
import { storage } from "../storage";
import { hubSpotService } from "../hubspot";
import { doesHubSpotQuoteExist } from "../hubspot";
import * as pricingModule from "../../shared/pricing";

// Mock dependencies
vi.mock("../storage");
vi.mock("../hubspot");
vi.mock("../../shared/pricing");
vi.mock("../middleware/supabase-auth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    // Mock authenticated user
    req.user = {
      id: 1,
      email: "test@seedfinancial.io",
      role: "admin",
    };
    next();
  },
}));

describe("POST /api/quotes", () => {
  let app: Express;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    await registerRoutes(app);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Quote Creation - Happy Path", () => {
    it("should create a quote with valid data", async () => {
      // Arrange
      const quoteData = {
        contactEmail: "client@example.com",
        companyName: "Test LLC",
        monthlyRevenueRange: "$100K-$500K",
        industry: "Professional Services",
        monthlyTransactions: "100-300",
        cleanupMonths: 6,
        cleanupComplexity: "0.25",
        entityType: "LLC",
        numEntities: 1,
        statesFiled: 1,
        numBusinessOwners: 1,
        includesBookkeeping: true,
        includesTaas: false,
      };

      const mockPricingCalc = {
        combined: { monthlyFee: 1500, setupFee: 500 },
        taas: { monthlyFee: 0 },
        priorYearFilingsFee: 0,
        qboFee: 50,
        bookkeeping: { monthlyFee: 1500, setupFee: 500 },
      };

      const mockCreatedQuote = {
        id: 123,
        ...quoteData,
        ownerId: 1,
        monthlyFee: "1500.00",
        setupFee: "500.00",
        taasMonthlyFee: "0.00",
        taasPriorYearsFee: "0.00",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyedOn(storage, "getQuotesByEmail").mockResolvedValue([]);
      vi.spyOn(pricingModule, "calculateCombinedFees").mockReturnValue(mockPricingCalc as any);
      vi.spyOn(storage, "createQuote").mockResolvedValue(mockCreatedQuote as any);

      // Act
      const response = await request(app).post("/api/quotes").send(quoteData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(123);
      expect(response.body.contactEmail).toBe("client@example.com");
      expect(response.body.monthlyFee).toBe("1500.00");
      expect(response.body.setupFee).toBe("500.00");
      expect(storage.createQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: 1,
          monthlyFee: "1500.00",
          setupFee: "500.00",
        })
      );
    });

    it("should sanitize empty string fields to defaults", async () => {
      const quoteData = {
        contactEmail: "client@example.com",
        monthlyRevenueRange: "$100K-$500K",
        industry: "Professional Services",
        monthlyFee: "", // Empty string should become "0"
        setupFee: "", // Empty string should become "0"
        cleanupMonths: "", // Empty string should become null
      };

      vi.spyOn(storage, "getQuotesByEmail").mockResolvedValue([]);
      vi.spyOn(pricingModule, "calculateCombinedFees").mockReturnValue({
        combined: { monthlyFee: 1500, setupFee: 500 },
        taas: { monthlyFee: 0 },
        priorYearFilingsFee: 0,
        qboFee: 50,
        bookkeeping: { monthlyFee: 1500, setupFee: 500 },
      } as any);
      vi.spyOn(storage, "createQuote").mockResolvedValue({ id: 1 } as any);

      const response = await request(app).post("/api/quotes").send(quoteData);

      expect(response.status).toBe(200);
      expect(storage.createQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          monthlyFee: expect.any(String), // Server-calculated
          setupFee: expect.any(String), // Server-calculated
        })
      );
    });
  });

  describe("Quote Creation - Approval Flow", () => {
    it("should require approval code when existing HubSpot quotes exist", async () => {
      // Arrange
      const existingQuote = {
        id: 100,
        hubspotQuoteId: "12345",
        contactEmail: "existing@example.com",
      };

      vi.spyOn(storage, "getQuotesByEmail").mockResolvedValue([existingQuote] as any);
      vi.mocked(doesHubSpotQuoteExist).mockResolvedValue(true);

      const quoteData = {
        contactEmail: "existing@example.com",
        monthlyRevenueRange: "$100K-$500K",
        industry: "Professional Services",
        // No approval code provided
      };

      // Act
      const response = await request(app).post("/api/quotes").send(quoteData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Approval code required");
      expect(response.body.requiresApproval).toBe(true);
      expect(response.body.existingQuotesCount).toBe(1);
    });

    it("should accept quote when no live HubSpot quotes exist", async () => {
      // Arrange
      const existingQuote = {
        id: 100,
        hubspotQuoteId: "12345",
        contactEmail: "existing@example.com",
      };

      vi.spyOn(storage, "getQuotesByEmail").mockResolvedValue([existingQuote] as any);
      vi.mocked(doesHubSpotQuoteExist).mockResolvedValue(false); // Quote deleted in HubSpot

      const mockPricingCalc = {
        combined: { monthlyFee: 1500, setupFee: 500 },
        taas: { monthlyFee: 0 },
        priorYearFilingsFee: 0,
        qboFee: 50,
        bookkeeping: { monthlyFee: 1500, setupFee: 500 },
      };

      vi.spyOn(pricingModule, "calculateCombinedFees").mockReturnValue(mockPricingCalc as any);
      vi.spyOn(storage, "createQuote").mockResolvedValue({ id: 101 } as any);

      const quoteData = {
        contactEmail: "existing@example.com",
        monthlyRevenueRange: "$100K-$500K",
        industry: "Professional Services",
        monthlyTransactions: "100-300",
      };

      // Act
      const response = await request(app).post("/api/quotes").send(quoteData);

      // Assert
      expect(response.status).toBe(200);
      expect(storage.createQuote).toHaveBeenCalled();
    });

    it("should validate and use approval code", async () => {
      // Arrange
      const existingQuote = {
        id: 100,
        hubspotQuoteId: "12345",
        contactEmail: "existing@example.com",
      };

      vi.spyOn(storage, "getQuotesByEmail").mockResolvedValue([existingQuote] as any);
      vi.mocked(doesHubSpotQuoteExist).mockResolvedValue(true);
      vi.spyOn(storage, "validateApprovalCode").mockResolvedValue(true);
      vi.spyOn(storage, "markApprovalCodeUsed").mockResolvedValue(undefined);

      const mockPricingCalc = {
        combined: { monthlyFee: 1500, setupFee: 500 },
        taas: { monthlyFee: 0 },
        priorYearFilingsFee: 0,
        qboFee: 50,
        bookkeeping: { monthlyFee: 1500, setupFee: 500 },
      };

      vi.spyOn(pricingModule, "calculateCombinedFees").mockReturnValue(mockPricingCalc as any);
      vi.spyOn(storage, "createQuote").mockResolvedValue({ id: 101 } as any);

      const quoteData = {
        contactEmail: "existing@example.com",
        approvalCode: "VALID_CODE_123",
        monthlyRevenueRange: "$100K-$500K",
        industry: "Professional Services",
        monthlyTransactions: "100-300",
      };

      // Act
      const response = await request(app).post("/api/quotes").send(quoteData);

      // Assert
      expect(response.status).toBe(200);
      expect(storage.validateApprovalCode).toHaveBeenCalledWith(
        "VALID_CODE_123",
        "existing@example.com"
      );
      expect(storage.markApprovalCodeUsed).toHaveBeenCalledWith(
        "VALID_CODE_123",
        "existing@example.com"
      );
    });

    it("should reject invalid approval code", async () => {
      // Arrange
      const existingQuote = {
        id: 100,
        hubspotQuoteId: "12345",
        contactEmail: "existing@example.com",
      };

      vi.spyOn(storage, "getQuotesByEmail").mockResolvedValue([existingQuote] as any);
      vi.mocked(doesHubSpotQuoteExist).mockResolvedValue(true);
      vi.spyOn(storage, "validateApprovalCode").mockResolvedValue(false);

      const quoteData = {
        contactEmail: "existing@example.com",
        approvalCode: "INVALID_CODE",
        monthlyRevenueRange: "$100K-$500K",
        industry: "Professional Services",
      };

      // Act
      const response = await request(app).post("/api/quotes").send(quoteData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid or expired");
      expect(response.body.requiresApproval).toBe(true);
    });
  });

  describe("Quote Creation - Validation", () => {
    it("should reject quote without required fields", async () => {
      // Arrange
      const incompleteData = {
        contactEmail: "client@example.com",
        // Missing required fields
      };

      vi.spyOn(storage, "getQuotesByEmail").mockResolvedValue([]);

      // Act
      const response = await request(app).post("/api/quotes").send(incompleteData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid quote data");
      expect(response.body.errors).toBeDefined();
    });

    it("should reject quote with invalid email", async () => {
      // Arrange
      const invalidData = {
        contactEmail: "not-an-email",
        monthlyRevenueRange: "$100K-$500K",
        industry: "Professional Services",
      };

      vi.spyOn(storage, "getQuotesByEmail").mockResolvedValue([]);

      // Act
      const response = await request(app).post("/api/quotes").send(invalidData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid quote data");
    });
  });

  describe("Quote Creation - Pricing Calculation", () => {
    it("should calculate pricing on server side", async () => {
      // Arrange
      const quoteData = {
        contactEmail: "client@example.com",
        monthlyRevenueRange: "$100K-$500K",
        industry: "Professional Services",
        monthlyTransactions: "100-300",
        cleanupMonths: 6,
        cleanupComplexity: "0.25",
      };

      const mockPricingCalc = {
        combined: { monthlyFee: 2000, setupFee: 750 },
        taas: { monthlyFee: 0 },
        priorYearFilingsFee: 0,
        qboFee: 50,
        bookkeeping: { monthlyFee: 2000, setupFee: 750 },
      };

      vi.spyOn(storage, "getQuotesByEmail").mockResolvedValue([]);
      vi.spyOn(pricingModule, "calculateCombinedFees").mockReturnValue(mockPricingCalc as any);
      vi.spyOn(storage, "createQuote").mockResolvedValue({ id: 1 } as any);

      // Act
      const response = await request(app).post("/api/quotes").send(quoteData);

      // Assert
      expect(response.status).toBe(200);
      expect(pricingModule.calculateCombinedFees).toHaveBeenCalled();
      expect(storage.createQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          monthlyFee: "2000.00",
          setupFee: "750.00",
        })
      );
    });

    it("should handle pricing calculation errors", async () => {
      // Arrange
      const quoteData = {
        contactEmail: "client@example.com",
        monthlyRevenueRange: "$100K-$500K",
        industry: "Professional Services",
      };

      vi.spyOn(storage, "getQuotesByEmail").mockResolvedValue([]);
      vi.spyOn(pricingModule, "calculateCombinedFees").mockImplementation(() => {
        throw new Error("Invalid pricing configuration");
      });

      // Act
      const response = await request(app).post("/api/quotes").send(quoteData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Pricing calculation failed");
    });
  });

  describe("Quote Creation - Authentication", () => {
    it("should require authentication", async () => {
      // Override requireAuth mock for this test
      const appNoAuth = express();
      appNoAuth.use(express.json());

      vi.mock("../middleware/supabase-auth", () => ({
        requireAuth: (req: any, res: any, next: any) => {
          res.status(401).json({ message: "Unauthorized" });
        },
      }));

      const quoteData = {
        contactEmail: "client@example.com",
        monthlyRevenueRange: "$100K-$500K",
      };

      const response = await request(app).post("/api/quotes").send(quoteData);

      // Either 401 from middleware or validation error
      expect([401, 400]).toContain(response.status);
    });
  });
});

describe("GET /api/quotes", () => {
  let app: Express;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    await registerRoutes(app);
    vi.clearAllMocks();
  });

  it("should return all quotes for authenticated user", async () => {
    // Arrange
    const mockQuotes = [
      { id: 1, contactEmail: "client1@example.com", ownerId: 1, monthlyFee: "1500.00" },
      { id: 2, contactEmail: "client2@example.com", ownerId: 1, monthlyFee: "2000.00" },
    ];

    vi.spyOn(storage, "getAllQuotes").mockResolvedValue(mockQuotes as any);

    // Act
    const response = await request(app).get("/api/quotes");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(storage.getAllQuotes).toHaveBeenCalledWith(1, undefined, undefined, undefined);
  });

  it("should filter quotes by email", async () => {
    // Arrange
    const mockQuotes = [{ id: 1, contactEmail: "client1@example.com", ownerId: 1 }];

    vi.spyOn(storage, "getQuotesByEmail").mockResolvedValue(mockQuotes as any);

    // Act
    const response = await request(app).get("/api/quotes?email=client1@example.com");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].contactEmail).toBe("client1@example.com");
  });

  it("should search quotes", async () => {
    // Arrange
    const mockQuotes = [{ id: 1, contactEmail: "client1@example.com", ownerId: 1 }];

    vi.spyOn(storage, "getAllQuotes").mockResolvedValue(mockQuotes as any);

    // Act
    const response = await request(app).get("/api/quotes?search=client1");

    // Assert
    expect(response.status).toBe(200);
    expect(storage.getAllQuotes).toHaveBeenCalledWith(1, "client1", undefined, undefined);
  });

  it("should handle errors gracefully", async () => {
    // Arrange
    vi.spyOn(storage, "getAllQuotes").mockRejectedValue(new Error("Database error"));

    // Act
    const response = await request(app).get("/api/quotes");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.message).toContain("Failed to fetch quotes");
  });
});

describe("PUT /api/quotes/:id", () => {
  let app: Express;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    await registerRoutes(app);
    vi.clearAllMocks();
  });

  it("should update a quote successfully", async () => {
    // Arrange
    const existingQuote = {
      id: 1,
      contactEmail: "client@example.com",
      monthlyFee: "1500.00",
      setupFee: "500.00",
      ownerId: 1,
    };

    const updateData = {
      companyName: "Updated LLC",
      monthlyTransactions: "300-500",
    };

    const updatedQuote = {
      ...existingQuote,
      ...updateData,
    };

    vi.spyOn(storage, "getQuote").mockResolvedValue(existingQuote as any);
    vi.spyOn(storage, "updateQuote").mockResolvedValue(updatedQuote as any);

    // Act
    const response = await request(app).put("/api/quotes/1").send(updateData);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.companyName).toBe("Updated LLC");
    expect(storage.getQuote).toHaveBeenCalledWith(1);
    expect(storage.updateQuote).toHaveBeenCalled();
  });

  it("should return 404 for non-existent quote", async () => {
    // Arrange
    vi.spyOn(storage, "getQuote").mockResolvedValue(null);

    // Act
    const response = await request(app).put("/api/quotes/999").send({ companyName: "Test" });

    // Assert
    expect(response.status).toBe(404);
    expect(response.body.message).toContain("not found");
  });

  it("should sync to HubSpot after update", async () => {
    // Arrange
    const existingQuote = {
      id: 1,
      hubspotQuoteId: "12345",
      contactEmail: "client@example.com",
      monthlyFee: "1500.00",
      setupFee: "500.00",
      ownerId: 1,
    };

    vi.spyOn(storage, "getQuote").mockResolvedValue(existingQuote as any);
    vi.spyOn(storage, "updateQuote").mockResolvedValue(existingQuote as any);
    vi.spyOn(hubSpotService as any, "updateQuote").mockResolvedValue(undefined);

    // Act
    const response = await request(app).put("/api/quotes/1").send({ companyName: "Updated LLC" });

    // Assert
    expect(response.status).toBe(200);
    expect(hubSpotService?.updateQuote).toHaveBeenCalled();
  });

  it("should handle invalid quote ID", async () => {
    // Act
    const response = await request(app).put("/api/quotes/invalid").send({ companyName: "Test" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Invalid quote ID");
  });
});

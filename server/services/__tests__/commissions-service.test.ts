/**
 * Commissions Service Tests
 *
 * Tests for the commissions service layer.
 * Ensures DRY consolidation works correctly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCommissions,
  getCommissionById,
  updateCommissionStatus,
  updateCommission,
  groupCommissionsByInvoice,
  type Commission,
} from "../commissions-service";
import * as dbModule from "../../db";

// Mock the database
vi.mock("../../db", () => ({
  db: {
    execute: vi.fn(),
  },
}));

describe("commissions-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCommissions", () => {
    it("should get commissions for specific sales rep", async () => {
      const mockCommissions = [
        {
          id: 1,
          sales_rep_id: 5,
          commission_type: "recurring",
          amount: 1000,
          status: "approved",
          company_name: "Test Company",
          sales_rep_name: "John Doe",
        },
      ];

      vi.mocked(dbModule.db.execute).mockResolvedValue({
        rows: mockCommissions,
      } as any);

      const result = await getCommissions({ salesRepId: 5 });

      expect(result).toEqual(mockCommissions);
      expect(dbModule.db.execute).toHaveBeenCalledOnce();
    });

    it("should get all commissions for admin", async () => {
      const mockCommissions = [
        { id: 1, sales_rep_id: 5, amount: 1000 },
        { id: 2, sales_rep_id: 6, amount: 2000 },
      ];

      vi.mocked(dbModule.db.execute).mockResolvedValue({
        rows: mockCommissions,
      } as any);

      const result = await getCommissions({ includeAll: true });

      expect(result).toEqual(mockCommissions);
      expect(result.length).toBe(2);
    });

    it("should get commissions for specific user", async () => {
      const mockCommissions = [{ id: 1, sales_rep_id: 5, amount: 1000 }];

      vi.mocked(dbModule.db.execute).mockResolvedValue({
        rows: mockCommissions,
      } as any);

      const result = await getCommissions({ userId: 10 });

      expect(result).toEqual(mockCommissions);
    });

    it("should return empty array when no commissions found", async () => {
      vi.mocked(dbModule.db.execute).mockResolvedValue({
        rows: [],
      } as any);

      const result = await getCommissions({ salesRepId: 999 });

      expect(result).toEqual([]);
    });
  });

  describe("getCommissionById", () => {
    it("should get commission by ID", async () => {
      const mockCommission = {
        id: 1,
        sales_rep_id: 5,
        amount: 1000,
        status: "approved",
      };

      vi.mocked(dbModule.db.execute).mockResolvedValue({
        rows: [mockCommission],
      } as any);

      const result = await getCommissionById(1);

      expect(result).toEqual(mockCommission);
    });

    it("should return null when commission not found", async () => {
      vi.mocked(dbModule.db.execute).mockResolvedValue({
        rows: [],
      } as any);

      const result = await getCommissionById(999);

      expect(result).toBeNull();
    });
  });

  describe("updateCommissionStatus", () => {
    it("should update commission status", async () => {
      const mockCommission = {
        id: 1,
        status: "approved",
      };

      vi.mocked(dbModule.db.execute)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [mockCommission] } as any);

      const result = await updateCommissionStatus(1, "approved");

      expect(result).toEqual(mockCommission);
      expect(dbModule.db.execute).toHaveBeenCalledTimes(2);
    });

    it("should return null when commission not found", async () => {
      vi.mocked(dbModule.db.execute).mockResolvedValue({
        rows: [],
      } as any);

      const result = await updateCommissionStatus(999, "approved");

      expect(result).toBeNull();
    });
  });

  describe("updateCommission", () => {
    it("should update commission amount", async () => {
      const mockCommission = {
        id: 1,
        amount: 1500,
      };

      vi.mocked(dbModule.db.execute)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCommission] } as any);

      const result = await updateCommission(1, { amount: 1500 });

      expect(result).toEqual(mockCommission);
    });

    it("should update commission notes", async () => {
      const mockCommission = {
        id: 1,
        notes: "Updated notes",
      };

      vi.mocked(dbModule.db.execute)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCommission] } as any);

      const result = await updateCommission(1, { notes: "Updated notes" });

      expect(result).toEqual(mockCommission);
    });

    it("should update both amount and notes", async () => {
      const mockCommission = {
        id: 1,
        amount: 1500,
        notes: "Updated notes",
      };

      vi.mocked(dbModule.db.execute)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCommission] } as any);

      const result = await updateCommission(1, {
        amount: 1500,
        notes: "Updated notes",
      });

      expect(result).toEqual(mockCommission);
      expect(dbModule.db.execute).toHaveBeenCalledTimes(3);
    });
  });

  describe("groupCommissionsByInvoice", () => {
    it("should group recurring commissions by invoice", () => {
      const commissions: Commission[] = [
        {
          id: 1,
          hubspot_invoice_id: "inv-1",
          sales_rep_id: 5,
          commission_type: "recurring",
          amount: 1000,
          status: "approved",
          month_number: 1,
          service_type: "bookkeeping",
          date_earned: "2024-01-01",
          created_at: "2024-01-01",
          notes: null,
          company_name: "Company A",
          sales_rep_name: "John Doe",
          service_names: "Bookkeeping",
        },
        {
          id: 2,
          hubspot_invoice_id: "inv-1",
          sales_rep_id: 5,
          commission_type: "recurring",
          amount: 500,
          status: "approved",
          month_number: 2,
          service_type: "bookkeeping",
          date_earned: "2024-02-01",
          created_at: "2024-02-01",
          notes: null,
          company_name: "Company A",
          sales_rep_name: "John Doe",
          service_names: "Bookkeeping",
        },
      ];

      const groups = groupCommissionsByInvoice(commissions);

      expect(groups.size).toBe(1);
      expect(groups.get("inv-1")?.commission).toBe(1500);
      expect(groups.get("inv-1")?.commissions).toHaveLength(2);
    });

    it("should handle bonus commissions separately", () => {
      const commissions: Commission[] = [
        {
          id: 1,
          hubspot_invoice_id: null,
          sales_rep_id: 5,
          commission_type: "monthly_bonus",
          amount: 2000,
          status: "approved",
          month_number: null,
          service_type: null,
          date_earned: "2024-01-01",
          created_at: "2024-01-01",
          notes: "Performance Bonus",
          company_name: "N/A",
          sales_rep_name: "John Doe",
          service_names: null,
        },
      ];

      const groups = groupCommissionsByInvoice(commissions);

      expect(groups.size).toBe(1);
      expect(groups.get("bonus_1")?.dealName).toBe("Performance Bonus");
      expect(groups.get("bonus_1")?.type).toBe("monthly_bonus");
    });

    it("should skip projection records", () => {
      const commissions: Commission[] = [
        {
          id: 1,
          hubspot_invoice_id: "inv-1",
          sales_rep_id: 5,
          commission_type: "projection",
          amount: 1000,
          status: "projected",
          month_number: null,
          service_type: null,
          date_earned: null,
          created_at: "2024-01-01",
          notes: null,
          company_name: "Company A",
          sales_rep_name: "John Doe",
          service_names: "Bookkeeping",
        },
      ];

      const groups = groupCommissionsByInvoice(commissions);

      expect(groups.size).toBe(0);
    });

    it("should handle multiple invoices", () => {
      const commissions: Commission[] = [
        {
          id: 1,
          hubspot_invoice_id: "inv-1",
          sales_rep_id: 5,
          commission_type: "recurring",
          amount: 1000,
          status: "approved",
          month_number: 1,
          service_type: "bookkeeping",
          date_earned: "2024-01-01",
          created_at: "2024-01-01",
          notes: null,
          company_name: "Company A",
          sales_rep_name: "John Doe",
          service_names: "Bookkeeping",
        },
        {
          id: 2,
          hubspot_invoice_id: "inv-2",
          sales_rep_id: 6,
          commission_type: "recurring",
          amount: 2000,
          status: "approved",
          month_number: 1,
          service_type: "taas",
          date_earned: "2024-01-01",
          created_at: "2024-01-01",
          notes: null,
          company_name: "Company B",
          sales_rep_name: "Jane Smith",
          service_names: "TaaS",
        },
      ];

      const groups = groupCommissionsByInvoice(commissions);

      expect(groups.size).toBe(2);
      expect(groups.get("inv-1")?.commission).toBe(1000);
      expect(groups.get("inv-2")?.commission).toBe(2000);
    });
  });
});

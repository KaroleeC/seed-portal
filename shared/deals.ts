import { z } from 'zod';

// Shared Deal types for BFF and client

export interface Deal {
  id: string;
  name: string;
  amount?: number | null;
  stage?: string | null;
  pipeline?: string | null;
  ownerId?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  closeDate?: string | null; // ISO
  currency?: string | null;
  createdAt?: string | null; // ISO
  updatedAt?: string | null; // ISO
  custom?: Record<string, unknown>;
}

export interface DealsResult {
  deals: Deal[];
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
}

// Zod schemas for runtime validation
export const DealSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number().nullable().optional(),
  stage: z.string().nullable().optional(),
  pipeline: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  closeDate: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  custom: z.record(z.unknown()).optional(),
});

export const DealsResultSchema = z.object({
  deals: z.array(DealSchema),
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  message: z.string().optional(),
});

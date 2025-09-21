import { z } from 'zod';

// Canonical shared billing types
export interface Invoice {
  id: string;
  properties: {
    hs_invoice_number?: string;
    hs_invoice_status?: string;
    hs_invoice_total_amount?: string;
    hs_invoice_paid_amount?: string;
    hs_invoice_paid_date?: string; // ISO or epoch
    hs_invoice_due_date?: string;
    hs_object_id?: string;
    [key: string]: any;
  };
  associations?: Record<string, any>;
}

export interface InvoiceLineItem {
  id: string;
  properties: {
    name?: string;
    description?: string;
    price?: string;
    quantity?: string;
    amount?: string;
    hs_recurring_billing_period?: string;
    hs_product_id?: string;
    [key: string]: any;
  };
}

export interface Subscription {
  id: string;
  properties: {
    hs_subscription_status?: string; // ACTIVE, PAUSED
    hs_subscription_start_date?: string;
    hs_subscription_end_date?: string;
    hs_subscription_recurring_amount?: string;
    hs_subscription_next_billing_date?: string;
    hs_object_id?: string;
    [key: string]: any;
  };
}

export interface SubscriptionPayment {
  id: string;
  properties: {
    hs_invoice_number?: string;
    hs_invoice_total_amount?: string;
    hs_invoice_paid_date?: string;
    hs_subscription_id?: string;
    [key: string]: any;
  };
}

// Zod schemas (minimal; keep permissive for now)
export const InvoiceSchema = z.object({
  id: z.string(),
  properties: z.record(z.any()),
  associations: z.record(z.any()).optional(),
});

export const InvoiceLineItemSchema = z.object({
  id: z.string(),
  properties: z.record(z.any()),
});

export const SubscriptionSchema = z.object({
  id: z.string(),
  properties: z.record(z.any()),
});

export const SubscriptionPaymentSchema = z.object({
  id: z.string(),
  properties: z.record(z.any()),
});

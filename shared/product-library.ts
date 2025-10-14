/**
 * SEEDPAY Product Library
 *
 * Standard products and services offered.
 * Prices are in cents (e.g., $150.00 = 15000)
 */

import type { Product } from "./types/quote";

/**
 * Product library - standard offerings
 *
 * Based on current HubSpot product library.
 * To be stored in database in Phase 2.
 */
export const PRODUCT_LIBRARY: Product[] = [
  {
    id: "monthly-bookkeeping-setup-fee",
    name: "Monthly Bookkeeping Setup Fee",
    description: "Monthly Bookkeeping Setup Fee",
    billingFrequency: "one-time",
    basePrice: 15000, // $150.00
  },
  {
    id: "payroll-administration",
    name: "Payroll Administration",
    description: "Payroll Administration",
    billingFrequency: "recurring",
    basePrice: 15000, // $150.00/month
  },
  {
    id: "agent-of-service",
    name: "Agent of Service",
    description: "Agent of Service",
    billingFrequency: "one-time",
    basePrice: 15000, // $150.00
  },
  {
    id: "ap-advanced",
    name: "AP Advanced",
    description: "AP Advanced",
    billingFrequency: "recurring",
    basePrice: 30000, // $300.00/month
  },
  {
    id: "ar-advanced",
    name: "AR Advanced",
    description: "AR Advanced",
    billingFrequency: "recurring",
    basePrice: 30000, // $300.00/month
  },
  {
    id: "ap-lite",
    name: "AP Lite",
    description: "AP Lite",
    billingFrequency: "recurring",
    basePrice: 15000, // $150.00/month
  },
  {
    id: "ar-lite",
    name: "AR Lite",
    description: "AR Lite",
    billingFrequency: "recurring",
    basePrice: 15000, // $150.00/month
  },
  {
    id: "cfo-advisory-40hr",
    name: "CFO Advisory 40-Hour Bundle",
    description: "CFO Advisory 40-Hour Bundle",
    billingFrequency: "one-time",
    basePrice: 1120000, // $11,200.00
  },
  {
    id: "cfo-advisory-32hr",
    name: "CFO Advisory 32-Hour Bundle",
    description: "CFO Advisory 32-Hour Bundle",
    billingFrequency: "one-time",
    basePrice: 912000, // $9,120.00
  },
  {
    id: "cfo-advisory-16hr",
    name: "CFO Advisory 16-Hour Bundle",
    description: "CFO Advisory 16-Hour Bundle",
    billingFrequency: "one-time",
    basePrice: 464000, // $4,640.00
  },
  {
    id: "cfo-advisory-8hr",
    name: "CFO Advisory 8-Hour Bundle",
    description: "CFO Advisory 8-Hour Bundle",
    billingFrequency: "one-time",
    basePrice: 236000, // $2,360.00
  },
  {
    id: "cfo-advisory-deposit",
    name: "CFO Advisory Pay-as-you-Go Deposit",
    description: "CFO Advisory Pay-as-you-Go Deposit",
    billingFrequency: "one-time",
    basePrice: 240000, // $2,400.00
  },
  {
    id: "prior-years-tax-filing",
    name: "Prior Years Tax Filing(s)",
    description: "Prior Years Tax Filing(s)",
    billingFrequency: "one-time",
    basePrice: 150000, // $1,500.00
  },
  {
    id: "managed-qbo-subscription",
    name: "Managed QBO Subscription",
    description: "Managed QBO Subscription",
    billingFrequency: "recurring",
    basePrice: 2500, // $25.00/month
  },
  {
    id: "tax-as-a-service",
    name: "Tax as a Service",
    description: "Tax as a Service",
    billingFrequency: "recurring",
    basePrice: 15000, // $150.00/month
  },
  {
    id: "tax-as-a-service-lite",
    name: "Tax as a Service Lite",
    description: "Tax as a Service Lite",
    billingFrequency: "recurring",
    basePrice: 7500, // $75.00/month
  },
  {
    id: "cleanup-catchup-project",
    name: "Clean-Up / Catch-Up Project",
    description: "Clean-Up / Catch-Up Project",
    billingFrequency: "one-time",
    basePrice: 10000, // $100.00
  },
  {
    id: "monthly-bookkeeping",
    name: "Monthly Bookkeeping",
    description: "Monthly Bookkeeping",
    billingFrequency: "recurring",
    basePrice: 7500, // $75.00/month
  },
];

/**
 * Get product by ID
 */
export function getProductById(id: string): Product | undefined {
  return PRODUCT_LIBRARY.find((p) => p.id === id);
}

/**
 * Get all recurring products
 */
export function getRecurringProducts(): Product[] {
  return PRODUCT_LIBRARY.filter((p) => p.billingFrequency === "recurring");
}

/**
 * Get all one-time products
 */
export function getOneTimeProducts(): Product[] {
  return PRODUCT_LIBRARY.filter((p) => p.billingFrequency === "one-time");
}

/**
 * Search products by name
 */
export function searchProducts(query: string): Product[] {
  const lowerQuery = query.toLowerCase();
  return PRODUCT_LIBRARY.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) || p.description.toLowerCase().includes(lowerQuery)
  );
}

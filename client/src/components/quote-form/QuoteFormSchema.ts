// This file is a re-export shim for the canonical quote form schema
// All schema logic has been moved to features/quote-calculator/schema.ts
// ⚠️ DO NOT DUPLICATE SCHEMA LOGIC HERE - use the canonical schema instead
export * from "@/features/quote-calculator/schema";
export { quoteFormSchema as formSchema } from "@/features/quote-calculator/schema";

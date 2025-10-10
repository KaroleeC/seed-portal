/**
 * Quote API Mock Handlers
 * Used by both Vitest tests and Storybook stories
 */

import { http, HttpResponse, delay } from "msw";

const mockQuote = {
  id: 1,
  prospectEmail: "prospect@example.com",
  prospectName: "John Doe",
  businessName: "Acme Corp",
  industry: "technology",
  revenue: 1000000,
  monthlyVolume: 50000,
  pricing: {
    baseMonthlyFee: 299,
    transactionFee: 0.029,
    total: 299,
  },
  status: "draft",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const quoteHandlers = [
  // Get all quotes
  http.get("/api/quotes", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const email = url.searchParams.get("email");

    if (email) {
      // Filter by email
      return HttpResponse.json({
        quotes: [mockQuote],
        total: 1,
      });
    }

    return HttpResponse.json({
      quotes: [mockQuote],
      total: 1,
    });
  }),

  // Get single quote
  http.get("/api/quotes/:id", async ({ params }) => {
    await delay(100);

    return HttpResponse.json({
      ...mockQuote,
      id: Number(params.id),
    });
  }),

  // Create quote
  http.post("/api/quotes", async ({ request }) => {
    await delay(200);
    const body = await request.json();

    return HttpResponse.json(
      {
        ...mockQuote,
        ...body,
        id: Math.floor(Math.random() * 10000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // Update quote
  http.patch("/api/quotes/:id", async ({ params, request }) => {
    await delay(200);
    const body = await request.json();

    return HttpResponse.json({
      ...mockQuote,
      ...body,
      id: Number(params.id),
      updatedAt: new Date().toISOString(),
    });
  }),

  // Delete quote
  http.delete("/api/quotes/:id", async () => {
    await delay(100);
    return HttpResponse.json({ success: true });
  }),

  // Calculate pricing
  http.post("/api/quotes/calculate", async ({ request }) => {
    await delay(150);
    const body = await request.json();

    return HttpResponse.json({
      baseMonthlyFee: 299,
      transactionFee: 0.029,
      total: 299,
      breakdown: {
        base: 299,
        industryMultiplier: 1.0,
        revenueMultiplier: 1.0,
      },
    });
  }),
];

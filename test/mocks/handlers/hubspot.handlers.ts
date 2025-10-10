/**
 * HubSpot API Mock Handlers
 * Used by both Vitest tests and Storybook stories
 */

import { http, HttpResponse, delay } from "msw";

const mockHubSpotDeal = {
  id: "12345",
  properties: {
    dealname: "Acme Corp - Quote",
    amount: "299",
    dealstage: "qualifiedtobuy",
    closedate: new Date().toISOString(),
    createdate: new Date().toISOString(),
  },
};

const mockHubSpotContact = {
  id: "67890",
  properties: {
    email: "contact@example.com",
    firstname: "John",
    lastname: "Doe",
    company: "Acme Corp",
  },
};

export const hubspotHandlers = [
  // Get deal by ID
  http.get("https://api.hubapi.com/crm/v3/objects/deals/:dealId", async ({ params }) => {
    await delay(150);

    return HttpResponse.json({
      ...mockHubSpotDeal,
      id: params.dealId,
    });
  }),

  // Create deal
  http.post("https://api.hubapi.com/crm/v3/objects/deals", async ({ request }) => {
    await delay(200);
    const body = await request.json();

    return HttpResponse.json(
      {
        ...mockHubSpotDeal,
        id: `${Math.floor(Math.random() * 100000)}`,
        properties: {
          ...mockHubSpotDeal.properties,
          ...body.properties,
        },
      },
      { status: 201 }
    );
  }),

  // Update deal
  http.patch("https://api.hubapi.com/crm/v3/objects/deals/:dealId", async ({ params, request }) => {
    await delay(150);
    const body = await request.json();

    return HttpResponse.json({
      ...mockHubSpotDeal,
      id: params.dealId,
      properties: {
        ...mockHubSpotDeal.properties,
        ...body.properties,
      },
    });
  }),

  // Search deals
  http.post("https://api.hubapi.com/crm/v3/objects/deals/search", async () => {
    await delay(200);

    return HttpResponse.json({
      results: [mockHubSpotDeal],
      total: 1,
    });
  }),

  // Get contact
  http.get("https://api.hubapi.com/crm/v3/objects/contacts/:contactId", async ({ params }) => {
    await delay(150);

    return HttpResponse.json({
      ...mockHubSpotContact,
      id: params.contactId,
    });
  }),

  // Create contact
  http.post("https://api.hubapi.com/crm/v3/objects/contacts", async ({ request }) => {
    await delay(200);
    const body = await request.json();

    return HttpResponse.json(
      {
        ...mockHubSpotContact,
        id: `${Math.floor(Math.random() * 100000)}`,
        properties: {
          ...mockHubSpotContact.properties,
          ...body.properties,
        },
      },
      { status: 201 }
    );
  }),
];

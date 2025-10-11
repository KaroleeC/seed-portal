import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@test/mocks/server";
import { HubSpotHttpClient } from "../../hubspot/http";

describe("HubSpotHttpClient", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("sends Authorization header and parses JSON", async () => {
    server.use(
      http.get("https://api.hubapi.com/crm/v3/objects/contacts", ({ request }) => {
        const auth = request.headers.get("authorization");
        expect(auth).toBe("Bearer test_token");
        return HttpResponse.json({ ok: true });
      })
    );

    const client = new HubSpotHttpClient("test_token");
    const res = await client.request("/crm/v3/objects/contacts");
    expect(res).toEqual({ ok: true });
  });

  it("returns null on 204 (no content)", async () => {
    server.use(
      http.get("https://api.hubapi.com/crm/v3/objects/deals", () => {
        return new HttpResponse(null, { status: 204 });
      })
    );
    const client = new HubSpotHttpClient("test_token");
    const res = await client.request("/crm/v3/objects/deals");
    expect(res).toBeNull();
  });

  it("retries on 500 and then succeeds", async () => {
    vi.useFakeTimers();
    let calls = 0;
    server.use(
      http.get("https://api.hubapi.com/crm/v3/objects/companies", () => {
        calls += 1;
        if (calls === 1) {
          return new HttpResponse("server error", { status: 500 });
        }
        return HttpResponse.json({ ok: true });
      })
    );
    const client = new HubSpotHttpClient("test_token");
    const promise = client.request("/crm/v3/objects/companies");
    // backoff for first retry is 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    const res = await promise;
    expect(res).toEqual({ ok: true });
  });
});

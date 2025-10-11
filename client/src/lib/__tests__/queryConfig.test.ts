import { describe, it, expect } from "vitest";
import {
  ResourceType,
  RESOURCE_TIMING,
  RESOURCE_TYPE_PATTERNS,
  getResourceType,
  getQueryTiming,
  defaultQueryOptions,
  prefetchKeys,
  getStaticResourceKeys,
} from "../queryConfig";

describe("Query Configuration", () => {
  describe("RESOURCE_TIMING", () => {
    it("defines timing for all resource types", () => {
      expect(RESOURCE_TIMING[ResourceType.STATIC]).toBeDefined();
      expect(RESOURCE_TIMING[ResourceType.SLOW]).toBeDefined();
      expect(RESOURCE_TIMING[ResourceType.MEDIUM]).toBeDefined();
      expect(RESOURCE_TIMING[ResourceType.FAST]).toBeDefined();
      expect(RESOURCE_TIMING[ResourceType.INFINITE]).toBeDefined();
    });

    it("has longer staleTime for static resources", () => {
      const staticTime = RESOURCE_TIMING[ResourceType.STATIC].staleTime;
      const slowTime = RESOURCE_TIMING[ResourceType.SLOW].staleTime;
      const mediumTime = RESOURCE_TIMING[ResourceType.MEDIUM].staleTime;
      const fastTime = RESOURCE_TIMING[ResourceType.FAST].staleTime;

      expect(staticTime).toBeGreaterThan(slowTime);
      expect(slowTime).toBeGreaterThan(mediumTime);
      expect(mediumTime).toBeGreaterThan(fastTime);
    });

    it("sets Infinity for infinite resources", () => {
      expect(RESOURCE_TIMING[ResourceType.INFINITE].staleTime).toBe(Infinity);
    });

    it("all timings have descriptions", () => {
      Object.values(RESOURCE_TIMING).forEach((timing) => {
        expect(timing.description).toBeTruthy();
        expect(typeof timing.description).toBe("string");
      });
    });
  });

  describe("RESOURCE_TYPE_PATTERNS", () => {
    it("maps pricing config to STATIC", () => {
      expect(RESOURCE_TYPE_PATTERNS["pricing.config"]).toBe(ResourceType.STATIC);
      expect(RESOURCE_TYPE_PATTERNS["seedqc.pricing"]).toBe(ResourceType.STATIC);
    });

    it("maps roles and permissions to STATIC", () => {
      expect(RESOURCE_TYPE_PATTERNS["rbac.roles"]).toBe(ResourceType.STATIC);
      expect(RESOURCE_TYPE_PATTERNS["rbac.permissions"]).toBe(ResourceType.STATIC);
    });

    it("maps deals and quotes to SLOW", () => {
      expect(RESOURCE_TYPE_PATTERNS["seedpay.deals"]).toBe(ResourceType.SLOW);
      expect(RESOURCE_TYPE_PATTERNS["quotes"]).toBe(ResourceType.SLOW);
    });

    it("maps commissions to MEDIUM", () => {
      expect(RESOURCE_TYPE_PATTERNS["seedpay.commissions"]).toBe(ResourceType.MEDIUM);
      expect(RESOURCE_TYPE_PATTERNS["seedpay.bonuses"]).toBe(ResourceType.MEDIUM);
    });

    it("maps stripe transactions to FAST", () => {
      expect(RESOURCE_TYPE_PATTERNS["stripe.transactions"]).toBe(ResourceType.FAST);
    });

    it("maps search to INFINITE", () => {
      expect(RESOURCE_TYPE_PATTERNS["crm.contacts.search"]).toBe(ResourceType.INFINITE);
    });
  });

  describe("getResourceType()", () => {
    it("identifies static resources", () => {
      expect(getResourceType(["pricing", "config"])).toBe(ResourceType.STATIC);
      expect(getResourceType(["seedqc", "pricing", "config"])).toBe(ResourceType.STATIC);
      expect(getResourceType(["rbac", "roles"])).toBe(ResourceType.STATIC);
    });

    it("identifies slow resources", () => {
      expect(getResourceType(["seedpay", "deals", "list"])).toBe(ResourceType.SLOW);
      expect(getResourceType(["quotes"])).toBe(ResourceType.SLOW);
      expect(getResourceType(["seedqc", "content", "all"])).toBe(ResourceType.SLOW);
    });

    it("identifies medium resources", () => {
      expect(getResourceType(["seedpay", "commissions", "all"])).toBe(ResourceType.MEDIUM);
      expect(getResourceType(["seedpay", "bonuses", "monthly"])).toBe(ResourceType.MEDIUM);
    });

    it("identifies fast resources", () => {
      expect(getResourceType(["stripe", "transactions"])).toBe(ResourceType.FAST);
    });

    it("identifies infinite resources", () => {
      expect(getResourceType(["crm", "contacts", "search", "query"])).toBe(ResourceType.INFINITE);
    });

    it("returns MEDIUM for unknown patterns", () => {
      expect(getResourceType(["unknown", "resource"])).toBe(ResourceType.MEDIUM);
    });

    it("handles empty query keys", () => {
      expect(getResourceType([])).toBeUndefined();
    });

    it("ignores non-string query key parts", () => {
      expect(getResourceType(["pricing", 123, "config"])).toBe(ResourceType.STATIC);
    });

    it("uses most specific pattern match", () => {
      // "seedpay.deals" should match before "seedpay"
      expect(getResourceType(["seedpay", "deals", "by-owner"])).toBe(ResourceType.SLOW);
    });
  });

  describe("getQueryTiming()", () => {
    it("returns static timing for pricing config", () => {
      const timing = getQueryTiming(["pricing", "config"]);

      expect(timing.staleTime).toBe(RESOURCE_TIMING[ResourceType.STATIC].staleTime);
      expect(timing.gcTime).toBe(RESOURCE_TIMING[ResourceType.STATIC].gcTime);
    });

    it("returns slow timing for deals", () => {
      const timing = getQueryTiming(["seedpay", "deals", "list"]);

      expect(timing.staleTime).toBe(RESOURCE_TIMING[ResourceType.SLOW].staleTime);
      expect(timing.gcTime).toBe(RESOURCE_TIMING[ResourceType.SLOW].gcTime);
    });

    it("returns medium timing for commissions", () => {
      const timing = getQueryTiming(["seedpay", "commissions", "all"]);

      expect(timing.staleTime).toBe(RESOURCE_TIMING[ResourceType.MEDIUM].staleTime);
      expect(timing.gcTime).toBe(RESOURCE_TIMING[ResourceType.MEDIUM].gcTime);
    });

    it("returns fast timing for stripe transactions", () => {
      const timing = getQueryTiming(["stripe", "transactions"]);

      expect(timing.staleTime).toBe(RESOURCE_TIMING[ResourceType.FAST].staleTime);
      expect(timing.gcTime).toBe(RESOURCE_TIMING[ResourceType.FAST].gcTime);
    });

    it("returns default timing for unknown resources", () => {
      const timing = getQueryTiming(["unknown", "resource"]);

      expect(timing.staleTime).toBe(RESOURCE_TIMING[ResourceType.MEDIUM].staleTime);
      expect(timing.gcTime).toBe(RESOURCE_TIMING[ResourceType.MEDIUM].gcTime);
    });

    it("handles empty query keys gracefully", () => {
      const timing = getQueryTiming([]);

      expect(timing.staleTime).toBe(RESOURCE_TIMING[ResourceType.MEDIUM].staleTime);
      expect(timing.gcTime).toBe(RESOURCE_TIMING[ResourceType.MEDIUM].gcTime);
    });
  });

  describe("defaultQueryOptions", () => {
    it("disables refetchOnWindowFocus", () => {
      expect(defaultQueryOptions.queries?.refetchOnWindowFocus).toBe(false);
    });

    it("enables refetchOnReconnect", () => {
      expect(defaultQueryOptions.queries?.refetchOnReconnect).toBe(true);
    });

    it("disables refetchInterval", () => {
      expect(defaultQueryOptions.queries?.refetchInterval).toBe(false);
    });

    it("has default staleTime", () => {
      expect(defaultQueryOptions.queries?.staleTime).toBe(2 * 60 * 1000);
    });

    it("has default gcTime", () => {
      expect(defaultQueryOptions.queries?.gcTime).toBe(10 * 60 * 1000);
    });

    it("has retry configuration", () => {
      expect(defaultQueryOptions.queries?.retry).toBeDefined();
      expect(typeof defaultQueryOptions.queries?.retry).toBe("function");
    });

    it("doesn't retry on 401/403 errors", () => {
      const retry = defaultQueryOptions.queries?.retry;
      if (typeof retry === "function") {
        expect(retry(0, new Error("401: Unauthorized"))).toBe(false);
        expect(retry(0, new Error("403: Forbidden"))).toBe(false);
      }
    });

    it("retries network errors", () => {
      const retry = defaultQueryOptions.queries?.retry;
      if (typeof retry === "function") {
        expect(retry(0, new Error("Network error"))).toBe(true);
        expect(retry(1, new Error("Network error"))).toBe(true);
        expect(retry(2, new Error("Network error"))).toBe(false); // Max 2 retries
      }
    });
  });

  describe("prefetchKeys", () => {
    it("provides pricing config key", () => {
      expect(prefetchKeys.pricingConfig).toEqual(["seedqc", "pricing", "config"]);
    });

    it("provides calculator content key", () => {
      expect(prefetchKeys.calculatorContent).toEqual(["seedqc", "content", "all"]);
    });

    it("provides commissions key factory", () => {
      expect(prefetchKeys.commissions("123")).toEqual(["seedpay", "commissions", "123"]);
      expect(prefetchKeys.commissions()).toEqual(["seedpay", "commissions", "all"]);
    });

    it("provides deals key factory", () => {
      expect(prefetchKeys.deals()).toEqual(["seedpay", "deals", "list"]);
    });

    it("provides user profile key", () => {
      expect(prefetchKeys.userProfile).toEqual(["core", "user", "me"]);
    });
  });

  describe("getStaticResourceKeys()", () => {
    it("returns array of static resource keys", () => {
      const keys = getStaticResourceKeys();

      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);
    });

    it("includes pricing config", () => {
      const keys = getStaticResourceKeys();
      const hasPricingConfig = keys.some((key) => key.join(".").includes("pricing.config"));

      expect(hasPricingConfig).toBe(true);
    });

    it("includes RBAC resources", () => {
      const keys = getStaticResourceKeys();
      const hasRbac = keys.some((key) => key.join(".").includes("rbac"));

      expect(hasRbac).toBe(true);
    });

    it("only includes STATIC resources", () => {
      const keys = getStaticResourceKeys();

      keys.forEach((key) => {
        const pattern = key.join(".");
        const resourceType = RESOURCE_TYPE_PATTERNS[pattern];
        expect(resourceType).toBe(ResourceType.STATIC);
      });
    });
  });

  describe("Performance Characteristics", () => {
    it("getResourceType executes quickly", () => {
      const testKeys = [
        ["pricing", "config"],
        ["seedpay", "deals", "list"],
        ["seedpay", "commissions", "all"],
        ["unknown", "resource"],
      ];

      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        testKeys.forEach((key) => getResourceType(key));
      }

      const duration = Date.now() - start;

      // Should complete 4000 iterations in < 50ms
      expect(duration).toBeLessThan(50);
    });

    it("getQueryTiming executes quickly", () => {
      const testKeys = [
        ["pricing", "config"],
        ["seedpay", "deals", "list"],
        ["seedpay", "commissions", "all"],
        ["unknown", "resource"],
      ];

      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        testKeys.forEach((key) => getQueryTiming(key));
      }

      const duration = Date.now() - start;

      // Should complete 4000 iterations in < 50ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe("DRY Principle Compliance", () => {
    it("no duplicate patterns in RESOURCE_TYPE_PATTERNS", () => {
      const patterns = Object.keys(RESOURCE_TYPE_PATTERNS);
      const uniquePatterns = [...new Set(patterns)];

      expect(patterns.length).toBe(uniquePatterns.length);
    });

    it("all resource types have timing configuration", () => {
      Object.values(ResourceType).forEach((type) => {
        expect(RESOURCE_TIMING[type]).toBeDefined();
        expect(RESOURCE_TIMING[type].staleTime).toBeDefined();
        expect(RESOURCE_TIMING[type].gcTime).toBeDefined();
      });
    });

    it("timing values are consistent (gcTime >= staleTime)", () => {
      Object.values(RESOURCE_TIMING).forEach((timing) => {
        if (timing.staleTime !== Infinity) {
          expect(timing.gcTime).toBeGreaterThanOrEqual(timing.staleTime);
        }
      });
    });
  });
});

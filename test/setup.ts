import { expect, afterEach, beforeAll, afterAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { server } from "./mocks/server";

// Extend Vitest's expect with React Testing Library matchers
expect.extend(matchers);

// Setup MSW (Mock Service Worker) for API mocking
beforeAll(() => {
  // Start MSW server before all tests
  server.listen({
    onUnhandledRequest: process.env.CI ? "error" : "warn", // stricter in CI
  });
});

afterEach(() => {
  // Cleanup React Testing Library
  cleanup();

  // Reset MSW handlers after each test
  // This ensures test isolation
  server.resetHandlers();
});

afterAll(() => {
  // Stop MSW server after all tests
  server.close();
});

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.HUBSPOT_ACCESS_TOKEN = "test-hubspot-token";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

// Browser-only mocks (only run in jsdom environment)
if (typeof window !== "undefined") {
  // Mock window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as unknown as typeof IntersectionObserver;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
}

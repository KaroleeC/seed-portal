/**
 * Example Test: MSW Integration
 *
 * This test demonstrates how MSW intercepts API calls.
 * Run with: npm test -- example
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { server } from "./server";
import { http, HttpResponse } from "msw";

// Simple component that fetches data
function EmailCounter() {
  const [count, setCount] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/email/threads")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setCount(data.threads.length);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>Email count: {count}</div>;
}

// Need to import React for JSX
import * as React from "react";

describe("MSW Integration Example", () => {
  it("intercepts API calls with default handlers", async () => {
    render(<EmailCounter />);

    // Initially shows loading
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // MSW intercepts the fetch and returns mock data
    await waitFor(() => {
      expect(screen.getByText(/Email count: 2/i)).toBeInTheDocument();
    });
  });

  it("can override handlers for specific tests", async () => {
    // Override the handler for this test only
    server.use(
      http.get("/api/email/threads", () => {
        return HttpResponse.json({
          threads: [{ id: 1 }, { id: 2 }, { id: 3 }],
        });
      })
    );

    render(<EmailCounter />);

    await waitFor(() => {
      expect(screen.getByText(/Email count: 3/i)).toBeInTheDocument();
    });
  });

  it("can test error scenarios", async () => {
    // Simulate API error
    server.use(
      http.get("/api/email/threads", () => {
        return HttpResponse.json({ error: "Server error" }, { status: 500 });
      })
    );

    render(<EmailCounter />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/i)).toBeInTheDocument();
    });
  });

  it("resets handlers after each test", async () => {
    // This test should use the default handlers again
    // (the override from the previous test is reset)
    render(<EmailCounter />);

    await waitFor(() => {
      expect(screen.getByText(/Email count: 2/i)).toBeInTheDocument();
    });
  });
});

describe("MSW Handler Examples", () => {
  it("demonstrates delay simulation", async () => {
    const start = Date.now();

    render(<EmailCounter />);

    // Handler has delay(100) so loading state should be visible
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Email count:/i)).toBeInTheDocument();
    });

    const elapsed = Date.now() - start;
    // Should take at least 100ms due to MSW delay
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  it("demonstrates dynamic responses", async () => {
    // Return different data based on query params
    server.use(
      http.get("/api/email/threads", ({ request }) => {
        const url = new URL(request.url);
        const filter = url.searchParams.get("filter");

        if (filter === "starred") {
          return HttpResponse.json({ threads: [{ id: 1 }] });
        }

        return HttpResponse.json({ threads: [] });
      })
    );

    // Component would need to support query params
    // This is just demonstrating the pattern
    const response = await fetch("/api/email/threads?filter=starred");
    const data = await response.json();

    expect(data.threads).toHaveLength(1);
  });
});

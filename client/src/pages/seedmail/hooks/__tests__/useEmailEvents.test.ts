/**
 * useEmailEvents Hook Unit Tests
 *
 * Tests the SSE event hook with mocked EventSource
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEmailEvents } from "../useEmailEvents";
import { createElement, type ReactNode } from "react";

// Mock EventSource
class MockEventSource {
  public url: string;
  public readyState: number = 0;
  public onopen: ((event: Event) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map();

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  constructor(url: string) {
    this.url = url;
    this.readyState = MockEventSource.CONNECTING;

    // Simulate connection opening async
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  addEventListener(event: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  removeEventListener(event: string, listener: (event: MessageEvent) => void) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Helper to emit events in tests
  emit(eventName: string, data: unknown) {
    const listeners = this.listeners.get(eventName);
    if (listeners) {
      const event = new MessageEvent("message", {
        data: JSON.stringify(data),
      });
      listeners.forEach((listener) => listener(event));
    }
  }

  // Helper to emit error
  emitError() {
    // Don't override readyState if it's already set to CLOSED
    if (this.readyState !== MockEventSource.CLOSED) {
      this.readyState = MockEventSource.CONNECTING;
    }
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
    this.listeners.clear();
  }
}

// Store instance for test access
let mockEventSourceInstance: MockEventSource | null = null;

describe("useEmailEvents", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => ReturnType<typeof createElement>;

  beforeEach(() => {
    // Setup QueryClient
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    // Mock EventSource globally
    mockEventSourceInstance = null;
    const MockedEventSource = vi.fn((url: string) => {
      mockEventSourceInstance = new MockEventSource(url);
      return mockEventSourceInstance as any;
    }) as any;

    // Add static constants that the hook relies on
    MockedEventSource.CONNECTING = MockEventSource.CONNECTING;
    MockedEventSource.OPEN = MockEventSource.OPEN;
    MockedEventSource.CLOSED = MockEventSource.CLOSED;

    global.EventSource = MockedEventSource;

    // Mock console methods to reduce noise
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it("should not connect when disabled", () => {
    const { result } = renderHook(
      () => useEmailEvents({ accountId: "test-account", enabled: false }),
      { wrapper }
    );

    expect(result.current.isConnected).toBe(false);
    expect(global.EventSource).not.toHaveBeenCalled();
  });

  it("should not connect when accountId is null", () => {
    const { result } = renderHook(() => useEmailEvents({ accountId: null, enabled: true }), {
      wrapper,
    });

    expect(result.current.isConnected).toBe(false);
    expect(global.EventSource).not.toHaveBeenCalled();
  });

  it("should create EventSource connection with correct URL", () => {
    renderHook(() => useEmailEvents({ accountId: "test-account-123", enabled: true }), { wrapper });

    expect(global.EventSource).toHaveBeenCalledWith("/api/email/events/test-account-123");
  });

  it("should set isConnected to true on 'connected' event", async () => {
    const { result } = renderHook(
      () => useEmailEvents({ accountId: "test-account", enabled: true }),
      { wrapper }
    );

    expect(result.current.isConnected).toBe(false);

    // Emit connected event
    await waitFor(() => {
      expect(mockEventSourceInstance).not.toBeNull();
    });

    mockEventSourceInstance!.emit("connected", {
      accountId: "test-account",
      timestamp: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it("should update lastSync and invalidate queries on 'sync-completed' event", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useEmailEvents({ accountId: "test-account", enabled: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockEventSourceInstance).not.toBeNull();
    });

    const syncData = {
      syncType: "full" as const,
      threadsProcessed: 42,
      messagesProcessed: 150,
      duration: 2500,
    };

    mockEventSourceInstance!.emit("sync-completed", syncData);

    await waitFor(() => {
      expect(result.current.lastSync).toEqual(syncData);
    });

    // Verify queries were invalidated
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["/api/email/threads", "test-account"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["/api/email/drafts", "test-account"],
    });
  });

  it("should update lastEmailReceived and invalidate threads on 'email-received' event", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useEmailEvents({ accountId: "test-account", enabled: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockEventSourceInstance).not.toBeNull();
    });

    const emailData = {
      messageId: "msg-123",
      threadId: "thread-456",
      from: "sender@example.com",
      subject: "New Email Subject",
    };

    mockEventSourceInstance!.emit("email-received", emailData);

    await waitFor(() => {
      expect(result.current.lastEmailReceived).toEqual(emailData);
    });

    // Verify threads query was invalidated
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["/api/email/threads", "test-account"],
    });
  });

  it("should update lastDraftSaved and invalidate drafts on 'draft-saved' event", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useEmailEvents({ accountId: "test-account", enabled: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockEventSourceInstance).not.toBeNull();
    });

    const draftData = {
      draftId: "draft-789",
      subject: "Draft Subject",
    };

    mockEventSourceInstance!.emit("draft-saved", draftData);

    await waitFor(() => {
      expect(result.current.lastDraftSaved).toEqual(draftData);
    });

    // Verify drafts query was invalidated
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["/api/email/drafts", "test-account"],
    });
  });

  it("should invalidate threads on 'email-deleted' event", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useEmailEvents({ accountId: "test-account", enabled: true }), { wrapper });

    await waitFor(() => {
      expect(mockEventSourceInstance).not.toBeNull();
    });

    const deleteData = {
      messageId: "msg-deleted",
      threadId: "thread-deleted",
    };

    mockEventSourceInstance!.emit("email-deleted", deleteData);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["/api/email/threads", "test-account"],
      });
    });
  });

  it("should handle onerror and set error state", async () => {
    const { result } = renderHook(
      () => useEmailEvents({ accountId: "test-account", enabled: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockEventSourceInstance).not.toBeNull();
    });

    // Initially connected
    mockEventSourceInstance!.emit("connected", {
      accountId: "test-account",
      timestamp: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Trigger error
    mockEventSourceInstance!.readyState = MockEventSource.CLOSED;
    mockEventSourceInstance!.emitError();

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe("Connection closed");
    });
  });

  it("should close connection on unmount", async () => {
    const { unmount } = renderHook(
      () => useEmailEvents({ accountId: "test-account", enabled: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockEventSourceInstance).not.toBeNull();
    });

    const closeSpy = vi.spyOn(mockEventSourceInstance!, "close");

    unmount();

    await waitFor(() => {
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  it("should close and reconnect when accountId changes", async () => {
    const { rerender } = renderHook(
      ({ accountId }) => useEmailEvents({ accountId, enabled: true }),
      {
        wrapper,
        initialProps: { accountId: "account-1" },
      }
    );

    await waitFor(() => {
      expect(mockEventSourceInstance).not.toBeNull();
    });

    const firstInstance = mockEventSourceInstance;
    const closeSpy = vi.spyOn(firstInstance!, "close");

    // Change accountId
    rerender({ accountId: "account-2" });

    await waitFor(() => {
      expect(closeSpy).toHaveBeenCalled();
    });

    // Verify new connection was created
    expect(global.EventSource).toHaveBeenCalledWith("/api/email/events/account-2");
  });

  it("should support manual disconnect", async () => {
    const { result } = renderHook(
      () => useEmailEvents({ accountId: "test-account", enabled: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockEventSourceInstance).not.toBeNull();
    });

    const closeSpy = vi.spyOn(mockEventSourceInstance!, "close");

    // Call disconnect
    result.current.disconnect();

    expect(closeSpy).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
  });

  it("should handle EventSource not supported", () => {
    // Remove EventSource
    delete (global as any).EventSource;

    const { result } = renderHook(
      () => useEmailEvents({ accountId: "test-account", enabled: true }),
      { wrapper }
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe("SSE not supported");
    expect(console.warn).toHaveBeenCalledWith(
      "[SSE] EventSource not supported, falling back to polling"
    );
  });
});

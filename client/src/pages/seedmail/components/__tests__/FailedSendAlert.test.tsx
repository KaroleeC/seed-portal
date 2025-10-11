import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FailedSendAlert } from "../FailedSendAlert";
import * as queryClient from "@/lib/queryClient";

// Mock API request
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("FailedSendAlert", () => {
  let testQueryClient: QueryClient;

  beforeEach(() => {
    testQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
  );

  it("should render failed send alert with error message", () => {
    render(
      <FailedSendAlert
        statusId="status-123"
        errorMessage="Network timeout"
        retryCount={0}
        maxRetries={3}
      />,
      { wrapper }
    );

    expect(screen.getByText("Send Failed")).toBeInTheDocument();
    expect(screen.getByText("Network timeout")).toBeInTheDocument();
    expect(screen.getByText("Attempt 1/3")).toBeInTheDocument();
  });

  it("should render hard bounce with appropriate message", () => {
    render(
      <FailedSendAlert
        statusId="status-123"
        bounceType="hard"
        bounceReason="Recipient address does not exist"
        retryCount={0}
        maxRetries={3}
      />,
      { wrapper }
    );

    expect(screen.getByText("Permanent failure")).toBeInTheDocument();
    expect(screen.getByText("Recipient address does not exist")).toBeInTheDocument();
    expect(screen.getByText(/email address appears to be invalid/i)).toBeInTheDocument();
  });

  it("should render soft bounce with retry suggestion", () => {
    render(
      <FailedSendAlert
        statusId="status-123"
        bounceType="soft"
        bounceReason="Temporary delivery failure"
        retryCount={1}
        maxRetries={3}
      />,
      { wrapper }
    );

    expect(screen.getByText("Temporary failure")).toBeInTheDocument();
    expect(screen.getByText(/temporary issue/i)).toBeInTheDocument();
    expect(screen.getByText("Attempt 2/3")).toBeInTheDocument();
  });

  it("should render spam complaint message", () => {
    render(
      <FailedSendAlert
        statusId="status-123"
        bounceType="complaint"
        bounceReason="Message blocked as spam"
        retryCount={0}
        maxRetries={3}
      />,
      { wrapper }
    );

    expect(screen.getByText("Spam complaint")).toBeInTheDocument();
    expect(screen.getByText(/marked as spam/i)).toBeInTheDocument();
  });

  it("should show retry button when retries available", () => {
    render(
      <FailedSendAlert
        statusId="status-123"
        errorMessage="Failed to send"
        retryCount={1}
        maxRetries={3}
      />,
      { wrapper }
    );

    expect(screen.getByRole("button", { name: /retry send/i })).toBeInTheDocument();
  });

  it("should hide retry button when max retries reached", () => {
    render(
      <FailedSendAlert
        statusId="status-123"
        errorMessage="Failed to send"
        retryCount={3}
        maxRetries={3}
      />,
      { wrapper }
    );

    expect(screen.queryByRole("button", { name: /retry send/i })).not.toBeInTheDocument();
    expect(screen.getByText(/maximum retry attempts reached/i)).toBeInTheDocument();
  });

  it("should call retry API on retry button click", async () => {
    const user = userEvent.setup();
    vi.mocked(queryClient.apiRequest).mockResolvedValue({ success: true });

    render(
      <FailedSendAlert
        statusId="status-123"
        errorMessage="Failed to send"
        retryCount={0}
        maxRetries={3}
      />,
      { wrapper }
    );

    const retryButton = screen.getByRole("button", { name: /retry send/i });
    await user.click(retryButton);

    await waitFor(() => {
      expect(queryClient.apiRequest).toHaveBeenCalledWith("/api/email/retry-send/status-123", {
        method: "POST",
      });
    });
  });

  it("should show success toast on successful retry", async () => {
    const user = userEvent.setup();
    vi.mocked(queryClient.apiRequest).mockResolvedValue({ success: true });

    render(
      <FailedSendAlert
        statusId="status-123"
        errorMessage="Failed to send"
        retryCount={0}
        maxRetries={3}
      />,
      { wrapper }
    );

    const retryButton = screen.getByRole("button", { name: /retry send/i });
    await user.click(retryButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Email sent!",
        })
      );
    });
  });

  it("should show error toast on failed retry", async () => {
    const user = userEvent.setup();
    vi.mocked(queryClient.apiRequest).mockRejectedValue(new Error("Retry failed"));

    render(
      <FailedSendAlert
        statusId="status-123"
        errorMessage="Failed to send"
        retryCount={0}
        maxRetries={3}
      />,
      { wrapper }
    );

    const retryButton = screen.getByRole("button", { name: /retry send/i });
    await user.click(retryButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Retry failed",
          variant: "destructive",
        })
      );
    });
  });

  it("should call onDismiss when dismiss button clicked", async () => {
    const user = userEvent.setup();
    const mockDismiss = vi.fn();

    render(
      <FailedSendAlert
        statusId="status-123"
        errorMessage="Failed to send"
        retryCount={0}
        maxRetries={3}
        onDismiss={mockDismiss}
      />,
      { wrapper }
    );

    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    await user.click(dismissButton);

    expect(mockDismiss).toHaveBeenCalled();
  });

  it("should disable retry button while retrying", async () => {
    const user = userEvent.setup();
    vi.mocked(queryClient.apiRequest).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
    );

    render(
      <FailedSendAlert
        statusId="status-123"
        errorMessage="Failed to send"
        retryCount={0}
        maxRetries={3}
      />,
      { wrapper }
    );

    const retryButton = screen.getByRole("button", { name: /retry send/i });
    await user.click(retryButton);

    // Button should be disabled while retrying
    expect(retryButton).toBeDisabled();
    expect(screen.getByText("Retrying...")).toBeInTheDocument();
  });
});

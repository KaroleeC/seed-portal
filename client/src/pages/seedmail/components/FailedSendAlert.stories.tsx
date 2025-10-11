import type { Meta, StoryObj } from "@storybook/react-vite";
import { FailedSendAlert } from "./FailedSendAlert";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock QueryClient for Storybook
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const meta = {
  title: "SeedMail/FailedSendAlert",
  component: FailedSendAlert,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="max-w-2xl">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
  argTypes: {
    statusId: {
      control: "text",
      description: "The send status ID for retry",
    },
    bounceType: {
      control: "select",
      options: ["hard", "soft", "complaint", null],
      description: "Type of bounce (if bounced)",
    },
    retryCount: {
      control: { type: "number", min: 0, max: 3 },
      description: "Current retry attempt count",
    },
    maxRetries: {
      control: { type: "number", min: 1, max: 5 },
      description: "Maximum allowed retry attempts",
    },
  },
} satisfies Meta<typeof FailedSendAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

// Generic failure
export const GenericFailure: Story = {
  args: {
    statusId: "status-123",
    errorMessage: "Failed to send email",
    retryCount: 0,
    maxRetries: 3,
  },
};

export const NetworkTimeout: Story = {
  args: {
    statusId: "status-124",
    errorMessage: "Network timeout occurred",
    retryCount: 1,
    maxRetries: 3,
  },
};

// Hard bounce
export const HardBounce: Story = {
  args: {
    statusId: "status-125",
    bounceType: "hard",
    bounceReason: "Recipient address does not exist",
    errorMessage: "User unknown in Gmail",
    retryCount: 0,
    maxRetries: 3,
  },
};

export const HardBounceInvalidDomain: Story = {
  args: {
    statusId: "status-126",
    bounceType: "hard",
    bounceReason: "Recipient address does not exist",
    errorMessage: "Domain not found",
    retryCount: 1,
    maxRetries: 3,
  },
};

// Soft bounce
export const SoftBounceMailboxFull: Story = {
  args: {
    statusId: "status-127",
    bounceType: "soft",
    bounceReason: "Temporary delivery failure",
    errorMessage: "Mailbox full",
    retryCount: 0,
    maxRetries: 3,
  },
};

export const SoftBounceQuotaExceeded: Story = {
  args: {
    statusId: "status-128",
    bounceType: "soft",
    bounceReason: "Temporary delivery failure",
    errorMessage: "Quota exceeded",
    retryCount: 2,
    maxRetries: 3,
  },
};

// Spam complaint
export const SpamComplaint: Story = {
  args: {
    statusId: "status-129",
    bounceType: "complaint",
    bounceReason: "Message blocked as spam",
    errorMessage: "Message rejected as spam",
    retryCount: 0,
    maxRetries: 3,
  },
};

export const SpamComplaintBlacklist: Story = {
  args: {
    statusId: "status-130",
    bounceType: "complaint",
    bounceReason: "Message blocked as spam",
    errorMessage: "Sender IP on blacklist",
    retryCount: 0,
    maxRetries: 3,
  },
};

// Max retries exceeded
export const MaxRetriesExceeded: Story = {
  args: {
    statusId: "status-131",
    errorMessage: "All retry attempts exhausted",
    retryCount: 3,
    maxRetries: 3,
  },
};

export const MaxRetriesExceededWithBounce: Story = {
  args: {
    statusId: "status-132",
    bounceType: "soft",
    bounceReason: "Temporary delivery failure",
    errorMessage: "Mailbox unavailable",
    retryCount: 3,
    maxRetries: 3,
  },
};

// Multiple retry attempts
export const FirstRetryAttempt: Story = {
  args: {
    statusId: "status-133",
    errorMessage: "Connection refused",
    retryCount: 1,
    maxRetries: 3,
  },
};

export const SecondRetryAttempt: Story = {
  args: {
    statusId: "status-134",
    errorMessage: "Connection refused",
    retryCount: 2,
    maxRetries: 3,
  },
};

export const LastRetryAttempt: Story = {
  args: {
    statusId: "status-135",
    errorMessage: "Connection refused",
    retryCount: 2,
    maxRetries: 3,
  },
};

// With dismiss callback
export const WithDismissCallback: Story = {
  args: {
    statusId: "status-136",
    errorMessage: "Temporary failure",
    retryCount: 0,
    maxRetries: 3,
    onDismiss: () => alert("Alert dismissed"),
  },
};

// All bounce types comparison
export const AllBounceTypes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Hard Bounce</h3>
        <FailedSendAlert
          statusId="status-hard"
          bounceType="hard"
          bounceReason="Recipient address does not exist"
          errorMessage="User unknown"
          retryCount={0}
          maxRetries={3}
        />
      </div>

      <div>
        <h3 className="font-semibold mb-2">Soft Bounce</h3>
        <FailedSendAlert
          statusId="status-soft"
          bounceType="soft"
          bounceReason="Temporary delivery failure"
          errorMessage="Mailbox full"
          retryCount={1}
          maxRetries={3}
        />
      </div>

      <div>
        <h3 className="font-semibold mb-2">Spam Complaint</h3>
        <FailedSendAlert
          statusId="status-complaint"
          bounceType="complaint"
          bounceReason="Message blocked as spam"
          errorMessage="Blocked by spam filter"
          retryCount={0}
          maxRetries={3}
        />
      </div>

      <div>
        <h3 className="font-semibold mb-2">Generic Failure</h3>
        <FailedSendAlert
          statusId="status-generic"
          errorMessage="Unknown error occurred"
          retryCount={0}
          maxRetries={3}
        />
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react";
import { SendStatusBadge } from "./SendStatusBadge";

const meta = {
  title: "SeedMail/SendStatusBadge",
  component: SendStatusBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["sending", "sent", "delivered", "failed", "bounced"],
      description: "The current send status of the email",
    },
    size: {
      control: "select",
      options: ["sm", "default"],
      description: "Badge size variant",
    },
  },
} satisfies Meta<typeof SendStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

// Success states
export const Sending: Story = {
  args: {
    status: "sending",
  },
};

export const Sent: Story = {
  args: {
    status: "sent",
  },
};

export const Delivered: Story = {
  args: {
    status: "delivered",
  },
};

// Failed states
export const Failed: Story = {
  args: {
    status: "failed",
    errorMessage: "Network timeout occurred while sending",
    retryCount: 1,
    maxRetries: 3,
  },
};

export const FailedMaxRetries: Story = {
  args: {
    status: "failed",
    errorMessage: "Unable to deliver message",
    retryCount: 3,
    maxRetries: 3,
  },
};

// Bounced states
export const BouncedHard: Story = {
  args: {
    status: "bounced",
    bounceType: "hard",
    errorMessage: "User unknown in Gmail",
    retryCount: 0,
    maxRetries: 3,
  },
};

export const BouncedSoft: Story = {
  args: {
    status: "bounced",
    bounceType: "soft",
    errorMessage: "Mailbox full",
    retryCount: 1,
    maxRetries: 3,
  },
};

export const BouncedComplaint: Story = {
  args: {
    status: "bounced",
    bounceType: "complaint",
    errorMessage: "Message blocked as spam",
    retryCount: 0,
    maxRetries: 3,
  },
};

// Size variants
export const SmallSize: Story = {
  args: {
    status: "sent",
    size: "sm",
  },
};

export const DefaultSize: Story = {
  args: {
    status: "sent",
    size: "default",
  },
};

// Multiple badges comparison
export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm w-24">Sending:</span>
        <SendStatusBadge status="sending" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm w-24">Sent:</span>
        <SendStatusBadge status="sent" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm w-24">Delivered:</span>
        <SendStatusBadge status="delivered" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm w-24">Failed:</span>
        <SendStatusBadge
          status="failed"
          errorMessage="Network error"
          retryCount={1}
          maxRetries={3}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm w-24">Bounced:</span>
        <SendStatusBadge
          status="bounced"
          bounceType="hard"
          errorMessage="User unknown"
          retryCount={0}
          maxRetries={3}
        />
      </div>
    </div>
  ),
};

export const SizeComparison: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm w-24">Small:</span>
        <SendStatusBadge status="sent" size="sm" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm w-24">Default:</span>
        <SendStatusBadge status="sent" size="default" />
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

/**
 * Badge component for status indicators and labels.
 * Compact with multiple color variants.
 */
const meta = {
  title: "UI/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default badge with primary styling.
 */
export const Default: Story = {
  args: {
    children: "Badge",
  },
};

/**
 * Secondary badge for neutral status.
 */
export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary",
  },
};

/**
 * Destructive badge for errors or critical status.
 */
export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Error",
  },
};

/**
 * Outlined badge variant.
 */
export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
};

/**
 * Status badges commonly used in the app.
 */
export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Active</Badge>
      <Badge variant="secondary">Pending</Badge>
      <Badge variant="destructive">Failed</Badge>
      <Badge variant="outline">Draft</Badge>
    </div>
  ),
};

/**
 * Priority badges.
 */
export const PriorityBadges: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="destructive">High</Badge>
      <Badge variant="default">Medium</Badge>
      <Badge variant="secondary">Low</Badge>
    </div>
  ),
};

/**
 * Count badges.
 */
export const CountBadges: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm">Notifications</span>
        <Badge>5</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">New Messages</span>
        <Badge variant="destructive">12</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Tasks</span>
        <Badge variant="secondary">8</Badge>
      </div>
    </div>
  ),
};

/**
 * Badge in context (with text).
 */
export const InContext: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Feature Request</h3>
        <Badge variant="secondary">In Progress</Badge>
      </div>
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Bug Report</h3>
        <Badge variant="destructive">Critical</Badge>
      </div>
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Documentation</h3>
        <Badge variant="outline">Review</Badge>
      </div>
    </div>
  ),
};

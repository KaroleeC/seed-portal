import type { Meta, StoryObj } from "@storybook/react-vite";
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
 * Secondary badge with Seed teal gradient (theme-aware).
 * Light mode: dark-to-light teal
 * Dark mode: light-to-dark teal (reversed & softer)
 */
export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Teal Gradient",
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
      <Badge variant="seed-orange">Featured</Badge>
      <Badge variant="secondary">Verified</Badge>
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

/**
 * ✅ DEPLOYED: Seed Orange Variant
 * The new seed-orange variant is now live!
 * Use: <Badge variant="seed-orange">
 */
export const SeedOrange: Story = {
  args: {
    variant: "seed-orange",
    children: "Seed Orange",
  },
};

/**
 * 🎨 Theme-Aware Badge Variants
 * Demonstrates how badges adapt to light/dark theme.
 * Toggle Storybook theme to see the difference!
 */
export const ThemeAware: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          🔥 Seed Orange - consistent across themes
        </p>
        <div className="flex gap-2">
          <Badge>Premium</Badge>
          <Badge>Featured</Badge>
          <Badge>5 New</Badge>
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-3">
          🌊 Seed Teal (secondary) - adapts to theme
        </p>
        <div className="flex gap-2">
          <Badge variant="secondary">Verified</Badge>
          <Badge variant="secondary">Active</Badge>
          <Badge variant="secondary">12</Badge>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground mb-3">Combined usage:</p>
        <div className="flex items-center gap-2">
          <span className="text-sm">John Doe</span>
          <Badge>Pro</Badge>
          <Badge variant="secondary">Verified</Badge>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground mb-3">
          💡 Toggle theme in Storybook toolbar to see secondary badge adapt!
        </p>
      </div>
    </div>
  ),
};

/**
 * 🎨 PREVIEW: Orange Gradient Badge Options (Reference)
 * Option 4 (Deep Fire) was selected and deployed as "seed-orange" variant.
 */
export const OrangeGradientPreview: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="text-sm text-muted-foreground mb-2">Option 1: Diagonal (Warm)</p>
        <div className="flex gap-2">
          <Badge
            style={{
              background: "linear-gradient(135deg, #e24c00 0%, #ff7f3f 100%)",
              color: "white",
              border: "none",
            }}
          >
            Active
          </Badge>
          <Badge
            style={{
              background: "linear-gradient(135deg, #e24c00 0%, #ff7f3f 100%)",
              color: "white",
              border: "none",
            }}
          >
            12 New
          </Badge>
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">Option 2: Vibrant Glow</p>
        <div className="flex gap-2">
          <Badge
            style={{
              background: "linear-gradient(135deg, #e24c00 0%, #ff6b35 50%, #f4a261 100%)",
              color: "white",
              border: "none",
              boxShadow: "0 2px 10px rgba(226, 76, 0, 0.3)",
            }}
          >
            Premium
          </Badge>
          <Badge
            style={{
              background: "linear-gradient(135deg, #e24c00 0%, #ff6b35 50%, #f4a261 100%)",
              color: "white",
              border: "none",
              boxShadow: "0 2px 10px rgba(226, 76, 0, 0.3)",
            }}
          >
            5
          </Badge>
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">Option 3: Sunset (Subtle)</p>
        <div className="flex gap-2">
          <Badge
            style={{
              background: "linear-gradient(to right, #e24c00 0%, #ff8c42 100%)",
              color: "white",
              border: "none",
            }}
          >
            Featured
          </Badge>
          <Badge
            style={{
              background: "linear-gradient(to right, #e24c00 0%, #ff8c42 100%)",
              color: "white",
              border: "none",
            }}
          >
            Hot
          </Badge>
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">Option 4: Deep Fire</p>
        <div className="flex gap-2">
          <Badge
            style={{
              background: "linear-gradient(135deg, #d44400 0%, #e24c00 50%, #ff7f3f 100%)",
              color: "white",
              border: "none",
            }}
          >
            Important
          </Badge>
          <Badge
            style={{
              background: "linear-gradient(135deg, #d44400 0%, #e24c00 50%, #ff7f3f 100%)",
              color: "white",
              border: "none",
            }}
          >
            99+
          </Badge>
        </div>
      </div>

      <div className="border-t pt-4 mt-2">
        <p className="text-sm text-muted-foreground mb-2">Current Default (for comparison)</p>
        <div className="flex gap-2">
          <Badge variant="default">Active</Badge>
          <Badge variant="default">5</Badge>
        </div>
      </div>
    </div>
  ),
};

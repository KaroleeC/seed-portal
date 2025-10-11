import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { Button } from "./button";
import { Mail, Plus, Trash2, Download } from "lucide-react";

/**
 * Button component with multiple variants and sizes.
 * Used throughout the application for primary and secondary actions.
 */
const meta = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default button with primary styling.
 */
export const Default: Story = {
  args: {
    children: "Button",
  },
};

/**
 * Destructive button for dangerous actions like delete.
 */
export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Delete",
  },
};

/**
 * Outlined button for secondary actions.
 */
export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Cancel",
  },
};

/**
 * Secondary button with Seed teal gradient (theme-aware).
 * Light mode: dark-to-light teal
 * Dark mode: light-to-dark teal (reversed & softer)
 */
export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: (
      <>
        <Mail />
        Secondary
      </>
    ),
  },
};

/**
 * Ghost button with minimal styling.
 */
export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Ghost",
  },
};

/**
 * Link-styled button.
 */
export const Link: Story = {
  args: {
    variant: "link",
    children: "Learn more",
  },
};

/**
 * Small button variant.
 */
export const Small: Story = {
  args: {
    size: "sm",
    children: "Small Button",
  },
};

/**
 * Large button variant.
 */
export const Large: Story = {
  args: {
    size: "lg",
    children: "Large Button",
  },
};

/**
 * Icon-only button.
 */
export const Icon: Story = {
  args: {
    size: "icon",
    children: <Plus />,
  },
};

/**
 * Button with icon and text.
 */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Mail />
        Send Email
      </>
    ),
  },
};

/**
 * Disabled button state.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Disabled",
  },
};

/**
 * Loading state (using disabled).
 */
export const Loading: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        Loading...
      </>
    ),
  },
};

/**
 * Common use case: Action buttons.
 */
export const ActionButtons: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button variant="default">
        <Plus />
        Create
      </Button>
      <Button variant="destructive">
        <Trash2 />
        Delete
      </Button>
      <Button variant="outline">
        <Download />
        Export
      </Button>
    </div>
  ),
};

/**
 * Button sizes comparison.
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <Plus />
      </Button>
    </div>
  ),
};

/**
 * All variants showcase.
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button variant="default">Default</Button>
        <Button variant="seed-orange">Seed Orange</Button>
        <Button variant="secondary">Secondary (Teal)</Button>
      </div>
      <div className="flex gap-2">
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
      <div className="flex gap-2">
        <Button variant="link">Link</Button>
      </div>
    </div>
  ),
};

/**
 * ✅ DEPLOYED: Seed Orange Variant
 * The new seed-orange variant is now live!
 * Use: <Button variant="seed-orange">
 */
export const SeedOrange: Story = {
  args: {
    variant: "seed-orange",
    children: (
      <>
        <Mail />
        Seed Orange
      </>
    ),
  },
};

/**
 * 🎨 Theme-Aware Variants
 * Primary (orange) and Secondary (teal) automatically adapt to light/dark theme.
 * Toggle Storybook theme to see the difference!
 */
export const ThemeAware: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          🔥 Seed Orange (default) - same in both themes
        </p>
        <div className="flex gap-2">
          <Button>Primary Action</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-3">
          🌊 Seed Teal (secondary) - gradient reverses & softens in dark mode
        </p>
        <div className="flex gap-2">
          <Button variant="secondary">
            <Download />
            Secondary Action
          </Button>
          <Button variant="secondary" size="sm">
            Export
          </Button>
          <Button variant="secondary" size="lg">
            Learn More
          </Button>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground mb-3">
          💡 Tip: Toggle the theme in Storybook toolbar to see adaptability!
        </p>
      </div>
    </div>
  ),
};

/**
 * 🎨 PREVIEW: Orange Gradient Options (Reference)
 * Option 4 (Deep Fire) was selected and deployed as "seed-orange" variant.
 */
export const OrangeGradientPreview: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="text-sm text-muted-foreground mb-2">Option 1: Diagonal (Warm)</p>
        <Button
          style={{
            background: "linear-gradient(135deg, #e24c00 0%, #ff7f3f 100%)",
            color: "white",
            border: "none",
          }}
        >
          <Mail />
          Orange Diagonal
        </Button>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">Option 2: Vibrant Glow</p>
        <Button
          style={{
            background: "linear-gradient(135deg, #e24c00 0%, #ff6b35 50%, #f4a261 100%)",
            color: "white",
            border: "none",
            boxShadow: "0 4px 20px rgba(226, 76, 0, 0.3)",
          }}
        >
          <Mail />
          Orange Glow
        </Button>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">Option 3: Sunset (Subtle)</p>
        <Button
          style={{
            background: "linear-gradient(to right, #e24c00 0%, #ff8c42 100%)",
            color: "white",
            border: "none",
          }}
        >
          <Mail />
          Orange Sunset
        </Button>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">Option 4: Deep Fire</p>
        <Button
          style={{
            background: "linear-gradient(135deg, #d44400 0%, #e24c00 50%, #ff7f3f 100%)",
            color: "white",
            border: "none",
          }}
        >
          <Mail />
          Deep Orange
        </Button>
      </div>

      <div className="border-t pt-4 mt-2">
        <p className="text-sm text-muted-foreground mb-2">Current Default (for comparison)</p>
        <Button variant="default">
          <Mail />
          Current Blue
        </Button>
      </div>
    </div>
  ),
};

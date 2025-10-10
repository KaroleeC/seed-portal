import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
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
 * Secondary button with muted colors.
 */
export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary",
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
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
    </div>
  ),
};

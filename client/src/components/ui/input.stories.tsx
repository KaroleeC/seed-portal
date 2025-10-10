import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";
import { Label } from "./label";
import { Mail, Search, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

/**
 * Input component for text entry.
 * Includes focus ring and accessibility features.
 */
const meta = {
  title: "UI/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic text input.
 */
export const Default: Story = {
  args: {
    placeholder: "Enter text...",
  },
};

/**
 * Input with label.
 */
export const WithLabel: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};

/**
 * Disabled input.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: "Disabled input",
    value: "Cannot edit",
  },
};

/**
 * Input with icon (using wrapper).
 */
export const WithIcon: Story = {
  render: () => (
    <div className="w-[300px]">
      <Label htmlFor="search">Search</Label>
      <div className="relative mt-2">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id="search" placeholder="Search..." className="pl-10" />
      </div>
    </div>
  ),
};

/**
 * Password input with toggle visibility.
 */
const PasswordInput = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-[300px] space-y-2">
      <Label htmlFor="password">Password</Label>
      <div className="relative">
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          placeholder="Enter password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

export const Password: Story = {
  render: () => <PasswordInput />,
};

/**
 * Email input.
 */
export const Email: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <Label htmlFor="email-input">Email Address</Label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id="email-input" type="email" placeholder="you@example.com" className="pl-10" />
      </div>
    </div>
  ),
};

/**
 * Input with error state.
 */
export const WithError: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <Label htmlFor="error-input">Username</Label>
      <Input
        id="error-input"
        placeholder="Enter username"
        className="border-destructive focus-visible:ring-destructive"
      />
      <p className="text-sm text-destructive">Username is required</p>
    </div>
  ),
};

/**
 * Input with helper text.
 */
export const WithHelperText: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <Label htmlFor="helper-input">API Key</Label>
      <Input id="helper-input" type="text" placeholder="sk_test_..." />
      <p className="text-sm text-muted-foreground">Your API key is used to authenticate requests</p>
    </div>
  ),
};

/**
 * Form with multiple inputs.
 */
export const FormExample: Story = {
  render: () => (
    <form className="w-[400px] space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" placeholder="John Doe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-form">Email</Label>
        <Input id="email-form" type="email" placeholder="john@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="(555) 123-4567" />
      </div>
    </form>
  ),
};

/**
 * Various input types.
 */
export const InputTypes: Story = {
  render: () => (
    <div className="w-[400px] space-y-4">
      <div className="space-y-2">
        <Label>Text</Label>
        <Input type="text" placeholder="Text input" />
      </div>
      <div className="space-y-2">
        <Label>Number</Label>
        <Input type="number" placeholder="123" />
      </div>
      <div className="space-y-2">
        <Label>Date</Label>
        <Input type="date" />
      </div>
      <div className="space-y-2">
        <Label>Time</Label>
        <Input type="time" />
      </div>
      <div className="space-y-2">
        <Label>File</Label>
        <Input type="file" />
      </div>
    </div>
  ),
};

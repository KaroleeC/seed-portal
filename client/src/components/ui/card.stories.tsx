import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";

/**
 * Card component for containing grouped content.
 * Features backdrop blur and shadow effects in dark mode.
 */
const meta = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic card with title and description.
 */
export const Default: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">This is the main content of the card.</p>
      </CardContent>
    </Card>
  ),
};

/**
 * Card with footer actions.
 */
export const WithFooter: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your information to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Fill out the form below to create your account.
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Continue</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Dashboard stat card.
 */
export const StatCard: Story = {
  render: () => (
    <Card className="w-[300px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">$45,231.89</div>
        <p className="text-xs text-muted-foreground mt-1">
          <span className="text-green-500">+20.1%</span> from last month
        </p>
      </CardContent>
    </Card>
  ),
};

/**
 * Card with badge status.
 */
export const WithBadge: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Feature Request</CardTitle>
          <Badge variant="secondary">In Progress</Badge>
        </div>
        <CardDescription>Submitted by John Doe • 2 days ago</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          Add ability to export data in multiple formats including CSV, Excel, and PDF.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm">
          View Details
        </Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Grid of cards.
 */
export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-[800px]">
      <Card>
        <CardHeader>
          <CardTitle>Card 1</CardTitle>
          <CardDescription>First card</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Content for card 1</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Card 2</CardTitle>
          <CardDescription>Second card</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Content for card 2</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Card 3</CardTitle>
          <CardDescription>Third card</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Content for card 3</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Card 4</CardTitle>
          <CardDescription>Fourth card</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Content for card 4</p>
        </CardContent>
      </Card>
    </div>
  ),
};

/**
 * Minimal card variant.
 */
export const Minimal: Story = {
  render: () => (
    <Card className="w-[300px]">
      <CardContent className="pt-6">
        <p className="text-sm">Simple card with just content, no header or footer.</p>
      </CardContent>
    </Card>
  ),
};

# Storybook Guide

## 🎨 Getting Started

### Running Storybook

```bash
npm run storybook
```

This will start Storybook at <http://localhost:6006>

### Building Storybook

```bash
npm run build-storybook
```

This creates a static build in `storybook-static/` for deployment.

---

## 📖 Writing Stories

### Basic Story Template

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { YourComponent } from "./your-component";

const meta = {
  title: "Category/YourComponent",
  component: YourComponent,
  parameters: {
    layout: "centered", // or "fullscreen" or "padded"
  },
  tags: ["autodocs"], // Auto-generate documentation
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Component props
    title: "Example",
    variant: "primary",
  },
};
```

---

## 🎯 Story Categories

Organize stories by category in the `title` field:

- **`UI/ComponentName`** - Design system components (Button, Input, Card, etc.)
- **`Features/FeatureName`** - Feature-specific components (EmailComposer, QuoteCalculator)
- **`Layout/ComponentName`** - Layout components (DashboardLayout, UniversalNavbar)
- **`Pages/PageName`** - Full page examples
- **`Forms/FormName`** - Form components and patterns

---

## 📝 Story Types

### 1. Props-Based Stories

Simple stories that just set props:

```tsx
export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Click me",
  },
};
```

### 2. Custom Render Stories

For complex examples with multiple components:

```tsx
export const WithIcon: Story = {
  render: () => (
    <Button>
      <Mail />
      Send Email
    </Button>
  ),
};
```

### 3. Interactive Stories

With state and interactions:

```tsx
const InteractiveExample = () => {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount(count + 1)}>Count: {count}</Button>;
};

export const Interactive: Story = {
  render: () => <InteractiveExample />,
};
```

---

## 🎨 Using Addons

### Accessibility (a11y)

The a11y addon automatically checks for accessibility issues. View results in the "Accessibility" panel.

### Interactions

Test user interactions:

```tsx
import { userEvent, within, expect } from "@storybook/test";

export const ClickButton: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    await expect(button).toHaveTextContent("Clicked");
  },
};
```

### Themes

Toggle between light and dark themes using the toolbar.

---

## 📐 Layout Options

Set layout in parameters:

```tsx
parameters: {
  layout: "centered",  // Component centered in viewport
  // OR
  layout: "fullscreen", // Full viewport (for pages)
  // OR
  layout: "padded",    // Default padding
}
```

---

## 🎭 Args & Controls

### ArgTypes

Customize controls for props:

```tsx
argTypes: {
  variant: {
    control: "select",
    options: ["primary", "secondary", "destructive"],
    description: "Button variant",
  },
  disabled: {
    control: "boolean",
  },
  onClick: {
    action: "clicked", // Show in Actions panel
  },
}
```

### Default Args

Set default values for all stories:

```tsx
args: {
  children: "Button",
  variant: "primary",
}
```

---

## 📚 Documentation

### Auto-Documentation

Add `tags: ["autodocs"]` to generate automatic documentation from:

- Component props (via TypeScript types)
- JSDoc comments
- Story examples

### Custom Documentation

Add descriptions to your stories:

```tsx
/**
 * Primary button for main actions.
 * Use this for the most important action on a page.
 */
export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Primary Action",
  },
};
```

---

## 🎨 Best Practices

### DO ✅

- **Story one component at a time** - Focus on a single component per file
- **Show all variants** - Create stories for each variant, size, and state
- **Use realistic data** - Use fixtures from `test/fixtures/` for consistency
- **Group related stories** - Use `AllVariants` or `Showcase` stories to compare
- **Add descriptions** - Document when to use each variant
- **Test interactions** - Add `.play()` functions for interactive stories

### DON'T ❌

- **Don't mock unnecessarily** - Let components render naturally when possible
- **Don't over-complicate** - Keep stories simple and focused
- **Don't duplicate code** - Extract components for reusable patterns
- **Don't skip edge cases** - Story loading, error, and empty states
- **Don't forget accessibility** - Check a11y panel for issues

---

## 🚀 Advanced Patterns

### Using Fixtures

Reuse test fixtures in stories:

```tsx
import { mockEmailThread } from "@/../../test/fixtures/email-fixtures";

export const WithData: Story = {
  render: () => <EmailList threads={[mockEmailThread]} />,
};
```

### Multiple Instances

Show component variations side-by-side:

```tsx
export const Sizes: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
```

### Dark/Light Comparison

```tsx
export const ThemeComparison: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      <div className="light">
        <Card>Light theme</Card>
      </div>
      <div className="dark">
        <Card>Dark theme</Card>
      </div>
    </div>
  ),
};
```

---

## 🔗 Resources

- [Storybook Docs](https://storybook.js.org/docs/react/get-started/introduction)
- [Component Story Format](https://storybook.js.org/docs/react/api/csf)
- [Vite + Storybook](https://storybook.js.org/docs/react/builders/vite)

---

## 💡 Quick Tips

1. **Hot reload** - Stories auto-reload on file save
2. **Keyboard shortcuts** - Press `?` in Storybook to see all shortcuts
3. **View source** - Click "Show code" in docs to see story source
4. **Copy examples** - Use existing stories as templates
5. **Search** - Use Cmd/Ctrl+K to search stories

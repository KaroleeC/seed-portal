# Storybook Quick Reference

## Commands

```bash
npm run storybook              # Start dev server → http://localhost:6006
npm run build-storybook        # Build static site
```

## Story Template

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { YourComponent } from "./your-component";

const meta = {
  title: "Category/ComponentName",
  component: YourComponent,
  tags: ["autodocs"],
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: "Example" },
};
```

## Categories

- `UI/` - Design system components
- `Features/` - Feature components
- `Layout/` - Layout components
- `Forms/` - Form components
- `Pages/` - Full pages

## Addons

- **Controls** - Interactive prop editing
- **Docs** - Auto-generated documentation
- **Accessibility** - a11y violation detection
- **Actions** - Event handler logging

## Keyboard Shortcuts (in Storybook)

- `?` - Show all shortcuts
- `Cmd/Ctrl + K` - Search stories
- `S` - Toggle sidebar
- `D` - Toggle dark mode
- `F` - Toggle fullscreen
- `A` - Toggle addons panel

## Best Practices

✅ Story all variants and states
✅ Use realistic data from fixtures
✅ Add JSDoc descriptions
✅ Test accessibility
✅ Keep stories simple and focused

❌ Don't over-mock
❌ Don't skip edge cases
❌ Don't duplicate code

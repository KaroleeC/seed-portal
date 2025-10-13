# ✅ Storybook Setup Complete

## 🎉 What Was Installed

Storybook has been configured for your Seed Portal project with the following:

### Packages Added

- `storybook@^8.4.7` - Core Storybook framework
- `@storybook/react-vite@^8.4.7` - Vite integration for React
- `@storybook/addon-essentials@^8.4.7` - Essential addons (controls, docs, etc.)
- `@storybook/addon-interactions@^8.4.7` - Test user interactions
- `@storybook/addon-a11y@^8.4.7` - Accessibility testing
- `@storybook/test@^8.4.7` - Testing utilities
- `@storybook/addon-themes@^8.4.7` - Theme switching support

### Configuration Files Created

```
.storybook/
├── main.ts                 # Main Storybook configuration
├── preview.tsx             # Global decorators and parameters
├── preview-head.html       # HTML head customization
├── STORYBOOK_GUIDE.md      # Complete usage guide
└── story.template.tsx      # Template for new stories
```

### Example Stories Created

```
client/src/components/ui/
├── button.stories.tsx      # Button component (15 stories)
├── card.stories.tsx        # Card component (6 stories)
├── input.stories.tsx       # Input component (9 stories)
└── badge.stories.tsx       # Badge component (7 stories)
```

---

## 🚀 Quick Start

### 1. Start Storybook

```bash
npm run storybook
```

Opens at **<http://localhost:6006>**

### 2. Explore Components

Navigate the sidebar to see:

- **UI/** - Design system components (Button, Input, Card, Badge)
- Each component has multiple stories showing variants and states

### 3. Try the Addons

**Controls Tab** - Change props interactively
**Docs Tab** - View auto-generated documentation
**Accessibility Tab** - See a11y violations
**Actions Tab** - Monitor event handlers

### 4. Toggle Themes

Use the theme switcher in the toolbar to preview light/dark modes.

---

## 📖 Creating Your First Story

### Option 1: Use the Template

```bash
cp .storybook/story.template.tsx client/src/components/YourComponent.stories.tsx
```

Then customize for your component.

### Option 2: Copy Existing Story

The Button story is a great reference:

```bash
cat client/src/components/ui/button.stories.tsx
```

### Option 3: Quick Example

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./MyComponent";

const meta = {
  title: "Features/MyComponent",
  component: MyComponent,
  tags: ["autodocs"],
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Hello Storybook",
  },
};
```

---

## 🎯 What to Story Next

### High Priority Components

These would benefit most from Storybook:

1. **Email Components** (`client/src/pages/seedmail/components/`)
   - `ComposeModal.tsx` - Email composition
   - `EmailDetail.tsx` - Message display
   - `ThreadList.tsx` - Thread list view

2. **Quote Calculator** (`client/src/features/quote-calculator/`)
   - Form sections
   - Pricing display
   - Configuration options

3. **Quick Actions** (`client/src/components/QuickAction.tsx`)
   - Circular dashboard cards

4. **Dashboard Components**
   - Stat cards
   - Charts
   - Widgets

### Recommended Order

**Week 1:** Core UI components (✅ Done!)
**Week 2:** Email components (3-5 components)
**Week 3:** Quote calculator sections (5-7 components)
**Week 4:** Dashboard widgets and layouts

---

## 🎨 Features Configured

### ✅ Vite Integration

- Reuses your existing Vite config
- Fast HMR (Hot Module Replacement)
- Path aliases work (`@/`, `@shared/`)

### ✅ Theme Support

- Dark mode by default (matches your app)
- Light mode toggle in toolbar
- Uses your existing theme tokens

### ✅ React Query Provider

- Stories can use `useQuery` hooks
- Configured in `.storybook/preview.tsx`

### ✅ Accessibility Testing

- Automatic a11y checks
- View violations in Accessibility panel
- Follows WCAG standards

### ✅ Auto Documentation

- Props table auto-generated from TypeScript
- JSDoc comments become descriptions
- Examples shown inline

---

## 📚 Key Commands

```bash
# Development
npm run storybook              # Start dev server (port 6006)

# Production Build
npm run build-storybook        # Build static site

# Testing (with Vitest)
npm test                       # Your existing tests still work
npm run test:ui                # Vitest UI

# Both Together
npm run storybook &            # Terminal 1: Storybook
npm run test:ui                # Terminal 2: Vitest UI
```

---

## 🔥 Pro Tips

### 1. **Hot Reload**

Edit a story and save - it updates instantly in the browser.

### 2. **Keyboard Shortcuts**

Press `?` in Storybook to see all shortcuts (search, navigate, etc.).

### 3. **Copy Code**

Click "Show code" in the Docs tab to copy story source.

### 4. **Share Stories**

Build and deploy Storybook to share with your team:

```bash
npm run build-storybook
# Upload storybook-static/ to hosting
```

### 5. **Test in Stories**

Add `.play()` functions to test interactions:

```tsx
export const ClickToOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button"));
    expect(canvas.getByText("Opened")).toBeInTheDocument();
  },
};
```

### 6. **Use Fixtures**

Import test fixtures for consistent data:

```tsx
import { mockEmailThread } from "@/../../test/fixtures/email-fixtures";

export const WithData: Story = {
  render: () => <EmailList threads={[mockEmailThread]} />,
};
```

---

## 🎭 Workflow Integration

### With Vitest

- **Vitest** tests behavior and logic
- **Storybook** shows visual states and variants
- Use the same fixtures in both

### With Design System

- Storybook is your living design system documentation
- Designers can preview components before implementation
- Developers can copy code examples

### With CI/CD

Add to GitHub Actions:

```yaml
- name: Build Storybook
  run: npm run build-storybook

- name: Publish to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./storybook-static
```

---

## 📖 Documentation

**Complete Guide:** `.storybook/STORYBOOK_GUIDE.md`
**Template:** `.storybook/story.template.tsx`
**Example Stories:** `client/src/components/ui/*.stories.tsx`

**Official Docs:** <https://storybook.js.org/docs/react/get-started/introduction>

---

## 🎯 Next Steps

1. ✅ **Installation complete** - Dependencies installed
2. ✅ **Configuration done** - Storybook configured for Vite
3. ✅ **Examples created** - 4 UI components with 37 stories
4. **Run it:** `npm run storybook`
5. **Create more stories** - Start with email components
6. **Share with team** - Demo at next standup

---

## 🚨 Troubleshooting

### Port Already in Use

If port 6006 is taken:

```bash
npm run storybook -- -p 6007
```

### Build Errors

Clear cache and rebuild:

```bash
rm -rf node_modules/.cache
npm run storybook
```

### Theme Not Working

Ensure `next-themes` is installed (✅ already in your package.json).

### Import Errors

Check path aliases in `.storybook/main.ts` match your `vite.config.ts`.

---

## 💡 Questions?

**Q: Should I story every component?**
A: No. Focus on reusable components and complex features.

**Q: How is this different from Vitest?**
A: Vitest tests behavior. Storybook showcases visual states.

**Q: Can I use both?**
A: Yes! They complement each other. Use both for full coverage.

**Q: Will this slow down my app?**
A: No. Storybook is separate and doesn't affect your production build.

---

## 🎉 Ready to Build

You're all set! Run `npm run storybook` and start exploring your component library.

**Happy Storying! 🚀**

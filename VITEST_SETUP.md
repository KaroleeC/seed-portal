# Vitest Testing Setup

✅ **Vitest has been successfully configured for this project!**

## 📦 Installation

Run the following command to install all testing dependencies:

```bash
npm install
```

## 🧪 Available Test Commands

```bash
# Run tests in watch mode (default)
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (explicit)
npm run test:watch
```

## 📁 Project Structure

```
seed-portal/
├── test/
│   ├── setup.ts              # Global test setup & mocks
│   └── test-utils.tsx        # Custom render with providers
├── vitest.config.ts          # Vitest configuration
└── client/src/
    └── components/
        └── __tests__/        # Component tests go here
            └── Button.test.tsx
```

## ✍️ Writing Tests

### Basic Component Test

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@/../../test/test-utils";
import { MyComponent } from "../MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Testing with User Interactions

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@/../../test/test-utils";
import userEvent from "@testing-library/user-event";
import { MyButton } from "../MyButton";

describe("MyButton", () => {
  it("handles clicks", async () => {
    const user = userEvent.setup();
    let clicked = false;

    render(
      <MyButton
        onClick={() => {
          clicked = true;
        }}
      >
        Click me
      </MyButton>
    );

    await user.click(screen.getByRole("button"));
    expect(clicked).toBe(true);
  });
});
```

### Testing with React Query

The custom `render` function from `test/test-utils.tsx` automatically wraps components with `QueryClientProvider`, so you can test components that use React Query hooks:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@/../../test/test-utils";
import { MyDataComponent } from "../MyDataComponent";

describe("MyDataComponent", () => {
  it("loads and displays data", async () => {
    // Mock API request
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ data: "test data" }),
      })
    ) as any;

    render(<MyDataComponent />);

    await waitFor(() => {
      expect(screen.getByText("test data")).toBeInTheDocument();
    });
  });
});
```

## 🎯 Best Practices

1. **Test file location**: Place test files next to the component or in `__tests__` folder
2. **Test file naming**: Use `.test.tsx` or `.spec.tsx` extension
3. **Describe blocks**: Group related tests using `describe()`
4. **Arrange-Act-Assert**: Structure tests clearly
5. **User-centric queries**: Use `screen.getByRole()` over `getByTestId()`
6. **Async testing**: Use `waitFor()` for async operations

## 🔧 Configuration

### Vitest Config (`vitest.config.ts`)

- **Environment**: jsdom (browser-like)
- **Globals**: `describe`, `it`, `expect` available without imports
- **Coverage**: v8 provider with HTML reports
- **Setup**: Auto-runs `test/setup.ts` before each test file

### Test Setup (`test/setup.ts`)

Includes mocks for:

- `window.matchMedia`
- `IntersectionObserver`
- `ResizeObserver`
- React Testing Library matchers

### Path Aliases

All path aliases from `tsconfig.json` work in tests:

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@server/*` → `server/*`

## 📊 Coverage Reports

After running `npm run test:coverage`, view the report at:

```
coverage/index.html
```

Coverage is configured to exclude:

- node_modules
- Config files
- Test files themselves
- Type definition files

## 🚀 CI/CD Integration

For GitHub Actions or other CI systems, use:

```yaml
- name: Run tests
  run: npm run test:run

- name: Generate coverage
  run: npm run test:coverage
```

## 🐛 Debugging Tests

### VS Code Integration

Add this to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

### Browser Debugging

Use Vitest UI for interactive debugging:

```bash
npm run test:ui
```

Then open <http://localhost:51204/__vitest__/>

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Vitest UI](https://vitest.dev/guide/ui.html)

## 🎉 You're Ready

Start writing tests and run `npm test` to see them execute in watch mode!

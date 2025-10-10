# Getting the Most Out of Vitest 🚀

## Table of Contents

1. [Watch Mode & Smart Re-runs](#watch-mode--smart-re-runs)
2. [Vitest UI - Visual Testing](#vitest-ui---visual-testing)
3. [Snapshot Testing](#snapshot-testing)
4. [Coverage Tracking & Thresholds](#coverage-tracking--thresholds)
5. [Mocking Strategies](#mocking-strategies)
6. [Testing Patterns by Feature](#testing-patterns-by-feature)
7. [Performance Optimization](#performance-optimization)
8. [VS Code Integration](#vs-code-integration)
9. [CI/CD Best Practices](#cicd-best-practices)
10. [Advanced Testing Techniques](#advanced-testing-techniques)

---

## 1. Watch Mode & Smart Re-runs

### Intelligent Test Execution

Vitest only re-runs tests affected by your changes:

```bash
# Watch mode with file filtering
npm test -- --reporter=verbose

# Run only changed tests
npm test -- --changed

# Run tests related to specific file
npm test -- --related src/components/Button.tsx
```

### Watch Mode Commands

When in watch mode, press:

- `a` - Run all tests
- `f` - Run only failed tests
- `u` - Update snapshots
- `p` - Filter by filename pattern
- `t` - Filter by test name pattern
- `q` - Quit

### Recommended Workflow

```bash
# Terminal 1: Development server
npm run dev:web

# Terminal 2: Test watch mode
npm test

# Terminal 3: Type checking
npm run type-check -- --watch
```

---

## 2. Vitest UI - Visual Testing

### Launch the UI

```bash
npm run test:ui
```

Opens at `http://localhost:51204/__vitest__/`

### UI Features

- 📊 **Visual test tree** - See all tests organized by file
- ⚡ **Instant re-runs** - Click any test to run it
- 🔍 **Detailed output** - Console logs, errors, and timing
- 📸 **Snapshot viewer** - Compare snapshot diffs visually
- 🎯 **Filter & search** - Find tests quickly
- 📈 **Coverage visualization** - See uncovered lines highlighted

### Best Use Cases

1. **Debugging failing tests** - See exact error location
2. **TDD workflow** - Write test → See it fail → Make it pass
3. **Code review** - Show test coverage to reviewers
4. **Onboarding** - Help new developers understand test structure

---

## 3. Snapshot Testing

### Component Snapshots

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@/../../test/test-utils";
import { EmailCard } from "../EmailCard";

describe("EmailCard", () => {
  it("matches snapshot", () => {
    const { container } = render(
      <EmailCard subject="Test Email" from="sender@example.com" date={new Date("2024-01-01")} />
    );

    expect(container.firstChild).toMatchSnapshot();
  });
});
```

### Inline Snapshots

```tsx
it("formats email correctly", () => {
  const result = formatEmail({ name: "John", email: "john@example.com" });

  // Snapshot written directly in test file
  expect(result).toMatchInlineSnapshot(`"John <john@example.com>"`);
});
```

### When to Use Snapshots

✅ **Good for:**

- Complex component output
- API response validation
- Configuration objects
- Generated HTML/markup

❌ **Avoid for:**

- Dynamic timestamps
- Random IDs
- Constantly changing data

### Update Snapshots

```bash
# Update all snapshots
npm test -- -u

# Update snapshots interactively (press 'u' in watch mode)
npm test
# Then press: u
```

---

## 4. Coverage Tracking & Thresholds

### Generate Coverage Reports

```bash
# Run tests with coverage
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Configure Coverage Thresholds

Update `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],

      // Fail CI if coverage drops below thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },

      // Files to include in coverage
      include: ["client/src/**/*.{ts,tsx}"],

      // Files to exclude
      exclude: [
        "**/*.config.*",
        "**/*.test.*",
        "**/types.ts",
        "**/index.ts", // Re-exports
      ],
    },
  },
});
```

### Coverage Badges

For GitHub README:

```bash
# Generate coverage badge
npm run test:coverage -- --reporter=json-summary

# Use with shields.io
# ![Coverage](https://img.shields.io/badge/coverage-85%25-green)
```

### Track Coverage Over Time

```bash
# Compare coverage between commits
git stash
npm run test:coverage -- --reporter=json > coverage-main.json
git stash pop
npm run test:coverage -- --reporter=json > coverage-feature.json

# Use tools like codecov.io or coveralls.io for visualization
```

---

## 5. Mocking Strategies

### Mock API Calls

```typescript
// __mocks__/apiClient.ts
import { vi } from "vitest";

export const apiRequest = vi.fn();

// In test file
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest } from "@/lib/queryClient";

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
}));

describe("useEmailThreads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches threads", async () => {
    const mockThreads = [{ id: "1", subject: "Test" }];

    (apiRequest as any).mockResolvedValue(mockThreads);

    // Test your hook/component
    const { result } = renderHook(() => useEmailThreads());

    await waitFor(() => {
      expect(result.current.data).toEqual(mockThreads);
    });
  });
});
```

### Mock Supabase

```typescript
// test/mocks/supabase.ts
import { vi } from "vitest";

export const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
};

// In test
vi.mock("@/lib/supabase", () => ({
  supabase: mockSupabase,
}));
```

### Mock React Query

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function createMockQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });
}

// Wrap tests with mock data
const queryClient = createMockQueryClient();
queryClient.setQueryData(["/api/email/threads"], mockThreads);

render(
  <QueryClientProvider client={queryClient}>
    <EmailInbox />
  </QueryClientProvider>
);
```

### Mock Timers

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("AutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves after 2 seconds of inactivity", async () => {
    const mockSave = vi.fn();
    render(<DraftEditor onSave={mockSave} />);

    // Type something
    const editor = screen.getByRole("textbox");
    await userEvent.type(editor, "Hello");

    // Fast-forward time
    vi.advanceTimersByTime(2000);

    expect(mockSave).toHaveBeenCalledWith("Hello");
  });
});
```

---

## 6. Testing Patterns by Feature

### Email Components

```typescript
// client/src/pages/seedmail/__tests__/EmailInbox.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@/../../test/test-utils";
import { EmailInbox } from "../components/EmailInbox";

describe("EmailInbox", () => {
  it("loads and displays threads", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { id: "1", subject: "Welcome", unreadCount: 1 }
        ]),
      })
    ) as any;

    render(<EmailInbox />);

    await waitFor(() => {
      expect(screen.getByText("Welcome")).toBeInTheDocument();
    });
  });

  it("shows loading state", () => {
    render(<EmailInbox />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("handles error state", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("Failed"))) as any;

    render(<EmailInbox />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### Custom Hooks

```typescript
// client/src/pages/seedmail/hooks/__tests__/useEmailSignature.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEmailSignature } from "../useEmailSignature";

describe("useEmailSignature", () => {
  it("fetches signature on mount", async () => {
    const mockSignature = {
      enabled: true,
      html: "<p>Best regards</p>",
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSignature),
      })
    ) as any;

    const { result } = renderHook(() => useEmailSignature());

    await waitFor(() => {
      expect(result.current.data).toEqual(mockSignature);
    });
  });
});
```

### Form Validation

```typescript
// client/src/features/quote-calculator/__tests__/validation.test.ts
import { describe, it, expect } from "vitest";
import { validateQuoteForm } from "../validation";

describe("Quote Validation", () => {
  it("requires company name", () => {
    const result = validateQuoteForm({
      companyName: "",
      revenue: 100000,
    });

    expect(result.errors).toContain("Company name is required");
  });

  it("validates revenue range", () => {
    const result = validateQuoteForm({
      companyName: "Acme Inc",
      revenue: -1000,
    });

    expect(result.errors).toContain("Revenue must be positive");
  });
});
```

### Utility Functions

```typescript
// client/src/lib/__tests__/time-utils.test.ts
import { describe, it, expect } from "vitest";
import { formatRelativeTime, parseEmailDate } from "../time-utils";

describe("time-utils", () => {
  describe("formatRelativeTime", () => {
    it("formats recent dates", () => {
      const now = new Date();
      const result = formatRelativeTime(now);
      expect(result).toBe("just now");
    });

    it("formats dates from yesterday", () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(yesterday);
      expect(result).toMatch(/yesterday/i);
    });
  });
});
```

---

## 7. Performance Optimization

### Parallel Test Execution

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Use all CPU cores
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },

    // Limit concurrent tests to prevent memory issues
    maxConcurrency: 5,
  },
});
```

### Test Sharding (CI)

```bash
# Split tests across multiple CI workers
npm test -- --shard=1/4  # Run 1st quarter
npm test -- --shard=2/4  # Run 2nd quarter
npm test -- --shard=3/4  # Run 3rd quarter
npm test -- --shard=4/4  # Run 4th quarter
```

### Benchmark Tests

```typescript
import { bench, describe } from "vitest";

describe("Performance", () => {
  bench("formatEmail - simple", () => {
    formatEmail({ email: "test@example.com" });
  });

  bench("formatEmail - with name", () => {
    formatEmail({ name: "John Doe", email: "test@example.com" });
  });
});
```

Run with: `npm test -- --run --reporter=verbose`

### Reduce Test Isolation

```typescript
// For unit tests that don't modify global state
export default defineConfig({
  test: {
    poolOptions: {
      threads: {
        isolate: false, // Faster but less safe
      },
    },
  },
});
```

---

## 8. VS Code Integration

### Install Extensions

1. **Vitest Extension** - `vitest.explorer`
   - Run tests from sidebar
   - Inline pass/fail indicators
   - Debug tests with breakpoints

2. **Coverage Gutters** - `ryanluker.vscode-coverage-gutters`
   - Show coverage in editor gutter
   - Green/red lines for covered/uncovered code

### VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "vitest.enable": true,
  "vitest.commandLine": "npm test",
  "testing.automaticallyOpenPeekView": "failureInVisibleDocument",

  "coverage-gutters.coverageFileNames": ["coverage/lcov.info"],
  "coverage-gutters.showLineCoverage": true,
  "coverage-gutters.showRulerCoverage": true
}
```

### Keyboard Shortcuts

Add to `.vscode/keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+t",
    "command": "testing.runAtCursor"
  },
  {
    "key": "ctrl+shift+r",
    "command": "testing.reRunLastRun"
  }
]
```

### Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current Test File",
      "autoAttachChildProcesses": true,
      "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
      "program": "${workspaceRoot}/node_modules/vitest/vitest.mjs",
      "args": ["run", "${relativeFile}"],
      "smartStep": true,
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 9. CI/CD Best Practices

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:run

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: Comment coverage on PR
        if: github.event_name == 'pull_request'
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Pre-commit Hook

Update `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests on changed files
npm test -- --run --changed --bail

# Run linting
npm run lint:staged
```

### Package.json Scripts

```json
{
  "scripts": {
    "test:ci": "vitest run --coverage --reporter=verbose",
    "test:changed": "vitest run --changed",
    "test:affected": "vitest run --changed HEAD~1",
    "test:failed": "vitest run --reporter=verbose --bail=1"
  }
}
```

---

## 10. Advanced Testing Techniques

### Test Fixtures

```typescript
// test/fixtures/email-fixtures.ts
export const mockEmailThread = {
  id: "thread-1",
  subject: "Test Email",
  participants: [{ email: "sender@example.com", name: "John Doe" }],
  messageCount: 3,
  unreadCount: 1,
  lastMessageAt: new Date("2024-01-01"),
};

export const mockEmailMessage = {
  id: "msg-1",
  threadId: "thread-1",
  from: { email: "sender@example.com", name: "John Doe" },
  to: [{ email: "recipient@example.com", name: "Jane Smith" }],
  subject: "Test Email",
  bodyHtml: "<p>Hello</p>",
  sentAt: new Date("2024-01-01"),
};

// Use in tests
import { mockEmailThread } from "@/../../test/fixtures/email-fixtures";
```

### Custom Matchers

```typescript
// test/matchers.ts
import { expect } from "vitest";

expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
    };
  },
});

// Use in tests
expect("test@example.com").toBeValidEmail();
```

### Test Context

```typescript
import { beforeEach, describe, it, expect } from "vitest";

interface TestContext {
  user: any;
  cleanup: () => void;
}

describe<TestContext>("User Management", () => {
  beforeEach<TestContext>(async (context) => {
    // Create test user
    context.user = await createTestUser();

    // Cleanup function
    context.cleanup = async () => {
      await deleteTestUser(context.user.id);
    };
  });

  it<TestContext>("updates user profile", async ({ user, cleanup }) => {
    await updateUserProfile(user.id, { name: "New Name" });
    expect(user.name).toBe("New Name");

    await cleanup();
  });
});
```

### Component Testing with User Events

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@/../../test/test-utils";
import userEvent from "@testing-library/user-event";
import { ComposeModal } from "../ComposeModal";

describe("ComposeModal", () => {
  it("handles email composition flow", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(<ComposeModal isOpen={true} onSend={onSend} />);

    // Fill in form
    await user.type(screen.getByLabelText(/to/i), "recipient@example.com");
    await user.type(screen.getByLabelText(/subject/i), "Test Subject");
    await user.type(screen.getByRole("textbox", { name: /body/i }), "Test body");

    // Enable tracking
    await user.click(screen.getByLabelText(/track opens/i));

    // Send email
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith({
      to: ["recipient@example.com"],
      subject: "Test Subject",
      bodyHtml: expect.stringContaining("Test body"),
      trackingEnabled: true,
    });
  });
});
```

### Integration Tests

```typescript
// Test entire feature flow
describe("Email Send Flow (Integration)", () => {
  it("sends email with tracking and saves to database", async () => {
    // 1. Compose email
    render(<ComposeModal isOpen={true} />);

    // 2. Fill form
    await fillEmailForm({
      to: "test@example.com",
      subject: "Integration Test",
      body: "Test content",
    });

    // 3. Send email
    await user.click(screen.getByRole("button", { name: /send/i }));

    // 4. Verify API call
    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith("/api/email/send", {
        method: "POST",
        body: expect.objectContaining({
          to: ["test@example.com"],
          trackingEnabled: true,
        }),
      });
    });

    // 5. Verify success toast
    expect(screen.getByText(/email sent/i)).toBeInTheDocument();

    // 6. Verify email appears in sent folder
    expect(screen.getByText("Integration Test")).toBeInTheDocument();
  });
});
```

---

## 📊 Recommended Testing Strategy

### Coverage Goals

- **Critical paths**: 90%+ coverage
  - Authentication
  - Payment processing
  - Data mutations
- **UI Components**: 70-80% coverage
  - Focus on user interactions
  - Test accessibility
- **Utilities**: 85%+ coverage
  - Pure functions
  - Formatters, validators

### Testing Pyramid

```
    /\
   /  \     E2E (5%)      - Playwright
  /----\    Integration (15%)  - Vitest + MSW
 /------\   Unit (80%)         - Vitest
----------
```

### What to Test

✅ **Always test:**

- User interactions
- Form validation
- API error handling
- Edge cases
- Accessibility

❌ **Don't test:**

- Third-party libraries
- Implementation details
- CSS styling (use visual regression instead)

---

## 🎯 Quick Wins

1. **Set up coverage thresholds** - Prevent regression
2. **Add pre-commit hooks** - Catch issues early
3. **Use Vitest UI** - Better debugging experience
4. **Create test fixtures** - Reusable test data
5. **Mock external dependencies** - Faster, reliable tests
6. **Run tests in CI** - Automated quality checks
7. **Track coverage trends** - Measure improvement
8. **Use VS Code extension** - Inline test running

---

## 📚 Resources

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Kent C. Dodds - Testing](https://kentcdodds.com/testing)
- [Vitest Examples](https://github.com/vitest-dev/vitest/tree/main/examples)

---

**Happy Testing! 🧪✨**

# MSW (Mock Service Worker) Setup

## 🎯 Overview

MSW intercepts HTTP requests at the network layer, providing realistic API mocking for both **Vitest tests** and **Storybook stories**.

**One set of handlers, multiple use cases:**

- ✅ Vitest unit & integration tests
- ✅ Storybook component stories
- ✅ Browser development (optional)

---

## 📁 Structure

```
test/mocks/
├── handlers/                    # Shared API mock handlers (SOURCE OF TRUTH)
│   ├── index.ts                # Exports all handlers
│   ├── email.handlers.ts       # Email API mocks
│   ├── quote.handlers.ts       # Quote API mocks
│   ├── hubspot.handlers.ts     # HubSpot API mocks
│   └── auth.handlers.ts        # Auth API mocks
├── server.ts                   # Node setup for Vitest
└── browser.ts                  # Browser setup for Storybook
```

---

## 🚀 Usage

### In Vitest Tests

MSW is **automatically active** in all tests. No setup needed!

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { EmailInbox } from './EmailInbox';

it('displays email threads', async () => {
  render(<EmailInbox />);

  // MSW intercepts fetch('/api/email/threads')
  await waitFor(() => {
    expect(screen.getByText('Re: Quote Request')).toBeInTheDocument();
  });
});
```

### In Storybook Stories

MSW is **automatically active** in all stories. Just use your components!

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { EmailInbox } from './EmailInbox';

const meta = {
  title: 'Features/EmailInbox',
  component: EmailInbox,
} satisfies Meta<typeof EmailInbox>;

export default meta;

// Component fetches data, MSW provides it
export const Default: Story = {
  render: () => <EmailInbox />,
};
```

### Override Handlers Per Test

```typescript
import { server } from '@/../../test/mocks/server';
import { http, HttpResponse } from 'msw';

it('handles API error', async () => {
  // Override for this test only
  server.use(
    http.get('/api/email/threads', () => {
      return HttpResponse.json(
        { error: 'Server error' },
        { status: 500 }
      );
    })
  );

  render(<EmailInbox />);
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Override Handlers Per Story

```typescript
import { http, HttpResponse } from "msw";

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/email/threads", () => {
          return HttpResponse.json({ error: "Failed to load" }, { status: 500 });
        }),
      ],
    },
  },
};
```

---

## ✍️ Writing New Handlers

### 1. Create Handler File

```typescript
// test/mocks/handlers/feature.handlers.ts
import { http, HttpResponse, delay } from "msw";

export const featureHandlers = [
  http.get("/api/feature/:id", async ({ params }) => {
    await delay(100); // Simulate network delay

    return HttpResponse.json({
      id: params.id,
      data: "mock data",
    });
  }),

  http.post("/api/feature", async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json({ id: 123, ...body }, { status: 201 });
  }),
];
```

### 2. Export from Index

```typescript
// test/mocks/handlers/index.ts
import { featureHandlers } from "./feature.handlers";

export const handlers = [
  // ... existing handlers
  ...featureHandlers,
];
```

### 3. Use Immediately

No configuration needed! The handlers work in tests and stories automatically.

---

## 🎨 Handler Patterns

### GET Request

```typescript
http.get("/api/resource/:id", async ({ params }) => {
  await delay(100);
  return HttpResponse.json({ id: params.id, data: "..." });
});
```

### POST Request

```typescript
http.post("/api/resource", async ({ request }) => {
  const body = await request.json();
  return HttpResponse.json({ id: 123, ...body }, { status: 201 });
});
```

### Query Parameters

```typescript
http.get('/api/resources', ({ request }) => {
  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';

  return HttpResponse.json({ page: Number(page), data: [...] });
});
```

### Error Response

```typescript
http.get("/api/resource", () => {
  return HttpResponse.json({ error: "Not found" }, { status: 404 });
});
```

### Network Delay

```typescript
http.get("/api/resource", async () => {
  await delay(500); // 500ms delay
  return HttpResponse.json({ data: "..." });
});
```

### External API (HubSpot, Box, etc.)

```typescript
http.get("https://api.external.com/endpoint", () => {
  return HttpResponse.json({ externalData: "..." });
});
```

---

## 🔧 Advanced Patterns

### Stateful Handlers

```typescript
let mockData = ["item1", "item2"];

export const statefulHandlers = [
  http.get("/api/items", () => {
    return HttpResponse.json({ items: mockData });
  }),

  http.post("/api/items", async ({ request }) => {
    const body = await request.json();
    mockData.push(body.name);
    return HttpResponse.json({ success: true });
  }),
];

// Reset in tests
beforeEach(() => {
  mockData = ["item1", "item2"];
});
```

### Conditional Responses

```typescript
http.get("/api/user/:id", ({ params, request }) => {
  const userId = params.id;

  if (userId === "admin") {
    return HttpResponse.json({ role: "admin", permissions: ["all"] });
  }

  return HttpResponse.json({ role: "user", permissions: ["read"] });
});
```

### Sequential Responses

```typescript
let callCount = 0;

http.get("/api/status", () => {
  callCount++;

  if (callCount === 1) {
    return HttpResponse.json({ status: "pending" });
  }

  return HttpResponse.json({ status: "complete" });
});
```

---

## 🧪 Testing Patterns

### Test Loading States

```typescript
it('shows loading spinner', async () => {
  render(<Component />);

  // MSW adds delay, so loading state is visible
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
});
```

### Test Error Handling

```typescript
it('displays error message', async () => {
  server.use(
    http.get('/api/data', () => {
      return HttpResponse.json({ error: 'Failed' }, { status: 500 });
    })
  );

  render(<Component />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Test Optimistic Updates

```typescript
it('shows optimistic UI', async () => {
  render(<TodoList />);

  const input = screen.getByRole('textbox');
  const button = screen.getByRole('button', { name: /add/i });

  await userEvent.type(input, 'New Todo');
  await userEvent.click(button);

  // Should show immediately (optimistic)
  expect(screen.getByText('New Todo')).toBeInTheDocument();

  // Wait for API confirmation
  await waitFor(() => {
    expect(screen.getByRole('listitem')).toHaveAttribute('data-confirmed', 'true');
  });
});
```

---

## 📚 Best Practices

### ✅ DO

- **Use shared fixtures** from `test/fixtures/`
- **Add realistic delays** with `delay(100)` to test loading states
- **Group handlers by feature** (email.handlers.ts, quote.handlers.ts)
- **Reset state** in `afterEach` for stateful handlers
- **Override selectively** with `server.use()` for specific tests
- **Test both success and error states**

### ❌ DON'T

- **Don't duplicate handlers** between tests and Storybook
- **Don't hardcode data** - use fixtures
- **Don't skip error scenarios** - test them!
- **Don't mock what you don't use** - keep it minimal
- **Don't forget cleanup** - MSW resets automatically in `afterEach`

---

## 🐛 Troubleshooting

### "Request not intercepted"

Check that your URL matches the handler exactly:

```typescript
// ❌ Won't match '/api/email/threads'
http.get('/email/threads', ...)

// ✅ Matches
http.get('/api/email/threads', ...)
```

### "Handler not found"

Ensure the handler is exported in `handlers/index.ts`:

```typescript
export const handlers = [
  ...emailHandlers,
  ...yourNewHandlers, // ← Add this
];
```

### Storybook: "MSW not working"

Check browser console for MSW initialization message:

```
🔶 MSW: Mock Service Worker initialized
```

If missing, check that `initializeMSW()` is called in `.storybook/preview.tsx`.

### Vitest: "Timeout exceeded"

Your handler might not be responding. Check for typos in URLs.

---

## 📖 Resources

- **MSW Docs:** https://mswjs.io/docs/
- **Vitest Integration:** https://mswjs.io/docs/integrations/node
- **Storybook Integration:** https://mswjs.io/docs/integrations/browser

---

## 🎯 Quick Reference

```typescript
// Import in tests/stories
import { server } from "@/../../test/mocks/server";
import { http, HttpResponse } from "msw";

// Override handler
server.use(
  http.get("/api/endpoint", () => {
    return HttpResponse.json({ data: "override" });
  })
);

// Reset to defaults
server.resetHandlers();

// Add delay
await delay(500);

// Access request data
http.post("/api/endpoint", async ({ request, params }) => {
  const body = await request.json();
  const id = params.id;
  return HttpResponse.json({ id, ...body });
});
```

---

**Need to add a new handler?** Just create a file in `handlers/`, export it from `index.ts`, and it works everywhere! 🚀

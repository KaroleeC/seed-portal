# MSW Quick Reference

## 🚀 Import

```typescript
import { server } from "@/../../test/mocks/server";
import { http, HttpResponse, delay } from "msw";
```

## 📝 Basic Handlers

### GET Request

```typescript
http.get("/api/resource/:id", ({ params }) => {
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

### With Delay

```typescript
http.get("/api/resource", async () => {
  await delay(100); // 100ms delay
  return HttpResponse.json({ data: "..." });
});
```

### Error Response

```typescript
http.get("/api/resource", () => {
  return HttpResponse.json({ error: "Not found" }, { status: 404 });
});
```

## 🧪 Override in Tests

```typescript
it("handles error", async () => {
  server.use(
    http.get("/api/resource", () => {
      return HttpResponse.json({ error: "Failed" }, { status: 500 });
    })
  );

  // Test error handling...
});
```

## 🎨 Override in Stories

```typescript
export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/resource", () => {
          return HttpResponse.json({ error: "Failed" }, { status: 500 });
        }),
      ],
    },
  },
};
```

## 📋 Common Patterns

### Query Parameters

```typescript
http.get('/api/resources', ({ request }) => {
  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';
  return HttpResponse.json({ page: Number(page), items: [...] });
});
```

### External API

```typescript
http.get("https://api.external.com/endpoint", () => {
  return HttpResponse.json({ externalData: "..." });
});
```

### Conditional Response

```typescript
http.get("/api/user/:id", ({ params }) => {
  if (params.id === "admin") {
    return HttpResponse.json({ role: "admin" });
  }
  return HttpResponse.json({ role: "user" });
});
```

## 🔧 Commands

```bash
npm test               # MSW active in all tests
npm run storybook      # MSW active in all stories
npm test -- example    # Run MSW example tests
```

## 📁 File Structure

```
test/mocks/
├── handlers/          # Add handlers here
│   ├── feature.handlers.ts
│   └── index.ts       # Export here
├── server.ts          # Vitest (don't modify)
└── browser.ts         # Storybook (don't modify)
```

## ✅ Checklist: Adding New Handler

1. Create `test/mocks/handlers/feature.handlers.ts`
2. Export from `test/mocks/handlers/index.ts`
3. Use immediately in tests/stories!

## 📖 Full Docs

- `test/mocks/README.md` - Complete guide
- `MSW_SETUP.md` - Setup documentation
- <https://mswjs.io/docs/> - Official docs

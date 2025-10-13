# SEEDMAIL Auto-Sync & SSE Test Strategy

**Created**: 2025-10-10  
**Purpose**: Prevent regression of auto-sync and SSE functionality  
**Context**: Fixed SSE 404 bug + added auto-sync on account selection

---

## 🎯 **What We're Testing**

### Critical Functionality

1. **Auto-sync triggers** when SeedMail loads
2. **SSE routes are accessible** (not 404)
3. **Background jobs queue** properly
4. **SSE broadcasts** sync completion events
5. **Client receives** and displays notifications

---

## 📁 **Test Files Added**

### 1. **Route Smoke Tests** (Prevents 404s)

```
server/__tests__/routes-smoke.test.ts
```

**Purpose**: Validates ALL API routes are registered and accessible

**What it catches**:

- ❌ Route mounting order issues
- ❌ Path prefix conflicts (relative vs absolute)
- ❌ Missing route registrations

**Run it**:

```bash
npm run test server/__tests__/routes-smoke.test.ts
```

**Example Output**:

```
✓ GET /api/email/accounts should be accessible
✓ POST /api/email/sync should be accessible
✓ GET /api/email/events/:accountId should be accessible ✅
```

---

### 2. **SEEDMAIL Integration Tests** (End-to-End)

```
server/__tests__/seedmail-integration.test.ts
```

**Purpose**: Tests full workflow: sync request → background job → SSE notification

**What it catches**:

- ❌ Job queueing failures
- ❌ SSE connection issues
- ❌ Event broadcasting failures
- ❌ Multi-tab SSE problems

**Run it**:

```bash
npm run test server/__tests__/seedmail-integration.test.ts
```

**Coverage**:

- Auto-sync request validation
- SSE connection establishment
- SSE event broadcasting
- Multi-tab concurrent connections
- Error handling

---

### 3. **Client Auto-Sync Tests** (React Hooks)

```
client/src/pages/seedmail/__tests__/auto-sync.test.tsx
```

**Purpose**: Validates React useEffect triggers sync on account selection

**What it catches**:

- ❌ useEffect dependency bugs
- ❌ Sync not triggering on load
- ❌ Multiple syncs for same account
- ❌ Toast not showing on SSE event

**Run it**:

```bash
npm run test -- auto-sync.test.tsx
```

**Coverage**:

- Sync triggers when account changes
- Sync only fires once per selection
- Error handling doesn't crash UI
- SSE events trigger toast notifications

---

## 🚀 **Running All Tests**

### Full Test Suite

```bash
# All server tests
npm run test:server

# All client tests
npm run test:client

# All E2E tests
npm run test:e2e seedmail-sse.spec.ts
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### CI Pipeline

```bash
npm run test:ci
```

---

## 📊 **Test Coverage Matrix**

| Component              | Unit Tests       | Integration Tests | E2E Tests |
| ---------------------- | ---------------- | ----------------- | --------- |
| **Route Registration** | ❌               | ✅ Smoke Tests    | ✅ E2E    |
| **Auto-Sync Trigger**  | ✅ React Hooks   | ✅ Full Stack     | ✅ E2E    |
| **SSE Connection**     | ✅ Service Layer | ✅ Multi-Tab      | ✅ E2E    |
| **Job Queueing**       | ❌               | ✅ Integration    | ⚠️ Manual |
| **Event Broadcasting** | ✅ Service Layer | ✅ Integration    | ✅ E2E    |
| **Error Handling**     | ✅ All Layers    | ✅ Integration    | ⚠️ Manual |

**Legend**:

- ✅ = Covered
- ⚠️ = Partially covered
- ❌ = Not covered (acceptable)

---

## 🔍 **What Each Test Validates**

### Route Smoke Tests

```typescript
✓ GET /api/email/events/:accountId → 200 (not 404)
✓ POST /api/email/sync → 200/400 (not 404)
✓ GET /api/email/accounts → 200 (not 404)
```

### Integration Tests

```typescript
✓ POST /api/email/sync queues background job
✓ SSE connection sends "connected" event
✓ broadcastSyncCompleted() sends event to all clients
✓ Multiple tabs each get separate SSE connections
✓ Closing one tab doesn't affect others
```

### Client Tests

```typescript
✓ useEffect triggers sync when account changes
✓ Sync only fires once per account (no duplicates)
✓ Switching accounts triggers new sync
✓ SSE events trigger toast notifications
✓ Failed sync doesn't crash app
```

### E2E Tests (Playwright)

```typescript
✓ Full page load → SSE connects → sync triggers → toast shows
✓ Works in Chrome, Firefox, Safari
✓ Works across multiple tabs
✓ Reconnects after network interruption
```

---

## 🐛 **Bug That Was Fixed**

### The Issue

```typescript
// ❌ WRONG (caused 404)
router.get("/events/:accountId", ...) // Relative path
app.use("/api/email", emailEventsRouter) // With prefix
```

**Result**: Express couldn't find route at `/api/email/events/:accountId`

### The Fix

```typescript
// ✅ CORRECT
router.get("/api/email/events/:accountId", ...) // Absolute path
app.use(emailEventsRouter) // No prefix
```

**Why it works**: All email routes now use consistent absolute paths

### How Tests Catch This

```typescript
// routes-smoke.test.ts
it("GET /api/email/events/:accountId should not return 404", async () => {
  const response = await request(app).get("/api/email/events/test-id");
  expect(response.status).not.toBe(404); // ✅ Would fail before fix
});
```

---

## 🔄 **Test-Driven Development Workflow**

### Adding New Routes

1. **Write smoke test first**:

   ```typescript
   const emailRoutes = [
     { method: "GET", path: "/api/email/my-new-route", ... }
   ];
   ```

2. **Run test (should fail)**:

   ```bash
   npm run test routes-smoke.test.ts
   ```

3. **Implement route**:

   ```typescript
   router.get("/api/email/my-new-route", requireAuth, handler);
   ```

4. **Run test again (should pass)** ✅

### Adding New Features

1. **Write integration test**
2. **Implement feature**
3. **Add E2E test**
4. **Update smoke tests if needed**

---

## 📋 **Pre-Deployment Checklist**

Before merging SSE/Auto-Sync changes:

- [ ] All smoke tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (all browsers)
- [ ] Manual testing in dev environment
- [ ] No console errors in browser
- [ ] SSE connection shows in Network tab
- [ ] Toast notifications appear
- [ ] Works in multiple tabs
- [ ] Survives page reload

---

## 🚨 **Known Limitations**

1. **Job processing**: Integration tests mock Graphile Worker. Real job execution is tested manually.
2. **Network interruption**: E2E tests simulate offline/online, but real network issues are harder to test.
3. **Performance**: Tests don't validate SSE performance under load (100+ connections).

---

## 📚 **Related Documentation**

- [LINTING_CONVENTIONS.md](./LINTING_CONVENTIONS.md) - Code quality rules
- [REDIS_REMOVAL_COMPLETE.md](./REDIS_REMOVAL_COMPLETE.md) - Architecture overview
- [E2E Tests](../e2e/seedmail-sse.spec.ts) - Full E2E test suite

---

## ✅ **Success Metrics**

Your tests are effective if:

1. ✅ Smoke tests run in < 5 seconds
2. ✅ Integration tests run in < 30 seconds
3. ✅ Zero 404s in production logs
4. ✅ Auto-sync works on first page load
5. ✅ SSE notifications appear reliably

---

**Last Updated**: 2025-10-10  
**Maintainer**: Engineering Team

# Linting Rules & Code Conventions

**Purpose**: Prevent simple bugs and enforce consistency across the codebase.  
**Created**: 2025-10-10  
**Context**: Lessons learned from SSE route mounting bug (404 on `/api/email/events/:accountId`)

---

## 🎯 **Critical Rules** (Prevent Production Bugs)

### 1. **Express Route Patterns** (MANDATORY)

**Rule**: All API routes MUST use **absolute paths** and be mounted without prefixes.

#### ✅ **CORRECT**

```typescript
// Route definition (absolute path)
router.get("/api/email/events/:accountId", requireAuth, handler);

// Mounting (no prefix)
app.use(emailEventsRouter);
```

#### ❌ **INCORRECT** (Causes route conflicts)

```typescript
// Relative path + prefix (DON'T DO THIS)
router.get("/events/:accountId", requireAuth, handler);
app.use("/api/email", emailEventsRouter); // ❌ Prefix conflicts
```

**Why**: Express routes are processed in order. Mixing relative/absolute paths with prefixes causes 404s and routing conflicts.

**Enforcement**:

- Custom ESLint rule (see below)
- Code review checklist
- Smoke tests validate all routes are accessible

---

### 2. **useEffect Dependencies** (React Hooks)

**Rule**: All variables used inside `useEffect` MUST be in the dependency array.

#### ✅ **CORRECT**

```typescript
useEffect(() => {
  if (!selectedAccount) return;
  
  apiRequest("/api/email/sync", {
    method: "POST",
    body: { accountId: selectedAccount },
  }).catch(() => {});
}, [selectedAccount]); // ✅ Dependency included
```

#### ❌ **INCORRECT**

```typescript
useEffect(() => {
  if (!selectedAccount) return;
  apiRequest("/api/email/sync", { ... });
}, []); // ❌ Missing selectedAccount - won't trigger on change
```

**Enforcement**:

- ESLint: `react-hooks/exhaustive-deps` (already enabled)
- Upgrade to `"error"` severity (currently `"warn"`)

---

### 3. **Route Registration Order**

**Rule**: SSE/WebSocket routes MUST be registered BEFORE catch-all routes.

#### ✅ **CORRECT**

```typescript
// SSE routes first (specific)
app.use(emailEventsRouter);

// General routes after (catch-all)
app.use(emailRouter);
```

#### ❌ **INCORRECT**

```typescript
// General routes first (catches SSE requests)
app.use(emailRouter); // ❌ Might intercept /api/email/events

// SSE routes after (never reached)
app.use(emailEventsRouter);
```

**Enforcement**:

- Comment in `server/routes/index.ts` marking order requirements
- Smoke tests catch 404s

---

### 4. **API Request Error Handling**

**Rule**: ALL async API requests MUST have `.catch()` or try/catch.

#### ✅ **CORRECT**

```typescript
// With .catch()
apiRequest("/api/email/sync", { ... })
  .catch((error) => {
    console.error("[AutoSync] Failed:", error);
  });

// With try/catch
try {
  await apiRequest("/api/email/sync", { ... });
} catch (error) {
  console.error("[AutoSync] Failed:", error);
}
```

#### ❌ **INCORRECT**

```typescript
// No error handling - crashes on failure
apiRequest("/api/email/sync", { ... }); // ❌ Unhandled promise rejection
```

**Enforcement**:

- ESLint: `@typescript-eslint/no-floating-promises` set to `"error"`

---

## 📋 **Best Practices** (Code Quality)

### 5. **Route Documentation**

Every route MUST have JSDoc describing:

- Purpose
- Request body/params
- Response format
- Example usage

```typescript
/**
 * GET /api/email/events/:accountId
 * 
 * SSE endpoint for real-time email sync notifications
 * 
 * @param accountId - Email account ID to listen for events
 * 
 * Events:
 * - sync-completed: Fired when background email sync completes
 * 
 * @example
 * const eventSource = new EventSource('/api/email/events/account-123');
 * eventSource.addEventListener('sync-completed', (event) => {
 *   console.log('Sync completed:', JSON.parse(event.data));
 * });
 */
router.get("/api/email/events/:accountId", requireAuth, handler);
```

---

### 6. **Consistent Import Paths**

**Rule**: Use path aliases consistently (avoid mixing relative and absolute).

#### ✅ **CORRECT**

```typescript
// All absolute aliases
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { EmailThread } from "@shared/email-types";
```

#### ❌ **INCORRECT**

```typescript
// Mixed (confusing)
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "../../hooks/use-auth"; // ❌ Relative
import { EmailThread } from "@shared/email-types";
```

**Enforcement**:

- ESLint: `import/no-relative-parent-imports` (custom rule)

---

### 7. **Type Safety**

**Rule**: Avoid `any` type unless absolutely necessary. Use `unknown` for error handling.

```typescript
// ✅ CORRECT
try {
  await syncEmail();
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error("Sync failed:", error.message);
  }
}

// ❌ INCORRECT
} catch (error: any) { // ❌ Loses type safety
  console.error("Sync failed:", error.message);
}
```

**Enforcement**:

- `@typescript-eslint/no-explicit-any`: `"error"`

---

## 🔧 **ESLint Configuration Updates**

Add to `.eslintrc.cjs`:

```javascript
module.exports = {
  rules: {
    // Critical rules (prevent bugs)
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "react-hooks/exhaustive-deps": "error", // Upgrade from warn
    
    // Best practices
    "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    "prefer-const": "error",
    
    // Import organization
    "import/order": ["error", {
      groups: [
        "builtin",
        "external",
        "internal",
        ["parent", "sibling"],
        "index",
      ],
      pathGroups: [
        {
          pattern: "@/**",
          group: "internal",
        },
        {
          pattern: "@shared/**",
          group: "internal",
        },
      ],
      alphabetize: {
        order: "asc",
        caseInsensitive: true,
      },
    }],
  },
};
```

---

## 🧪 **Testing Requirements**

### Route Smoke Tests (MANDATORY for new routes)

Every new API route MUST be added to `server/__tests__/routes-smoke.test.ts`:

```typescript
const emailRoutes = [
  { method: "GET", path: "/api/email/accounts", description: "..." },
  { method: "POST", path: "/api/email/sync", description: "..." },
  { method: "GET", path: "/api/email/events/:accountId", description: "..." }, // ✅ Add new routes here
];
```

### Integration Tests (RECOMMENDED for complex features)

Features involving multiple systems (API + jobs + SSE) should have integration tests:

- `server/__tests__/seedmail-integration.test.ts`
- Tests full workflow end-to-end

---

## 📝 **Code Review Checklist**

Before merging, verify:

- [ ] All new routes use absolute paths
- [ ] Routes are added to smoke tests
- [ ] `useEffect` dependencies are complete
- [ ] API requests have error handling
- [ ] No `any` types (use `unknown` for errors)
- [ ] Routes are documented with JSDoc
- [ ] Tests pass locally

---

## 🚨 **When to Break These Rules**

You can deviate from these rules ONLY when:

1. There's a compelling technical reason (document it)
2. You've discussed with the team
3. You add a `// eslint-disable-next-line <rule> -- <reason>` comment

Example:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Third-party library types are incomplete
const legacyConfig: any = importOldConfig();
```

---

## 🔄 **Enforcement Strategy**

1. **Pre-commit hook** (Husky):
   - Run ESLint on staged files
   - Block commit if critical rules fail

2. **CI Pipeline**:
   - Run full ESLint check
   - Run smoke tests
   - Block merge if any fail

3. **Code Review**:
   - Use checklist above
   - Automated PR comments for common violations

---

## 📚 **Resources**

- [Express Router Best Practices](https://expressjs.com/en/guide/routing.html)
- [React Hooks Rules](https://react.dev/reference/react/hooks#rules-of-hooks)
- [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

**Last Updated**: 2025-10-10  
**Maintainer**: Engineering Team

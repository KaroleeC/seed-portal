# Authorization Pattern Convention

> **Required for all routes.** Enforced by ESLint `no-restricted-syntax` rule.

## Core Principle

**All route handlers MUST use middleware-based authorization.** Inline authorization checks (`req.user?.role === 'admin'`) are **prohibited**.

## Standard Pattern

```typescript
// ✅ CORRECT: Use middleware
import { requireAuth, requirePermission } from "./_shared";

router.post(
  "/api/resource",
  requireAuth, // Always required
  requirePermission("resource.action", "resource"), // For protected routes
  asyncHandler(async (req, res) => {
    // Business logic only - no auth checks here
  })
);
```

```typescript
// ❌ WRONG: Inline auth check (ESLint will error)
router.post("/api/resource", requireAuth, async (req, res) => {
  if (req.user?.role !== "admin") {
    // ⚠️ ESLint error: Use requirePermission instead
    return res.status(403).json({ message: "Forbidden" });
  }
});
```

## Why This Matters

1. **Centralized policies** - Authorization rules live in one place (Cerbos policies, not scattered in code)
2. **Auditable** - Easy to see what actions are protected
3. **Testable** - Middleware can be unit tested independently
4. **Future-proof** - When we enable Cerbos, policies work immediately
5. **No rework** - Don't accumulate authorization debt
6. **DRY** - Single source of truth for authorization logic

## Route Types

### Protected Routes (Default)

```typescript
router.post("/api/quotes", requireAuth, requirePermission("quotes.create", "quote"), handler);
```

### Public Routes (Rare)

Only for: `/api/health`, `/api/csrf-token`, `/api/webhooks/*`, `/api/auth/*`

```typescript
router.get("/api/health", handler); // No auth needed
```

### Resource-Level Authorization

```typescript
// Middleware automatically loads resource attributes (owner, department, etc.)
router.put(
  "/api/quotes/:id",
  requireAuth,
  requirePermission("quotes.update", "quote"),
  handler
  // No need for: if (quote.ownerId !== req.user.id) return 403;
);
```

## Action Naming

Format: `{resource}.{action}`

```typescript
// Standard CRUD
"quotes.view"; // Read/list
"quotes.create"; // Create new
"quotes.update"; // Modify
"quotes.delete"; // Remove

// Custom actions
"quotes.approve"; // Workflows
"commissions.sync"; // Integrations
"deals.manage_team"; // Team ops
```

## Current State

- **Infrastructure**: ✅ Complete (Cerbos client, attribute loader, middleware)
- **Feature Flag**: `USE_CERBOS=false` (falls back to RBAC)
- **Fallback**: RBAC database queries
- **Policies**: Define later when services stabilize

## For New Routes

**Template:**

```typescript
/**
 * POST /api/resource
 * Action: resource.create
 * Creates a new resource
 */
router.post(
  "/api/resource",
  requireAuth,
  requirePermission("resource.create", "resource"),
  asyncHandler(async (req, res) => {
    const result = await service.create(req.body);
    res.json(result);
  })
);
```

**Checklist:**

1. ✅ Always use `requirePermission`
2. ✅ Never inline auth checks
3. ✅ Name actions: `{resource}.{action}`
4. ✅ Document the action

## When Policies Are Undefined

Falls back to RBAC permissions in database (see `server/db/seeds/rbac-seed.sql`):

```sql
INSERT INTO permissions (key, description) VALUES
  ('resource.create', 'Create new resource');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.key = 'resource.create';
```

## Migration Plan

### Phase 1: Today ✅

- ✅ ESLint enforces middleware pattern
- ✅ All new routes use `requirePermission`
- ✅ Falls back to RBAC
- ✅ Documentation in place

### Phase 2: When Services Stabilize

- Define Cerbos policies with business rules
- Test with `USE_CERBOS=true`
- Enable in production

### Phase 3: Future

- Remove RBAC fallback (optional)
- Policies = single source of truth

## ESLint Enforcement

These trigger errors:

```typescript
// ❌ All caught by ESLint
req.user?.role === "admin";
req.user.role !== "employee";
req.user?.permissionLevel >= 5;
```

**Error Message:**

> Avoid inline auth checks like req.user.role. Use requirePermission() middleware instead. See docs/AUTHORIZATION_PATTERN.md

## Examples

### Good ✅

```typescript
// server/routes.ts:3557
app.post(
  "/api/commissions/sync-hubspot",
  requireAuth,
  requirePermission("commissions.sync", "commission"),
  handler
);
```

### Bad ❌ (To Refactor)

```typescript
// ❌ Inline role check
if (req.user && req.user.role === "admin") { ... }

// ❌ Role-based logic
const type = req.user.role === "admin" ? "direct" : "request";
```

## Migrating Legacy Guard Functions

### Before (❌ Anti-pattern)

```typescript
function ensureAdmin(req: any, res: any): boolean {
  const role = req?.user?.role; // ⚠️ ESLint error
  if (role !== "admin") {
    res.status(403).json({ message: "Admin only" });
    return false;
  }
  return true;
}

router.post("/api/resource", requireAuth, async (req, res) => {
  if (!ensureAdmin(req, res)) return; // ❌ Guard function anti-pattern
  // logic
});
```

### After (✅ Correct Pattern)

```typescript
// No guard function needed!
router.post(
  "/api/resource",
  requireAuth,
  requirePermission("resource.create", "resource"), // ✅ Middleware handles it
  async (req, res) => {
    // logic - no auth checks needed
  }
);
```

### Why Guard Functions Are An Anti-Pattern

1. **Not composable** - Can't combine multiple permission checks easily
2. **Mixed concerns** - Business logic + auth logic in same handler
3. **Hard to test** - Can't test auth independently from handler
4. **Not auditable** - Permissions scattered throughout codebase
5. **ESLint violations** - Use of `req.user.role` triggers errors

## See Also

- `server/services/authz/authorize.ts` - Authorization logic
- `server/services/authz/cerbos-client.ts` - Cerbos integration
- `server/services/authz/attribute-loader.ts` - Attribute enrichment
- `cerbos/policies/*.yaml` - Example policies
- `docs/architecture/CERBOS_INTEGRATION.md` - Full docs
- `.eslintrc.cjs` - ESLint rules
- `server/db/seeds/rbac-seed.sql` - RBAC permissions

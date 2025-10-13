# RBAC Migration Report

**Generated:** 2025-01-12  
**Last Updated:** 2025-01-12  
**Total Violations Found:** 97  
**Violations Resolved:** 9  
**Violations Remaining:** 88

This report identifies all code that needs to be migrated to use the new RBAC system. Files are prioritized by number of violations.

---

## Summary

The ESLint RBAC plugin has identified **97 RBAC-related issues** across the codebase:

### Backend Issues (Server)

- **79 violations** in server files
  - Missing `requirePermission` middleware
  - Missing route documentation
  - Inline auth checks

### Frontend Issues (Client)

- **18 violations** in client files
  - Direct `user.role` checks
  - Should use `usePermissions()` hook or `PermissionGuard` component

---

## Priority Files (Most Violations)

### 🔴 Critical Priority

#### 1. `server/routes.ts` - 38 violations (9 resolved, 29 remaining)

**✅ Completed:**

- All 9 admin RBAC/policy endpoints now protected:
  - `GET /api/admin/rbac/users` - `admin.rbac.read`
  - `GET /api/admin/rbac/roles` - `admin.rbac.read`
  - `GET /api/admin/rbac/permissions` - `admin.rbac.read`
  - `POST /api/admin/rbac/assign-role` - `admin.rbac.write`
  - `DELETE /api/admin/rbac/user/:userId/role/:roleId` - `admin.rbac.write`
  - `POST /api/admin/rbac/test-authz` - `admin.debug`
  - `GET /api/admin/cerbos/policy/:policyName` - `admin.policy.read`
  - `GET /api/admin/cerbos/policies` - `admin.policy.read`
  - `PUT /api/admin/cerbos/policy/:policyName` - `admin.policy.write`

**🔄 In Progress:**

- ~29 remaining routes need `requirePermission` middleware and documentation

**Action:** Continue adding `requirePermission` middleware and JSDoc comments to remaining routes.

#### 2. `server/hubspot-routes.ts` - 34 violations

**Issues:**

- Routes missing `requirePermission` middleware
- Routes missing documentation
- Inline auth checks (`if (!req.user)`)

**Action:** Add permission checks and documentation. Replace inline auth with middleware.

### 🟡 Medium Priority

#### 3. `server/admin-routes.ts` - 6 violations

**Issues:**

- Missing route documentation (1 route)
- Some routes need permission refinement

**Action:** Add missing documentation. Most routes already have `requirePermission` ✅

#### 4. `server/routes/cadence.ts` - 1 violation

**Action:** Add missing route documentation

#### 5. `server/routes/admin-rbac.ts` - 1 violation

**Action:** Add missing route documentation

#### 6. `server/middleware/supabase-auth.ts` - 1 violation

**Action:** Review inline auth check

---

## Frontend Files (Client)

### Files with `user.role` checks

1. **`client/src/pages/assistant.tsx`** - 3 violations
2. **`client/src/components/assistant/AssistantWidget.tsx`** - 3 violations
3. **`client/src/components/cadence/CadenceSettings.tsx`** - 2 violations
4. **`client/src/pages/user-management.tsx`** - 1 violation
5. **`client/src/pages/settings-hub.tsx`** - 1 violation
6. **`client/src/pages/seedpay-settings.tsx`** - 1 violation
7. **`client/src/pages/sales-cadence/builder/[id].tsx`** - 1 violation
8. **`client/src/pages/leads-inbox/index.tsx`** - 1 violation
9. **`client/src/pages/command-dock-settings.tsx`** - 1 violation
10. **`client/src/components/settings/system/UserManagementInlinePanel.tsx`** - 1 violation
11. **`client/src/components/settings/system/CommandDockRBACPanel.tsx`** - 1 violation

**Migration Pattern for Frontend:**

Replace:

```typescript
if (user?.role === "admin") { ... }
```

With:

```typescript
const { hasPermission } = usePermissions();
if (hasPermission("admin.view:system")) { ... }
```

Or use `PermissionGuard`:

```typescript
<PermissionGuard permissions="admin.view:system">
  <AdminContent />
</PermissionGuard>
```

---

## Violation Types Breakdown

### Backend Violations

| Violation Type                       | Count | Description                                   |
| ------------------------------------ | ----- | --------------------------------------------- |
| `rbac/require-permission-middleware` | ~40   | Routes missing `requirePermission` middleware |
| `rbac/require-route-documentation`   | ~35   | Routes missing JSDoc documentation            |
| `rbac/no-inline-auth-checks`         | ~4    | Inline `if (!req.user)` checks in handlers    |

### Frontend Violations

| Violation Type               | Count | Description                                      |
| ---------------------------- | ----- | ------------------------------------------------ |
| `rbac/no-direct-role-checks` | 18    | Direct `user.role` checks instead of permissions |

---

## Migration Steps

### For Backend Routes

1. **Add requirePermission middleware**

```typescript
// Before
app.get("/api/endpoint", requireAuth, async (req, res) => { ... });

// After
app.get("/api/endpoint",
  requireAuth,
  requirePermission("resource.action", "scope"),
  async (req, res) => { ... }
);
```

1. **Add route documentation**

```typescript
/**
 * GET /api/endpoint
 * Action: resource.action
 * Description of what this endpoint does
 */
app.get("/api/endpoint", requireAuth, requirePermission(...), handler);
```

1. **Remove inline auth checks**

```typescript
// Before
app.get("/api/endpoint", requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // ...
});

// After
app.get(
  "/api/endpoint",
  requireAuth, // Handles authentication
  requirePermission("resource.view", "system"), // Handles authorization
  async (req, res) => {
    // req.user is guaranteed to exist here
  }
);
```

### For Frontend Components

1. **Import usePermissions hook**

```typescript
import { usePermissions } from "@/hooks/use-permissions";
```

1. **Check permissions instead of roles**

```typescript
const { hasPermission } = usePermissions();
const canAccess = hasPermission("admin.view:system");
```

1. **Or use PermissionGuard**

```typescript
<PermissionGuard permissions="admin.view:system">
  <AdminPanel />
</PermissionGuard>
```

---

## Recommended Migration Order

### Phase 1: High-Traffic Routes (Week 1)

1. ✅ `server/admin-routes.ts` - Already mostly complete
2. `server/routes.ts` - Core API routes
3. Frontend pages with most traffic:
   - `assistant.tsx`
   - `user-management.tsx`

### Phase 2: HubSpot Integration (Week 2)

1. `server/hubspot-routes.ts` - All HubSpot endpoints
2. Related frontend components

### Phase 3: Remaining Routes (Week 3)

1. `server/routes/cadence.ts`
2. `server/routes/admin-rbac.ts`
3. Other frontend components

### Phase 4: Polish & Testing (Week 4)

1. Add missing documentation
2. Test all permission checks
3. Update tests to cover RBAC scenarios

---

## Testing Checklist

After migrating each file:

- [ ] All routes have `requirePermission` middleware
- [ ] All routes have JSDoc documentation with Action field
- [ ] No inline auth checks in route handlers
- [ ] Frontend uses `usePermissions()` or `PermissionGuard`
- [ ] Tests updated to cover permission checks
- [ ] Manual testing confirms access control works
- [ ] ESLint shows no RBAC warnings for the file

---

## Resources

- **Migration Guide:** [FRONTEND_RBAC_MIGRATION_GUIDE.md](./FRONTEND_RBAC_MIGRATION_GUIDE.md)
- **RBAC Plan:** [RBAC_REFACTOR_PLAN.md](./RBAC_REFACTOR_PLAN.md)
- **ESLint Plugin:** `eslint-plugin-rbac/README.md`
- **Full Report:** `rbac-migration-report.txt` (raw ESLint output)

---

## Quick Commands

```bash
# Run RBAC linter on specific file
npx eslint server/routes.ts --format compact | grep rbac/

# Run on all server files
npx eslint server --ext .ts | grep rbac/

# Run on all client files
npx eslint client/src --ext .ts,.tsx | grep rbac/

# Generate fresh report
npx eslint . --ext .ts,.tsx --format compact 2>&1 | grep rbac/ > rbac-migration-report.txt
```

---

## Notes

- **Backward Compatible:** The system supports both legacy role checks and RBAC simultaneously
- **Gradual Migration:** Files can be migrated incrementally without breaking existing functionality
- **Testing:** Each migrated file should be tested to ensure permissions work correctly
- **Documentation:** ESLint will flag missing documentation, ensuring all routes are well-documented

---

## Progress Tracking

Track your migration progress:

```bash
# Count remaining violations
npx eslint . --ext .ts,.tsx --format compact 2>&1 | grep -c rbac/

# View violations by type
npx eslint . --ext .ts,.tsx --format compact 2>&1 | grep rbac/ | cut -d'(' -f2 | cut -d')' -f1 | sort | uniq -c
```

---

**Last Updated:** 2025-01-12  
**Status:** 🟡 Migration In Progress  
**Violations Remaining:** 88 (9 resolved)

### Recent Progress

- ✅ Protected all 9 admin endpoints in `server/routes.ts` with appropriate permissions

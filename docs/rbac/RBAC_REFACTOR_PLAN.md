# RBAC Refactoring Plan

## Objective

Migrate `admin-routes.ts` from generic `requireAdmin` to granular permission-based authorization.

## Current State

- All admin routes use `requireAdmin` alias pointing to `requirePermission("admin.access")`
- No granular permission checks
- Frontend expects RBAC endpoints that exist but lack proper authorization

## Target State

- Each route uses specific permission (e.g., `users.manage`, `roles.view`)
- Clear permission requirements documented in route comments
- Consistent authorization pattern across all routes
- Comprehensive test coverage

---

## Permission Mapping

### User Management Routes

| Route                                         | Method | Current        | New Permission                  |
| --------------------------------------------- | ------ | -------------- | ------------------------------- |
| `/api/admin/users`                            | GET    | `requireAdmin` | `users.view`                    |
| `/api/admin/users`                            | POST   | `requireAdmin` | `users.create`                  |
| `/api/admin/users/:userId`                    | DELETE | `requireAdmin` | `users.delete`                  |
| `/api/admin/users/:userId/role`               | PATCH  | `requireAdmin` | `users.update` + `roles.assign` |
| `/api/admin/users/:userId/reset-password`     | POST   | `requireAdmin` | `users.update`                  |
| `/api/admin/users/:userId/link-hubspot-owner` | POST   | `requireAdmin` | `users.update`                  |
| `/api/admin/impersonate/:userId`              | POST   | `requireAdmin` | `admin.impersonate` (new)       |

### RBAC Management Routes

| Route                                       | Method | Current        | New Permission             |
| ------------------------------------------- | ------ | -------------- | -------------------------- |
| `/api/admin/rbac/users`                     | GET    | `requireAuth`  | `users.view` ✅            |
| `/api/admin/rbac/roles`                     | GET    | `requireAuth`  | `roles.view` ✅            |
| `/api/admin/rbac/permissions`               | GET    | `requireAuth`  | `permissions.view` ✅      |
| `/api/admin/rbac/assign-role`               | POST   | `requireAuth`  | `roles.assign` ✅          |
| `/api/admin/rbac/user/:userId/role/:roleId` | DELETE | `requireAuth`  | `roles.remove` ✅          |
| `/api/admin/rbac/departments`               | GET    | `requireAdmin` | `departments.view` (new)   |
| `/api/admin/rbac/departments`               | POST   | `requireAdmin` | `departments.manage` (new) |
| `/api/admin/rbac/departments/:id`           | PUT    | `requireAdmin` | `departments.manage` (new) |
| `/api/admin/rbac/departments/:id`           | DELETE | `requireAdmin` | `departments.manage` (new) |
| `/api/admin/rbac/manager-edges`             | GET    | `requireAdmin` | `departments.view` (new)   |
| `/api/admin/rbac/manager-edges`             | POST   | `requireAdmin` | `departments.manage` (new) |
| `/api/admin/rbac/manager-edges`             | DELETE | `requireAdmin` | `departments.manage` (new) |
| `/api/admin/rbac/audit`                     | GET    | `requireAdmin` | `admin.audit` (new)        |

### Pricing Management Routes

| Route                            | Method | Current        | New Permission      |
| -------------------------------- | ------ | -------------- | ------------------- |
| `/api/admin/pricing/config`      | GET    | `requireAdmin` | `pricing.view` ✅   |
| `/api/admin/pricing/base`        | GET    | `requireAdmin` | `pricing.view` ✅   |
| `/api/admin/pricing/base`        | POST   | `requireAdmin` | `pricing.update` ✅ |
| `/api/admin/pricing/tiers`       | GET    | `requireAdmin` | `pricing.view` ✅   |
| `/api/admin/pricing/tiers`       | POST   | `requireAdmin` | `pricing.update` ✅ |
| `/api/admin/pricing/tiers/:id`   | PUT    | `requireAdmin` | `pricing.update` ✅ |
| `/api/admin/pricing/tiers/:id`   | DELETE | `requireAdmin` | `pricing.update` ✅ |
| `/api/admin/pricing/history`     | GET    | `requireAdmin` | `pricing.view` ✅   |
| `/api/admin/pricing/cache/clear` | POST   | `requireAdmin` | `admin.cache` (new) |

### Calculator Management Routes

| Route                               | Method | Current        | New Permission        |
| ----------------------------------- | ------ | -------------- | --------------------- |
| `/api/admin/calculator/content`     | GET    | `requireAdmin` | `calculator.admin` ✅ |
| `/api/admin/calculator/content`     | POST   | `requireAdmin` | `calculator.admin` ✅ |
| `/api/admin/calculator/content/:id` | PUT    | `requireAdmin` | `calculator.admin` ✅ |
| `/api/admin/calculator/content/:id` | DELETE | `requireAdmin` | `calculator.admin` ✅ |

### CRM Configuration Routes

| Route                                      | Method | Current        | New Permission            |
| ------------------------------------------ | ------ | -------------- | ------------------------- |
| `/api/admin/crm/lead-config`               | GET    | `requireAdmin` | `crm.config.view` (new)   |
| `/api/admin/crm/lead-config/sources/:key`  | PUT    | `requireAdmin` | `crm.config.manage` (new) |
| `/api/admin/crm/lead-config/statuses/:key` | PUT    | `requireAdmin` | `crm.config.manage` (new) |
| `/api/admin/crm/lead-config/stages/:key`   | PUT    | `requireAdmin` | `crm.config.manage` (new) |
| `/api/admin/crm/lead-config/sources/:key`  | DELETE | `requireAdmin` | `crm.config.manage` (new) |
| `/api/admin/crm/lead-config/statuses/:key` | DELETE | `requireAdmin` | `crm.config.manage` (new) |
| `/api/admin/crm/lead-config/stages/:key`   | DELETE | `requireAdmin` | `crm.config.manage` (new) |

### HubSpot Integration Routes

| Route                          | Method | Current        | New Permission    |
| ------------------------------ | ------ | -------------- | ----------------- |
| `/api/admin/hubspot/pipelines` | GET    | `requireAdmin` | `hubspot.view` ✅ |

---

## New Permissions to Add

Add these to `rbac-seed.sql`:

```sql
-- Department management
('departments.view', 'View departments', 'departments', true),
('departments.manage', 'Manage departments', 'departments', true),

-- Audit and cache
('admin.audit', 'View audit logs', 'admin', true),
('admin.cache', 'Manage system cache', 'admin', true),
('admin.impersonate', 'Impersonate other users', 'admin', true),

-- CRM configuration
('crm.config.view', 'View CRM configuration', 'crm', true),
('crm.config.manage', 'Manage CRM configuration', 'crm', true),
```

---

## Implementation Steps

### ✅ Step 1: Add Missing Permissions to Seed File

- [x] Add new permission definitions
- [x] Update admin role to include all permissions

### ⏳ Step 2: Refactor admin-rbac.ts

- [x] Add proper authorization to all routes
- [x] Use granular permissions
- [x] Add route documentation comments
- [x] Use consistent error handling with `getErrorMessage()`

### ✅ Step 3: Refactor admin-routes.ts

- [x] Replace `requireAdmin` with specific permissions
- [x] Group routes by resource type
- [x] Add documentation comments for each route
- [x] Fix ESLint issues in touched code

### ⏳ Step 4: Add Comprehensive Tests

- [x] Create test file for admin-rbac routes
- [x] Add tests for admin-routes endpoints
- [x] Test authorization (permission checks)
- [x] Test user experience (error messages, response format)
- [x] Add integration tests with MSW for HubSpot calls

### ✅ Step 5: Update Frontend

- [x] Update API client to use RBAC endpoints
- [x] Replace legacy `role` field with RBAC roles
- [x] Update UI to show granular permissions
- [x] Add permission-based UI guards

**Implementation Details:**

Created comprehensive RBAC frontend infrastructure:

1. **RBAC API Client** (`client/src/lib/rbac-api.ts`)
   - Type-safe functions for all RBAC operations
   - Role management (CRUD)
   - Permission assignment/removal
   - User role management
   - Department management
   - User permission queries

2. **useUserPermissions Hook** (`client/src/hooks/use-user-permissions.tsx`)
   - Fetches user's RBAC permissions from backend
   - Caches permissions with 5-minute stale time
   - Provides permission checking functions: `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`
   - Provides role and department checks: `hasRole()`, `isInDepartment()`

3. **Enhanced usePermissions Hook** (`client/src/hooks/use-permissions.tsx`)
   - Unified interface for permission checking
   - Automatic fallback: RBAC → Legacy role-based
   - Backward compatible with existing code
   - Exposes RBAC-specific features via `rbac` object

4. **Enhanced PermissionGuard Component** (`client/src/components/PermissionGuard.tsx`)
   - Loading state during permission fetch
   - Supports both legacy and RBAC permission formats
   - Custom error messages and fallback content
   - Clean hide/show without errors

5. **Updated can.ts Helper** (`client/src/lib/can.ts`)
   - Added deprecation notices
   - Documented migration path to usePermissions hook
   - Added `canAny()` and `canAll()` helpers

6. **Migration Examples**
   - Updated `admin-commission-tracker.tsx` to use RBAC permissions
   - Replaced `user.role === "admin"` with `hasPermission("manage_commissions")`
   - Query enabling with permissions instead of roles

7. **Documentation** (`docs/FRONTEND_RBAC_MIGRATION_GUIDE.md`)
   - Comprehensive migration guide with code examples
   - Permission format documentation
   - Best practices and testing strategies
   - Gradual migration strategy
   - Troubleshooting guide

**Key Features:**

- ✅ Backward compatible (supports both legacy and RBAC)
- ✅ Automatic fallback when RBAC unavailable
- ✅ Type-safe API client
- ✅ Cached permission queries (5-minute TTL)
- ✅ Loading states and error handling
- ✅ Comprehensive documentation

### ✅ Step 6: Add ESLint Rules

- [x] Enforce `requirePermission` usage
- [x] Prevent inline auth checks
- [x] Require route documentation

**Implementation Details:**

Created custom ESLint plugin with 4 rules to enforce RBAC patterns and identify legacy code:

1. **`rbac/require-permission-middleware`**
   - Enforces `requirePermission` middleware on all API routes
   - Flags routes that only have `requireAuth` without permission checks
   - Configurable exempt routes for public endpoints

2. **`rbac/no-inline-auth-checks`**
   - Prevents inline authentication/authorization checks in route handlers
   - Detects `if (!req.user)` and `if (req.user.role === "admin")` patterns
   - Encourages middleware-based auth

3. **`rbac/require-route-documentation`**
   - Requires JSDoc comments above route definitions
   - Must include HTTP method, path, Action field, and description
   - Ensures API routes are properly documented

4. **`rbac/no-direct-role-checks`**
   - Prevents `user.role` checks in frontend code
   - Encourages use of `usePermissions()` hook or `PermissionGuard` component
   - Configurable allowed files for legacy code

**Configuration:**

- Registered plugin in `package.json` as local dependency
- Added rules to `.eslintrc.cjs` with separate configs for server vs client
- Server rules: all 3 backend rules (permission, docs, inline checks)
- Client rules: no-direct-role-checks only

**Migration Discovery:**

- Generated comprehensive migration report
- **97 total violations identified**:
  - 79 backend violations (routes.ts, hubspot-routes.ts, admin-routes.ts)
  - 18 frontend violations (direct user.role checks)
- Created detailed migration plan with prioritization

**Deliverables:**

- ✅ Custom ESLint plugin (`eslint-plugin-rbac/`)
- ✅ 4 custom rules with documentation
- ✅ ESLint configuration updated
- ✅ Migration report generated (`docs/RBAC_MIGRATION_REPORT.md`)
- ✅ 97 violations flagged for remediation

---

## Testing Strategy

### Unit Tests (Vitest)

- Test authorization logic in isolation
- Test permission resolution
- Test error handling

### Integration Tests (Supertest)

- Test API endpoints with auth
- Test permission enforcement
- Test error responses

### E2E Tests (Playwright)

- Test user flows (admin creating users, assigning roles)
- Test permission-based UI visibility
- Test error states

---

## Rollout Plan

### Phase 1: Backend (Current)

1. Add missing permissions to database
2. Refactor routes to use granular permissions
3. Add comprehensive tests
4. Deploy to staging

### Phase 2: Frontend

1. Update API client
2. Update UI components
3. Add permission guards
4. Deploy to staging

### Phase 3: Production

1. Run seed script to add new permissions
2. Deploy backend changes
3. Monitor for authorization errors
4. Deploy frontend changes

---

## Success Criteria

- [ ] All admin routes use granular permissions
- [ ] No routes use generic `requireAdmin`
- [ ] Test coverage > 80% for RBAC routes
- [ ] All ESLint rules pass
- [ ] Frontend uses RBAC data instead of legacy role field
- [ ] No authorization-related bugs in production

---

## Notes

- Keep `admin.*` wildcard permission for super admins
- Maintain backward compatibility during migration
- Use feature flags if needed for gradual rollout
- Document all permission changes in changelog

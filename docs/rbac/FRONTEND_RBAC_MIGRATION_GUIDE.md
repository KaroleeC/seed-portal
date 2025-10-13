# Frontend RBAC Migration Guide

This guide covers migrating from legacy role-based authentication to the new RBAC (Role-Based Access Control) system.

## Overview

The frontend now supports **both legacy and RBAC permissions** with automatic fallback. When RBAC data is available, it takes precedence. Otherwise, the system falls back to static role-based permissions.

---

## New Files & Infrastructure

### 1. **RBAC API Client** (`client/src/lib/rbac-api.ts`)

Type-safe API client for all RBAC operations:

```typescript
import { getUserPermissions, assignRoleToUser } from "@/lib/rbac-api";

// Fetch user permissions
const permissions = await getUserPermissions(userId);

// Assign role to user
await assignRoleToUser(userId, roleId);
```

### 2. **useUserPermissions Hook** (`client/src/hooks/use-user-permissions.tsx`)

Fetches and caches user RBAC permissions:

```typescript
import { useUserPermissions } from "@/hooks/use-user-permissions";

function MyComponent() {
  const {
    hasPermission,
    hasRole,
    isInDepartment,
    roles,
    departments,
    permissions,
    isLoading,
  } = useUserPermissions();

  if (isLoading) return <LoadingSpinner />;

  if (!hasPermission("users.view:system")) {
    return <AccessDenied />;
  }

  return <div>...</div>;
}
```

### 3. **Enhanced usePermissions Hook** (`client/src/hooks/use-permissions.tsx`)

Unified permission checking with automatic RBAC/legacy fallback:

```typescript
import { usePermissions } from "@/hooks/use-permissions";

function MyComponent() {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    rbac,
    isAdmin,
  } = usePermissions();

  // Works with both legacy and RBAC permissions
  const canEdit = hasPermission("edit_quotes");
  const canManage = hasPermission("users.manage:system"); // RBAC format

  // RBAC-specific features
  if (rbac.isEnabled) {
    console.log("Using RBAC permissions:", rbac.permissions);
    console.log("User roles:", rbac.roles);
    console.log("User departments:", rbac.departments);
  }

  return <div>...</div>;
}
```

### 4. **Enhanced PermissionGuard Component** (`client/src/components/PermissionGuard.tsx`)

Guard component with loading states and custom error messages:

```tsx
import { PermissionGuard } from "@/components/PermissionGuard";

// Single permission
<PermissionGuard permissions="users.view:system">
  <UserList />
</PermissionGuard>

// Multiple permissions (ANY)
<PermissionGuard permissions={["users.view:system", "users.view:department"]}>
  <UserList />
</PermissionGuard>

// Multiple permissions (ALL required)
<PermissionGuard
  permissions={["users.view:system", "users.delete:system"]}
  requireAll
>
  <UserManagement />
</PermissionGuard>

// Custom fallback
<PermissionGuard
  permissions="admin.view:system"
  fallback={<p>You need admin access</p>}
>
  <AdminPanel />
</PermissionGuard>

// Custom error message
<PermissionGuard
  permissions="quotes.delete:system"
  errorMessage="Only managers can delete quotes"
>
  <DeleteQuoteButton />
</PermissionGuard>

// Hide without error
<PermissionGuard permissions="advanced.features:system" showError={false}>
  <AdvancedFeatures />
</PermissionGuard>
```

---

## Migration Patterns

### Pattern 1: Replace Direct Role Checks

**Before:**

```typescript
import { useAuth } from "@/hooks/use-auth";

function AdminPanel() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return <AccessDenied />;
  }

  return <div>Admin content</div>;
}
```

**After:**

```typescript
import { usePermissions } from "@/hooks/use-permissions";

function AdminPanel() {
  const { hasPermission } = usePermissions();

  if (!hasPermission("admin.view:system")) {
    return <AccessDenied />;
  }

  return <div>Admin content</div>;
}
```

**Or use PermissionGuard:**

```typescript
import { PermissionGuard } from "@/components/PermissionGuard";

function AdminPanel() {
  return (
    <PermissionGuard permissions="admin.view:system">
      <div>Admin content</div>
    </PermissionGuard>
  );
}
```

### Pattern 2: Conditional Query Enabling

**Before:**

```typescript
const { data } = useQuery({
  queryKey: ["/api/admin/users"],
  enabled: user?.role === "admin",
});
```

**After:**

```typescript
const { hasPermission } = usePermissions();

const { data } = useQuery({
  queryKey: ["/api/admin/users"],
  enabled: hasPermission("users.view:system"),
});
```

### Pattern 3: Conditional UI Rendering

**Before:**

```typescript
{user?.role === "admin" && (
  <Button onClick={handleDelete}>Delete</Button>
)}
```

**After:**

```typescript
const { hasPermission } = usePermissions();

{hasPermission("users.delete:system") && (
  <Button onClick={handleDelete}>Delete</Button>
)}
```

**Or use PermissionGuard:**

```typescript
<PermissionGuard permissions="users.delete:system" showError={false}>
  <Button onClick={handleDelete}>Delete</Button>
</PermissionGuard>
```

### Pattern 4: Multiple Permission Checks

**Before:**

```typescript
const isAdmin = user?.role === "admin";
const canEdit = isAdmin || user?.role === "manager";
```

**After:**

```typescript
const { hasAnyPermission } = usePermissions();

const canEdit = hasAnyPermission(["quotes.edit:system", "quotes.edit:department"]);
```

### Pattern 5: Deprecate `can()` Helper

**Before:**

```typescript
import { can } from "@/lib/can";

if (can(user, "commissions.sync")) {
  // ...
}
```

**After:**

```typescript
import { usePermissions } from "@/hooks/use-permissions";

const { hasPermission } = usePermissions();

if (hasPermission("commissions.sync:system")) {
  // ...
}
```

---

## Permission Format

RBAC permissions use the format: `action:resource`

### Common Patterns

```typescript
// System-wide permissions
"users.view:system";
"users.create:system";
"users.delete:system";

// Resource-scoped permissions
"quotes.view:own"; // View own quotes
"quotes.edit:department"; // Edit quotes in user's department
"quotes.delete:system"; // Delete any quote

// Feature permissions
"calculator.admin:system";
"pricing.update:system";
"crm.config.manage:system";
```

---

## RBAC-Specific Features

### Check User Roles

```typescript
const { rbac } = usePermissions();

if (rbac.hasRole("Sales Manager")) {
  // Role-specific logic
}

// Get all roles
console.log(rbac.roles); // [{ id: 1, name: "Sales Manager", ... }]
```

### Check Department Membership

```typescript
const { rbac } = usePermissions();

if (rbac.isInDepartment("Engineering")) {
  // Department-specific logic
}

// Get all departments
console.log(rbac.departments); // [{ id: 1, name: "Engineering" }]
```

### Get All Permissions

```typescript
const { rbac } = usePermissions();

// Get flat array of permission strings
const allPermissions = rbac.permissions;
// ["users.view:system", "quotes.edit:own", ...]
```

### Refresh Permissions

```typescript
const { rbac } = usePermissions();

// Force refetch permissions (e.g., after role change)
await rbac.refetch();
```

---

## Best Practices

### 1. **Always Use Server-Side Validation**

Client-side permissions are for UI affordances only. Always validate on the backend:

```typescript
// ❌ BAD: Only client-side check
const { hasPermission } = usePermissions();
if (hasPermission("users.delete:system")) {
  await deleteUser(userId); // Backend must also check!
}

// ✅ GOOD: Server validates permissions
const { hasPermission } = usePermissions();
if (hasPermission("users.delete:system")) {
  try {
    await deleteUser(userId); // Backend checks permission
  } catch (error) {
    // Handle 403 Forbidden
  }
}
```

### 2. **Use PermissionGuard for Pages/Sections**

```typescript
// ✅ GOOD: Clean separation
<PermissionGuard permissions="admin.view:system">
  <AdminDashboard />
</PermissionGuard>

// ❌ BAD: Scattered checks
function AdminDashboard() {
  const { hasPermission } = usePermissions();
  if (!hasPermission("admin.view:system")) return null;
  // ...
}
```

### 3. **Cache Permission Checks**

```typescript
// ✅ GOOD: Check once
const { hasPermission } = usePermissions();
const canEdit = hasPermission("quotes.edit:system");

return (
  <div>
    {canEdit && <EditButton />}
    {canEdit && <SaveButton />}
  </div>
);

// ❌ BAD: Repeated checks
return (
  <div>
    {hasPermission("quotes.edit:system") && <EditButton />}
    {hasPermission("quotes.edit:system") && <SaveButton />}
  </div>
);
```

### 4. **Provide Meaningful Error Messages**

```typescript
<PermissionGuard
  permissions="quotes.delete:system"
  errorMessage="Only administrators can delete quotes. Contact your manager for assistance."
>
  <DeleteButton />
</PermissionGuard>
```

### 5. **Handle Loading States**

```typescript
const { hasPermission, rbac } = usePermissions();

if (rbac.isLoading) {
  return <LoadingSpinner />;
}

// Permission checks are now safe
const canEdit = hasPermission("quotes.edit:system");
```

---

## Testing

### Test Permission Checks

```typescript
import { render, screen } from "@testing-library/react";
import { PermissionGuard } from "@/components/PermissionGuard";

// Mock usePermissions
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasPermission: (perm: string) => perm === "users.view:system",
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
    rbac: { isLoading: false },
  }),
}));

test("shows content when user has permission", () => {
  render(
    <PermissionGuard permissions="users.view:system">
      <div>Protected Content</div>
    </PermissionGuard>
  );

  expect(screen.getByText("Protected Content")).toBeInTheDocument();
});

test("shows error when user lacks permission", () => {
  render(
    <PermissionGuard permissions="users.delete:system">
      <div>Protected Content</div>
    </PermissionGuard>
  );

  expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
});
```

---

## Gradual Migration Strategy

1. **Phase 1**: Set up RBAC infrastructure (✅ Complete)
   - Created RBAC API client
   - Built permission hooks
   - Enhanced PermissionGuard

2. **Phase 2**: Update high-priority pages
   - Admin panels
   - User management
   - Sensitive operations

3. **Phase 3**: Update remaining pages
   - Feature pages
   - Settings panels
   - Dashboard widgets

4. **Phase 4**: Remove legacy code
   - Deprecate `can()` helper
   - Remove static role checks
   - Clean up imports

---

## Troubleshooting

### Permissions Not Loading

```typescript
const { rbac } = usePermissions();

console.log("RBAC enabled:", rbac.isEnabled);
console.log("RBAC loading:", rbac.isLoading);
console.log("Permissions:", rbac.permissions);

// Force refetch if stale
await rbac.refetch();
```

### Fallback to Legacy

The system automatically falls back to legacy permissions when:

- RBAC data is still loading
- User has no RBAC roles assigned
- API endpoint is unavailable

Check which mode is active:

```typescript
const { rbac } = usePermissions();

if (rbac.isEnabled) {
  console.log("Using RBAC permissions");
} else {
  console.log("Using legacy role-based permissions");
}
```

### Permission Format Errors

Always use the correct format:

```typescript
// ✅ GOOD
hasPermission("users.view:system");

// ❌ BAD
hasPermission("users.view"); // Missing resource
hasPermission("view users"); // Wrong format
hasPermission("users:view"); // Wrong order
```

---

## FAQ

**Q: Do I need to update all role checks immediately?**  
A: No. The system supports both legacy and RBAC, so migration can be gradual.

**Q: What if RBAC data fails to load?**  
A: The system automatically falls back to legacy role-based permissions.

**Q: Can I use both role and permission checks?**  
A: Yes, but prefer permission checks for consistency and flexibility.

**Q: How do I test RBAC locally?**  
A: Assign roles and permissions via the `/rbac-management` admin panel.

**Q: Does this affect backend permissions?**  
A: No. Backend already uses RBAC. This is frontend-only migration.

---

## Resources

- **Backend RBAC**: `server/admin-rbac.ts`
- **RBAC Schema**: `shared/schema.ts` (roles, permissions, departments)
- **Permission List**: `server/services/rbac/permission-checker.ts`
- **API Docs**: `docs/RBAC_REFACTOR_PLAN.md`

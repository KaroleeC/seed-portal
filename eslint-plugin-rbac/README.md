# ESLint Plugin RBAC

Custom ESLint rules for enforcing RBAC (Role-Based Access Control) patterns in Seed Portal.

## Rules

### `rbac/require-permission-middleware`

Enforces that all Express route handlers use `requirePermission` middleware for granular access control.

**❌ Bad:**

```typescript
app.get("/api/admin/users", requireAuth, async (req, res) => {
  // Missing requirePermission middleware
});
```

**✅ Good:**

```typescript
app.get(
  "/api/admin/users",
  requireAuth,
  requirePermission("users.view", "system"),
  async (req, res) => {
    // ...
  }
);
```

**Options:**

- `exemptRoutes`: Array of route paths to exempt (e.g., `["/api/user", "/api/csrf-token"]`)

---

### `rbac/no-inline-auth-checks`

Prevents inline authentication/authorization checks in route handlers. Auth should be handled by middleware.

**❌ Bad:**

```typescript
app.get("/api/admin/users", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  // ...
});
```

**✅ Good:**

```typescript
app.get(
  "/api/admin/users",
  requireAuth,
  requirePermission("users.view", "system"),
  async (req, res) => {
    // Auth is handled by middleware
  }
);
```

---

### `rbac/require-route-documentation`

Requires JSDoc-style documentation comments above route definitions.

**❌ Bad:**

```typescript
app.get("/api/admin/users", requireAuth, requirePermission("users.view", "system"), handler);
```

**✅ Good:**

```typescript
/**
 * GET /api/admin/users
 * Action: users.view
 * Get all users from the database
 */
app.get("/api/admin/users", requireAuth, requirePermission("users.view", "system"), handler);
```

**Required fields in documentation:**

- HTTP method and path
- `Action:` field specifying required permission
- Description of endpoint purpose

**Options:**

- `exemptRoutes`: Array of route paths to exempt from documentation

---

### `rbac/no-direct-role-checks`

Prevents direct `user.role` checks in frontend code. Use `usePermissions()` hook or `PermissionGuard` component.

**❌ Bad:**

```typescript
// Direct role check
if (user.role === "admin") {
  return <AdminPanel />;
}

// Conditional rendering
{user?.role === "admin" && <Button />}

// Variable assignment
const isAdmin = user.role === "admin";
```

**✅ Good:**

```typescript
// Use usePermissions hook
const { hasPermission } = usePermissions();
if (hasPermission("admin.view:system")) {
  return <AdminPanel />;
}

// Use PermissionGuard component
<PermissionGuard permissions="admin.view:system">
  <AdminPanel />
</PermissionGuard>

// For conditional rendering
const { hasPermission } = usePermissions();
{hasPermission("users.delete:system") && <Button />}
```

**Options:**

- `allowedFiles`: Array of file patterns allowed to use direct role checks (e.g., `["shared/permissions.ts"]`)

---

## Configuration

### Recommended (Warnings)

Add to your `.eslintrc.cjs`:

```javascript
module.exports = {
  plugins: ["rbac"],
  extends: ["plugin:rbac/recommended"],
};
```

This enables all rules at warning level.

### Strict (Errors)

For stricter enforcement:

```javascript
module.exports = {
  plugins: ["rbac"],
  extends: ["plugin:rbac/strict"],
};
```

This enables all rules at error level.

### Custom Configuration

Configure individual rules:

```javascript
module.exports = {
  plugins: ["rbac"],
  rules: {
    "rbac/require-permission-middleware": [
      "warn",
      {
        exemptRoutes: ["/api/user", "/api/csrf-token", "/api/health"],
      },
    ],
    "rbac/no-inline-auth-checks": "error",
    "rbac/require-route-documentation": [
      "warn",
      {
        exemptRoutes: ["/api/csrf-token"],
      },
    ],
    "rbac/no-direct-role-checks": [
      "warn",
      {
        allowedFiles: ["shared/permissions.ts", "lib/can.ts"],
      },
    ],
  },
};
```

---

## Usage

### Backend (Server Routes)

In `server/.eslintrc.cjs`:

```javascript
module.exports = {
  plugins: ["rbac"],
  rules: {
    "rbac/require-permission-middleware": "warn",
    "rbac/no-inline-auth-checks": "warn",
    "rbac/require-route-documentation": "warn",
  },
};
```

### Frontend (Client)

In `client/.eslintrc.cjs`:

```javascript
module.exports = {
  plugins: ["rbac"],
  rules: {
    "rbac/no-direct-role-checks": "warn",
  },
};
```

---

## Finding Files That Need Migration

Run ESLint with these rules enabled to automatically identify all files that need RBAC migration:

```bash
# Check all files
npm run lint

# Check specific directory
npx eslint server/ --ext .ts

# Output to file for review
npx eslint server/ --ext .ts > migration-report.txt
```

The rules will flag:

- Routes missing `requirePermission` middleware
- Inline auth/role checks in route handlers
- Routes missing documentation
- Direct `user.role` checks in frontend code

---

## Auto-Fix Support

These rules are informational and do not support auto-fixing, as RBAC migration requires careful consideration of:

- Appropriate permission names
- Resource scopes (system, department, own)
- Business logic requirements

Manual migration ensures correct permission mappings.

---

## Development

### Adding New Rules

1. Create rule file in `eslint-plugin-rbac/rules/`
2. Export rule in `eslint-plugin-rbac/index.js`
3. Add to recommended/strict configs
4. Document in this README

### Testing Rules

Test rules manually:

```bash
# Create test file with violations
echo 'app.get("/api/test", requireAuth, handler)' > test.ts

# Run ESLint with the plugin
npx eslint test.ts
```

---

## Resources

- [ESLint Custom Rules Documentation](https://eslint.org/docs/latest/extend/custom-rules)
- [RBAC Migration Guide](../docs/FRONTEND_RBAC_MIGRATION_GUIDE.md)
- [RBAC Refactor Plan](../docs/RBAC_REFACTOR_PLAN.md)

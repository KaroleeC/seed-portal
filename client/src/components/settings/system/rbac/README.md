# RBAC Management System

Enterprise-grade Role-Based Access Control management interface.

## Overview

The RBAC Management system provides a comprehensive UI for managing users, roles, permissions, and access control policies. Built with enterprise principles: function over form, dense layouts, and efficient workflows.

## Architecture

```
rbac/
├── UsersTab.tsx              # User directory with role assignments
├── RolesTab.tsx              # Role catalog with permission mappings
├── PermissionsTab.tsx        # Permission catalog
├── AssignRoleDialog.tsx      # Role assignment modal
└── __tests__/                # Component tests
```

## Features

### 🔐 Users Tab

- **User Directory**: Searchable list of all portal users
- **Role Assignments**: View and manage user roles
- **Department Tags**: Department affiliations
- **Quick Actions**: Assign/remove roles via dropdown menu
- **Bulk Operations**: Ready for future bulk role assignment

### 🛡️ Roles Tab

- **Role Catalog**: All system and custom roles
- **Permission Mapping**: View permissions assigned to each role
- **System Roles**: Protected system roles with badges
- **Role Management**: Create, edit, and delete custom roles (coming soon)

### 🔑 Permissions Tab

- **Permission Catalog**: Complete list of available permissions
- **Category Grouping**: Permissions organized by category
- **Summary Cards**: Quick stats on total permissions, categories, and active status
- **Search & Filter**: Find permissions quickly

## Components

### DataTable (Reusable)

Enterprise data table component used throughout RBAC management.

**Features:**

- Sorting (click column headers)
- Filtering (search by any column)
- Pagination (configurable page sizes)
- Column visibility controls
- Compact, dense design

**Usage:**

```tsx
const columns: ColumnDef<User>[] = [
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
  },
];

<DataTable
  columns={columns}
  data={users}
  searchKey="email"
  searchPlaceholder="Search users..."
  pageSize={10}
/>;
```

### AssignRoleDialog

Modal dialog for assigning roles to users.

**Features:**

- Displays current user roles
- Shows available roles (excluding already assigned)
- System role badges
- Assignment warning
- Optimistic updates

**Usage:**

```tsx
<AssignRoleDialog open={isOpen} onOpenChange={setIsOpen} user={selectedUser} />
```

## API Integration

All API calls go through centralized functions in `@/lib/rbac-api.ts`:

### User Management

```typescript
import { assignRoleToUser, removeRoleFromUser } from "@/lib/rbac-api";

// Assign role
await assignRoleToUser(userId, roleId);

// Remove role
await removeRoleFromUser(userId, roleId);
```

### Role Management

```typescript
import { getRoles, getRolePermissions } from "@/lib/rbac-api";

// Get all roles
const { roles } = await getRoles();

// Get role permissions
const { permissions } = await getRolePermissions(roleId);
```

### Permission Management

```typescript
import { getPermissions } from "@/lib/rbac-api";

// Get all permissions
const { permissions } = await getPermissions();
```

## Design Principles

### Function Over Form

- Dense, information-rich layouts
- Quick actions accessible via dropdown menus
- Keyboard navigation support
- Minimal clicks to complete tasks

### Enterprise Patterns

- Consistent table designs across tabs
- Standardized action menus
- Clear status indicators (badges)
- Responsive layouts

### Performance

- Query caching via React Query
- Optimistic updates for mutations
- Lazy loading of tab content
- Efficient re-renders

## Testing

### Unit Tests

```bash
npm run test:run -- rbac
```

Tests cover:

- Component rendering
- User interactions
- API integration
- Error handling
- Empty states

### Storybook

```bash
npm run storybook
```

Interactive stories for:

- DataTable component (all variants)
- Empty states
- Loading states
- Error states

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and roles
- **Focus Management**: Logical focus order
- **Color Contrast**: WCAG AA compliant

## Future Enhancements

### Phase 1 (Current)

- ✅ User directory with role assignments
- ✅ Role catalog with permission viewing
- ✅ Permission catalog
- ✅ Basic role assignment/removal

### Phase 2 (Planned)

- [ ] Create/edit custom roles
- [ ] Bulk role assignments
- [ ] Role templates
- [ ] Audit log viewer
- [ ] Permission search and filtering

### Phase 3 (Future)

- [ ] Conditional permissions
- [ ] Time-based role assignments
- [ ] Department-based access control
- [ ] Advanced permission builder
- [ ] Role inheritance

## Integration

### Adding to System Settings

The RBAC Management panel is integrated into SystemTabs:

```tsx
import RBACManagementPanel from "@/components/settings/system/RBACManagementPanel";

<TabsTrigger value="rbac">
  <Lock className="w-4 h-4" /> RBAC
</TabsTrigger>

<TabsContent value="rbac">
  <RBACManagementPanel />
</TabsContent>
```

### Required Permissions

Users must have `admin` permissions to access RBAC management.

## Troubleshooting

### Roles not loading

Check that the API endpoint `/api/admin/rbac/roles` is accessible and returns data.

### Assignment failing

Verify the user has admin permissions and the role exists.

### Table not sorting

Ensure `DataTableColumnHeader` is used for sortable columns.

## Related Documentation

- [RBAC Backend API](../../../../server/routes/admin-rbac.ts)
- [RBAC Migration Status](../../../../docs/RBAC_MIGRATION_STATUS.md)
- [Permission System](../../../../shared/schema.ts)

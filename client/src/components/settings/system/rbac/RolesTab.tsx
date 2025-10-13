import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Shield, Key } from "lucide-react";

interface RoleWithPermissions {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Array<{
    id: number;
    key: string;
    description: string | null;
  }>;
}

export function RolesTab() {
  const { data } = useQuery({
    queryKey: ["/api/admin/rbac/roles"],
    queryFn: async () => {
      return apiFetch<{ roles: RoleWithPermissions[] }>("GET", "/api/admin/rbac/roles");
    },
  });

  const columns: ColumnDef<RoleWithPermissions>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => {
        const role = row.original;
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium">{role.name}</span>
              {role.isSystem && (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="mr-1 h-2.5 w-2.5" />
                  System
                </Badge>
              )}
            </div>
            {role.description && (
              <span className="text-muted-foreground text-xs">{role.description}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "permissions",
      header: "Permissions",
      cell: ({ row }) => {
        const permissions = row.original.permissions;
        const displayCount = 3;
        const remaining = permissions.length - displayCount;

        return (
          <div className="flex flex-wrap gap-1 items-center">
            {permissions.length === 0 ? (
              <span className="text-muted-foreground text-xs">No permissions</span>
            ) : (
              <>
                {permissions.slice(0, displayCount).map((perm, index) => (
                  <Badge
                    key={`${row.original.id}-perm-${perm.id}-${index}`}
                    variant="outline"
                    className="text-xs"
                  >
                    <Key className="mr-1 h-2.5 w-2.5" />
                    {perm.key}
                  </Badge>
                ))}
                {remaining > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    +{remaining} more
                  </Badge>
                )}
              </>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const role = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem disabled>
                <Key className="mr-2 h-3 w-3" />
                Manage Permissions
              </DropdownMenuItem>
              {!role.isSystem && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="text-destructive">
                    Delete Role
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const roles = data?.roles || [];

  return (
    <Card className="bg-white/95">
      <CardHeader className="border-b py-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Role Catalog</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {roles.length} roles with permission mappings
            </CardDescription>
          </div>
          <Button size="sm" className="h-7 px-3 text-xs" disabled>
            <Plus className="mr-1.5 h-3 w-3" />
            Create Role
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <DataTable
          columns={columns}
          data={roles}
          searchKey="name"
          searchPlaceholder="Search roles..."
          pageSize={10}
          emptyMessage="No roles found."
        />
      </CardContent>
    </Card>
  );
}

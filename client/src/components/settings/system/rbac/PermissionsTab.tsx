import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Key, Tag } from "lucide-react";

interface Permission {
  id: number;
  key: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
}

export function PermissionsTab() {
  const { data } = useQuery({
    queryKey: ["/api/admin/rbac/permissions"],
    queryFn: async () => {
      return apiFetch<{ permissions: Permission[] }>("GET", "/api/admin/rbac/permissions");
    },
  });

  const columns: ColumnDef<Permission>[] = [
    {
      accessorKey: "key",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Permission Key" />,
      cell: ({ row }) => {
        const permission = row.original;
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Key className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono text-xs font-medium">{permission.key}</span>
            </div>
            {permission.description && (
              <span className="text-muted-foreground text-xs mt-0.5">{permission.description}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.original.category;
        return category ? (
          <Badge variant="outline" className="text-xs">
            <Tag className="mr-1 h-2.5 w-2.5" />
            {category}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">Uncategorized</span>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.isActive;
        return isActive ? (
          <Badge variant="secondary" className="text-xs">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Inactive
          </Badge>
        );
      },
    },
  ];

  const permissions = data?.permissions || [];

  // Group permissions by category for summary
  const categoryCounts = permissions.reduce<Record<string, number>>((acc, perm) => {
    const cat = perm.category || "uncategorized";
    return { ...acc, [cat]: (acc[cat] || 0) + 1 };
  }, {});

  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-white/95">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Permissions</p>
                <p className="text-2xl font-bold">{permissions.length}</p>
              </div>
              <Key className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/95">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{Object.keys(categoryCounts).length}</p>
              </div>
              <Tag className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/95">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{permissions.filter((p) => p.isActive).length}</p>
              </div>
              <Key className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions Table */}
      <Card className="bg-white/95">
        <CardHeader className="border-b py-3">
          <div>
            <CardTitle className="text-sm">Permission Catalog</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              System-wide permissions available for role assignment
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <DataTable
            columns={columns}
            data={permissions}
            searchKey="key"
            searchPlaceholder="Search permissions..."
            pageSize={15}
            emptyMessage="No permissions found."
          />
        </CardContent>
      </Card>
    </div>
  );
}

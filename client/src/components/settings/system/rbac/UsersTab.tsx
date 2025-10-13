import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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
import { MoreHorizontal, UserPlus, Shield, Mail, Calendar } from "lucide-react";
import { removeRoleFromUser } from "@/lib/rbac-api";
import { AssignRoleDialog } from "./AssignRoleDialog";
import { format } from "date-fns";

interface UserWithRoles {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  roles: Array<{
    id: number;
    name: string;
    description: string | null;
  }>;
  departments: Array<{
    id: number;
    name: string;
  }>;
}

export function UsersTab() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/rbac/users"],
    queryFn: async () => {
      return apiFetch<{ users: UserWithRoles[] }>("GET", "/api/admin/rbac/users");
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      removeRoleFromUser(userId, roleId),
    onSuccess: () => {
      toast({ title: "Success", description: "Role removed from user" });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/users"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
    },
  });

  const columns: ColumnDef<UserWithRoles>[] = [
    {
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => {
        const user = row.original;
        const displayName =
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.email.split("@")[0];

        return (
          <div className="flex flex-col">
            <span className="font-medium">{displayName}</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {user.email}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => {
        const roles = row.original.roles;
        return (
          <div className="flex flex-wrap gap-1">
            {roles.length === 0 ? (
              <span className="text-muted-foreground text-xs">No roles</span>
            ) : (
              roles.map((role, index) => (
                <Badge
                  key={`${row.original.id}-role-${role.id}-${index}`}
                  variant="secondary"
                  className="text-xs"
                >
                  {role.name}
                </Badge>
              ))
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "departments",
      header: "Departments",
      cell: ({ row }) => {
        const departments = row.original.departments || [];
        return (
          <div className="flex flex-wrap gap-1">
            {departments.length === 0 ? (
              <span className="text-muted-foreground text-xs">None</span>
            ) : (
              departments.map((dept, index) => (
                <Badge
                  key={`${row.original.id}-dept-${dept.id}-${index}`}
                  variant="outline"
                  className="text-xs"
                >
                  {dept.name}
                </Badge>
              ))
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => {
        if (!row.original.createdAt) {
          return <span className="text-muted-foreground text-xs">Unknown</span>;
        }
        const date = new Date(row.original.createdAt);
        if (isNaN(date.getTime())) {
          return <span className="text-muted-foreground text-xs">Invalid date</span>;
        }
        return (
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(date, "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;

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
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(user);
                  setIsAssignDialogOpen(true);
                }}
              >
                <Shield className="mr-2 h-3 w-3" />
                Assign Role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.roles.map((role) => (
                <DropdownMenuItem
                  key={role.id}
                  onClick={() => removeRoleMutation.mutate({ userId: user.id, roleId: role.id })}
                  className="text-destructive"
                >
                  Remove {role.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const users = data?.users || [];

  return (
    <>
      <Card className="bg-white/95">
        <CardHeader className="border-b py-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">User Directory</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {users.length} users with role assignments
              </CardDescription>
            </div>
            <Button size="sm" className="h-7 px-3 text-xs" disabled>
              <UserPlus className="mr-1.5 h-3 w-3" />
              Invite User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <DataTable
            columns={columns}
            data={users}
            searchKey="email"
            searchPlaceholder="Search by email..."
            pageSize={10}
            emptyMessage={isLoading ? "Loading users..." : "No users found."}
          />
        </CardContent>
      </Card>

      {selectedUser && (
        <AssignRoleDialog
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          user={selectedUser}
        />
      )}
    </>
  );
}

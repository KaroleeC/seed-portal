import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, RotateCcw, UserCheck } from "lucide-react";

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  defaultDashboard?: string;
  createdAt: string;
}

export default function UserManagementInlinePanel() {
  const { toast } = useToast();
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => await apiRequest<{ users: User[] }>("GET", "/api/admin/users"),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User role updated successfully" });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  const updateDashboardMutation = useMutation({
    mutationFn: async ({
      userId,
      defaultDashboard,
    }: {
      userId: number;
      defaultDashboard: string;
    }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/dashboard`, {
        defaultDashboard,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Default dashboard updated successfully" });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/reset-password`, {});
    },
    onSuccess: () =>
      toast({ title: "Password reset", description: "A new password was generated" }),
  });

  const impersonateMutation = useMutation({
    mutationFn: async (userId: number) =>
      await apiRequest("POST", `/api/admin/impersonate/${userId}`, {}),
    onSuccess: () => toast({ title: "Impersonation started" }),
  });

  const users: User[] = usersData?.users || [];

  return (
    <Card className="bg-white/95 text-xs">
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" /> Portal Users ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && <div className="text-center py-8">Loading users…</div>}
        {!isLoading && users.length === 0 && <div className="text-center py-8">No users found</div>}
        {!isLoading && users.length > 0 && (
          <div className="divide-y">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email.split("@")[0]}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
                <div className="flex items-end gap-2">
                  {/* Role Selector - reading user.role for management UI */}
                  <div className="flex flex-col min-w-[9rem]">
                    <span className="text-[11px] text-muted-foreground mb-1">Permission Level</span>
                    <Select
                      value={user.role} // eslint-disable-line rbac/no-direct-role-checks
                      onValueChange={(newRole) =>
                        updateRoleMutation.mutate({ userId: user.id, role: newRole })
                      }
                      disabled={updateRoleMutation.isPending}
                    >
                      <SelectTrigger aria-label="Permission Level" className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dashboard Selector */}
                  <div className="flex flex-col min-w-[9rem]">
                    <span className="text-[11px] text-muted-foreground mb-1">
                      Default Dashboard
                    </span>
                    <Select
                      value={user.defaultDashboard || "sales"}
                      onValueChange={(newDashboard) =>
                        updateDashboardMutation.mutate({
                          userId: user.id,
                          defaultDashboard: newDashboard,
                        })
                      }
                      disabled={updateDashboardMutation.isPending}
                    >
                      <SelectTrigger aria-label="Default Dashboard" className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Impersonate */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => impersonateMutation.mutate(user.id)}
                    className="h-8 px-3"
                  >
                    <UserCheck className="h-4 w-4 mr-1" /> Sign In As
                  </Button>

                  {/* Reset Password */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetPasswordMutation.mutate(user.id)}
                    disabled={resetPasswordMutation.isPending}
                    className="h-8 px-3"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" /> Reset Password
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

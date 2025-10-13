import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Shield,
  TestTube,
  Eye,
  Code,
  UserCheck,
  Minus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  FileText,
  Save,
  RefreshCw,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import UserManagement from "@/pages/user-management";

// Interfaces used across components
interface Department {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

interface ManagerEdge {
  manager_user_id: number;
  member_user_id: number;
  manager_email?: string;
  member_email?: string;
}

interface AuditItem {
  id: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  created_at: string;
  actor_email?: string;
  diff_json?: Record<string, unknown>;
}

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  defaultDashboard?: string;
  roles?: Array<{ id: number; name: string; description: string }>;
  createdAt: string;
  updatedAt: string;
}

// --- Minimal lists for Phase 2 ---
function DepartmentsList() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/rbac/departments"],
    queryFn: async () =>
      apiRequest<{ departments: Department[] }>("GET", "/api/admin/rbac/departments"),
  });

  const toggleMutation = useMutation({
    mutationFn: async (dept: Department) =>
      apiRequest("PUT", `/api/admin/rbac/departments/${dept.id}`, {
        isActive: !dept.isActive,
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/departments"] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (dept: Department) =>
      apiRequest("DELETE", `/api/admin/rbac/departments/${dept.id}`, {}),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/departments"] }),
  });

  if (isLoading) return <div>Loading departments…</div>;
  const items = data?.departments || [];
  if (!items.length) return <div>No departments yet.</div>;

  return (
    <div className="space-y-2">
      {items.map((d) => (
        <div key={d.id} className="flex items-center justify-between border rounded p-3">
          <div>
            <div className="font-medium">{d.name}</div>
            <div className="text-xs text-gray-500">{d.description || "—"}</div>
            <div className="text-xs mt-1">Status: {d.isActive ? "Active" : "Inactive"}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate(d)}>
              {d.isActive ? "Deactivate" : "Activate"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => deactivateMutation.mutate(d)}>
              Soft Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ManagerEdgesList() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/rbac/manager-edges"],
    queryFn: async () =>
      apiRequest<{ edges: ManagerEdge[] }>("GET", "/api/admin/rbac/manager-edges"),
  });

  const removeMutation = useMutation({
    mutationFn: async (edge: ManagerEdge) =>
      apiRequest("DELETE", "/api/admin/rbac/manager-edges", {
        managerUserId: edge.manager_user_id,
        memberUserId: edge.member_user_id,
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/manager-edges"] }),
  });

  if (isLoading) return <div>Loading edges…</div>;
  const edges = data?.edges || [];
  if (!edges.length) return <div>No manager relationships defined.</div>;

  return (
    <div className="space-y-2">
      {edges.map((e) => (
        <div
          key={`${e.manager_user_id}-${e.member_user_id}`}
          className="flex items-center justify-between border rounded p-3"
        >
          <div className="text-sm">
            <span className="font-medium">{e.manager_email || e.manager_user_id}</span>
            <span className="mx-2">→</span>
            <span>{e.member_email || e.member_user_id}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => removeMutation.mutate(e)}>
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}

function AuditList() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/rbac/audit"],
    queryFn: async () =>
      apiRequest<{ items: AuditItem[] }>("GET", "/api/admin/rbac/audit?limit=100"),
  });

  if (isLoading) return <div>Loading audit…</div>;
  const items = data?.items || [];
  if (!items.length) return <div>No audit events.</div>;

  return (
    <div className="space-y-2">
      {items.map((a) => (
        <div key={`${a.id}`} className="border rounded p-3 text-sm">
          <div className="flex justify-between">
            <div>
              <span className="font-medium">{a.action}</span>
              <span className="ml-2 text-gray-600">
                {a.entity_type} {a.entity_id || ""}
              </span>
            </div>
            <div className="text-gray-500">{new Date(a.created_at).toLocaleString()}</div>
          </div>
          <div className="text-xs text-gray-600 mt-1">by {a.actor_email || "system"}</div>
          {a.diff_json && (
            <pre className="mt-2 bg-gray-50 rounded p-2 text-xs overflow-x-auto">
              {JSON.stringify(a.diff_json, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

interface Role {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  permissions?: Array<{ id: number; key: string; description: string }>;
}

// interface Permission {
//   id: number;
//   key: string;
//   description: string;
//   category: string;
//   isActive: boolean;
// }

interface PolicyDecision {
  action: string;
  resource: string;
  allowed: boolean;
  reason: string;
  timestamp: string;
  principal: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export default function RBACManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [testScenario, setTestScenario] = useState({
    userEmail: "",
    action: "",
    resourceType: "",
    resourceId: "",
  });
  const [policyContent, setPolicyContent] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState("commission");

  // Fetch all users with RBAC roles
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/rbac/users"],
    queryFn: async () => {
      return await apiRequest<{ users: User[] }>("GET", "/api/admin/rbac/users");
    },
  });

  // Fetch all roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/admin/rbac/roles"],
    queryFn: async () => {
      return await apiRequest<{ roles: Role[] }>("GET", "/api/admin/rbac/roles");
    },
  });

  // Fetch all permissions - not currently used in UI
  // const { data: permissionsData } = useQuery({
  //   queryKey: ["/api/admin/rbac/permissions"],
  //   queryFn: async () => {
  //     return await apiRequest<{ permissions: Permission[] }>("GET", "/api/admin/rbac/permissions");
  //   },
  // });

  // Fetch policy content
  const { data: policyData, refetch: refetchPolicy } = useQuery({
    queryKey: ["/api/admin/cerbos/policy", selectedPolicy],
    queryFn: async () => {
      return await apiRequest<{ content: string }>(
        "GET",
        `/api/admin/cerbos/policy/${selectedPolicy}`
      );
    },
    enabled: !!selectedPolicy,
  });

  // Assign role to user mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: number }) => {
      return await apiRequest<{ success: boolean }>("POST", "/api/admin/rbac/assign-role", {
        userId,
        roleId,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Role assigned successfully" });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    },
  });

  // Remove role from user mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: number }) => {
      return await apiRequest<{ success: boolean }>(
        "DELETE",
        `/api/admin/rbac/user/${userId}/role/${roleId}`
      );
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Role removed successfully" });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove role",
        variant: "destructive",
      });
    },
  });

  // Test authorization mutation
  const testAuthzMutation = useMutation({
    mutationFn: async (scenario: typeof testScenario) => {
      return await apiRequest<PolicyDecision>("POST", "/api/admin/rbac/test-authz", scenario);
    },
    onSuccess: (data) => {
      toast({
        title: data.allowed ? "Access Granted" : "Access Denied",
        description: data.reason,
        variant: data.allowed ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test authorization",
        variant: "destructive",
      });
    },
  });

  // Update policy mutation
  const updatePolicyMutation = useMutation({
    mutationFn: async ({ policyName, content }: { policyName: string; content: string }) => {
      return await apiRequest<{ success: boolean }>(
        "PUT",
        `/api/admin/cerbos/policy/${policyName}`,
        { content }
      );
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Policy updated successfully" });
      void refetchPolicy();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update policy",
        variant: "destructive",
      });
    },
  });

  // Update user default dashboard mutation
  const updateDashboardMutation = useMutation({
    mutationFn: async ({
      userId,
      defaultDashboard,
    }: {
      userId: number;
      defaultDashboard: string;
    }) => {
      return await apiRequest<{ success: boolean }>(
        "PATCH",
        `/api/admin/users/${userId}/dashboard`,
        {
          defaultDashboard,
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Default dashboard updated successfully",
      });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update default dashboard",
        variant: "destructive",
      });
    },
  });

  // Impersonate user mutation
  const impersonateMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest<{
        user: { firstName?: string; lastName?: string; defaultDashboard?: string };
      }>("POST", `/api/admin/impersonate/${userId}`, {});
    },
    onSuccess: (data) => {
      toast({
        title: "Impersonation Started",
        description: `Now signed in as ${data.user.firstName} ${data.user.lastName}`,
      });
      void queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      // Navigate to their default dashboard
      const dashboard = data.user.defaultDashboard || "sales";
      switch (dashboard) {
        case "admin":
          window.location.href = "/admin";
          break;
        case "sales":
          window.location.href = "/sales-dashboard";
          break;
        case "service":
          window.location.href = "/service-dashboard";
          break;
        default:
          window.location.href = "/";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Impersonation Failed",
        description: error.message || "Failed to impersonate user",
        variant: "destructive",
      });
    },
  });

  const users: User[] = usersData?.users || [];
  const roles: Role[] = rolesData?.roles || [];

  React.useEffect(() => {
    if (policyData?.content) {
      setPolicyContent(policyData.content);
    }
  }, [policyData]);

  const handleDashboardUpdate = (userId: number, newDashboard: string) => {
    updateDashboardMutation.mutate({ userId, defaultDashboard: newDashboard });
  };

  const handleImpersonate = (user: User) => {
    impersonateMutation.mutate(user.id);
  };

  const handleTestAuthorization = () => {
    if (!testScenario.userEmail || !testScenario.action) {
      toast({
        title: "Missing Information",
        description: "Please provide user email and action",
        variant: "destructive",
      });
      return;
    }
    testAuthzMutation.mutate(testScenario);
  };

  const handleUpdatePolicy = () => {
    if (!selectedPolicy || !policyContent) {
      toast({
        title: "Missing Information",
        description: "Please select a policy and provide content",
        variant: "destructive",
      });
      return;
    }
    updatePolicyMutation.mutate({ policyName: selectedPolicy, content: policyContent });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <BackButton className="text-white hover:border-[#e24c00] hover:text-white hover:bg-transparent border border-transparent" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">RBAC & Policy Management</h1>
          <p className="text-white/80">Manage roles, permissions, and authorization policies</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 bg-white/10 backdrop-blur-sm">
            <TabsTrigger value="users" className="data-[state=active]:bg-white/20">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="roles" className="data-[state=active]:bg-white/20">
              <Shield className="h-4 w-4 mr-2" />
              Role Management
            </TabsTrigger>
            <TabsTrigger value="testing" className="data-[state=active]:bg-white/20">
              <TestTube className="h-4 w-4 mr-2" />
              Permission Testing
            </TabsTrigger>
            <TabsTrigger value="decisions" className="data-[state=active]:bg-white/20">
              <Eye className="h-4 w-4 mr-2" />
              Decision Viewer
            </TabsTrigger>
            <TabsTrigger value="policies" className="data-[state=active]:bg-white/20">
              <Code className="h-4 w-4 mr-2" />
              Policy Editor
            </TabsTrigger>
            <TabsTrigger value="departments" className="data-[state=active]:bg-white/20">
              <Users className="h-4 w-4 mr-2" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="managers" className="data-[state=active]:bg-white/20">
              <UserCheck className="h-4 w-4 mr-2" />
              Managers
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-white/20">
              <FileText className="h-4 w-4 mr-2" />
              Audit
            </TabsTrigger>
          </TabsList>

          {/* Users Tab (embeds existing UserManagement page for unified hub) */}
          <TabsContent value="users" className="space-y-6">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg border">
              <UserManagement />
            </div>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Departments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create Department */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label htmlFor="dept-name">Name</Label>
                    <Input id="dept-name" placeholder="e.g. Sales" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="dept-desc">Description</Label>
                    <Input id="dept-desc" placeholder="Optional" />
                  </div>
                  <Button
                    onClick={async () => {
                      const name = (
                        document.getElementById("dept-name") as HTMLInputElement
                      )?.value?.trim();
                      const description = (
                        document.getElementById("dept-desc") as HTMLInputElement
                      )?.value?.trim();
                      if (!name) return alert("Department name is required");
                      await apiRequest("POST", "/api/admin/rbac/departments", {
                        name,
                        description,
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ["/api/admin/rbac/departments"],
                      });
                    }}
                  >
                    Add
                  </Button>
                </div>

                {/* List Departments */}
                <DepartmentsList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Managers Tab */}
          <TabsContent value="managers" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Manager Relationships</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label htmlFor="mgr-manager">Manager User ID</Label>
                    <Input id="mgr-manager" placeholder="e.g. 1" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="mgr-member">Member User ID</Label>
                    <Input id="mgr-member" placeholder="e.g. 7" />
                  </div>
                  <Button
                    onClick={async () => {
                      const m = parseInt(
                        (document.getElementById("mgr-manager") as HTMLInputElement)?.value || ""
                      );
                      const u = parseInt(
                        (document.getElementById("mgr-member") as HTMLInputElement)?.value || ""
                      );
                      if (!Number.isFinite(m) || !Number.isFinite(u))
                        return alert("Enter valid IDs");
                      await apiRequest("POST", "/api/admin/rbac/manager-edges", {
                        managerUserId: m,
                        memberUserId: u,
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ["/api/admin/rbac/manager-edges"],
                      });
                    }}
                  >
                    Add Edge
                  </Button>
                </div>

                <ManagerEdgesList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Access Audit</CardTitle>
              </CardHeader>
              <CardContent>
                <AuditList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Role Management Tab */}
          <TabsContent value="roles" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Users and Role Assignment */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Users & Role Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {usersLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Loading users...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div key={user.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {user.firstName && user.lastName
                                  ? `${user.firstName} ${user.lastName}`
                                  : user.email.split("@")[0]}
                              </div>
                              <div className="text-sm text-gray-600">{user.email}</div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleImpersonate(user)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Impersonate
                              </Button>
                            </div>
                          </div>

                          {/* Default Dashboard Selector */}
                          <div className="flex items-center gap-4">
                            <p className="text-sm font-medium">Default Dashboard:</p>
                            <Select
                              value={user.defaultDashboard || "sales"}
                              onValueChange={(newDashboard) =>
                                handleDashboardUpdate(user.id, newDashboard)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="sales">Sales</SelectItem>
                                <SelectItem value="service">Service</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Current Roles */}
                          <div>
                            <div className="text-sm font-medium mb-2">Current Roles:</div>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {user.roles?.map((role) => (
                                <Badge
                                  key={role.id}
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  {role.name}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 hover:bg-red-100"
                                    onClick={() =>
                                      removeRoleMutation.mutate({
                                        userId: user.id,
                                        roleId: role.id,
                                      })
                                    }
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                </Badge>
                              )) || (
                                <span className="text-sm text-gray-500">No roles assigned</span>
                              )}
                            </div>

                            {/* Add Role */}
                            <div className="flex gap-2">
                              <Select
                                onValueChange={(roleId) =>
                                  assignRoleMutation.mutate({
                                    userId: user.id,
                                    roleId: parseInt(roleId),
                                  })
                                }
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Assign role..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles
                                    .filter((role) => !user.roles?.some((ur) => ur.id === role.id))
                                    .map((role) => (
                                      <SelectItem key={role.id} value={role.id.toString()}>
                                        {role.name} - {role.description}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Roles and Permissions Overview */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Roles & Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {rolesLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Loading roles...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {roles.map((role) => (
                        <div key={role.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-medium">{role.name}</div>
                              <div className="text-sm text-gray-600">{role.description}</div>
                            </div>
                            <Badge variant={role.isActive ? "default" : "secondary"}>
                              {role.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Permissions: </span>
                            {role.permissions?.length || 0} assigned
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Permission Testing Tab */}
          <TabsContent value="testing" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Authorization Testing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="test-user-email">User Email</Label>
                    <Input
                      id="test-user-email"
                      placeholder="user@seedfinancial.io"
                      value={testScenario.userEmail}
                      onChange={(e) =>
                        setTestScenario({ ...testScenario, userEmail: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Action</p>
                    <Select
                      value={testScenario.action}
                      onValueChange={(value) => setTestScenario({ ...testScenario, action: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select action..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commissions.view">View Commissions</SelectItem>
                        <SelectItem value="commissions.sync">Sync Commissions</SelectItem>
                        <SelectItem value="commissions.approve">Approve Commissions</SelectItem>
                        <SelectItem value="quotes.view">View Quotes</SelectItem>
                        <SelectItem value="quotes.create">Create Quotes</SelectItem>
                        <SelectItem value="quotes.update">Update Quotes</SelectItem>
                        <SelectItem value="diagnostics.view">View Diagnostics</SelectItem>
                        <SelectItem value="admin.*">Admin Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Resource Type</p>
                    <Select
                      value={testScenario.resourceType}
                      onValueChange={(value) =>
                        setTestScenario({ ...testScenario, resourceType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select resource..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commission">Commission</SelectItem>
                        <SelectItem value="quote">Quote</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="test-resource-id">Resource ID (Optional)</Label>
                    <Input
                      id="test-resource-id"
                      placeholder="123"
                      value={testScenario.resourceId}
                      onChange={(e) =>
                        setTestScenario({ ...testScenario, resourceId: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={handleTestAuthorization}
                  disabled={testAuthzMutation.isPending}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {testAuthzMutation.isPending ? "Testing..." : "Test Authorization"}
                </Button>

                {/* Test Results */}
                {testAuthzMutation.data && (
                  <div className="mt-6 p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {testAuthzMutation.data.allowed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">
                        {testAuthzMutation.data.allowed ? "Access Granted" : "Access Denied"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <strong>Reason:</strong> {testAuthzMutation.data.reason}
                      </div>
                      <div>
                        <strong>Action:</strong> {testAuthzMutation.data.action}
                      </div>
                      <div>
                        <strong>Resource:</strong> {testAuthzMutation.data.resource}
                      </div>
                      <div>
                        <strong>Timestamp:</strong>{" "}
                        {new Date(testAuthzMutation.data.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Decision Viewer Tab */}
          <TabsContent value="decisions" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Policy Decision Viewer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-600">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Decision logging will appear here when authorization requests are made.</p>
                  <p className="text-sm mt-2">
                    Use the Permission Testing tab to generate test decisions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policy Editor Tab */}
          <TabsContent value="policies" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Cerbos Policy Editor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <p className="text-sm font-medium">Policy:</p>
                  <Select value={selectedPolicy} onValueChange={setSelectedPolicy}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commission">Commission Policy</SelectItem>
                      <SelectItem value="quote">Quote Policy</SelectItem>
                      <SelectItem value="diagnostics">Diagnostics Policy</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleUpdatePolicy}
                    disabled={updatePolicyMutation.isPending}
                    className="ml-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updatePolicyMutation.isPending ? "Saving..." : "Save Policy"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policy-content">Policy Content (YAML)</Label>
                  <Textarea
                    id="policy-content"
                    value={policyContent}
                    onChange={(e) => setPolicyContent(e.target.value)}
                    className="font-mono text-sm min-h-[400px]"
                    placeholder="Policy content will load here..."
                  />
                </div>

                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  <strong>Note:</strong> Policy changes will be deployed to Railway automatically.
                  Test your changes thoroughly before saving.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

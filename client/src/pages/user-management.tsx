import React, { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users,
  UserPlus,
  Trash2,
  RotateCcw,
  Copy,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  UserCheck,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  defaultDashboard?: string;
  roleAssignedBy?: number;
  roleAssignedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50, "First name too long"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name too long"),
  email: z
    .string()
    .email("Invalid email")
    .refine(
      (email) => email.endsWith("@seedfinancial.io"),
      "Email must be a @seedfinancial.io address"
    ),
  role: z.enum(["admin", "employee"], { required_error: "Role is required" }),
  defaultDashboard: z.enum(["admin", "sales", "service"], {
    required_error: "Default dashboard is required",
  }),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function UserManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "employee",
      defaultDashboard: "sales",
    },
  });

  // Fetch all users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      return await apiRequest<{ users: User[] }>("GET", "/api/admin/users");
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      return await apiRequest<{ user: User; generatedPassword: string }>(
        "POST",
        "/api/admin/users",
        userData
      );
    },
    onSuccess: (data) => {
      toast({
        title: "User Created Successfully",
        description: `${data.user.firstName} ${data.user.lastName} has been added to the portal.`,
      });
      setGeneratedPassword(data.generatedPassword);
      setIsCreateDialogOpen(false);
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating User",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return await apiRequest<{ success: boolean }>("PATCH", `/api/admin/users/${userId}/role`, {
        role,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
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
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update default dashboard",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest<{ deletedUser: User }>("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: (data) => {
      toast({
        title: "User Deleted",
        description: `${data.deletedUser.firstName} ${data.deletedUser.lastName} has been removed from the portal.`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Deleting User",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest<{ user: User; newPassword: string }>(
        "POST",
        `/api/admin/users/${userId}/reset-password`,
        {}
      );
    },
    onSuccess: (data) => {
      toast({
        title: "Password Reset",
        description: `New password generated for ${data.user.firstName} ${data.user.lastName}`,
      });
      setGeneratedPassword(data.newPassword);
    },
    onError: (error: Error) => {
      toast({
        title: "Error Resetting Password",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const handleRoleUpdate = (userId: number, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleDashboardUpdate = (userId: number, newDashboard: string) => {
    updateDashboardMutation.mutate({ userId, defaultDashboard: newDashboard });
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const impersonateMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest<{ user: User }>("POST", `/api/admin/impersonate/${userId}`, {});
    },
    onSuccess: (data) => {
      toast({
        title: "Impersonation Started",
        description: `Now signed in as ${data.user.firstName} ${data.user.lastName}`,
      });

      // Invalidate auth queries to refresh with impersonated user
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

  const handleImpersonate = (user: User) => {
    impersonateMutation.mutate(user.id);
  };

  const handleConfirmResetPassword = () => {
    if (selectedUserForReset) {
      resetPasswordMutation.mutate(selectedUserForReset.id);
      setIsResetPasswordDialogOpen(false);
      setSelectedUserForReset(null);
    }
  };

  const copyPasswordToClipboard = () => {
    void navigator.clipboard.writeText(generatedPassword);
    toast({ title: "Copied", description: "Password copied to clipboard" });
  };

  const users: User[] = usersData?.users || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <BackButton className="text-white hover:border-[#e24c00] hover:text-white hover:bg-transparent border border-transparent" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-white/80">Manage portal users and their access permissions</p>
        </div>

        <div className="flex justify-center mb-8">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#e24c00] hover:bg-[#c13e00] text-white shadow-sm"
                data-testid="button-add-user"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account for the portal. A secure password will be generated
                  automatically and displayed after creation.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => createUserMutation.mutate(data))}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter first name"
                            data-testid="input-first-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter last name"
                            data-testid="input-last-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="user@seedfinancial.io"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Permission Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Select permission level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="employee">
                              Employee - Regular portal access
                            </SelectItem>
                            <SelectItem value="admin">
                              Admin - Full administrative access
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultDashboard"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Dashboard</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default-dashboard">
                              <SelectValue placeholder="Select default dashboard" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">
                              Admin Dashboard - User management & system settings
                            </SelectItem>
                            <SelectItem value="sales">
                              Sales Dashboard - Quotes, clients & commissions
                            </SelectItem>
                            <SelectItem value="service">
                              Service Dashboard - Client support & operations
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="submit"
                      className="bg-[#e24c00] hover:bg-[#c13e00] text-white"
                      disabled={createUserMutation.isPending}
                      data-testid="button-create-user"
                    >
                      {createUserMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Generated Password Display */}
        {generatedPassword && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-green-800 dark:text-green-400 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Password Generated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-700 dark:text-green-300 mb-3">
                Save this password and share it with the user. It won't be shown again.
              </p>
              <div className="flex items-center gap-2">
                <div className="bg-white dark:bg-gray-800 border rounded px-3 py-2 flex-1 font-mono text-sm">
                  {showPassword ? generatedPassword : "••••••••••••"}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPasswordToClipboard}
                  data-testid="button-copy-password"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <Card className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Users className="h-5 w-5" />
              Portal Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-3 text-gray-600 dark:text-gray-400 text-sm">Loading users...</p>
              </div>
            )}
            {!isLoading && users.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">No users found</p>
              </div>
            )}
            {!isLoading && users.length > 0 && (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.email.split("@")[0]}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          Created {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end space-x-3">
                      {/* Role Selector */}
                      <div className="flex flex-col">
                        <label
                          htmlFor={`role-select-${user.id}`}
                          className="text-xs text-gray-500 dark:text-gray-400 mb-1"
                        >
                          Permission Level
                        </label>
                        {/* eslint-disable rbac/no-direct-role-checks -- Displaying role in form field, not for authorization */}
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => handleRoleUpdate(user.id, newRole)}
                          disabled={updateRoleMutation.isPending}
                        >
                          {/* eslint-enable rbac/no-direct-role-checks */}
                          <SelectTrigger
                            id={`role-select-${user.id}`}
                            className="w-32 h-9 text-xs"
                            data-testid={`select-role-${user.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dashboard Selector */}
                      <div className="flex flex-col">
                        <label
                          htmlFor={`dashboard-select-${user.id}`}
                          className="text-xs text-gray-500 dark:text-gray-400 mb-1"
                        >
                          Default Dashboard
                        </label>
                        <Select
                          value={user.defaultDashboard || "sales"}
                          onValueChange={(newDashboard) =>
                            handleDashboardUpdate(user.id, newDashboard)
                          }
                          disabled={updateDashboardMutation.isPending}
                        >
                          <SelectTrigger
                            id={`dashboard-select-${user.id}`}
                            className="w-32 h-9 text-xs"
                            data-testid={`select-dashboard-${user.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Impersonate Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImpersonate(user)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-9"
                        data-testid={`button-impersonate-${user.id}`}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Sign In As
                      </Button>

                      {/* Reset Password Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUserForReset(user);
                          setIsResetPasswordDialogOpen(true);
                        }}
                        disabled={resetPasswordMutation.isPending}
                        className="h-9"
                        data-testid={`button-reset-password-${user.id}`}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset Password
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9"
                        data-testid={`button-delete-${user.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Delete User
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-medium">
                  {selectedUser?.firstName && selectedUser?.lastName
                    ? `${selectedUser.firstName} ${selectedUser.lastName}`
                    : selectedUser?.email}
                </span>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
                disabled={deleteUserMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Confirmation Dialog */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center text-orange-600">
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset Password
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to reset the password for{" "}
                <span className="font-medium">
                  {selectedUserForReset?.firstName && selectedUserForReset?.lastName
                    ? `${selectedUserForReset.firstName} ${selectedUserForReset.lastName}`
                    : selectedUserForReset?.email}
                </span>
                ? A new password will be generated and you'll need to share it with the user.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsResetPasswordDialogOpen(false);
                  setSelectedUserForReset(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#e24c00] hover:bg-[#c13e00] text-white"
                onClick={handleConfirmResetPassword}
                disabled={resetPasswordMutation.isPending}
                data-testid="button-confirm-reset-password"
              >
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

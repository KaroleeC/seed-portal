import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Lock, Key } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UsersTab } from "./rbac/UsersTab";
import { RolesTab } from "./rbac/RolesTab";
import { PermissionsTab } from "./rbac/PermissionsTab";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * RBAC Management Panel
 *
 * Enterprise-grade Role-Based Access Control management interface.
 * Provides comprehensive user, role, and permission management.
 *
 * Features:
 * - User management with role assignments
 * - Role configuration with permission mapping
 * - Permission catalog and assignment
 * - Audit trails and activity logs
 * - Department-based access control
 *
 * Design principles:
 * - Function over form (enterprise-focused)
 * - Dense, information-rich layouts
 * - Quick actions and bulk operations
 * - Real-time validation and feedback
 */
export default function RBACManagementPanel() {
  const { isAdmin } = usePermissions();
  const [tab, setTab] = useState<string>("users");

  if (!isAdmin) {
    return (
      <Card className="bg-white/95">
        <CardContent className="py-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
          <p className="text-sm text-muted-foreground">
            You need administrator permissions to access RBAC management.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            RBAC Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage users, roles, permissions, and access control policies
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-3">
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="users" className="flex items-center gap-2 h-9 px-3 text-xs">
            <Users className="w-3.5 h-3.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2 h-9 px-3 text-xs">
            <Lock className="w-3.5 h-3.5" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2 h-9 px-3 text-xs">
            <Key className="w-3.5 h-3.5" />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3">
          <UsersTab />
        </TabsContent>

        <TabsContent value="roles" className="space-y-3">
          <RolesTab />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-3">
          <PermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

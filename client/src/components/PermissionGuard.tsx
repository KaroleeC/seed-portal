import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { type Permission } from "@shared/permissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

interface PermissionGuardProps {
  permissions: Permission | Permission[];
  requireAll?: boolean; // If true, requires ALL permissions. If false, requires ANY permission
  children: ReactNode;
  fallback?: ReactNode;
  showError?: boolean;
}

export function PermissionGuard({
  permissions,
  requireAll = false,
  children,
  fallback,
  showError = true,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissions();

  const permissionList = Array.isArray(permissions)
    ? permissions
    : [permissions];

  const hasAccess = Array.isArray(permissions)
    ? requireAll
      ? hasAllPermissions(permissionList)
      : hasAnyPermission(permissionList)
    : hasPermission(permissions);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showError) {
    return (
      <Alert variant="destructive" className="m-4">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this feature. Contact your
          administrator if you believe this is an error.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

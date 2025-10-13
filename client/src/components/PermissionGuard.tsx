import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { type Permission } from "@shared/permissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Loader2 } from "lucide-react";

interface PermissionGuardProps {
  /**
   * Permission(s) required to access the guarded content
   * Supports both:
   * - Legacy permissions (from shared/permissions.ts)
   * - RBAC permissions (string format: "action:resource")
   */
  permissions: Permission | string | (Permission | string)[];

  /**
   * If true, requires ALL permissions. If false, requires ANY permission
   * @default false
   */
  requireAll?: boolean;

  /**
   * Content to render if user has access
   */
  children: ReactNode;

  /**
   * Custom fallback content when access is denied
   * If not provided, shows default error message (if showError is true)
   */
  fallback?: ReactNode;

  /**
   * Whether to show error message when access is denied
   * @default true
   */
  showError?: boolean;

  /**
   * Custom error message to display when access is denied
   */
  errorMessage?: string;
}

export function PermissionGuard({
  permissions,
  requireAll = false,
  children,
  fallback,
  showError = true,
  errorMessage,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, rbac } = usePermissions();

  // Show loading state while RBAC permissions are being fetched
  if (rbac.isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Checking permissions...</span>
      </div>
    );
  }

  const permissionList = Array.isArray(permissions) ? permissions : [permissions];

  // Check access based on permission requirements
  let hasAccess: boolean;
  if (Array.isArray(permissions)) {
    hasAccess = requireAll ? hasAllPermissions(permissionList) : hasAnyPermission(permissionList);
  } else {
    hasAccess = hasPermission(permissions);
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showError) {
    const defaultMessage =
      errorMessage ||
      "You don't have permission to access this feature. Contact your administrator if you believe this is an error.";

    return (
      <Alert variant="destructive" className="m-4">
        <Lock className="h-4 w-4" />
        <AlertDescription>{defaultMessage}</AlertDescription>
      </Alert>
    );
  }

  return null;
}

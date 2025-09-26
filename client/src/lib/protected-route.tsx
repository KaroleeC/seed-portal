import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  console.log("[ProtectedRoute] Debug:", {
    path,
    hasUser: !!user,
    isLoading,
    userEmail: user?.email,
  });

  if (isLoading) {
    console.log("[ProtectedRoute] Loading...");
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // If no authenticated user, redirect to auth
  if (!user) {
    console.log("[ProtectedRoute] No user, redirecting to /auth");
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  console.log("[ProtectedRoute] User authenticated, rendering component");
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}

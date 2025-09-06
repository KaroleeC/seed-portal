import React, { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { ArrowLeft, Bell, User, Settings, LogOut, Shield, UserMinus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BackButton } from "@/components/BackButton";
import { useBackNavigation } from "@/hooks/use-navigation-history";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";

interface UniversalNavbarProps {
  showBackButton?: boolean;
  fallbackPath?: string;
}

export function UniversalNavbar({ 
  showBackButton = true,
  fallbackPath = "/"
}: UniversalNavbarProps) {
  const { user: dbUser, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const { canGoBack } = useBackNavigation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Memoize avatar content to prevent re-renders
  const avatarContent = useMemo(() => {
    if (dbUser?.profilePhoto) {
      return (
        <img 
          src={dbUser.profilePhoto} 
          alt="Profile" 
          className="w-7 h-7 rounded-full object-cover border border-white/20"
        />
      );
    }
    
    const initial = dbUser?.firstName?.charAt(0)?.toUpperCase() || dbUser?.email?.charAt(0)?.toUpperCase() || '?';
    return (
      <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
        {initial}
      </div>
    );
  }, [dbUser?.profilePhoto, dbUser?.firstName, dbUser?.email]);

  // Memoize user info to prevent re-renders
  const userInfo = useMemo(() => ({
    displayName: dbUser?.email?.split('@')[0] || '',
    email: dbUser?.email || '',
    isImpersonating: dbUser?.isImpersonating || false
  }), [dbUser?.email, dbUser?.isImpersonating]);

  const handleLogout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  // Memoize navigation handlers to prevent infinite re-renders
  // setLocation from wouter is stable, no need to include in deps
  const handleGoToProfile = useCallback(() => {
    setLocation('/profile');
  }, []);

  const handleGoToKbAdmin = useCallback(() => {
    setLocation('/kb-admin');
  }, []);

  const handleGoToAdmin = useCallback(() => {
    setLocation('/admin');
  }, []);

  // Stop impersonation mutation
  const stopImpersonationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/stop-impersonation', {});
    },
    onSuccess: async () => {
      toast({
        title: "Impersonation Stopped",
        description: "You have returned to your admin account.",
      });
      
      // Redirect to admin dashboard first, then refresh
      setLocation('/admin');
      
      // Delay the cache operations to prevent cascading re-renders
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop impersonation",
        variant: "destructive",
      });
    },
  });

  // Memoize impersonation handler (defined after mutation)
  const handleStopImpersonation = useCallback(() => {
    stopImpersonationMutation.mutate();
  }, [stopImpersonationMutation]);

  // Define main dashboard routes that should not show back button
  const mainDashboardRoutes = ['/', '/admin', '/sales-dashboard', '/service-dashboard'];
  const isMainDashboard = mainDashboardRoutes.includes(location);
  
  // Only show back button if there's history and not on a main dashboard
  const shouldShowBackButton = showBackButton && canGoBack && !isMainDashboard;

  return (
    <header className="bg-transparent z-50 py-4 relative">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-center h-20">
          <img src={logoPath} alt="Seed Financial" className="h-16" />
        </div>
        
        {/* Smart Back Button - Positioned Absolutely */}
        {shouldShowBackButton && (
          <div className="absolute top-4 left-6">
            <BackButton
              variant="ghost"
              size="sm"
              className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20"
              fallbackPath={fallbackPath}
            />
          </div>
        )}
        
        {/* User Menu - Positioned Absolutely */}
        <div className="absolute top-4 right-6 flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="relative p-2 hover:bg-white/10 text-white">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-orange-500 rounded-full"></span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 p-2 hover:bg-white/10 text-white">
                {avatarContent}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2 border-b">
                <p className="font-medium text-gray-900 text-sm">{userInfo.displayName}</p>
                <p className="text-xs text-gray-500">{userInfo.email}</p>
                {userInfo.isImpersonating && (
                  <div className="mt-1 flex items-center gap-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <p className="text-xs text-orange-600 font-medium">Admin View</p>
                  </div>
                )}
              </div>
              {userInfo.isImpersonating && (
                <DropdownMenuItem 
                  onClick={handleStopImpersonation} 
                  className="text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  disabled={stopImpersonationMutation.isPending}
                >
                  <UserMinus className="mr-2 h-3 w-3" />
                  {stopImpersonationMutation.isPending ? 'Stopping...' : 'Stop Impersonation'}
                </DropdownMenuItem>
              )}
              {userInfo.isImpersonating && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={handleGoToProfile} className="text-sm">
                <User className="mr-2 h-3 w-3" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGoToKbAdmin} className="text-sm">
                <Settings className="mr-2 h-3 w-3" />
                Knowledge Base Admin
              </DropdownMenuItem>
              {(userInfo.email === 'jon@seedfinancial.io' || userInfo.email === 'anthony@seedfinancial.io' || dbUser?.role === 'admin') && (
                <DropdownMenuItem onClick={handleGoToAdmin} className="text-sm">
                  <Shield className="mr-2 h-3 w-3" />
                  SEEDOS Dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 text-sm">
                <LogOut className="mr-2 h-3 w-3" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
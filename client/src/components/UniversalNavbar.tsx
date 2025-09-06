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
          className="w-8 h-8 rounded-full object-cover border-2 border-white/20 shadow-md"
        />
      );
    }
    
    const initial = dbUser?.firstName?.charAt(0)?.toUpperCase() || dbUser?.email?.charAt(0)?.toUpperCase() || '?';
    return (
      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md border-2 border-white/20">
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
    <header className="bg-transparent z-50 relative">
      <div className="max-w-6xl mx-auto px-8">
        <div className="flex items-center justify-center py-6">
          <img src={logoPath} alt="Seed Financial" className="seed-logo h-12 transition-all duration-300 hover:scale-105" />
        </div>
        
        {/* Smart Back Button - Positioned Absolutely */}
        {shouldShowBackButton && (
          <div className="absolute top-6 left-8">
            <BackButton
              variant="ghost"
              size="sm"
              className="seed-button-secondary text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-md border border-white/20 transition-all duration-200"
              fallbackPath={fallbackPath}
            />
          </div>
        )}
        
        {/* User Menu - Positioned Absolutely */}
        <div className="absolute top-6 right-8 flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="relative p-2 hover:bg-white/10 text-white/80 hover:text-white transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full shadow-lg pulse"></span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 p-2 hover:bg-white/10 text-white/80 hover:text-white transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20">
                {avatarContent}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 seed-card border-0 shadow-xl">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-semibold text-gray-900 text-sm">{userInfo.displayName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{userInfo.email}</p>
                {userInfo.isImpersonating && (
                  <div className="mt-2 flex items-center gap-2 px-2 py-1 bg-orange-50 border border-orange-200 rounded-md">
                    <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full animate-pulse"></div>
                    <p className="text-xs text-orange-700 font-medium">Admin View Active</p>
                  </div>
                )}
              </div>
              {userInfo.isImpersonating && (
                <DropdownMenuItem 
                  onClick={handleStopImpersonation} 
                  className="text-sm text-orange-700 hover:text-orange-800 hover:bg-orange-50 font-medium seed-nav-item"
                  disabled={stopImpersonationMutation.isPending}
                >
                  <UserMinus className="mr-3 h-4 w-4" />
                  {stopImpersonationMutation.isPending ? 'Stopping...' : 'Stop Impersonation'}
                </DropdownMenuItem>
              )}
              {userInfo.isImpersonating && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={handleGoToProfile} className="text-sm seed-nav-item hover:bg-gray-50">
                <User className="mr-3 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGoToKbAdmin} className="text-sm seed-nav-item hover:bg-gray-50">
                <Settings className="mr-3 h-4 w-4" />
                Knowledge Base Admin
              </DropdownMenuItem>
              {(userInfo.email === 'jon@seedfinancial.io' || userInfo.email === 'anthony@seedfinancial.io' || dbUser?.role === 'admin') && (
                <DropdownMenuItem onClick={handleGoToAdmin} className="text-sm seed-nav-item hover:bg-gray-50">
                  <Shield className="mr-3 h-4 w-4" />
                  SEEDOS Dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 text-sm hover:bg-red-50 hover:text-red-700 transition-colors duration-200">
                <LogOut className="mr-3 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
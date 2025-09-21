import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
};

type LoginData = {
  email?: string;
  password?: string;
  googleCredential?: string;
};

type RegisterData = {
  email: string;
  password?: string; // Optional since default password is used
};

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log('[useAuth] 🚀 Login mutation started with:', {
        keys: Object.keys(credentials),
        email: credentials.email,
        hasPassword: !!credentials.password,
        hasGoogleCredential: !!credentials.googleCredential,
        timestamp: new Date().toISOString()
      });
      
      const result = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify(credentials)
      });
      
      console.log('[useAuth] ✅ Login mutation successful:', {
        result,
        timestamp: new Date().toISOString()
      });
      return result;
    },
    onSuccess: async (user: SelectUser) => {
      console.log('[useAuth] 🎉 Login success callback triggered:', {
        user: user.email,
        timestamp: new Date().toISOString(),
        cookiesAfterLogin: document.cookie ? 'YES' : 'NO',
        cookieSnippet: document.cookie.substring(0, 100)
      });
      
      console.log('[useAuth] ⏳ Waiting for session propagation...');
      // Wait a moment for session to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('[useAuth] 🧹 Clearing user data cache...');
      // Only invalidate user-specific queries to prevent cascading re-renders
      // Use exact:true to prevent invalidating related queries that might cause performance issues
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/user"],
        exact: true  // Only invalidate this exact query, not child queries
      });
      
      console.log('[useAuth] ⏳ Allowing natural refetch cycle...');
      // Let React Query handle the refetch naturally instead of forcing it
      
      console.log('[useAuth] 🍞 Showing success toast...');
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
        duration: 2000, // 2 seconds instead of default 5 seconds
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message;
      let title = "Login failed";
      let description = errorMessage;
      
      // Provide specific error messages for common cases
      if (errorMessage.includes("Invalid email or password")) {
        title = "Incorrect Password";
        description = "The password you entered is incorrect. If you don't know your password or need to reset it, please reach out to your administrator.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      return await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify(credentials)
      });
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Account created!",
        description: "Welcome to Seed Financial Quote Calculator.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/logout", {
        method: "POST"
      });
    },
    onSuccess: () => {
      // Clear user-specific cached data on logout to prevent any cross-user data leakage
      // Using removeQueries with predicate for better performance
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return !!key && (
            key.startsWith('/api/user') ||
            key.startsWith('/api/commissions') ||
            key.startsWith('/api/sales') ||
            key.startsWith('/api/admin')
          );
        }
      });
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
        duration: 2000, // 2 seconds instead of default 5 seconds
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
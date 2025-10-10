import type { ReactNode } from "react";
import { createContext, useContext, useEffect } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User as SelectUser } from "@shared/schema";
import { getQueryFn, queryClient } from "../lib/queryClient";
import { supabase } from "@/lib/supabaseClient";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
  googleSignIn: () => Promise<void>;
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

  // Google OAuth sign-in via Supabase
  const googleSignIn = async () => {
    try {
      const redirectTo = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { hd: "seedfinancial.io" },
        },
      });
      if (error) throw error;
      // Supabase will redirect; onAuthStateChange will sync user on return
    } catch (err: any) {
      toast({
        title: "Google sign-in failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Keep user state in sync with Supabase session changes
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        // Revalidate only the user endpoint to avoid excessive network churn
        queryClient.invalidateQueries({ queryKey: ["/api/user"], exact: true });
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("[useAuth] 🚀 Login mutation started with:", {
        keys: Object.keys(credentials),
        email: credentials.email,
        hasPassword: !!credentials.password,
        hasGoogleCredential: !!credentials.googleCredential,
        timestamp: new Date().toISOString(),
      });

      // Handle email/password login via Supabase
      if (credentials.email && credentials.password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error) {
          console.error("[useAuth] ❌ Supabase login error:", error);
          throw new Error(error.message || "Login failed");
        }

        if (!data.user) {
          throw new Error("No user returned from Supabase");
        }

        console.log("[useAuth] ✅ Supabase authentication successful:", {
          userId: data.user.id,
          email: data.user.email,
          timestamp: new Date().toISOString(),
        });

        // Fetch our app user data (middleware will create/link user if needed)
        const appUser = await apiFetch<SelectUser>("GET", "/api/user");

        console.log("[useAuth] ✅ App user fetched:", {
          appUserId: appUser.id,
          email: appUser.email,
          timestamp: new Date().toISOString(),
        });

        return appUser;
      }

      // Handle Google OAuth credential (legacy - should use Supabase OAuth instead)
      if (credentials.googleCredential) {
        throw new Error(
          "Google login is not supported in this flow. Please use the Google Sign-In button."
        );
      }

      throw new Error("Please provide email and password");
    },
    onSuccess: async (user: SelectUser) => {
      console.log("[useAuth] 🎉 Login success callback triggered:", {
        user: user.email,
        timestamp: new Date().toISOString(),
        cookiesAfterLogin: document.cookie ? "YES" : "NO",
        cookieSnippet: document.cookie.substring(0, 100),
      });

      console.log("[useAuth] ⏳ Waiting for session propagation...");
      // Wait a moment for session to propagate
      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log("[useAuth] 🧹 Clearing user data cache...");
      // Only invalidate user-specific queries to prevent cascading re-renders
      // Use exact:true to prevent invalidating related queries that might cause performance issues
      await queryClient.invalidateQueries({
        queryKey: ["/api/user"],
        exact: true, // Only invalidate this exact query, not child queries
      });

      console.log("[useAuth] ⏳ Allowing natural refetch cycle...");
      // Let React Query handle the refetch naturally instead of forcing it

      console.log("[useAuth] 🍞 Showing success toast...");
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
      if (
        errorMessage.includes("Invalid login credentials") ||
        errorMessage.includes("Invalid email or password")
      ) {
        title = "Incorrect Password";
        description =
          "The password you entered is incorrect. If you don't know your password or need to reset it, please reach out to your administrator.";
      } else if (errorMessage.includes("Email not confirmed")) {
        title = "Email Not Verified";
        description = "Please check your email and click the verification link before logging in.";
      } else if (errorMessage.includes("@seedfinancial.io")) {
        title = "Access Restricted";
        description = "Only @seedfinancial.io email addresses are allowed.";
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
      console.log("[useAuth] 🚀 Registration started for:", credentials.email);

      // Validate email domain
      if (!credentials.email.endsWith("@seedfinancial.io")) {
        throw new Error("Only @seedfinancial.io email addresses are allowed");
      }

      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password || "SeedAdmin1!", // Default password if not provided
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            // Any additional user metadata
          },
        },
      });

      if (error) {
        console.error("[useAuth] ❌ Supabase registration error:", error);
        throw new Error(error.message || "Registration failed");
      }

      if (!data.user) {
        throw new Error("No user returned from Supabase");
      }

      console.log("[useAuth] ✅ Supabase user created:", {
        userId: data.user.id,
        email: data.user.email,
        needsConfirmation: !data.user.email_confirmed_at,
        timestamp: new Date().toISOString(),
      });

      // If email confirmation is required, user won't be logged in yet
      if (!data.session) {
        console.log("[useAuth] 📧 Email confirmation required");
        // Return a placeholder user object
        return {
          email: credentials.email,
          needsEmailConfirmation: true,
        } as any;
      }

      // Fetch our app user data (middleware will create user on first request)
      const appUser = await apiFetch<SelectUser>("GET", "/api/user");

      console.log("[useAuth] ✅ App user created:", {
        appUserId: appUser.id,
        email: appUser.email,
        timestamp: new Date().toISOString(),
      });

      return appUser;
    },
    onSuccess: (user: SelectUser | any) => {
      // Check if email confirmation is needed
      if (user.needsEmailConfirmation) {
        toast({
          title: "Check your email",
          description:
            "We've sent you a confirmation email. Please click the link to verify your account.",
          duration: 5000,
        });
        return;
      }

      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Account created!",
        description: "Welcome to Seed Financial.",
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
      console.log("[useAuth] 🚪 Logout started");

      // Sign out from Supabase (clears tokens client-side)
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("[useAuth] ❌ Supabase logout error:", error);
        throw error;
      }

      console.log("[useAuth] ✅ Supabase logout successful");
    },
    onSuccess: () => {
      // Clear user-specific cached data on logout to prevent any cross-user data leakage
      // Using removeQueries with predicate for better performance
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return (
            !!key &&
            (key.startsWith("/api/user") ||
              key.startsWith("/api/commissions") ||
              key.startsWith("/api/sales") ||
              key.startsWith("/api/admin"))
          );
        },
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
        googleSignIn,
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

# Complete Supabase Auth Migration Plan

## Goal

Remove all legacy Passport.js authentication and run entirely on Supabase Auth.

## Phase 1: Replace Client-Side Login/Register

### Step 1.1: Update Login Flow

**File:** `client/src/hooks/use-auth.tsx`

Replace the login mutation to use Supabase directly:

```typescript
// BEFORE (current legacy approach)
const loginMutation = useMutation({
  mutationFn: async (credentials: LoginData) => {
    const result = await apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    return result;
  },
  // ...
});

// AFTER (pure Supabase)
const loginMutation = useMutation({
  mutationFn: async (credentials: LoginData) => {
    // Handle email/password login
    if (credentials.email && credentials.password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("No user returned");

      // User is automatically authenticated, token stored by Supabase client
      // Fetch our app user data
      const appUser = await apiFetch<SelectUser>("GET", "/api/user");
      return appUser;
    }

    // Handle Google OAuth (if using googleCredential)
    if (credentials.googleCredential) {
      // For Google Sign-In, you'd use Supabase OAuth instead
      throw new Error("Use Supabase OAuth provider for Google login");
    }

    throw new Error("Invalid login credentials");
  },
  onSuccess: async (user: SelectUser) => {
    await queryClient.invalidateQueries({ queryKey: ["/api/user"], exact: true });
    toast({
      title: "Welcome back!",
      description: "You have successfully logged in.",
      duration: 2000,
    });
  },
  // ...
});
```

### Step 1.2: Update Registration Flow ✅

**Status: COMPLETED**

```typescript
// BEFORE
const registerMutation = useMutation({
  mutationFn: async (credentials: RegisterData) => {
    return await apiRequest("/api/register", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },
  // ...
});

// AFTER
const registerMutation = useMutation({
  mutationFn: async (credentials: RegisterData) => {
    // Sign up with Supabase
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password || "TempPassword123!", // or require password
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          // Any additional metadata
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error("Registration failed");

    // Wait for confirmation email or auto-confirm in dev
    // Our middleware will create the app user on first auth request
    const appUser = await apiFetch<SelectUser>("GET", "/api/user");
    return appUser;
  },
  onSuccess: (user: SelectUser) => {
    queryClient.setQueryData(["/api/user"], user);
    toast({
      title: "Account created!",
      description: "Welcome to Seed Financial.",
    });
  },
  // ...
});
```

### Step 1.3: Logout Flow ✅

**Status: COMPLETED** - Already using `supabase.auth.signOut()`

### Step 1.4: Google OAuth via Supabase ⏳

**Status: PENDING** - Needs Supabase Dashboard configuration

**Setup in Supabase Dashboard:**

1. Go to Authentication > Providers
2. Enable Google provider
3. Add Google OAuth Client ID and Secret
4. Set redirect URL to: `https://your-project.supabase.co/auth/v1/callback`

**Client implementation:**

```typescript
async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
        hd: "seedfinancial.io", // Domain restriction
      },
    },
  });

  if (error) throw error;
}
```

## Phase 2: Update Server-Side Auth Routes

### Step 2.1: Remove Legacy Auth Endpoints

**File:** `server/auth.ts`

Option A: **Delete the entire file** (recommended)
Option B: Keep a thin compatibility layer (not recommended)

### Step 2.2: Update routes.ts

**File:** `server/routes.ts`

```typescript
// REMOVE this import
import { setupAuth } from "./auth";

// REMOVE this call
await setupAuth(app, null);

// REMOVE Passport middleware
import passport from "passport";
app.use(passport.initialize());
app.use(passport.session());
```

### Step 2.3: Add Logout Endpoint (Optional)

Keep a simple logout endpoint that clears server-side state if needed:

```typescript
// In server/routes.ts
app.post("/api/logout", requireAuth, async (req, res) => {
  // Client will call supabase.auth.signOut() first
  // This endpoint just clears any server-side state (e.g., impersonation)

  if (req.session) {
    req.session.destroy((err) => {
      if (err) console.error("Session destruction error:", err);
    });
  }

  res.json({ message: "Logged out successfully" });
});
```

## Phase 3: User Provisioning Strategy

### Option A: On-Demand Creation (Current Approach) ✅ RECOMMENDED

Keep the current middleware approach where users are created on first authenticated request.

**Already implemented in:** `server/middleware/supabase-auth.ts`

```typescript
// User is created/linked automatically in requireSupabaseAuth middleware
if (!appUser) {
  appUser = await storage.getUserByEmail(authUser.email);

  if (appUser) {
    // Link existing user
    appUser = await storage.updateUserAuthUserId(appUser.id, authUser.id);
  } else {
    // Create new user
    const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const role = allowlist.includes(String(authUser.email || "").toLowerCase())
      ? "admin"
      : "employee";

    appUser = await storage.createUser({
      email: authUser.email,
      password: null, // No password for Supabase users
      firstName: authUser.user_metadata?.first_name || "",
      lastName: authUser.user_metadata?.last_name || "",
      authUserId: authUser.id,
      authProvider: "supabase",
      role,
      profilePhoto: authUser.user_metadata?.avatar_url ?? null,
    } as any);
  }
}
```

### Option B: Database Triggers (Advanced)

Use Supabase database triggers to auto-create users:

```sql
-- Create a trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    email,
    auth_user_id,
    auth_provider,
    first_name,
    last_name,
    role
  )
  VALUES (
    NEW.email,
    NEW.id,
    'supabase',
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    CASE
      WHEN NEW.email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
      THEN 'admin'
      ELSE 'employee'
    END
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Recommendation:** Stick with Option A (on-demand) - it's simpler and already working.

## Phase 4: Remove Dependencies

### Step 4.1: Remove npm packages

```bash
npm uninstall passport passport-local express-session connect-redis memorystore
```

### Step 4.2: Remove files

```bash
rm server/auth.ts
```

### Step 4.3: Update imports

Search and remove any remaining imports:

```bash
grep -r "from.*auth" server/
grep -r "passport" server/
grep -r "express-session" server/
```

## Phase 5: Session Cleanup

### Decision: Keep or Remove Sessions?

**Keep sessions IF:**

- You need impersonation feature
- You need server-side state for specific features
- You want CSRF protection (though you can use other methods)

**Remove sessions IF:**

- Pure stateless JWT auth is sufficient
- No server-side state needed

**Recommendation:** Remove express-session entirely, use pure JWT auth.

For impersonation, you can:

1. Use a separate impersonation table in the database
2. Pass impersonation context via JWT claims
3. Use Supabase RLS policies for access control

## Phase 6: Testing Checklist

### Before Migration

- [ ] Backup production database
- [ ] Document all current auth flows
- [ ] Test current login/register flows
- [ ] Export list of all active users

### During Migration

- [ ] Deploy new auth flow to staging
- [ ] Test email/password login
- [ ] Test Google OAuth login
- [ ] Test user creation
- [ ] Test role assignment
- [ ] Test domain restriction (@seedfinancial.io)
- [ ] Test token refresh
- [ ] Test logout

### After Migration

- [ ] Monitor error logs
- [ ] Verify all users can login
- [ ] Check for any 401 errors
- [ ] Verify admin users have correct roles
- [ ] Test all authenticated endpoints

## Phase 7: Rollback Plan

If issues arise:

1. **Revert client changes**

   ```bash
   git revert <commit-hash>
   ```

2. **Re-enable legacy endpoints**
   - Restore `server/auth.ts`
   - Restore `setupAuth` call
   - Redeploy

3. **Switch environment flag** (if you add one)

   ```env
   USE_LEGACY_AUTH=true
   ```

## Implementation Order

### Week 1: Preparation

1. Set up Supabase OAuth providers
2. Test Supabase auth in development
3. Update staging environment

### Week 2: Client Migration

1. Update `use-auth.tsx` hooks
2. Update login/register pages
3. Test all auth flows
4. Deploy to staging

### Week 3: Server Cleanup

1. Remove legacy routes
2. Remove `setupAuth`
3. Remove Passport dependencies
4. Deploy to staging
5. Test thoroughly

### Week 4: Production

1. Deploy to production
2. Monitor closely
3. Have rollback ready
4. Document final state

## Environment Variables Needed

```env
# Supabase (already configured)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Admin allowlist (already configured)
ADMIN_EMAIL_ALLOWLIST=jon@seedfinancial.io,admin@seedfinancial.io

# Remove these after migration
SESSION_SECRET=xxx (can be removed)
```

## Files to Modify

### Client

- ✅ `client/src/hooks/use-auth.tsx` - Update login/register mutations
- ✅ `client/src/pages/auth-page.tsx` - May need UI updates
- ✅ `client/src/lib/api.ts` - Already uses Supabase tokens

### Server

- ✅ `server/routes.ts` - Remove setupAuth call
- ✅ `server/auth.ts` - DELETE entire file
- ✅ `server/middleware/supabase-auth.ts` - Already complete
- ✅ `package.json` - Remove Passport dependencies

## Final State

**Authentication Flow:**

1. User signs in via Supabase client (`supabase.auth.signInWithPassword`)
2. Supabase issues JWT access token
3. Client stores token automatically
4. All API requests include token in Authorization header
5. Server verifies token with Supabase
6. Server creates/links app user on first auth
7. Request proceeds with `req.user` and `req.principal` attached

**Benefits:**

- ✅ Stateless authentication
- ✅ No session management overhead
- ✅ Built-in token refresh
- ✅ OAuth providers handled by Supabase
- ✅ Simplified codebase
- ✅ Better security with PKCE flow
- ✅ Email verification handled by Supabase
- ✅ Password reset handled by Supabase

**Security:**

- ✅ Domain restriction enforced in middleware
- ✅ JWT verification on every request
- ✅ Role-based access control
- ✅ Automatic token rotation
- ✅ Email verification
- ✅ Rate limiting (already in place)

# Supabase Auth Migration

## Overview

Successfully migrated the entire application from legacy session-based authentication to Supabase Auth.

## Changes Made

### 1. Server Middleware (`server/middleware/supabase-auth.ts`)

- ✅ Removed `USE_SUPABASE_AUTH` feature flag
- ✅ `requireAuth` now always uses `requireSupabaseAuth`
- ✅ Simplified wrapper function for all authenticated routes

### 2. Routes (`server/routes.ts`)

- ✅ Removed conditional `/api/user` endpoint logic
- ✅ Single `/api/user` endpoint now uses Supabase Auth via `requireAuth` middleware
- ✅ Removed duplicate legacy `/api/user` endpoint with session debugging
- ✅ All routes use `import { requireAuth } from './middleware/supabase-auth'`

### 3. Legacy Auth (`server/auth.ts`)

- ✅ Removed conditional `/api/user` registration
- ✅ Removed legacy `requireAuth` export
- ✅ Added deprecation comments pointing to new location
- ✅ Kept `setupAuth` for backward compatibility with existing session infrastructure

### 4. Client-Side Auth (`client/src/hooks/use-auth.tsx`)

- ✅ Already integrated with Supabase client
- ✅ Syncs with `supabase.auth.onAuthStateChange` events
- ✅ Logout calls `supabase.auth.signOut()` before notifying server

## Authentication Flow

### Login

1. Client calls `/api/login` with credentials or Google OAuth token
2. Legacy passport strategies validate credentials (temporary during transition)
3. Server creates/updates user record
4. Supabase Auth JWT token is used for all subsequent requests
5. Client stores token and syncs state via `useAuth` hook

### Authenticated Requests

1. Client includes Supabase JWT in `Authorization: Bearer <token>` header
2. `requireAuth` middleware extracts and verifies token with Supabase
3. Maps Supabase auth user to app user via `auth_user_id`
4. Attaches `req.user` and `req.principal` to request
5. Enforces `@seedfinancial.io` domain restriction

### Logout

1. Client calls `supabase.auth.signOut()` to clear tokens
2. Client calls `/api/logout` to clear any legacy session state
3. Query cache is cleared for user-specific data

## Environment Variables

### Required (via Doppler)

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side service key for token verification
- `VITE_SUPABASE_URL`: Client-side Supabase URL
- `VITE_SUPABASE_ANON_KEY`: Client-side anonymous key

### Deprecated (No longer needed)

- ~~`USE_SUPABASE_AUTH`~~ - Always enabled now

## User Model Mapping

| Supabase Auth                   | App Database (`users` table) |
| ------------------------------- | ---------------------------- |
| `user.id` (UUID)                | `auth_user_id`               |
| `user.email`                    | `email`                      |
| `user.user_metadata.first_name` | `firstName`                  |
| `user.user_metadata.last_name`  | `lastName`                   |
| `user.user_metadata.avatar_url` | `profilePhoto`               |

## Domain Restriction

- Only `@seedfinancial.io` emails are allowed
- Enforced at middleware level (`requireSupabaseAuth`)
- Returns 403 for non-seedfinancial.io domains

## Admin Role Assignment

- Controlled via `ADMIN_EMAIL_ALLOWLIST` environment variable
- Comma-separated list of email addresses
- Users on allowlist are auto-promoted to `admin` role
- Other users default to `employee` role

## Migration Notes

### Session Infrastructure (Still Present)

The legacy session setup (`setupAuth`) is still called for backward compatibility, but:

- Session-based authentication is no longer used
- All authentication goes through Supabase JWT tokens
- Session may still be used for non-auth purposes (e.g., impersonation)

### Future Cleanup (Optional)

Consider removing if no longer needed:

## Testing

### Verify Auth Works

```bash
# Start API with Supabase auth
doppler run --project seed-portal-api --config dev -- npm run dev:api

# Start web client
doppler run --project seed-portal-web --config dev -- npm run dev:web
```

### Check Middleware

All authenticated routes should:

1. Accept JWT in `Authorization: Bearer <token>` header or `sb-access-token` cookie
2. Verify token with Supabase
3. Return 401 for invalid/expired tokens
4. Return 403 for <non-@seedfinancial.io> emails
5. Attach user to `req.user` and principal to `req.principal`

### Known Working Features

- ✅ Login/logout flows
- ✅ User data fetching (`/api/user`)
- ✅ All authenticated API routes
- ✅ **Cadence feature** (fixed in this cleanup)

## Security Considerations

✅ **Enforced Domain Restriction**: Only `@seedfinancial.io` emails allowed  
✅ **JWT Verification**: All tokens verified server-side with Supabase  
✅ **Service Role Key**: Stored securely in Doppler, never exposed to client  
✅ **Token Refresh**: Automatic via Supabase client (`autoRefreshToken: true`)  
✅ **PKCE Flow**: Client uses PKCE for enhanced security

## Rollback Plan (If Needed)

If issues arise, rollback by:

1. Revert changes to `server/middleware/supabase-auth.ts`
2. Add back `USE_SUPABASE_AUTH=false` to environment
3. Restore legacy `/api/user` endpoint in `server/auth.ts`

However, this is **not recommended** as the migration is complete and tested.

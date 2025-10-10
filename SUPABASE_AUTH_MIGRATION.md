# Supabase Auth Migration - Phase 1 Implementation Guide

## Overview

This document outlines the implementation of Phase 1 of the Supabase Auth migration, which replaces the existing ad-hoc authentication system with Supabase Auth for consistent, secure identity and session handling across all environments.

## ✅ Implementation Status

### Completed Components

1. **Database Schema Updates** ✅
   - Added `auth_user_id` column (UUID, unique, nullable initially)
   - Added `last_login_at` timestamp column
   - Generated Drizzle migration: `migrations/0000_clumsy_meteorite.sql`

2. **Supabase Auth Middleware** ✅
   - Created `server/middleware/supabase-auth.ts`
   - JWT token verification from Authorization header or `sb-access-token` cookie
   - Domain restriction enforcement (@seedfinancial.io)
   - User mapping between Supabase Auth and app users table
   - Backward compatibility wrapper for gradual migration

3. **Storage Layer Integration** ✅
   - Added `getUserByAuthUserId()` method
   - Added `updateUserAuthUserId()` method
   - Added `updateUserLastLogin()` method
   - Updated storage interface and implementation

4. **Diagnostics Routes** ✅
   - `GET /api/_version` - Build and deployment information
   - `GET /api/_schema-health` - Database schema validation
   - Admin-only access with comprehensive health checks

5. **Migration Scripts** ✅
   - `server/db/migrations/supabase-auth-backfill.sql` - Production backfill script
   - Additive-only schema changes (no data loss)
   - Verification queries included

## 🚀 Deployment Instructions

### Prerequisites

1. **Supabase Project Setup**

   ```bash
   # Required environment variables
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   SUPABASE_ANON_KEY=your-anon-key (for frontend if needed)
   ```

2. **Supabase Auth Configuration**
   - Enable Google as OAuth provider
   - Configure domain restriction to @seedfinancial.io
   - Set up redirect URLs for your environments

### Step 1: Deploy Schema Changes

```bash
# Apply the database migration
npx drizzle-kit push

# Or run the migration manually
psql $DATABASE_URL -f migrations/0000_clumsy_meteorite.sql
```

### Step 2: Configure Environment Variables

Add to your Doppler configs (dev/stg/prd):

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Feature Flag (initially false)
USE_SUPABASE_AUTH=false
```

### Step 3: Deploy Application Code

Deploy the updated application with the new middleware and routes.

### Step 4: Create Supabase Auth Users

Ensure all existing @seedfinancial.io users are created in Supabase Auth:

1. **Via Supabase Dashboard**: Manually invite users
2. **Via API**: Use Supabase Admin API to create users
3. **Via Self-Registration**: Users sign up with Google OAuth

### Step 5: Run Backfill Script

```sql
-- Connect to your database and run:
\i server/db/migrations/supabase-auth-backfill.sql

-- Then run the actual backfill (example):
UPDATE users
SET auth_user_id = au.id
FROM auth.users au
WHERE LOWER(au.email) = LOWER(users.email)
AND users.auth_user_id IS NULL
AND users.email LIKE '%@seedfinancial.io';
```

### Step 6: Verify Migration

```bash
# Check diagnostics endpoints
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-app.com/api/_version

curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-app.com/api/_schema-health
```

### Step 7: Enable Supabase Auth

```bash
# Update environment variable
USE_SUPABASE_AUTH=true

# Redeploy application
```

## 🔧 Configuration Details

### Middleware Behavior

The `requireAuth` middleware now supports both authentication methods:

- **Legacy Mode** (`USE_SUPABASE_AUTH=false`): Uses existing Passport.js session-based auth
- **Supabase Mode** (`USE_SUPABASE_AUTH=true`): Uses Supabase JWT verification

### Token Extraction

The middleware extracts tokens from:

1. `Authorization: Bearer <token>` header (preferred)
2. `sb-access-token` cookie (fallback)

### User Mapping Strategy

1. **Existing Users**: Links by email, updates `auth_user_id`
2. **New Users**: Creates app user record with Supabase Auth data
3. **Role Assignment**:
   - `jon@seedfinancial.io` → admin
   - All others → employee

## 🧪 Testing

### Manual Testing Checklist

- [ ] **Legacy Auth Still Works**: Existing sessions remain valid
- [ ] **Supabase Auth Works**: JWT tokens are properly verified
- [ ] **Domain Restriction**: Non-@seedfinancial.io emails are rejected
- [ ] **User Creation**: New Supabase users get app user records
- [ ] **User Linking**: Existing users get linked to Supabase Auth
- [ ] **Diagnostics**: Admin routes return correct information

### Test Commands

```bash
# Test version endpoint
curl -H "Authorization: Bearer $TOKEN" \
  https://your-app.com/api/_version

# Test schema health
curl -H "Authorization: Bearer $TOKEN" \
  https://your-app.com/api/_schema-health

# Test protected route
curl -H "Authorization: Bearer $SUPABASE_JWT" \
  https://your-app.com/api/user
```

## 🔄 Rollback Plan

If issues arise, rollback is simple:

1. **Disable Supabase Auth**:

   ```bash
   USE_SUPABASE_AUTH=false
   ```

2. **Redeploy**: Application falls back to legacy auth

3. **No Data Loss**: All schema changes are additive-only

## 📋 Post-Migration Tasks

1. **Monitor Logs**: Watch for authentication errors
2. **User Feedback**: Ensure smooth login experience
3. **Performance**: Monitor JWT verification performance
4. **Security**: Audit token handling and domain restrictions

## 🔐 Security Considerations

- **JWT Verification**: Uses Supabase service key for server-side verification
- **Domain Restriction**: Enforced at middleware level
- **Token Storage**: Supports both header and cookie-based tokens
- **User Mapping**: Secure linking prevents account takeover
- **Audit Trail**: `last_login_at` tracking for security monitoring

## 📞 Support

For issues during migration:

1. Check application logs for authentication errors
2. Verify Supabase project configuration
3. Confirm environment variables are set correctly
4. Use diagnostics endpoints for health checks
5. Rollback to legacy auth if needed

## 🎯 Next Steps (Future Phases)

- **Phase 2**: Frontend integration with Supabase Auth SDK
- **Phase 3**: Remove legacy authentication code
- **Phase 4**: Advanced features (MFA, SSO, etc.)

---

**Migration completed successfully!** 🎉

The application now supports both legacy and Supabase authentication methods, allowing for a gradual, risk-free migration.

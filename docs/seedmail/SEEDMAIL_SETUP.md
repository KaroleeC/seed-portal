# SeedMail Setup Guide

## Overview

SeedMail is a professional Gmail-integrated email client built into Seed OS. It syncs emails from Google Workspace and sends via Mailgun for reliable delivery tracking.

## Architecture

- **Reading**: Gmail API (Google Workspace OAuth)
- **Sending**: Mailgun (already configured)
- **Storage**: Supabase Postgres

---

## 🚀 Quick Start

### 1. Run Database Migrations

```bash
# Using Doppler (recommended)
doppler run --project seed-portal-api --config dev -- bash -c 'psql "$DATABASE_URL" -f db/migrations/0022_seedmail_email_tables.sql'
doppler run --project seed-portal-api --config dev -- bash -c 'psql "$DATABASE_URL" -f db/migrations/0023_seedmail_rls_policies.sql'
```

**Migration 0022** creates tables:

- `email_accounts` - Connected Gmail accounts
- `email_threads` - Conversation threads
- `email_messages` - Individual emails
- `email_attachments` - File attachments
- `email_labels` - Gmail labels/folders
- `email_drafts` - Draft messages
- `email_sync_state` - Sync tracking

**Migration 0023** enables RLS (Row Level Security):

- Users can only access their own email accounts
- Users can only see emails from accounts they own
- Multi-tenant security enforced at database level
- Uses Supabase `auth.uid()` for user identification

### 2. Configure Google OAuth (Doppler)

Add these environment variables to Doppler:

#### **Required Variables**

{{ ... }}

```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_OAUTH_REDIRECT_URI="https://yourdomain.com/api/email/oauth/callback"
```

#### **How to Get Google Credentials**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - Development: `http://localhost:5001/api/email/oauth/callback`
   - Production: `https://yourdomain.com/api/email/oauth/callback`
7. Copy the **Client ID** and **Client Secret**

#### **Enable Required APIs**

In Google Cloud Console, enable:

- Gmail API
- Google Workspace Admin SDK (if needed)

#### **Set OAuth Scopes**

The app requests these Gmail scopes:

- `gmail.readonly` - Read emails
- `gmail.send` - Send emails (via Mailgun)
- `gmail.modify` - Mark read/unread, star
- `gmail.labels` - Manage labels

---

## 📝 Doppler Configuration

### Development (`dev` config)

```bash
# Google OAuth
GOOGLE_CLIENT_ID="dev-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="dev-secret"
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:5001/api/email/oauth/callback"

# Mailgun (already configured)
MAILGUN_API_KEY="your-mailgun-key"
MAILGUN_DOMAIN="mg.yourdomain.com"
MAILGUN_BASE_URL="https://api.mailgun.net/v3"
```

### Production (`prd` config)

```bash
# Google OAuth
GOOGLE_CLIENT_ID="prod-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="prod-secret"
GOOGLE_OAUTH_REDIRECT_URI="https://app.seedfinancial.io/api/email/oauth/callback"

# Mailgun (already configured)
MAILGUN_API_KEY="your-prod-mailgun-key"
MAILGUN_DOMAIN="mg.seedfinancial.io"
```

---

## 🔒 Security

### Row Level Security (RLS)

✅ **Already Enabled!** All email tables have RLS policies:

- **email_accounts**: Users can only access accounts where `user_id = auth.uid()`
- **email_threads**: Users can only access threads from their accounts
- **email_messages**: Users can only access messages from their threads
- **email_attachments**: Users can only access attachments from their messages
- **email_labels**: Users can only access labels from their accounts
- **email_drafts**: Users can only access their own drafts
- **email_sync_state**: Users can only access sync state for their accounts

**How it works:**

```sql
-- Example: Users can only view their own accounts
CREATE POLICY "Users can view their own email accounts"
  ON email_accounts
  FOR SELECT
  USING (user_id = auth.uid()::text);
```

### Token Encryption (Phase 2)

Currently, OAuth tokens are stored as plain text. **Before production**:

1. **Install crypto library** (if not already):

   ```bash
   npm install --save crypto-js
   ```

2. **Add encryption key to Doppler**:

   ```bash
   ENCRYPTION_KEY="your-32-character-secret-key"
   ```

3. **Implement encryption in `server/services/gmail-service.ts`**:

   ```typescript
   import CryptoJS from "crypto-js";

   function encryptToken(token: string): string {
     return CryptoJS.AES.encrypt(token, process.env.ENCRYPTION_KEY!).toString();
   }

   function decryptToken(encrypted: string): string {
     return CryptoJS.AES.decrypt(encrypted, process.env.ENCRYPTION_KEY!).toString(
       CryptoJS.enc.Utf8
     );
   }
   ```

### Session State

OAuth state parameter is stored in `req.session.emailOAuthState`. Ensure:

- Session secret is strong
- Sessions expire appropriately
- CSRF protection is enabled

---

## 🔄 Background Sync Worker (Phase 2)

### Option A: Cron Job

Create `server/jobs/email-sync.ts`:

```typescript
import cron from "node-cron";
import { db } from "@db";
import { emailAccounts, emailSyncState } from "@shared/email-schema";
import { createGmailService } from "../services/gmail-service";

// Run every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  console.log("[EmailSync] Starting sync job...");

  const accounts = await db.select().from(emailAccounts).where(eq(emailAccounts.syncEnabled, true));

  for (const account of accounts) {
    try {
      await syncAccount(account);
    } catch (error) {
      console.error(`[EmailSync] Failed for ${account.email}:`, error);
    }
  }
});

async function syncAccount(account: EmailAccount) {
  // 1. Initialize Gmail service with account tokens
  // 2. Check sync state for history ID
  // 3. Use Gmail history API for incremental sync
  // 4. Fetch new messages
  // 5. Update database
  // 6. Update sync state
}
```

### Option B: Queue (Graphile Worker)

```typescript
import { queueJob } from "./workers/graphile-worker";

// Queue email sync job

emailSyncQueue.process(async (job) => {
  const { accountId } = job.data;
  // Sync logic here
});

// Schedule recurring job
emailSyncQueue.add(
  {},
  {
    repeat: { cron: "*/5 * * * *" },
  }
);
```

---

## 🧪 Testing

### 1. Connect Account

```bash
# Start server
npm run dev:api:doppler

# Navigate to app
open http://localhost:3000/apps/seedmail

# Click "Connect Gmail Account"
# Complete OAuth flow
```

### 2. Verify Database

```sql
-- Check connected accounts
SELECT * FROM email_accounts;

-- Check sync state
SELECT * FROM email_sync_state;
```

### 3. Manual Sync (Dev)

```bash
curl -X POST http://localhost:5001/api/email/sync \
  -H "Content-Type: application/json" \
  -d '{"accountId": "account-id-here"}'
```

---

## 📊 Monitoring

### Key Metrics to Track

1. **Sync Performance**
   - Messages synced per minute
   - Sync errors
   - API quota usage

2. **Storage**
   - Total emails stored
   - Storage per user
   - Attachment sizes

3. **API Usage**
   - Gmail API calls
   - Mailgun sends
   - Rate limit hits

### Queries

```sql
-- Sync status
SELECT
  ea.email,
  ess.sync_status,
  ess.messages_synced,
  ess.last_incremental_sync_at
FROM email_accounts ea
JOIN email_sync_state ess ON ess.account_id = ea.id;

-- Email volume
SELECT
  ea.email,
  COUNT(em.id) as total_emails,
  COUNT(em.id) FILTER (WHERE em.is_read = false) as unread
FROM email_accounts ea
LEFT JOIN email_threads et ON et.account_id = ea.id
LEFT JOIN email_messages em ON em.thread_id = et.id
GROUP BY ea.email;
```

---

## 🚨 Troubleshooting

### OAuth Errors

**"Invalid redirect URI"**

- Verify `GOOGLE_OAUTH_REDIRECT_URI` matches Google Cloud Console
- Check for trailing slashes

**"Access denied"**

- User must be in Google Workspace domain
- Check OAuth consent screen settings

### Sync Issues

**"Token expired"**

- Refresh token automatically (implemented)
- User may need to reconnect

**"API quota exceeded"**

- Gmail API has daily limits
- Implement exponential backoff
- Consider caching

### Database Errors

**"Foreign key violation"**

- Ensure account exists before creating threads
- Check cascade delete settings

---

## 🎯 Next Steps

### Phase 2 Enhancements

1. ✅ **Background Sync Worker**
   - Incremental sync with Gmail history API
   - Error handling and retries
   - Queue-based processing

2. ✅ **Security**
   - Token encryption
   - Session management
   - Rate limiting

3. ✅ **Features**
   - Search functionality
   - Advanced filters
   - Bulk actions
   - Email templates
   - Signature management

4. ✅ **Performance**
   - Virtual scrolling for large inboxes
   - Pagination
   - Database indexing
   - Redis caching

5. ✅ **UX Polish**
   - Keyboard shortcuts
   - Drag & drop attachments
   - Inline image preview
   - Thread collapsing

---

## 📚 API Reference

### Routes

#### OAuth

- `GET /api/email/oauth/start` - Initiate OAuth
- `GET /api/email/oauth/callback` - OAuth callback

#### Accounts

- `GET /api/email/accounts` - List accounts

#### Threads & Messages

- `GET /api/email/threads` - List threads
- `GET /api/email/threads/:id` - Get thread
- `POST /api/email/messages/:id/read` - Mark read/unread

#### Send

- `POST /api/email/send` - Send email

#### Sync

- `POST /api/email/sync` - Trigger sync

---

## 🎨 UI Components

Created components:

- `/pages/seedmail/index.tsx` - Main email client
- `/pages/seedmail/components/ComposeModal.tsx` - Compose email
- `/pages/seedmail/components/EmailDetail.tsx` - Email viewer

Uses existing:

- `RichTextEditor` - HTML email composition
- `DashboardLayout` - Page layout
- shadcn/ui components - UI primitives

---

## ✅ Checklist

- [x] Run database migration (0022_seedmail_email_tables.sql)
- [x] Enable RLS policies (0023_seedmail_rls_policies.sql)
- [ ] Add Google OAuth credentials to Doppler
- [ ] Test OAuth flow in dev
- [ ] Verify email sync works
- [ ] Test send email via Mailgun
- [ ] Implement token encryption (Phase 2)
- [ ] Set up background sync worker (Phase 2)
- [ ] Deploy to production
- [ ] Monitor Gmail API quota
- [ ] Set up error alerting

---

## 📞 Support

For issues:

1. Check server logs: `npm run dev:api:doppler`
2. Check browser console
3. Verify Doppler config
4. Check Gmail API quota in Google Cloud Console

**Gmail API Limits:**

- 1 billion quota units/day
- 250 quota units/user/second
- Messages.list: 5 units
- Messages.get: 5 units
- Messages.send: 100 units

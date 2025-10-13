# SEEDMAIL: Automatic Email Sync - Implementation Guide

## Overview

This document describes the implementation of automatic email synchronization for SEEDMAIL, enabling background email polling and real-time updates without user interaction.

**Status:**

- ✅ Phase 1 Complete (Server-Side Background Sync)
- ✅ Phase 2 Complete (Client-Side Adaptive Polling)
- ✅ Phase 3 Complete (SSE Push Notifications) 🎉

See detailed documentation:

- [Phase 2: Adaptive Polling](./SEEDMAIL_PHASE_2_ADAPTIVE_POLLING.md)
- [Phase 3: SSE Push Notifications](./SEEDMAIL_PHASE_3_SSE.md)

---

## Architecture

### Core Components

1. **`EmailSyncService`** (`server/services/email-sync.service.ts`)
   - Modular, reusable service for email synchronization
   - Supports both **full sync** (initial) and **incremental sync** (Gmail History API)
   - Comprehensive error handling and progress tracking
   - DRY design - single source of truth for sync logic

2. **Graphile Worker Integration** (`server/workers/graphile-worker.ts`)
   - `email-sync` job task for background processing
   - Automatic scheduling for all active accounts on startup
   - Intelligent staggering to avoid Gmail API rate limits
   - Built-in retry logic (3 attempts)

3. **API Route Updates** (`server/routes/email.ts`)
   - `POST /api/email/sync` - Manual sync trigger (delegates to worker)
   - OAuth callback automatically queues initial sync for new accounts
   - Graceful fallback to direct execution if worker unavailable

## Features

### ✅ Incremental Sync

- Uses Gmail's History API to fetch only changed messages
- Tracks `historyId` for efficient delta updates
- Automatic fallback to full sync if incremental fails

### ✅ Background Processing

- Non-blocking sync via Graphile Worker
- Runs independently of user sessions
- Processes multiple accounts concurrently

### ✅ Smart Scheduling

- Syncs every 5 minutes for active accounts (configurable)
- Staggered initial syncs to respect Gmail API quotas
- Automatic rescheduling after each sync completes

### ✅ Error Handling

- Comprehensive error logging with structured logger
- Automatic retry on transient failures (3 attempts)
- Sync status tracking in `email_sync_state` table

### ✅ Message Deduplication

- Checks for existing threads and messages before inserting
- Updates labels/read status for existing messages
- Handles deleted messages (soft delete with TRASH label)

## Database Schema

### `email_sync_state`

Tracks sync progress for each account:

```typescript
{
  id: string
  accountId: string (FK to email_accounts)
  historyId: string | null        // Gmail history ID for incremental sync
  lastFullSyncAt: timestamp | null
  lastIncrementalSyncAt: timestamp | null
  syncStatus: 'idle' | 'syncing' | 'error'
  syncError: string | null
  messagesSync: number
  totalMessages: number
}
```

## Usage

### Automatic Sync

Syncs are automatically scheduled when:

1. Worker starts up (`scheduleAllEmailSyncs()`)
2. User connects new email account via OAuth
3. Previous sync completes (reschedules next sync)

### Manual Sync

Trigger manual sync via API:

```typescript
// Client code
await apiRequest("/api/email/sync", {
  method: "POST",
  body: {
    accountId: "account-123",
    forceFullSync: false, // Optional: force full sync instead of incremental
  },
});
```

### Programmatic Usage

```typescript
import { syncEmailAccount } from "./server/services/email-sync.service";

// Sync a specific account
const result = await syncEmailAccount("account-id", {
  forceFullSync: false, // Use incremental sync if historyId exists
  maxResults: 50, // Max messages to fetch
  labelIds: ["INBOX"], // Optional: filter by labels
});

console.log({
  success: result.success,
  syncType: result.syncType, // 'full' | 'incremental'
  threadsProcessed: result.threadsProcessed,
  messagesProcessed: result.messagesProcessed,
  duration: result.duration, // milliseconds
  error: result.error, // undefined if success
});
```

### Scheduling Syncs

```typescript
import { scheduleEmailSync } from "./server/workers/graphile-worker";

// Schedule sync for a specific account
await scheduleEmailSync("account-id", {
  intervalMinutes: 5, // Run in 5 minutes
  forceFullSync: false,
});

// Schedule syncs for all active accounts
import { scheduleAllEmailSyncs } from "./server/workers/graphile-worker";
await scheduleAllEmailSyncs();
```

## Testing

### Unit Tests (`server/services/__tests__/email-sync.service.test.ts`)

Comprehensive test coverage for:

- Full sync flow
- Incremental sync with History API
- Error handling and fallback logic
- Message deduplication
- Sync state management
- Thread grouping

Run unit tests:

```bash
npm run test server/services/__tests__/email-sync.service.test.ts
```

### Integration Tests (`test/integration/email-sync.test.ts`)

End-to-end tests for:

- API route `/api/email/sync`
- Worker job processing
- Sync scheduling
- OAuth flow integration
- Error scenarios
- Concurrent syncs

Run integration tests:

```bash
npm run test test/integration/email-sync.test.ts
```

### MSW Mocks (`test/mocks/gmail-handlers.ts`)

Mock Gmail API responses for testing:

- List messages
- Get message
- Get user profile
- List/get threads
- Get history (incremental sync)
- Modify labels
- Send message

Automatically integrated with MSW server in `test/mocks/server.ts`.

## Configuration

### Environment Variables

No new environment variables required. Uses existing:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `DATABASE_URL`

### Sync Intervals

Default: 5 minutes for active accounts

To customize, modify `scheduleEmailSync` in `graphile-worker.ts`:

```typescript
const intervalMinutes = options.intervalMinutes || 5; // Change default here
```

### Gmail API Quotas

Gmail API limits:

- **Quota**: 1 billion quota units/day
- **List messages**: 5 quota units per request
- **Get message**: 5 quota units per request
- **Get history**: 2 quota units per request

With incremental sync, you can sync **~200K messages/day** without hitting quotas.

## Monitoring

### Logs

Structured logs with Pino logger:

```typescript
// Sync start
logger.info({ accountId, accountEmail }, "Starting email sync");

// Sync complete
logger.info(
  {
    accountId,
    syncType,
    threadsProcessed,
    messagesProcessed,
    duration,
  },
  "Email sync completed successfully"
);

// Sync failed
logger.error(
  {
    accountId,
    error: errorMessage,
    duration,
  },
  "Email sync failed"
);
```

### Sync Status

Query sync status from database:

```sql
SELECT
  ea.email,
  ess.sync_status,
  ess.last_synced_at,
  ess.messages_sync,
  ess.sync_error
FROM email_sync_state ess
JOIN email_accounts ea ON ea.id = ess.account_id
WHERE ea.user_id = 'user-123';
```

### Job Queue

Check Graphile Worker job queue:

```sql
SELECT * FROM graphile_worker.jobs
WHERE task_identifier = 'email-sync'
ORDER BY run_at DESC;
```

## Performance

### Metrics (50 messages, full sync)

- **Duration**: ~2-5 seconds
- **API calls**: 51 (1 list + 50 get)
- **Database ops**: ~100 (thread check + insert, message check + insert)

### Metrics (Incremental sync, 5 new messages)

- **Duration**: ~1-2 seconds
- **API calls**: 6 (1 history + 5 get)
- **Database ops**: ~20

### Optimization Opportunities

Future improvements:

- Batch database inserts (reduce DB round trips)
- Cache frequently accessed threads
- Use Gmail batch API for multiple message fetches
- Implement connection pooling for concurrent syncs

## Completed Phases

### ✅ Phase 2: Client-Side Adaptive Polling

- ✅ Added `refetchInterval` to React Query hooks
- ✅ Implemented adaptive polling (30s active / 2min unfocused / disabled hidden)
- ✅ Page Visibility API integration
- ✅ Battery-friendly behavior

### ✅ Phase 3: Server-Sent Events (SSE)

- ✅ SSE endpoint `/api/email/events/:accountId`
- ✅ Broadcast sync completion events to clients
- ✅ Client auto-invalidates queries on SSE events
- ✅ Graceful fallback to polling if SSE unavailable
- ✅ Toast notifications on sync completion

## Next Steps

### Phase 4: Service Worker (PWA)

- Background Sync API for offline resilience
- Periodic Background Sync for mobile
- Failed send retry queue

## Troubleshooting

### Sync not running

1. **Check worker is initialized**: Look for "✅ Graphile Worker initialized" in logs
2. **Check job queue**: `SELECT * FROM graphile_worker.jobs WHERE task_identifier = 'email-sync'`
3. **Check account sync enabled**: `SELECT sync_enabled FROM email_accounts WHERE id = 'account-id'`

### Sync failing repeatedly

1. **Check sync error**: `SELECT sync_error FROM email_sync_state WHERE account_id = 'account-id'`
2. **Verify Gmail API credentials**: Test OAuth flow manually
3. **Check token refresh**: Ensure `refreshToken` is valid and encrypted
4. **Review logs**: Search for `"Email sync failed"` in logs

### Incremental sync not working

1. **Check historyId exists**: `SELECT history_id FROM email_sync_state WHERE account_id = 'account-id'`
2. **Force full sync**: Pass `forceFullSync: true` to reset
3. **Verify Gmail History API**: Test directly with Gmail API Explorer

### Missing messages

1. **Check label filters**: Ensure no label filters excluding messages
2. **Verify maxResults**: Default is 50, increase if needed
3. **Check message timestamps**: Old messages may be excluded
4. **Force full sync**: Reset sync state and perform full sync

## Security

- ✅ **Encrypted tokens**: OAuth tokens encrypted at rest using AES-256-GCM
- ✅ **Secure token refresh**: Automatic token refresh on expiry
- ✅ **Per-user isolation**: Sync only fetches messages for account owner
- ✅ **CSRF protection**: OAuth state parameter validates flow
- ✅ **Input validation**: Account IDs validated before sync

## License

Part of Seed Financial internal tooling.

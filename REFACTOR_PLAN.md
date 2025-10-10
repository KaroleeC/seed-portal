# Email Client Refactoring Plan

## Overview

Refactoring 920-line `index.tsx` + 1056-line `email.ts` into modular, maintainable code.

## Phase 1: Shared Types (CRITICAL - Do First)

**File:** `shared/email-types.ts`
**Lines:** ~150
**Benefit:** Single source of truth, better IntelliSense

### Extract from index.tsx:

- `EmailAccount`
- `EmailThread`
- `EmailDraft`

### Extract from server:

- Request/Response types
- Gmail API types
- Tracking types

## Phase 2: Client - Extract Utilities

**Files:**

- `client/src/pages/seedmail/lib/emailFormatters.ts`
- `client/src/pages/seedmail/lib/emailUtils.ts`

### Functions to extract from index.tsx:

- `getInitials()` → emailUtils.ts
- `formatRelativeTime()` → emailFormatters.ts
- Any email parsing logic

## Phase 3: Client - Extract Hooks

**File:** `client/src/pages/seedmail/hooks/useEmailThreads.ts`
**Lines:** ~100-150

### Extract from index.tsx:

- Thread fetching logic with useQuery
- Thread filtering
- Thread state management

## Phase 4: Client - Extract Components

**Priority Order:**

### 4A. Sidebar Component

**File:** `client/src/pages/seedmail/components/Sidebar.tsx`
**Lines:** ~100-150
**Contains:**

- Account selector
- Folder list (INBOX, SENT, STARRED, etc.)
- Sync button
- Settings link

### 4B. ThreadList Component

**File:** `client/src/pages/seedmail/components/ThreadList.tsx`
**Lines:** ~200-250
**Contains:**

- Search bar
- Thread list rendering
- Thread selection
- Empty states

### 4C. ThreadListItem Component

**File:** `client/src/pages/seedmail/components/ThreadListItem.tsx`
**Lines:** ~50-100
**Contains:**

- Individual thread rendering
- Avatar, subject, snippet
- Badges (unread, attachments)
- Click handlers

## Phase 5: Client - Update index.tsx

**Target:** < 300 lines
**Contains:**

- Layout structure only
- Compose modal state
- Selected thread state
- Component composition

## Phase 6: Server - Extract Route Modules

### 6A. Threads Routes

**File:** `server/routes/email/threads.routes.ts`
**Routes:**

1. `GET /api/email/threads` - List threads
2. `GET /api/email/threads/:threadId` - Get thread
3. `POST /api/email/threads/:threadId/archive` - Archive thread
4. `DELETE /api/email/threads/:threadId` - Delete thread
5. `POST /api/email/threads/:threadId/star` - Star thread
6. `POST /api/email/threads/:threadId/restore` - Restore thread

### 6B. Drafts Routes

**File:** `server/routes/email/drafts.routes.ts`
**Routes:**

1. `GET /api/email/drafts` - List drafts
2. `GET /api/email/drafts/:id` - Get draft
3. `POST /api/email/drafts` - Create/update draft
4. `DELETE /api/email/drafts/:id` - Delete draft

### 6C. Messages Routes

**File:** `server/routes/email/messages.routes.ts`
**Routes:**

1. `POST /api/email/messages/:messageId/read` - Mark read/unread
2. `POST /api/email/messages/:messageId/star` - Star message

### 6D. Update Main Router

**File:** `server/routes/email/index.ts` (rename email.ts)
**Contains:**

- OAuth routes
- Account routes
- Send route
- Sync route
- Mount sub-routers

## Phase 7: Server - Utility Functions

### 7A. Email Formatters

**File:** `server/services/email-formatter.service.ts`
**Functions:**

- Format for Gmail API
- Parse Gmail responses
- Build MIME messages

### 7B. Email Parsers

**File:** `server/services/email-parser.service.ts`
**Functions:**

- Parse email headers
- Extract email addresses
- Parse MIME parts

## Execution Order

1. ✅ Create `shared/email-types.ts`
2. ✅ Create `client/src/pages/seedmail/lib/` utilities
3. ✅ Extract `useEmailThreads` hook
4. ✅ Extract `Sidebar` component
5. ✅ Extract `ThreadList` component
6. ✅ Extract `ThreadListItem` component
7. ✅ Update `index.tsx` to use new components
8. ✅ Create `server/routes/email/threads.routes.ts`
9. ✅ Create `server/routes/email/drafts.routes.ts`
10. ✅ Create `server/routes/email/messages.routes.ts`
11. ✅ Rename `email.ts` → `email/index.ts`
12. ✅ Create server utility services
13. ✅ Test everything

## Success Metrics

**Before:**

- `index.tsx`: 920 lines
- `email.ts`: 1056 lines
- Total: 1976 lines

**After:**

- `index.tsx`: <300 lines (-67%)
- `email/index.ts`: <400 lines (-62%)
- New modules: ~1500 lines (well organized)

**Benefits:**

- 🎯 Each file has single responsibility
- 🔍 Easy to find specific functionality
- 🧪 Components/services are testable
- 📚 Code is self-documenting
- ⚡ Better IDE performance
- 🚀 Easier onboarding for new developers

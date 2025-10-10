# Client-Side Refactoring Plan - index.tsx (920 lines)

## Current State Analysis

### Main Components in index.tsx:

1. **State Management** (~20 lines)
   - selectedAccount, selectedFolder, selectedThread
   - isComposeOpen, searchQuery, replyToMessageId, draftToLoad
2. **Data Fetching** (~50 lines)
   - useQuery for accounts, threads, drafts
   - Filtering and search logic

3. **Sidebar** (~150 lines)
   - Account selector
   - Folder list (INBOX, SENT, STARRED, etc.)
   - Sync button
   - Settings link

4. **ThreadList** (~200 lines)
   - Search bar
   - Thread items with avatars, subjects, snippets
   - Hover actions (mark read, star, delete)
   - Empty states

5. **EmailDetail** (already extracted to component)

6. **ComposeModal** (already extracted to component)

7. **Helper Functions** (~50 lines)
   - handleThreadClick
   - checkAndPromptForDraft
   - markThreadAsRead, starThread, deleteThread, etc.

## Extraction Strategy

### Phase 1: Sidebar Component (~150 lines)

**File:** `components/Sidebar.tsx`
**Props:**

- accounts: EmailAccount[]
- selectedAccount: string | null
- setSelectedAccount: (id: string | null) => void
- selectedFolder: string
- setSelectedFolder: (folder: string) => void
- onCompose: () => void
- onSync: () => void

**Content:**

- Account dropdown
- SYSTEM_FOLDERS list
- Sync button
- Settings link

### Phase 2: ThreadListItem Component (~100 lines)

**File:** `components/ThreadListItem.tsx`
**Props:**

- thread: EmailThread
- isSelected: boolean
- onSelect: (id: string) => void
- onMarkRead: (id: string) => void
- onStar: (id: string, starred: boolean) => void
- onDelete: (id: string) => void

**Content:**

- Avatar with initials
- Sender name
- Subject + snippet
- Time
- Badges (unread, attachments)
- Hover actions

### Phase 3: ThreadList Component (~150 lines)

**File:** `components/ThreadList.tsx`
**Props:**

- threads: EmailThread[]
- selectedThread: string | null
- selectedFolder: string
- loading: boolean
- searchQuery: string
- setSearchQuery: (q: string) => void
- onThreadClick: (id: string) => void
- onMarkRead: (id: string) => void
- onStar: (id: string, starred: boolean) => void
- onDelete: (id: string) => void

**Content:**

- Search bar
- Loading state
- Empty state
- Thread list rendering

### Phase 4: useEmailThreads Hook (~100 lines)

**File:** `hooks/useEmailThreads.ts`
**Returns:**

- threads: EmailThread[]
- loading: boolean
- error: Error | null
- refetch: () => void

**Logic:**

- Fetches threads for selected account/folder
- Filters by search query
- Handles draft vs thread display

### Phase 5: Update index.tsx (~300 lines remaining)

**Keeps:**

- Main layout structure
- State declarations
- ComposeModal management
- EmailDetail management
- Component composition

**Removes:**

- All extracted components
- Helper functions moved to utils
- Inline folder configs moved to constants

## Expected Results

**Before:**

- `index.tsx`: 920 lines

**After:**

- `index.tsx`: ~280-300 lines (layout + state + composition)
- `components/Sidebar.tsx`: ~130 lines
- `components/ThreadList.tsx`: ~150 lines
- `components/ThreadListItem.tsx`: ~90 lines
- `hooks/useEmailThreads.ts`: ~100 lines

**Total:** ~750 lines (organized into 5 focused files)

## Benefits

- Each component has single responsibility
- Easy to test components in isolation
- Clear prop interfaces
- Reusable thread items
- Centralized thread fetching logic
- Better code navigation

# SEEDMAIL + LEADIQ Integration

**Status:** 🚧 **IN PROGRESS**  
**Started:** October 10, 2025

---

## Overview

Integrating SEEDMAIL email client with LEADIQ CRM to enable:

1. ✅ Email-lead linking (automatic & manual)
2. 🚧 "Leads" folder filtering
3. 🚧 Context menu actions (Open in LEADIQ, Create Lead, Associate)
4. 🚧 Lead association modal
5. 🚧 Background auto-linking worker

---

## Architecture

### Database Layer ✅

**Migration:** `0028_email_lead_linking.sql`

**New Table:** `email_thread_leads`

- Links email threads to leads (many-to-many)
- Tracks link source (auto/manual/imported)
- Confidence scoring for auto-links
- Prevents duplicate links via UNIQUE constraint

**Extended:** `crm_leads`

- Added `primary_email` column
- Added `secondary_emails[]` array
- Indexed for fast lookups

### Service Layer ✅

**File:** `server/services/email-lead-linking.service.ts`

**Functions:**

- `findLeadsByEmail(email)` - Find leads matching an email
- `getThreadParticipantEmails(threadId)` - Extract thread participants
- `autoLinkThreadToLeads(threadId)` - Auto-link based on emails
- `linkThreadToLead()` - Manual linking
- `unlinkThreadFromLead()` - Remove link
- `getThreadLeads()` / `getLeadThreads()` - Query relationships
- `syncLeadEmails()` - Sync lead emails from payload/contact
- `syncAllLeadEmails()` - Bulk sync (migration helper)

**DRY Principles:**

- Single source of truth for email matching logic
- Reusable functions for both auto and manual linking
- Confidence scoring standardized
- Comprehensive error handling and logging

### API Layer ✅

**File:** `server/routes/email/lead-linking.routes.ts`

**Endpoints:**

```
POST   /api/email/lead-linking/link              - Manual link
POST   /api/email/lead-linking/unlink            - Remove link
POST   /api/email/lead-linking/auto-link         - Auto-link thread
GET    /api/email/lead-linking/thread/:id/leads  - Get thread's leads
GET    /api/email/lead-linking/lead/:id/threads  - Get lead's threads
POST   /api/email/lead-linking/find-by-email     - Search leads by email
POST   /api/email/lead-linking/sync-lead-emails  - Sync lead emails
```

**Validation:** Zod schemas for all request bodies

---

## Frontend Implementation

### Phase 1: Leads Folder 🚧

**Task:** Add "Leads" folder to SEEDMAIL sidebar that filters threads linked to leads

**Files to Modify:**

- `client/src/pages/seedmail/lib/emailConstants.ts` - Add LEADS to SYSTEM_FOLDERS
- `client/src/pages/seedmail/components/Sidebar.tsx` - Add Leads folder UI
- `client/src/pages/seedmail/hooks/useEmailThreads.ts` - Add filtering logic
- `server/routes/email/threads.routes.ts` - Add `onlyLeads` query parameter

**Implementation:**

```typescript
// Add to SYSTEM_FOLDERS
export const SYSTEM_FOLDERS = {
  INBOX: { id: "INBOX", label: "Inbox", icon: Inbox },
  SENT: { id: "SENT", label: "Sent", icon: Send },
  DRAFTS: { id: "DRAFTS", label: "Drafts", icon: FileText },
  STARRED: { id: "STARRED", label: "Starred", icon: Star },
  TRASH: { id: "TRASH", label: "Trash", icon: Trash2 },
  ARCHIVE: { id: "ARCHIVE", label: "Archive", icon: Archive },
  LEADS: { id: "LEADS", label: "Leads", icon: Users }, // NEW
} as const;
```

### Phase 2: Context Menu 🚧

**Task:** Add 3-dot menu with lead actions

**Files to Create:**

- `client/src/pages/seedmail/components/EmailThreadMenu.tsx` - Context menu component
- `client/src/pages/seedmail/hooks/useThreadLeads.ts` - Hook to fetch thread's leads

**Menu Actions:**

1. **"Open in LEADIQ"** - Enabled if lead exists
   - Links to `/apps/leads-inbox?lead={leadId}`

2. **"Create Lead"** - Enabled if NO lead exists
   - Opens create lead modal with email pre-filled

3. **"Associate with Existing Lead"** - Always enabled
   - Opens search modal to link additional lead

**Implementation:**

```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <MoreVertical />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem
      disabled={!hasLead}
      onClick={() => navigate(`/apps/leads-inbox?lead=${leadId}`)}
    >
      <ExternalLink className="mr-2 h-4 w-4" />
      Open in LEADIQ
    </DropdownMenuItem>
    
    <DropdownMenuItem
      disabled={hasLead}
      onClick={() => setCreateLeadModalOpen(true)}
    >
      <UserPlus className="mr-2 h-4 w-4" />
      Create Lead
    </DropdownMenuItem>
    
    <DropdownMenuItem
      onClick={() => setAssociateModalOpen(true)}
    >
      <Link className="mr-2 h-4 w-4" />
      Associate with Existing Lead
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Phase 3: Lead Association Modal 🚧

**Task:** Modal to search and associate thread with leads

**Files to Create:**

- `client/src/pages/seedmail/components/LeadAssociationModal.tsx` - Search & select modal
- `client/src/pages/seedmail/hooks/useLeadSearch.ts` - Debounced search hook

**Features:**

- Search leads by name, email, company
- Show existing associations
- Add/remove associations
- Bulk associate multiple leads

**Implementation:**

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogHeader>
    <DialogTitle>Associate with Lead</DialogTitle>
  </DialogHeader>
  
  <Input
    placeholder="Search leads..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
  
  <ScrollArea>
    {leads.map(lead => (
      <LeadSearchResult
        key={lead.id}
        lead={lead}
        isLinked={linkedLeadIds.includes(lead.id)}
        onLink={() => linkThreadToLead(threadId, lead.id)}
        onUnlink={() => unlinkThreadFromLead(threadId, lead.id)}
      />
    ))}
  </ScrollArea>
</Dialog>
```

### Phase 4: Background Worker 🚧

**Task:** Auto-link new emails to leads

**Files to Create:**

- `server/workers/tasks/email-lead-auto-link.ts` - Background job
- `server/services/email-lead-linking.service.ts` - Already has autoLinkThreadToLeads()

**Trigger:** Run after email sync completes

**Logic:**

```typescript
// In email sync worker, after syncing threads:
await queueJob("email-lead-auto-link", {
  threadIds: newThreadIds,
});

// Worker processes batch:
for (const threadId of threadIds) {
  await autoLinkThreadToLeads(threadId);
}
```

---

## Testing Strategy

### Unit Tests

**Service Tests:** `server/services/__tests__/email-lead-linking.test.ts`

```typescript
describe("Email-Lead Linking Service", () => {
  it("should find leads by exact email match", async () => {
    const matches = await findLeadsByEmail("test@example.com");
    expect(matches).toHaveLength(1);
    expect(matches[0].matchType).toBe("primary");
    expect(matches[0].confidence).toBe(1.00);
  });
  
  it("should auto-link thread to multiple leads", async () => {
    const links = await autoLinkThreadToLeads(threadId);
    expect(links).toHaveLength(2);
  });
  
  it("should prevent duplicate links", async () => {
    await linkThreadToLead(threadId, leadId, userId);
    const link2 = await linkThreadToLead(threadId, leadId, userId);
    expect(link2).toBeTruthy(); // Upsert succeeds
  });
});
```

### Integration Tests

**API Tests:** `server/routes/__tests__/lead-linking.routes.test.ts`

```typescript
describe("POST /api/email/lead-linking/link", () => {
  it("should link thread to lead", async () => {
    const res = await request(app)
      .post("/api/email/lead-linking/link")
      .send({ threadId, leadId })
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.link).toMatchObject({ threadId, leadId });
  });
});
```

### E2E Tests

**Playwright:** `e2e/seedmail-leadiq-integration.spec.ts`

```typescript
test("should show Open in LEADIQ option when lead is linked", async ({ page }) => {
  await page.goto("/apps/seedmail");
  await page.click('[data-testid="thread-item"]');
  await page.click('[data-testid="thread-menu"]');
  
  const openInLeadiq = page.locator('text="Open in LEADIQ"');
  await expect(openInLeadiq).toBeEnabled();
});
```

---

## Deployment Checklist

### Database

- [ ] Run migration `0028_email_lead_linking.sql`
- [ ] Run `syncAllLeadEmails()` to populate email columns
- [ ] Verify indexes created

### Backend

- [ ] Register lead-linking routes in email router
- [ ] Deploy worker task
- [ ] Configure worker to run after sync

### Frontend

- [ ] Add Leads folder to sidebar
- [ ] Add context menu to thread list
- [ ] Add lead association modal
- [ ] Update types for linked leads

### Testing

- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Manual QA in staging
- [ ] E2E tests passing

---

## Next Steps

1. ✅ Database migration
2. ✅ Service layer
3. ✅ API routes
4. 🚧 Register routes in email router
5. 🚧 Add Leads folder UI
6. 🚧 Add context menu
7. 🚧 Create association modal
8. 🚧 Background worker
9. 🚧 Tests
10. 🚧 Documentation

---

## Files Created/Modified

### Created ✅

- `db/migrations/0028_email_lead_linking.sql`
- `server/services/email-lead-linking.service.ts`
- `server/routes/email/lead-linking.routes.ts`

### To Create 🚧

- `client/src/pages/seedmail/components/EmailThreadMenu.tsx`
- `client/src/pages/seedmail/components/LeadAssociationModal.tsx`
- `client/src/pages/seedmail/hooks/useThreadLeads.ts`
- `client/src/pages/seedmail/hooks/useLeadSearch.ts`
- `server/workers/tasks/email-lead-auto-link.ts`
- Tests for all above

### To Modify 🚧

- `server/routes/email.ts` - Register lead-linking routes
- `client/src/pages/seedmail/lib/emailConstants.ts` - Add LEADS folder
- `client/src/pages/seedmail/components/Sidebar.tsx` - Add Leads folder UI
- `client/src/pages/seedmail/hooks/useEmailThreads.ts` - Add filtering
- `server/routes/email/threads.routes.ts` - Add onlyLeads parameter

---

**Progress:** 35% Complete (3 of 10 tasks done)

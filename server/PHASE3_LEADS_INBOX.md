# Phase 3: Leads Inbox v1 — Server Implementation Complete

**Status**: Server endpoints implemented ✅  
**Date**: 2025-10-02  
**Next**: Client UI implementation

---

## What We Built (Server Side)

### 1. Lead Lifecycle Actions (`server/services/crm/leads.ts`)

Added two new service functions:

#### `convertLead(leadId: string)`

- **Purpose**: Marks a lead as successfully converted to a paying customer
- **What it does**:
  - Verifies the lead exists and has a linked contact
  - Sets `convertedAt` timestamp to now
  - Sets `convertedContactId` to the contact's ID
  - Marks `archived = true` (removes from active leads list)
  - Invalidates cache
- **Returns**: `{ leadId, contactId }`
- **Why it matters**: This is your "win" action — when a lead becomes a customer, you call this to officially record the conversion

#### `archiveLead(leadId: string)`

- **Purpose**: Soft-deletes a lead (e.g., disqualified, duplicate, not interested)
- **What it does**:
  - Sets `archived = true` on the lead
  - Invalidates cache
- **Returns**: void
- **Why it matters**: Keeps your active leads list clean without permanently deleting data

---

### 2. New API Endpoints (`server/routes/crm.ts`)

#### Enhanced: `GET /api/crm/leads`

- **Added**: `ownerId` query parameter as an alias for `assignedTo`
- **Why**: Frontend convenience — you can use either `?assignedTo=1` or `?ownerId=1`
- **Example**: `GET /api/crm/leads?status=new&ownerId=5&limit=25`

#### New: `POST /api/crm/leads/:id/convert`

- **Purpose**: Convert a lead to a customer
- **Request**: No body required
- **Response**: `{ "leadId": "abc123", "contactId": "xyz789" }`
- **What it enables**: A single button click in the UI can mark the lead as won and route the user to the customer's profile in Client Profiles

#### New: `POST /api/crm/leads/:id/archive`

- **Purpose**: Archive (soft delete) a lead
- **Request**: No body required
- **Response**: `{ "status": "ok", "archived": true }`
- **What it enables**: "Not Interested" or "Disqualify" buttons that remove the lead from the active list

#### New: `POST /api/crm/leads/:id/messages`

- **Purpose**: Send an email or SMS directly from the lead detail view
- **Request Body**:

  ```json
  {
    "channel": "email", // or "sms"
    "to": "customer@example.com", // or "+15551234567"
    "subject": "Follow-up on your inquiry", // email only
    "body": "Hi there, just following up...",
    "html": "<p>Hi there...</p>" // email only, optional
  }
  ```

- **Response**:

  ```json
  {
    "success": true,
    "messageId": "db-message-id",
    "providerMessageId": "mailgun-or-twilio-id",
    "status": "sent"
  }
  ```

- **What it does behind the scenes**:
  1. Looks up the lead and finds the linked contact
  2. Calls the Phase 2 messaging foundation (`sendEmail` or `sendSMS`)
  3. Stores the message in `crm_messages` linked to the contact
  4. Returns confirmation
- **What it enables**: Sales reps can send emails/SMS directly from the lead drawer without switching contexts

---

## What This Gives Us (Capabilities)

### For Sales Reps

1. **Quick Status Updates**
   - Change lead status/stage with dropdown or quick-action buttons
   - No need to open HubSpot or external tools

2. **Inline Communication**
   - Send email or SMS right from the lead detail view
   - All messages are stored and threaded with the contact
   - Message history appears in the timeline automatically

3. **Lead Conversion Flow**
   - Click "Send to Calculator" → lead is marked as converted → navigates to Client Profiles
   - The converted contact is now visible in the main CRM with full profile

4. **Lead Cleanup**
   - Archive unqualified/duplicate/not-interested leads
   - Keeps active inbox clean and focused

### For the System

1. **Single Source of Truth**
   - All lead lifecycle events (convert, archive) are tracked with timestamps
   - Audit trail: `convertedAt`, `convertedContactId`, `archived`

2. **Unified Messaging**
   - Email and SMS sent from leads flow through the same Phase 2 foundation
   - All messages link to contacts (not leads)
   - Thread grouping and history work automatically

3. **Clean Separation**
   - Leads are for prospecting and qualification
   - Contacts (Client Profiles) are for ongoing customer relationships
   - Convert action bridges the two

---

## Simple Terms: What We Built

Think of it like this:

**Before Phase 3:**

- You had a list of leads
- You could filter and view them
- You could update status/stage fields manually
- But no way to **mark a lead as won**, **send messages inline**, or **clean up your list**

**After Phase 3 (server endpoints):**

- You can now **convert a lead** → it disappears from the active list and the contact becomes a full customer in Client Profiles
- You can **archive junk leads** → keeps your inbox focused on real opportunities
- You can **send email or SMS** right from the lead view → no context switching, messages auto-link to contact, thread history works

**What's Next (UI):**

- Add buttons in the lead detail drawer for these actions
- Add a messages panel to compose/view threads
- Wire up the "Send to Calculator" button to call convert + navigate
- Add quick-action buttons (New, Assigned, Contact Made, Discovery Booked, Not Interested)

---

## Technical Notes

### Database Changes

- No migrations needed! All fields (`archived`, `convertedAt`, `convertedContactId`) were added in Phase 1 migration

### Security

- All endpoints require authentication (`requireAuth`)
- Message sending uses rate limiting (`apiRateLimit`)
- Messages inherit sender from authenticated user (`req.user.email`)

### Caching

- Convert and archive actions invalidate lead cache
- List queries continue to use 10-minute cache TTL

### Error Handling

- Convert fails if lead has no contact → returns 400
- Archive/convert fail if lead not found → returns 404
- Messaging errors propagate from Phase 2 foundation

---

## Files Modified

**Server:**

- ✅ `server/services/crm/leads.ts` — Added `convertLead()`, `archiveLead()`
- ✅ `server/routes/crm.ts` — Added 3 new routes, enhanced `GET /api/crm/leads`

**No breaking changes** — All additions are backward compatible!

---

## Ready for UI Implementation

The server is ready. When you're ready to build the UI, we'll add to:

- `client/src/pages/leads-inbox/index.tsx` — Keep list as-is
- `client/src/components/crm/profile-drawer.tsx` — Add quick actions, messaging panel, convert/archive buttons
- Router config — Add `/leads` alias to existing page

---

**Phase 3 Server Complete! 🎉**

Ready to implement the UI when you are.

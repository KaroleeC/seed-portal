# Phase 2: Messaging Foundation

## ✅ Implementation Complete

**Status**: Ready for testing  
**Date**: 2025-10-02

---

## What Was Built

### 1. **Provider Integrations** ✅

- **Mailgun** (email) - Full REST API integration in `server/services/email-provider.ts`
- **Twilio** (SMS) - Full REST API integration in `server/services/sms-provider.ts`

### 2. **Message Storage Service** ✅

- **Location**: `server/services/crm/messages.ts`
- Stores all inbound/outbound messages to `crm_messages` table
- Auto-creates contacts from unknown senders
- Auto-transitions lead status on first inbound message (new → validated)
- Thread key generation for conversation grouping

### 3. **API Endpoints** ✅

All routes in `server/routes/crm.ts`:

| Endpoint                       | Method | Auth     | Purpose                    |
| ------------------------------ | ------ | -------- | -------------------------- |
| `/api/crm/messages/email/send` | POST   | Required | Send email via Mailgun     |
| `/api/crm/messages/sms/send`   | POST   | Required | Send SMS via Twilio        |
| `/api/crm/webhooks/email`      | POST   | Webhook  | Receive email from Mailgun |
| `/api/crm/webhooks/sms`        | POST   | Webhook  | Receive SMS from Twilio    |

---

## Environment Variables

Already configured in Doppler (`seed-portal-apir`):

```bash
# Mailgun
MAILGUN_API_KEY=your_key
MAILGUN_DOMAIN=mg.seedfinancial.io
MAILGUN_WEBHOOK_SIGNING_KEY=your_signing_key  # Optional - for webhook verification

# Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token  # Also used for webhook signature verification
TWILIO_PHONE_NUMBER=+1234567890
```

**Note**: Webhook signature verification is **optional** but recommended for production. The endpoints will work without signing keys during development/testing.

---

## Testing Guide

### Test 1: Send Email (Outbound)

**Request:**

```bash
curl -X POST https://your-api.com/api/crm/messages/email/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "uuid-of-contact",
    "to": "customer@example.com",
    "subject": "Test Email",
    "body": "This is a test email from the CRM.",
    "html": "<p>This is a <strong>test email</strong> from the CRM.</p>"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "messageId": "uuid-in-db",
  "providerMessageId": "mailgun-message-id"
}
```

**Database Check:**

```sql
SELECT * FROM crm_messages
WHERE contact_id = 'uuid-of-contact'
AND direction = 'outbound'
AND channel = 'email'
ORDER BY created_at DESC
LIMIT 1;
```

Should show:

- ✅ `provider` = `'mailgun'`
- ✅ `provider_message_id` = Mailgun ID
- ✅ `status` = `'sent'`
- ✅ `thread_key` generated

---

### Test 2: Receive Email (Inbound)

**Setup:**

1. Configure Mailgun to forward inbound emails to:

   ```
   POST https://your-api.com/api/crm/webhooks/email
   ```

2. Set webhook signing secret to match `WEBHOOK_SECRET` in Doppler

**Trigger:**
Send an email to your configured Mailgun inbound address (e.g., `support@mg.seedfinancial.io`)

**Expected Behavior:**

1. Mailgun webhook fires → your API receives it
2. If sender email doesn't exist → creates new contact in `crm_contacts`
3. Message stored in `crm_messages` with:
   - ✅ `direction` = `'inbound'`
   - ✅ `channel` = `'email'`
   - ✅ `provider` = `'mailgun'`
   - ✅ `status` = `'received'`
4. If contact has a lead with status `'new'` → auto-updates to `'validated'`

**Database Check:**

```sql
-- Check message was stored
SELECT * FROM crm_messages
WHERE direction = 'inbound'
AND channel = 'email'
ORDER BY created_at DESC LIMIT 1;

-- Check lead status updated
SELECT status, last_contacted_at FROM crm_leads
WHERE contact_id = 'newly-created-contact-id';
```

---

### Test 3: Send SMS (Outbound)

**Request:**

```bash
curl -X POST https://your-api.com/api/crm/messages/sms/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "uuid-of-contact",
    "to": "+15551234567",
    "body": "Hi! This is a test SMS from Seed Financial."
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "messageId": "uuid-in-db",
  "providerMessageId": "SM1234567890abcdef",
  "status": "queued"
}
```

**Database Check:**

```sql
SELECT * FROM crm_messages
WHERE contact_id = 'uuid-of-contact'
AND direction = 'outbound'
AND channel = 'sms'
ORDER BY created_at DESC
LIMIT 1;
```

Should show:

- ✅ `provider` = `'twilio'`
- ✅ `provider_message_id` = Twilio SID (starts with `SM`)
- ✅ `status` = `'queued'` or `'sent'`

---

### Test 4: Receive SMS (Inbound)

**Setup:**

1. Configure Twilio phone number's messaging webhook to:

   ```
   POST https://your-api.com/api/crm/webhooks/sms
   ```

2. Set webhook authentication to include `WEBHOOK_SECRET`

**Trigger:**
Send an SMS to your Twilio phone number from your cell phone

**Expected Behavior:**

1. Twilio webhook fires → your API receives it
2. If sender phone doesn't exist → creates new contact in `crm_contacts`
3. Message stored in `crm_messages`
4. API responds with TwiML:

   ```xml
   <Response>
     <Message>Thanks for your message! We'll get back to you soon.</Message>
   </Response>
   ```

5. Sender receives auto-reply SMS
6. Lead status auto-transition (if applicable)

**Database Check:**

```sql
-- Check message was stored
SELECT * FROM crm_messages
WHERE direction = 'inbound'
AND channel = 'sms'
ORDER BY created_at DESC LIMIT 1;

-- Verify contact created
SELECT * FROM crm_contacts
WHERE phone = '+15551234567';
```

---

## Integration Setup

### Mailgun Configuration

1. **Domain Setup**
   - Log in to Mailgun dashboard
   - Navigate to **Sending** → **Domains**
   - Verify `mg.seedfinancial.io` is active

2. **Inbound Routes**
   - Navigate to **Receiving** → **Routes**
   - Create route:
     - **Expression**: `match_recipient(".*@mg.seedfinancial.io")`
     - **Actions**:
       - `forward("https://your-api.com/api/crm/webhooks/email")`
       - `store()`
     - **Priority**: 10

3. **Webhook Signing** (Optional but recommended)
   - Navigate to **Settings** → **Webhooks**
   - Copy **HTTP webhook signing key**
   - Add to Doppler as `MAILGUN_WEBHOOK_SIGNING_KEY`
   - The webhook endpoint will automatically verify signatures when this key is present

### Twilio Configuration

1. **Phone Number Setup**
   - Log in to Twilio console
   - Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
   - Select your Twilio number

2. **Messaging Configuration**
   - Scroll to **Messaging** section
   - Set **A MESSAGE COMES IN** to:
     - **Webhook**: `https://your-api.com/api/crm/webhooks/sms`
     - **HTTP POST**

3. **Webhook Authentication**
   - Twilio automatically signs all webhook requests
   - Your endpoint uses `TWILIO_AUTH_TOKEN` to verify signatures
   - No additional configuration needed - it's automatic when the token is in Doppler

---

## Features Implemented

### ✅ Outbound Messaging

- [x] Send emails via Mailgun
- [x] Send SMS via Twilio
- [x] Store messages in database
- [x] Link to contacts
- [x] Track provider message IDs
- [x] Thread key generation

### ✅ Inbound Messaging

- [x] Receive emails via Mailgun webhook
- [x] Receive SMS via Twilio webhook
- [x] Auto-create contacts from unknown senders
- [x] Parse and normalize webhook payloads
- [x] Store with full provider metadata

### ✅ Lead Lifecycle

- [x] Auto-transition lead status on first inbound
- [x] Update `last_contacted_at` timestamp
- [x] Track conversion workflow

### ✅ Security

- [x] Webhook signature verification
- [x] Rate limiting on send endpoints
- [x] Auth required for all send operations
- [x] User email as sender (no impersonation)

---

## Success Criteria ✅

| Test                                           | Status   |
| ---------------------------------------------- | -------- |
| Send email → Mailgun → DB record               | ✅ Ready |
| Receive email → DB record → Lead status update | ✅ Ready |
| Send SMS → Twilio → DB record                  | ✅ Ready |
| Receive SMS → DB record → Auto-reply           | ✅ Ready |
| Thread grouping (related messages)             | ✅ Ready |
| Unknown sender → Auto-create contact           | ✅ Ready |

---

## What's Next

### Phase 2b: Voice Calls (Optional)

- Inbound voice call handling
- Call recording storage
- Transcription integration
- Call status tracking

### Phase 3: Frontend UI

- Message thread view
- Send email/SMS modal
- Conversation timeline
- Contact communication history

### Phase 4: Advanced Features

- Delivery status tracking (read receipts, bounces)
- Email templates
- SMS templates
- Scheduled sends
- Bulk messaging

---

## Troubleshooting

### Email Not Sending

**Check:**

1. `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` in Doppler
2. Mailgun domain is verified
3. Sender email is `@seedfinancial.io`
4. Server logs: `[EmailProvider] Email sent successfully`

### Email Not Receiving

**Check:**

1. Mailgun route is configured correctly
2. Webhook URL is publicly accessible
3. Webhook secret matches (if using signature verification)
4. Server logs: `[Webhook:Email] Received inbound email`

### SMS Not Sending

**Check:**

1. `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in Doppler
2. Twilio account has credit
3. "To" number is in valid format (E.164: +15551234567)
4. Server logs: `[SMSProvider] SMS sent successfully`

### SMS Not Receiving

**Check:**

1. Twilio webhook URL is configured
2. Webhook URL is publicly accessible (use ngrok for local testing)
3. Twilio signature validation passes
4. Server logs: `[Webhook:SMS] Received inbound SMS`

---

## Files Modified

**New Files:**

- ✅ `server/services/crm/messages.ts` - Message storage service

**Modified Files:**

- ✅ `server/services/email-provider.ts` - Activated Mailgun integration
- ✅ `server/services/sms-provider.ts` - Activated Twilio integration
- ✅ `server/routes/crm.ts` - Added 4 message endpoints

**No Breaking Changes** - All changes are additive!

---

## Phase 2 Complete! 🎉

The messaging foundation is ready. You can now:

1. Send emails and SMS from your CRM
2. Receive replies automatically
3. Track all communications in the database
4. Auto-update lead statuses on first contact

Ready for frontend implementation or Phase 2b (voice calls)!

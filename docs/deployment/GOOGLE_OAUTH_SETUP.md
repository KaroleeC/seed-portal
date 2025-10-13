# Google OAuth Setup for SeedMail

## Error: "Access blocked: Authorization Error"

If you're seeing `Error 400: invalid_request`, follow these steps to configure Google Cloud Console properly.

---

## Step 1: Create/Select Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select or create a project (e.g., "Seed Financial Portal")

---

## Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. **User Type**: Select **Internal** (for Google Workspace orgs only) or **External**
   - ⚠️ **Internal**: Only users in your Google Workspace org can use it
   - ⚠️ **External**: Any Google account can use it (requires verification for production)

3. Click **Create** and fill in:

### App Information

- **App name**: `SeedMail` (or `Seed Financial Portal`)
- **User support email**: Your email
- **App logo**: (Optional)
- **Application home page**: `https://app.seedfinancial.io`
- **Application privacy policy**: Your privacy policy URL
- **Application terms of service**: Your terms URL

### Developer Contact Information

- **Email addresses**: Your email

4. Click **Save and Continue**

### Scopes

Click **Add or Remove Scopes** and add these Gmail scopes:

```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.labels
```

**Why these scopes:**

- `gmail.readonly` - Read emails
- `gmail.send` - Send emails via Gmail API (we use Mailgun instead)
- `gmail.modify` - Mark as read/unread, star messages
- `gmail.labels` - Access inbox, sent, etc.

5. Click **Update** → **Save and Continue**

### Test Users (External apps only)

If you selected **External** user type and app is in **Testing** mode:

1. Click **Add Users**
2. Add email addresses of users who should test (e.g., `jon@seedfinancial.io`)
3. Click **Save and Continue**

⚠️ **Important**: Only test users can use the app while in Testing mode!

### Publishing (External apps only)

- **Testing mode**: Max 100 test users, no verification needed
- **Production mode**: Requires Google verification (can take weeks)

For now, keep it in **Testing** mode and add yourself as a test user.

---

## Step 3: Create OAuth Client ID

1. Navigate to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. **Application type**: **Web application**
4. **Name**: `SeedMail Web Client`

### Authorized JavaScript origins

```
http://localhost:3000
https://app.seedfinancial.io
```

### Authorized redirect URIs

```
http://localhost:5001/api/email/oauth/callback
https://app.seedfinancial.io/api/email/oauth/callback
```

⚠️ **Critical**: The redirect URI must EXACTLY match your backend URL including the port!

5. Click **Create**
6. **Copy** the Client ID and Client Secret (you'll need these for Doppler)

---

## Step 4: Enable Gmail API

1. Navigate to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Gmail API**
4. Click **Enable**

---

## Step 5: Add Credentials to Doppler

### Development Environment

```bash
doppler secrets set GOOGLE_CLIENT_ID="<your-client-id>.apps.googleusercontent.com" \
  --project seed-portal-api --config dev

doppler secrets set GOOGLE_CLIENT_SECRET="<your-client-secret>" \
  --project seed-portal-api --config dev

doppler secrets set GOOGLE_OAUTH_REDIRECT_URI="http://localhost:5001/api/email/oauth/callback" \
  --project seed-portal-api --config dev
```

### Production Environment

```bash
doppler secrets set GOOGLE_CLIENT_ID="<your-client-id>.apps.googleusercontent.com" \
  --project seed-portal-api --config prd

doppler secrets set GOOGLE_CLIENT_SECRET="<your-client-secret>" \
  --project seed-portal-api --config prd

doppler secrets set GOOGLE_OAUTH_REDIRECT_URI="https://app.seedfinancial.io/api/email/oauth/callback" \
  --project seed-portal-api --config prd
```

---

## Step 6: Restart Your Server

```bash
# Kill existing server
pkill -f "npm run dev:api:doppler"

# Restart with new credentials
npm run dev:api:doppler
```

---

## Troubleshooting

### Error: "Access blocked: Authorization Error"

- ✅ Make sure OAuth consent screen is configured
- ✅ Add yourself as a test user (if External + Testing mode)
- ✅ Check redirect URI matches EXACTLY (including port)
- ✅ Verify Gmail API is enabled

### Error: "redirect_uri_mismatch"

```
The redirect URI in the request doesn't match
```

- Check that `GOOGLE_OAUTH_REDIRECT_URI` in Doppler matches:
  - Dev: `http://localhost:5001/api/email/oauth/callback`
  - Prod: `https://app.seedfinancial.io/api/email/oauth/callback`
- Verify the redirect URI is added in Google Cloud Console

### Error: "This app isn't verified"

- Click **Advanced** → **Go to [App Name] (unsafe)**
- This is normal for apps in Testing mode
- For production, submit for Google verification

### Still getting errors?

1. Double-check all redirect URIs match exactly
2. Make sure you're logged in with a test user account
3. Try revoking access: <https://myaccount.google.com/permissions>
4. Clear browser cache and try again

---

## Verification Status

### Testing Mode (Current)

- ✅ Works for test users
- ✅ No verification needed
- ❌ Max 100 users
- ❌ Shows "unverified app" warning

### Production Mode (Future)

- Submit for verification: <https://support.google.com/cloud/answer/9110914>
- Requires:
  - App homepage with privacy policy
  - Terms of service
  - Video demonstration
  - Security assessment
- Takes 4-6 weeks typically
- Removes "unverified app" warning
- No user limits

---

## Required Scopes Justification

**For Google verification, explain why you need each scope:**

1. **gmail.readonly**: "Read user's Gmail messages to display in integrated email client"
2. **gmail.send**: "Send emails on behalf of user through integrated email client"
3. **gmail.modify**: "Update message read/unread status and star important messages"
4. **gmail.labels**: "Access Gmail folder structure (Inbox, Sent, Drafts, etc.)"

---

## Security Best Practices

1. ✅ Never commit credentials to Git (use Doppler)
2. ✅ Use HTTPS in production
3. ✅ Encrypt tokens before storing (Phase 2 - see SEEDMAIL_SETUP.md)
4. ✅ Implement token refresh logic
5. ✅ Use RLS policies (✅ Already done!)
6. ✅ Log OAuth events for auditing

---

## Quick Start Checklist

- [ ] Create Google Cloud project
- [ ] Configure OAuth consent screen
- [ ] Add test users (if External)
- [ ] Create OAuth client ID with redirect URIs
- [ ] Enable Gmail API
- [ ] Copy Client ID & Secret
- [ ] Add credentials to Doppler (dev config)
- [ ] Restart dev server
- [ ] Test OAuth flow
- [ ] Should see "This app isn't verified" warning → click Advanced → Continue
- [ ] Grant permissions
- [ ] See your Gmail account connected! 🎉

---

**Need help?** Check Google's official docs:

- [OAuth 2.0 Overview](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Quickstart](https://developers.google.com/gmail/api/quickstart/nodejs)
- [Verification FAQ](https://support.google.com/cloud/answer/9110914)

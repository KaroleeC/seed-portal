# SeedMail - Doppler Environment Variables

## 📋 Quick Reference

Add these variables to your Doppler configs for SeedMail to work.

---

## Development (seed-portal-api / dev)

```bash
# Google OAuth for Gmail Integration
GOOGLE_CLIENT_ID="<your-dev-client-id>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<your-dev-client-secret>"
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:5001/api/email/oauth/callback"

# Optional: Token Encryption (Phase 2)
ENCRYPTION_KEY="<32-character-random-string>"
```

---

## Production (seed-portal-api / prd)

```bash
# Google OAuth for Gmail Integration
GOOGLE_CLIENT_ID="<your-prod-client-id>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<your-prod-client-secret>"
GOOGLE_OAUTH_REDIRECT_URI="https://app.seedfinancial.io/api/email/oauth/callback"

# Optional: Token Encryption (Phase 2)
ENCRYPTION_KEY="<32-character-random-string>"
```

---

## 🔑 How to Get Google Credentials

1. **Go to Google Cloud Console**
   - <https://console.cloud.google.com>

2. **Create/Select Project**
   - Use existing project or create new

3. **Enable Gmail API**
   - APIs & Services → Library
   - Search "Gmail API"
   - Click Enable

4. **Create OAuth Credentials**
   - APIs & Services → Credentials
   - Click "+ CREATE CREDENTIALS"
   - Choose "OAuth client ID"
   - Application type: "Web application"
   - Name: "SeedMail - Dev" or "SeedMail - Prod"

5. **Configure Redirect URIs**
   - Authorized redirect URIs:
     - Dev: `http://localhost:5001/api/email/oauth/callback`
     - Prod: `https://app.seedfinancial.io/api/email/oauth/callback`

6. **Copy Credentials**
   - Copy Client ID
   - Copy Client Secret
   - Add to Doppler

7. **Configure OAuth Consent Screen**
   - User type: Internal (for Google Workspace)
   - App name: SeedMail
   - Scopes:
     - `gmail.readonly`
     - `gmail.send`
     - `gmail.modify`
     - `gmail.labels`

---

## ✅ Verification

After adding to Doppler:

```bash
# Pull latest config
doppler secrets download --project seed-portal-api --config dev

# Verify variables exist
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
echo $GOOGLE_OAUTH_REDIRECT_URI

# Restart server
npm run dev:api:doppler
```

---

## 🚨 Important Notes

- **Keep secrets secure** - Never commit to git
- **Use different credentials** for dev/prod
- **Mailgun is already configured** - No changes needed
- **Encryption key** is optional for Phase 1, required for production
- **Redirect URI** must exactly match Google Cloud Console

---

## 📞 Support

If OAuth fails, check:

1. ✅ Variables are in correct Doppler project/config
2. ✅ Redirect URI matches Google Cloud Console exactly
3. ✅ Gmail API is enabled in Google Cloud
4. ✅ OAuth consent screen is configured
5. ✅ User is in Google Workspace domain

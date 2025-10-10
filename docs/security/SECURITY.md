# Security Guidelines

## CRITICAL: Never Hardcode Secrets

**⚠️ WARNING: Hardcoding secrets in source code is a severe security vulnerability that can lead to:**

- Unauthorized access to your Google Workspace data
- Data breaches and privacy violations
- Compliance violations (SOC2, GDPR, etc.)
- Financial losses and reputational damage

## Proper Secret Management

### 1. Environment Variables

All sensitive information MUST be stored in environment variables:

- Database credentials → `DATABASE_URL`
- Google OAuth Client ID → `VITE_GOOGLE_CLIENT_ID`
- Google Client Secret → `GOOGLE_CLIENT_SECRET`
- Slack tokens → `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`
- API keys → `OPENAI_API_KEY`, `AIRTABLE_TOKEN`

### 2. Local Development

1. Copy `.env.example` to `.env`
2. Fill in your actual values
3. NEVER commit `.env` to version control

### 3. Google ADC Setup

For Google Admin API access:

1. Run: `gcloud auth application-default login --scopes=...`
2. The ADC file will be created at `~/.config/gcloud/application_default_credentials.json`
3. This file is automatically ignored by Git
4. NEVER copy this file into your project directory

### 4. Production Deployment

Use Replit's Secrets feature:

1. Go to the Secrets tab in your Repl
2. Add each environment variable
3. The application will automatically use them

### 5. Security Checklist

- [ ] No secrets in source code
- [ ] `.env` file is in `.gitignore`
- [ ] ADC files are in `.gitignore`
- [ ] All secrets use environment variables
- [ ] Production uses secure secret storage
- [ ] Regularly rotate all secrets and tokens

### 6. If Secrets Are Exposed

1. **Immediately revoke** the exposed credentials
2. Generate new credentials
3. Update all environment variables
4. Review access logs for unauthorized use
5. Notify your security team

## Git History Cleanup

If secrets were accidentally committed:

```bash
# Use BFG Repo-Cleaner to remove secrets from history
java -jar bfg.jar --replace-text secrets.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

Remember: Security is everyone's responsibility. When in doubt, ask for help!

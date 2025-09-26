# Railway Deployment Setup

## Environment Variables Required

### Essential Backend Variables (from Doppler)

- `DATABASE_URL` - Supabase PostgreSQL connection string
- `REDIS_URL` - Railway will provide this automatically
- `SESSION_SECRET` - For session encryption
- `NODE_ENV` - Set to "production"

### API Keys (from Doppler)

- `OPENAI_API_KEY`
- `HUBSPOT_PRIVATE_APP_TOKEN`
- `ANTHROPIC_API_KEY`
- `SLACK_BOT_TOKEN`
- `STRIPE_SECRET_KEY`
- `BOX_CLIENT_ID`
- `BOX_CLIENT_SECRET`
- `BOX_DEVELOPER_TOKEN`
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`

### Google APIs (from Doppler)

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PROJECT_ID`

## Railway Services to Create

1. **Web Service** (Express API)
   - Uses: `web` process from Procfile
   - Port: 8080 (Railway default)

2. **Worker Service** (BullMQ Background Jobs)
   - Uses: `worker` process from Procfile
   - No exposed port needed

3. **Redis Service**
   - One-click add from Railway dashboard
   - Will auto-provide REDIS_URL

## Deployment Steps

1. Create Railway project
2. Connect to GitHub repo: `seed-portal`
3. Add Redis service
4. Configure environment variables from Doppler
5. Deploy both web and worker services
6. Test health endpoint: `/api/health`

## CORS Configuration

Update CORS settings to include Vercel frontend URL when ready.

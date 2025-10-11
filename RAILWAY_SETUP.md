# Railway Deployment Setup

## Environment Variables Required

### Essential Backend Variables (from Doppler)

- `DATABASE_URL` - Supabase PostgreSQL connection string
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

2. **Worker Service** (Graphile Worker Background Jobs)
   - Uses: `worker` process from Procfile
   - No exposed port needed
   - Postgres-backed job queue (no Redis needed)

## Deployment Steps

1. Create Railway project
2. Connect to GitHub repo: `seed-portal`
3. Configure environment variables from Doppler
4. Deploy both web and worker services
5. Test health endpoint: `/api/health`

## CORS Configuration

Update CORS settings to include Vercel frontend URL when ready.

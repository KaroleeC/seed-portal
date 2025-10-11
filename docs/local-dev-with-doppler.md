# Local Development with Doppler

This guide shows how to run the Seed Portal locally using Doppler for environment variables.

## Overview

- Single Node process runs both the API and Vite-powered web in dev.
- We use Doppler projects:
  - `seed-portal-api` (backend)
  - `seed-portal-web` (frontend)
- Minimal required secrets allow the server to boot and the web to load. Optional third-party services (OpenAI, HubSpot, Box, Google Admin, Redis) can be enabled as needed.

## One-time setup

- Node.js 18+ (Node 20+ recommended). You currently have Node 24, which is fine.
- Install dependencies:
  ```bash
  npm install
  ```
- Install and log in to Doppler CLI:
  ```bash
  brew install dopplerhq/cli/doppler
  doppler login
  doppler setup  # optional guided setup
  ```

## Start the dev server (with Doppler)

Use the script we added in `package.json`:

```bash
npm run dev:doppler
```

This runs:

```bash
doppler run --project seed-portal-api --config dev -- npm run dev
```

…which injects environment variables from `seed-portal-api (dev)` and starts the server (`tsx server/index.ts`).

The server binds to `127.0.0.1` by default and listens on `PORT` (defaults to `5000`).

- App URL: http://127.0.0.1:5000
- Health check: http://127.0.0.1:5000/api/health

Note: In local dev, it’s normal for `/api/health` to report `unhealthy` if third-party credentials (OpenAI, HubSpot, Box) are not configured. Database and core HTTP server being up is enough to proceed.

## Doppler secrets - minimal checklist

### seed-portal-api (dev)

Required to boot:

- `DATABASE_URL` — Supabase Postgres connection string (e.g. Neon/Supabase URI with `sslmode=require`).
- `SESSION_SECRET` — random secret for sessions in dev.
- `PORT` — `5000` (recommended for local).
- `HOST` — `127.0.0.1` (local-only binding).
- `VITE_API_BASE_URL` — `http://127.0.0.1:5000` (used by the frontend during dev via Vite).

Optional (recommended later):

- `SENTRY_DSN` — error tracking.

Feature-specific (enable when needed):

- `OPENAI_API_KEY` — AI features.
- `HUBSPOT_ACCESS_TOKEN` — CRM features.
- Slack:
  - `SLACK_BOT_TOKEN`
  - `SLACK_CHANNEL_ID`
  - `SLACK_PA_CHANNEL_ID`
- Box storage:
  - `BOX_CLIENT_ID`
  - `BOX_CLIENT_SECRET`
  - `BOX_KEY_ID`
  - `BOX_PRIVATE_KEY`
  - `BOX_ENTERPRISE_ID`
- Google Admin (if using admin features):
  - `GOOGLE_CLIENT_ID_OS`
  - `GOOGLE_CLIENT_SECRET_OS`
  - `GOOGLE_REFRESH_TOKEN`
  - `GOOGLE_SERVICE_ACCOUNT_JSON`

### seed-portal-web (dev)

Required for the frontend build/runtime:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` — should match the backend URL (e.g. `http://127.0.0.1:5000`).

Note: In this repo, Vite runs in middleware mode from the server process. If you run `npm run dev:doppler` for the backend, the `VITE_*` vars provided to that same process will be picked up by Vite at runtime.

## Verifying the setup

- Start the server with Doppler: `npm run dev:doppler`
- Open http://127.0.0.1:5000 in the browser
- Check health (expected 503 if third-parties disabled):
  ```bash
  curl -i http://127.0.0.1:5000/api/health
  ```
- Look for: `Database connection established` in the server logs.

## Troubleshooting

- Port binding ENOTSUP:
  - We’ve updated `server/index.ts` to use:
    ```ts
    server.listen(port, process.env.HOST ?? "127.0.0.1", () => {
      /* ... */
    });
    ```
    This avoids unsupported socket options and mirrors the minimal test server that worked locally.
  - Ensure `HOST=127.0.0.1` in dev. In production, set `HOST=0.0.0.0` (see note below).
- Port in use:
  ```bash
  lsof -ti :5000 | xargs kill
  ```
- Missing third-party creds:
  - AI (OpenAI), CRM (HubSpot), Storage (Box), Google Admin will warn or report unhealthy on `/api/health`. Add the corresponding secrets to your Doppler dev configs when you need to exercise those features.

## Production/Hosted environments

- Railway/Vercel/Replit typically require binding to `0.0.0.0`. Set `HOST=0.0.0.0` in those environments.
- Keep dev and prod secrets separate in Doppler projects/environments.

## Notes

- The server integrates Vite in middleware mode. You generally don’t need to run a separate Vite dev server.
- `.env` is only for local experiments; prefer `doppler run` for daily dev.
- If you want, we can add feature flags (e.g. `DISABLE_CRM`, `DISABLE_BOX`, `DISABLE_AI`) to silence warnings during local dev.

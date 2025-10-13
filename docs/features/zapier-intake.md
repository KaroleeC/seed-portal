# Zapier Lead Ingestion

This document explains how to send leads from Zapier to the Seed Portal CRM.

## Endpoint

- URL: `POST /api/crm/intake/zapier`
- Auth: Shared secret header (no user session)

## Headers

- `Content-Type: application/json`
- `X-Webhook-Secret: <your-secret>`
- `X-Idempotency-Key: <unique id per lead>` (recommended)

## Environment Variables

- `ZAPIER_WEBHOOK_SECRET`: Shared secret for verifying Zapier requests.
- `ZAPIER_ALLOWED_IPS` (optional): Comma-separated allowlist (e.g. `3.214.22.172, 52.15.89.12`).

These are validated in `server/config/env.ts` and used by `server/middleware/verify-webhook-secret.ts`.

## Payload Shape

Minimum:

```json
{
  "email": "pat@example.com"
}
```

Optional fields (all pass-through and stored in `crm_leads.payload`):

```json
{
  "email": "pat@example.com",
  "firstName": "Pat",
  "lastName": "Lee",
  "companyName": "Acme Co",
  "phone": "+14155550123",
  "assignedTo": null,
  "source": "zapier",
  "status": "new",
  "stage": "unassigned",
  "utm": { "campaign": "spring-2025" }
}
```

## Behavior

- Upserts a contact in `crm_contacts` by `email`.
  - Updates `firstName`, `lastName`, `companyName` if they are currently null.
- Inserts a new lead into `crm_leads` with `status` (default `new`), `stage` (default `unassigned`), `source` (default `zapier`), and raw `payload`.
- Logs the webhook to `intake_webhooks` with `idempotency_key`, `source`, `payload`, and processing status.
- Idempotency:
  - If `X-Idempotency-Key` is provided and already processed, returns the prior result.
  - If header is missing, the service hashes the payload to derive a key.
  - In production, `X-Idempotency-Key` is REQUIRED. In dev, the hash fallback is allowed.
- Assignment: If you pass `assignedTo` as a user id or `@seedfinancial.io` email, it will be validated and stored. Invalid values return HTTP 400.
- Dedupe: If an open lead already exists for the same contact (not disqualified and not closed), the service updates that lead instead of creating a new row. Disable via `CRM_DEDUPE_OPEN_LEAD=false`.

## Canonical values (admin-managed)

- Allowed `source`, `status`, and `stage` are admin-configurable using new tables:
  - `crm_lead_sources(key,label,is_active,sort_order)`
  - `crm_lead_statuses(key,label,is_active,sort_order)`
  - `crm_lead_stages(key,label,is_active,sort_order)`
- API (admin only):
  - GET `/api/admin/crm/lead-config` → returns active lists
  - PUT `/api/admin/crm/lead-config/sources/:key` body `{ label?, isActive?, sortOrder? }`
  - PUT `/api/admin/crm/lead-config/statuses/:key` body `{ label?, isActive?, sortOrder? }`
  - PUT `/api/admin/crm/lead-config/stages/:key` body `{ label?, isActive?, sortOrder? }`
  - DELETE `/api/admin/crm/lead-config/{sources|statuses|stages}/:key` → sets `is_active=false`
- The intake service normalizes incoming values against the active lists; unknown values map to `other/new/unassigned` if present.

## Responses

- Success: `200 { "status": "ok", "lead": { "id", "contactId", "status", "stage" } }`
- Auth error: `401 { message: "Invalid webhook secret" }`
- Missing secret in prod: `500 { message: "Webhook secret not configured" }`
- Invalid payload: `400 { message: "Invalid payload" }`
- Server error: `500 { message: "Failed to ingest lead" }`

## Zapier Setup

1. Create a Zap with the app "Webhooks by Zapier" and event "POST".
2. Set the URL to your environment (e.g. `https://portal.seedfinancial.io/api/crm/intake/zapier`).
3. Add headers:
   - `X-Webhook-Secret: <your-secret>`
   - `X-Idempotency-Key: {{zap_meta_human_now}}-{{unique_id}}`
4. Map source fields to the JSON body; at minimum include `email`.
5. Test the Zap.

## cURL Example

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'X-Webhook-Secret: $ZAPIER_WEBHOOK_SECRET' \
  -H 'X-Idempotency-Key: demo-123' \
  -d '{
    "email": "pat@example.com",
    "firstName": "Pat",
    "lastName": "Lee",
    "companyName": "Acme Co",
    "source": "zapier"
  }' \
  https://localhost:5000/api/crm/intake/zapier
```

## UI Verification

Open `/leads-inbox`. New rows will appear with `source = zapier`. Click "Open" to view details in the Profile Drawer.

## Migrations (additive-only)

Create the admin config tables (development first, then preview/prod) using drizzle-kit or SQL. Additive-only, safe to run repeatedly.

Using drizzle:

```bash
npm run db:push
```

Or SQL equivalent:

```sql
CREATE TABLE IF NOT EXISTS crm_lead_sources (
  key text PRIMARY KEY,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS crm_lead_statuses (
  key text PRIMARY KEY,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS crm_lead_stages (
  key text PRIMARY KEY,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
```

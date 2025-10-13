---
Title: Integration Removal Plan (HubSpot, Box, Airtable)
Description: Plan to replace HubSpot, Box, and Airtable with first‑party apps (LEADIQ, Seed Cadence, Seed Scheduler, SEEDMAIL, SEEDQC, SEEDPAY, CLIENTIQ, SEEDDRIVE) using env‑selectable providers, CI guardrails, and a strangler migration pattern.
---

Date: 2025-10-13
Owner: Platform
Status: Draft

## Decisions (Confirmed)

- **client-intel** Client Intel is being removed and replaced by **CLIENTIQ** (not the same feature). Airtable integration will be removed.
- **quotes/payments** Quote provider is **SEEDPAY**. Payments are processed via **Stripe**.
- **storage** Storage provider is **Supabase**. Bucket and root path convention should match Box’s subtree design (parity with `CLIENTS` root).

## Context & Target Architecture

We are replacing external integrations with first‑party apps and a single Postgres (Supabase) source of truth, using env‑selectable providers and a strangler pattern. Apps and flows:

- **LEADIQ**: Lead intake (Zapier webhook + manual). Displays/assigns leads, embeds communications.
- **Seed Cadence**: Automated sales outreach (email/SMS/voice), driven from LEADIQ.
- **Seed Scheduler**: Booking links, events, ICS email.
- **SEEDMAIL**: Email app; LEADIQ embeds an email widget as an extension of SEEDMAIL.
- **SMS/Voice**: Parallel widget planned, similar to SEEDMAIL.
- **SEEDQC**: Quote Calculator. Can push quotes into SEEDPAY.
- **SEEDPAY**: Quotes, payments, invoices, commissions/payroll. Client e‑sign + pay from quote; replaces HubSpot quotes and expands beyond commissions.
- **CLIENTIQ**: Post‑sale hub for sales + service visibility; leads move here upon first payment.
- **SEEDDRIVE**: Storage replacement for Box (initially Supabase Storage buckets; future dedicated service).
- **Project Management**: Internal for accounting team (future).

Principles:

- **Conventions-over-configuration** and **stable routes**. No UI copy/layout changes during rewiring.
- **Provider toggles** via env (Doppler managed) to avoid big bang cuts and allow rollback.
- **Single BFF** for client apps; internal services behind it.
- **RBAC** consistent with persona defaults (sales → limited storage access, etc.).

## Architecture Decision Records (ADRs)

- **Purpose**: Capture and socialize key architecture choices and their consequences.
- **Location**: `seed-portal/docs/adrs/` (to be created). Index doc `0000-adr-index.md` will link all ADRs.
- **Template**: Title, Status, Context, Decision, Consequences, Alternatives.
- **Initial ADRs to draft**:
  - ADR-0001: Provider pattern and env toggles (QUOTE_PROVIDER, STORAGE_PROVIDER, deprecate CLIENT_INTEL_SOURCE).
  - ADR-0002: SEEDDRIVE bucket, path scheme, and privacy model (private by default, signed URLs).
  - ADR-0003: Stripe payment and invoicing flows (Checkout, Subscriptions, Invoicing, Tax, refunds, methods).
  - ADR-0004: E‑sign service separate from Stripe (system-wide integration points).
  - ADR-0005: Lead intake webhook schema and auth (Zapier → LEADIQ).

Notes: ADRs capture the WHY behind big decisions, not day‑to‑day conventions (naming, folder rules). We will enforce conventions via documentation, lint rules, scripts, and templates (see next section).

### ADR-0004 (Draft): E‑sign service candidates (trade‑offs)

- **DocuSeal**
  - Pros: OSS, self‑host, templates, API; modern UI.
  - Cons: Validate legal/compliance requirements (ESIGN/UETA), roadmap/community reliance.
- **Open eSignForms**
  - Pros: Mature OSS, flexible workflows, self‑host.
  - Cons: Java stack, heavier ops; UI modernization may be needed.
- **LibreSign**
  - Pros: OSS, active development.
  - Cons: Enterprise support/compliance posture to be validated.

Decision criteria: legal compliance, API ergonomics, audit trails, template/versioning, signing certificate, SSO, ops footprint.

## Engineering Conventions & Enforcement

- **Structure doc**: `docs/STRUCTURE.md` describing feature‑based architecture and folder layout. Example:

```text
src/
  features/
    [feature-name]/
      components/
      hooks/
      utils/
      types/
      api/
      __tests__/
      index.ts
shared/
  components/ hooks/ utils/ types/
```

- **Contributing**: `docs/CONTRIBUTING.md` with naming conventions and workflow (components PascalCase, hooks use* camelCase, utils camelCase, tests alongside files, import order).
- **ESLint (filenames)**: add `eslint-plugin-filenames` and rules to enforce file naming:

```js
// .eslintrc.*
module.exports = {
  plugins: ['filenames'],
  rules: {
    'filenames/match-regex': [2, '^[A-Z][a-zA-Z]+$|^[a-z][a-z0-9-]+(\\.[a-z]+)?$', true],
    'filenames/match-exported': [2, 'kebab']
  }
};
```

- **Feature scaffold**: `scripts/new-feature.ts` to create the standard folder tree and stub `index.ts`.
- **Templates**: `.templates/Component.tsx`, `.templates/Hook.ts` as starting points.
- **Path aliases**: configure `tsconfig.json` for stable imports (`@features/*`, `@shared/*`, etc.). Example in Appendices.
- **Path aliases status**: Accepted set `@features/*`, `@shared/*`, `@components/*`, `@hooks/*`, `@utils/*`, `@types/*`.
- **Generator script language**: Use TypeScript `scripts/new-feature.ts` for consistency and types; execute via `tsx`/`ts-node` locally, compile for CI if needed.

## Environment & Guardrails (Phase 0)

Set defaults in Doppler:

- `QUOTE_PROVIDER=seedpay` (server) — provider for quote sync/creation
- `STORAGE_PROVIDER=supabase` (server) — storage provider for files
- `CLIENT_INTEL_SOURCE` — removed immediately (Airtable/Client Intel decommissioned)
- `DISABLE_BOX=1` in dev/test/CI (server) — ensure no Box calls

Storage defaults:

- Supabase bucket: `seeddrive` (top-level; will also serve other internal storage use cases).
- Privacy: start **private** by default with signed URLs; avoid public buckets to align with SOC‑2 goals.
- `clientKey`: prefer UUID v4 as opaque identifier for `CLIENTS/{clientKey}/…` paths.

Stripe (server):

- `STRIPE_API_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_*/PRODUCT_*` (as needed for subscriptions)

Enforce via lint/CI:

- ESLint `no-restricted-imports` in repo root:
  - Block direct imports of `@hubspot/api-client`, `box-node-sdk`, `airtable` outside provider modules (ultimately block everywhere).
- CI job fails on banned imports and floating SDK usage (grep or eslint rules).
- Add unit + supertest smoke to exercise provider toggles.

## HubSpot → SEEDPAY (Quotes/Deals/Commissions)

High‑impact files today:

- Server: `server/hubspot.ts`, `server/hubspot-routes.ts`, `server/hubspot-sync.ts`, `server/services/hubspot/*`, `server/services/providers/index.ts`, `server/services/providers/hubspot-provider.ts`, `server/routes/deals.ts`, `server/routes/commissions.ts`, `server/quote-routes.ts`, `server/workers/graphile-worker.ts`, `server/services/commissions-service.ts`.
- Client: `client/src/features/quote-calculator/**` (hooks/providers), `client/src/pages/admin-hubspot.tsx`, calculator components, commission tracker pages.

Plan:

1. **Provider scaffolding**
   - Implement `seedpayProvider` conforming to `server/services/quote-provider.interface.ts`.
   - Update `server/services/providers/index.ts` to support `QUOTE_PROVIDER=seedpay` (default dev/test/CI); keep `hubspot` for emergency rollback.
2. **BFF routing & compatibility**
   - `server/hubspot-routes.ts`: Proxy to provider or return HTTP 410 with migration guidance; keep stable external route surface used by clients.
   - `server/quote-routes.ts`: Ensure all quote actions go through provider interface and internal storage service (no Box/HubSpot direct calls).
3. **Data model and sourcing**
   - Quotes/deals/commissions use Postgres tables in `@shared/schema` as SoT. Payments/invoices are handled by **Stripe** and recorded in SEEDPAY entities for reporting and commissions.
   - Commission tracker consumes SEEDPAY entities via a single BFF endpoint/service.
4. **Client rewiring (mechanical)**
   - Replace `useHubSpotSync` / provider on the client with generic BFF hooks that do not reference HubSpot.
   - Preserve UI copy and routes; only change data flow.
5. **Data migration (optional/targeted)**
   - Import only active quotes/deals needed for continuity (one‑off script). Otherwise let new pipeline generate fresh quotes in SEEDPAY.
6. **Decommission**
   - Remove direct `@hubspot/api-client` imports; delete dead code once tests pass.

Acceptance:

- QUOTE flow works end‑to‑end with `QUOTE_PROVIDER=seedpay`.
- Commission tracker reads only SEEDPAY data.
- No external HubSpot network calls in CI.

## Box → SEEDDRIVE (Supabase Storage, then service)

High‑impact files today:

- `server/services/storage-service.ts` (Box SDK implementation)
- `server/box-integration.ts` (utility)
- `server/quote-routes.ts` (document generation + folder creation)

Plan:

1. **Provider abstraction**
   - Introduce `StorageProvider` interface with `createFolder`, `uploadFile`, `copyFile`, `renameFile`, `getFolderContents`, `getDownloadUrl`.
   - Implement `SupabaseStorageProvider` using Supabase bucket `seeddrive` with Box‑parity subtree structure: `CLIENTS/{clientKey}/…`.
     - `{clientKey}` = opaque internal identifier (UUID v4) rather than human-readable names for security.
     - Start **private** by default; use signed URLs for client-facing downloads.
   - Factory: `STORAGE_PROVIDER=supabase|box` (default `supabase`).
2. **Replace usages**
   - Update `server/quote-routes.ts` “generate documents” path to use storage provider (no direct Box APIs).
   - Enforce persona rule: sales users cannot access raw storage; all access through BFF endpoints with RBAC.
   - Enforce attachments policy: file attachments allowed only when mode === "support" (carried forward across endpoints/UI).
3. **Decommission**
   - Set `DISABLE_BOX=1` and remove Box credentials from Doppler dev/test.
   - Remove Box SDK dependency after all tests pass.
4. **Migration Tool (Box → SEEDDRIVE)**
   - Build a migration utility to backfill the entire `CLIENTS` subtree from Box to Supabase, preserving folder structure and metadata.
   - Map Box folder/file IDs to Supabase object paths; maintain created/updated timestamps where feasible.
   - Provide resumable, idempotent jobs with audit logs; moderate concurrency with rate‑limit backoff.

Acceptance:

- File/folder operations succeed via Supabase in dev/test/CI.
- No Box network calls observed in logs.

## Airtable → Removal (migrate to CLIENTIQ)

Decision: Client Intel is deprecated. Replace with **CLIENTIQ** (a different product surface). Remove Airtable.

Plan:

1. **Immediate decommission**
   - Remove Airtable SDK and all Client Intel code paths (routes, pages, services, data access).
   - Remove/redirect Client Intel navigation to CLIENTIQ.
2. **CLIENTIQ build**
   - Build CLIENTIQ from scratch with a clean schema and UI; no dependency on legacy Client Intel tables.
3. **Data handling**
   - Default: do not migrate any Client Intel data. If any historical data is later required, handle as a separate import task.

Acceptance:

- No Airtable dependencies remain.
- No references to Client Intel in routes or navigation; CLIENTIQ is the canonical post‑sale hub.

## Cross‑Cutting: Leads, Cadence, Scheduler, Payments

- **Leads ingestion**: Zapier webhook routes create leads in Postgres (LEADIQ). Manual entry remains available. Define and document the webhook JSON schema and authentication (HMAC/shared secret).
- **Cadence**: Seed Cadence consumes LEADIQ leads, schedules sequences, and records outcomes in Postgres.
- **Scheduler**: Already backed by `crm_*` tables (Drizzle). Ensure ICS emails and attendee flows are provider‑agnostic.
- **Payments (Stripe)**: Mirror HubSpot’s approach using Stripe‑hosted surfaces.
  - Checkout: Use Stripe Checkout for one‑time payments and fixed subscriptions (no proration, no trials).
  - Subscriptions: Fixed price only; standard cancellation behavior.
  - Invoices: Use Stripe Invoicing (hosted invoices) with webhooks as SoT; attach our quote PDFs as needed.
  - Payment Links: enable as a fallback/manual option when needed.
  - Methods: enable `card`, `us_bank_account` (ACH), and `link`.
  - Taxes: use Stripe Tax.
  - Refunds: via Stripe APIs; reflect in SEEDPAY ledger for commissions.
  - E‑sign: in‑house app across SeedOS (evaluate open‑source alternatives); integrate signatures into the quote → pay flow.
  - On first successful payment, move entity from LEADIQ to CLIENTIQ.

## Security & Compliance (SOC‑2 Readiness)

- **Private-by-default storage** in `seeddrive` with signed URLs; scoped, short TTL; rotate signing secrets.
- **RBAC + mode enforcement**: enforce Support‑mode attachments policy at route/middleware; principle of least privilege for service keys.
- **Audit logging** for storage actions, payments webhooks, provider selection, and migrations (Box → Supabase).
- **Secrets management** via Doppler; no secrets in code; periodic rotation.
- **Backups & retention** policies for Supabase buckets and Postgres.

## Observability & RBAC

- Central logging for provider selection and external network attempts (warn/fail in CI).
- RBAC aligns to persona defaults (sales defaults to limited/blocked storage access by policy).

## Phased Execution Plan (Quick Wins)

Each phase is isolated with clear exits to prevent scope creep. Phases can ship independently.

- **Phase 0 — Guardrails & Docs** ✅ **COMPLETE**
  - Scope: env toggles defaulting to `seedpay`/`supabase`, ESLint restricted imports, unit smokes; publish ADR index and stubs; add `docs/STRUCTURE.md`, `docs/CONTRIBUTING.md`, `.templates/`, `scripts/new-feature.ts`; accept path aliases.
  - **Deliverables** (All Complete):
    - ✅ Provider toggles configured in `.env.example` and Doppler
    - ✅ ESLint restricted imports enforced (`@hubspot/api-client`, `box-node-sdk`, `airtable`)
    - ✅ ESLint filename conventions enforced
    - ✅ Provider smoke tests added
    - ✅ 5 ADRs created and indexed
    - ✅ STRUCTURE.md (800 lines) - Architecture guide
    - ✅ CONTRIBUTING.md (600 lines) - Enhanced development guide
    - ✅ 6 code templates created (`.templates/`)
    - ✅ Feature generator script (`scripts/new-feature.ts` - 270 lines)
    - ✅ Feature generator tests (350 lines, 26 test cases)
    - ✅ Path aliases configured (`@features/*`, `@components/*`, etc.)
    - ✅ Documentation reorganized (63 docs into 9 folders)
    - ✅ Build validation passed (zero new errors)
  - **Exit Criteria Met**: CI green with no direct SDK usage; ADRs published; documentation complete; feature generator ready.
  - **Out of scope**: any route rewiring, payments, migrations (Phase 1+).
  - **Status**: Phase 0 completed October 2025. Ready for Phase 1.
  - **Detailed Execution**: See [PHASE_0_EXECUTION.md](./PHASE_0_EXECUTION.md) and [PHASE_0_EXECUTION_PART2.md](./PHASE_0_EXECUTION_PART2.md)

- **Phase 1 — Providers & Rewire (Quotes + Storage) + CLIENTIQ scaffold**
  - Scope: implement `seedpayProvider`; implement `SupabaseStorageProvider` with `CLIENTS/{clientKey}`; rewire `server/quote-routes.ts` to providers; remove Client Intel routes/pages/services; scaffold CLIENTIQ placeholder routes.
  - Deliverables: provider factory switching by env; supertest smokes; 1 Playwright smoke for quote + upload.
  - Exit: QUOTE flow works via SEEDPAY; storage ops via Supabase; no direct SDK usage.

- **Phase 2 — Stripe Payments & Webhooks + Commission unification**
  - Scope: Checkout (one‑time + fixed subs); Invoicing; Payment Links fallback; webhook handlers; unify commission tracker to SEEDPAY entities; e‑sign integration points (skeleton) aligned with ADR‑0004.
  - Deliverables: payment flows E2E in dev/test; ledger updates and CLIENTIQ transition; audit logs.
  - Exit: first payment transitions entity to CLIENTIQ; refunds reflected in ledger.
  - Out of scope: Box migration.

- **Phase 3 — SEEDDRIVE Hardening & Box Migration**
  - Scope: private‑by‑default + signed URLs; enforce Support‑mode attachments; build and run Box → Supabase migration (staging → production) with resumable jobs and audit logs.
  - Deliverables: migration tool + runbook; monitoring and rate‑limit backoff.
  - Exit: staging backfill complete; production plan approved.
  - Out of scope: HubSpot importer.

- **Phase 4 — HubSpot Importer & Legacy Cleanup**
  - Scope: self‑serve importer for contacts/companies; 410/proxy for legacy routes; remove SDKs and dead code.
  - Deliverables: importer UI/CLI; CI green without external SDK packages.
  - Exit: repo free of HubSpot/Box/Airtable deps; proxies documented.
  - Out of scope: major UI refresh.

## Timeline (Time‑boxed)

- **Day 0 (2–4 hrs)**
  - Add provider toggles and ESLint guardrails (default to `seedpay` / `supabase` / `internal`).
  - CI checks + minimal unit tests for provider selection.
  - Draft ADRs 0001–0005 and publish `docs/adrs/0000-adr-index.md`.
  - Add `docs/STRUCTURE.md`, `docs/CONTRIBUTING.md`, `.templates/`, `scripts/new-feature.ts`, ESLint filenames rules, and path aliases section in this plan.
- **Day 1 (4–8 hrs)**
  - Implement `seedpayProvider` minimal methods used today; rewire quote routes.
  - Implement `SupabaseStorageProvider` with Box‑parity paths and refactor `storage-service`.
  - Decommission Client Intel (routes/pages/services) and scaffold CLIENTIQ routes placeholder.
  - Add supertest smokes; 1 Playwright smoke each for quote + file upload.
- **Day 2 (cleanup)**
  - Return 410 / proxy behavior for legacy HubSpot routes.
  - Remove direct SDK imports; prune dead code.
  - Build and validate Box → SEEDDRIVE migration tool (staging run), prepare production runbook.
  - Optional import scripts and data checks.

## Rollback Strategy

- Flip env vars back to `hubspot`/`box`/`airtable` providers if needed.
- Keep routes stable; proxies can forward to legacy implementations temporarily.

## Deliverables & Exit Criteria

- Provider interfaces and factory toggles live; defaults set in Doppler.
- All quote/Stripe payments and storage flows work without external SDKs in dev/test/CI.
- ESLint/CI enforce no direct SDK imports.
- Legacy SDK packages removed after green CI.
- Box → SEEDDRIVE migration utility implemented with resumable jobs and audit logs; staging run completed; production plan documented.
- ADRs 0001–0005 published with `0000-adr-index.md`.
- `docs/STRUCTURE.md`, `docs/CONTRIBUTING.md`, `.templates/`, `scripts/new-feature.ts`, and path aliases configured.

## Appendices

### Environment Variables (server)

- `QUOTE_PROVIDER=seedpay | hubspot`
- `STORAGE_PROVIDER=supabase | box`
- `CLIENT_INTEL_SOURCE` (removed immediately)
- `DISABLE_BOX=1` (dev/test/CI)
- `SEEDDRIVE_BUCKET=seeddrive`
- `SEEDDRIVE_SIGNED_URL_TTL=300` (seconds; example)
- `ZAPIER_LEAD_WEBHOOK_SECRET` (HMAC signing secret)

Stripe:

- `STRIPE_API_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

Doppler projects: `seed-portal-api` (server), `seed-portal-web` (client).

### Lead Intake Webhook (Draft Schema)

Endpoint: `POST /api/leads/webhook`

Auth: `X-SeedOS-Signature: sha256=<hmac>` where HMAC is computed over raw body using `ZAPIER_LEAD_WEBHOOK_SECRET`.

JSON body (minimum):

```json
{
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+1-555-123-4567",
  "company": "Acme Inc",
  "source": "zapier",
  "utm": { "source": "google", "medium": "cpc", "campaign": "q4" },
  "notes": "Interested in premium tier",
  "assignedUserId": "uuid-optional"
}
```

Validation: require at minimum `email` OR `phone`. Create lead in Postgres (LEADIQ). Return `201` with lead id.

### Stripe Event Handling (Initial)

Handle webhooks (idempotent):

- `payment_intent.succeeded`
- `charge.refunded`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Actions: update SEEDPAY ledger, commissions accruals, and CLIENTIQ transition upon first successful payment.

### HubSpot Migration Tool (Future)

- Build a self‑serve importer to sync contacts/companies from HubSpot into Postgres for new customers. Decouple from internal tools timeline.

### Impacted Code Paths (non‑exhaustive)

- HubSpot: `server/hubspot*.ts`, `server/services/hubspot/**`, `server/services/providers/*.ts`, `server/routes/**`, `server/workers/**`, client calculator hooks/pages.
- Box: `server/services/storage-service.ts`, `server/box-integration.ts`, `server/quote-routes.ts` (document generation).
- Airtable: `server/airtable.ts`, `server/client-intel.ts`, `server/routes/client-intel.ts`, `client/src/pages/client-intel.tsx`.

### Path Aliases Example (tsconfig.json)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@features/*": ["src/features/*"],
      "@shared/*": ["src/shared/*"],
      "@components/*": ["src/shared/components/*"],
      "@hooks/*": ["src/shared/hooks/*"],
      "@utils/*": ["src/shared/utils/*"],
      "@types/*": ["src/shared/types/*"]
    }
  }
}
```

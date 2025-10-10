# Phase 0 — Settings Information Architecture (IA)

Route convention: per-app stable routes at `/apps/:app/settings`. Usability first; simple structure; RBAC gates via existing permissions. Include new apps.

## Global principles

- Stable routes and section slugs; avoid churn.
- RBAC filters visibility; unauthorized users never see restricted sections.
- Keep copy/layout simple and usable; polish comes later.

## Top-level Settings Hub

- Path: `/apps/settings` (optional umbrella for cross-app preferences).
- Sections:
  - **Account & Profile**: profile, security, devices/sessions, 2FA.
  - **Appearance**: theme mode (Dark/Light), variant (SeedKB/Classic), density.
  - **Notifications**: email/SMS/push preferences.
  - **Integrations**: HubSpot, Slack, Box, Stripe, Mercury, QuickBooks.
  - **AI & Data**: AI defaults, data retention, export.

## App-specific Settings (stable)

- **Leads Inbox** — `/apps/leads/settings`
  - Capture rules, assignment routing, SLA, statuses, dispositions, notifications.
- **Client Profiles** — `/apps/clients/settings`
  - Profile schema fields, custom attributes, visibility, merge rules, tags.
- **Knowledge Base** — `/apps/knowledge-base/settings`
  - Categories, roles, publishing workflow, search tuning, branding.
- **Calculator (SeedQC)** — `/apps/seedqc/settings`
  - Pricing rules, tiers, services, approvals.
- **Commission (SeedPay)** — `/apps/seedpay/settings`
  - Commission rules, rates, payout schedules, approvals.

## Page structure (per settings page)

- Left nav: section list (sticky), simple and readable.
- Right content: forms/tables using existing UI primitives; no fancy visuals.
- Breadcrumbs: `App > Settings > Section`.

## RBAC

- Gate sections with existing permissions; show disabled state when view-only.
- Server validates on save.

## Keyboard & discoverability

- Command Dock exposes Settings entries; Cmd/Ctrl+K to navigate quickly.

## Acceptance criteria

- Stable routes exist and are documented for Leads Inbox, Client Profiles, Knowledge Base, SeedQC, SeedPay.
- Structure is clear enough to scaffold in Phase 1 without changing copy/layout.

## Out of scope (Phase 0)

- Building pages; this document is the blueprint.

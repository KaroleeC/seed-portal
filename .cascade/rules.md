# Project Guidelines (seed-portal)

This document applies to the `seed-portal/` app only. It is used by Cascade and humans to keep code consistent, safe, and testable.

---

## Scope & Principles

- Prefer conventions over configuration in the portal.
- Use functional React components with TypeScript.
- Prefer composition over inheritance.
- Keep code generation and refactors mechanical; avoid UI copy/layout changes unless explicitly requested.

---

## New File Requirement

Every new file MUST begin with a top-of-file description.

- For TypeScript/TSX, use a block comment.
- For Markdown, add a short description at the top.

Example (TypeScript):

```ts
/**
 * Description: Short summary of the file's purpose.
 * Responsibilities:
 * - What this module/component owns
 * Inputs/Props:
 * - Props, params, or external inputs
 * Outputs:
 * - Returns/exports or DOM effects
 * Side effects:
 * - Network, storage, or global state effects (if any)
 * Owner: Team/Area (e.g., Portal Core)
 */
```

Example (Markdown):

```md
---
Title: Short Name
Description: What this document covers and why it exists.
---
```

---

## RBAC

- Backend routes must use `requirePermission("<resource>.<action>")` and be documented.
- Frontend must not read `user.role` directly. Use `usePermissions()` (`isAdmin`, `hasPermission()`).
- Use database constraints and upserts for integrity; never bypass constraints.
- Permission naming format: `{resource}.{action}:{scope?}` (scope optional).

Examples:

```md
admin.rbac.read
admin.rbac.write
admin.policy.read
admin.policy.write
admin.debug
```

---

## Data Integrity & Null-Safety

- Never throw from React render paths.
- Default potentially-null arrays to `[]`, objects to `{}`, and guard dates (invalid -> show "Unknown").
- Keys in lists must be stable and unique; prefer composite keys when mapping nested data.

---

## Testing

- Unit/Component: Vitest (jsdom for components, node for pure logic).
- E2E: Playwright.
- Network isolation: MSW with strict handlers for tests.
- Test data factories for reproducible fixtures.
- Coverage: introduce gating starting with Calculator and other critical surfaces.
- Standardize selectors and test naming (e.g., `data-testid="users-tab.table"`).

---

## UI Constraints

- Do not change UI copy/layout/structure outside explicit UI refresh tasks.
- Use existing tokens/components and aim for consistency.

---

## API & Error Handling

- Centralize API calls in typed utilities/clients.
- Handle errors robustly; surface user-friendly messages.
- Use error boundaries for page-level isolation.

---

## Documentation & CI

- Reusable components should have a Storybook story when it adds value.
- Adhere to markdownlint rules (blank lines around headings/lists/fences; languages on code fences).
- Add/keep CI steps for ESLint, typecheck, tests, and markdownlint.

---

## Anti-Patterns (Avoid)

- Inline role checks in UI or route handlers.
- Throwing during render.
- Unstable list keys.
- Tests that hit real networks.
- Broad `any` without justification.

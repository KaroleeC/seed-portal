# Phase 0 — Theme Specification (Seed Dark/Light)

Constraints: no UI copy/layout changes. We will define tokens and usage so Phase 1 can implement without moving structures.

## Goals

- **Universal page background**: Sales gradient becomes the canonical dark background across the app; introduce a branded Light gradient.
- **Token-first**: Replace hard-coded hex/gradients with CSS variables and utilities. Keep Seed orange accents and all existing motion.
- **Accessible**: Maintain AA contrast for text and interactive states.

## Token model

We build on existing variables in `client/src/index.css`. Add universal page background tokens and a named light variant.

```css
/* New universal page background tokens */
:root {
  /* Light theme defaults */
  --page-bg-start: #75c29a; /* teal */
  --page-bg-end: #f4f4f4; /* light */
}

.dark,
.dark.theme-seed-dark {
  /* Dark theme background adopts Sales gradient */
  --page-bg-start: #253e31; /* slate-green */
  --page-bg-end: #75c29a; /* teal */
}

/* Utility for page backgrounds */
.page-bg {
  background-image: linear-gradient(to bottom right, var(--page-bg-start), var(--page-bg-end));
}
```

- Keep existing brand tokens: `--seed-dark`, `--seed-light`, `--seed-orange`.
- Keep semantic roles: `--background`, `--foreground`, `--card`, `--muted`, etc.

## Light theme variant

We retain `:root` as the default Light. Add `.theme-seed-light` as an explicit variant (optional), mirroring `:root` but reserved for future finetuning.

```css
/* Optional explicit light variant */
.theme-seed-light {
  /* inherit :root values, override selectively if needed */
  --page-bg-start: #75c29a;
  --page-bg-end: #f4f4f4;
}
```

## Dark theme (canonical)

- Continue to use `.dark.theme-seed-dark` (SeedKB navy glass tokens) as canonical dark.
- No changes to component motion or orange accents.

## Adoption guidance

- Replace page-level gradient wrappers with:
  - `className="min-h-screen page-bg theme-seed-dark"` for dark containers.
  - In Light, container stays `page-bg` and relies on `:root` or `.theme-seed-light`.
- Replace `.gradient-text` hard-coded hex stops with `var(--page-bg-start)`/`var(--page-bg-end)` where brand-appropriate.

## Acceptance criteria

- No inline hex for page backgrounds on Sales/Service/Admin dashboards.
- Background controlled entirely by `--page-bg-*` tokens.
- Visual parity maintained with current Sales dashboard in dark mode.

## Out of scope (Phase 0)

- Implementing the token changes in code (tracked in Phase 1).
- Refactoring component internals or copy.

## References

- `client/src/pages/sales-dashboard.tsx` uses `bg-gradient-to-br from-[#253e31] to-[#75c29a]` at the root container (lines ~264).
- `client/src/index.css` defines SeedKB surface utilities (`.kb-surface`, `.kb-quick-action`) and dark token roles.

# Phase 0 — UI Drift Report (Baseline)

Scope: client UI code in `client/src/pages/` and shared components in `client/src/components/`.
Goal: identify hard-coded colors/gradients, duplicated surfaces/shells, and non-token styles to inform Phase 1 tokenization. No UI copy/layout changes per constraints.

## Summary findings

- **Hard-coded hex colors present** across multiple files (scan surfaced 36 files). Priority targets:
  - **Page backgrounds (dashboards)**:
    - `client/src/pages/sales-dashboard.tsx`: container uses `bg-gradient-to-br from-[#253e31] to-[#75c29a]` (line ~264).
    - `client/src/pages/service-dashboard.tsx`: inline gradient usage.
    - `client/src/pages/admin-dashboard.tsx`: inline gradient usage.
  - **Utility in `index.css`**:
    - `.gradient-text` uses `from-[#253e31] to-[#75c29a]`.
- **SeedKB surface duplication**:
  - `KbCard` + `.kb-surface`/`.kb-quick-action` define their own glass surfaces. These align with SeedKB dark theme but are not yet tokenized as universal primitives.
- **Quick Actions row**:
  - Canonical sizing already apparent in `sales-dashboard.tsx`: `w-32 h-32` (8rem) rounded-full circles using `.kb-quick-action` glaze and motion.
  - Grid placement: `grid gap-8 justify-items-center`, `grid-cols-5` (default) or `grid-cols-6` (admin). This will be standardized across all dashboards.

## Token/utility candidates (to replace raw values)

- **Universal page background (dark/light)**
  - Tokens: `--page-bg-start`, `--page-bg-end`.
  - Utility: `.page-bg { background-image: linear-gradient(to bottom right, var(--page-bg-start), var(--page-bg-end)); }`
- **KB glass surfaces**
  - Promote `.kb-surface`, `.kb-quick-action`, `.kb-hover-motion` as universal utilities sourced from tokens already present in `.dark.theme-seed-dark`.
- **Gradient text**
  - Replace hard-coded hex in `.gradient-text` with `var(--page-bg-start)`/`var(--page-bg-end)` where brand-appropriate.

## Replacement plan (incremental)

1. Introduce background tokens and `.page-bg` utility (Phase 1).
2. Swap dashboard wrappers from per-page gradients → `.page-bg` without altering inner content.
3. Keep Quick Actions spec consistent (8rem circles, same motion/glaze) across Sales/Service/Admin.
4. Gradually codemod remaining hard-coded hex to tokenized utilities; leave any copy/layout intact.

## Notes

- This report is intentionally focused on high-impact visual drift (backgrounds, surfaces, prominent utilities). Additional smaller instances (e.g., prose styles in `index.css`) will be addressed later if they impact cross-theme consistency.

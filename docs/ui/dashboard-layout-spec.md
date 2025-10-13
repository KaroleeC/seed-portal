# Phase 0 — Universal DashboardLayout Specification

Constraint: wrap existing pages without changing inner content/copy. The layout standardizes header, quick actions, and page background.

## Component contract

- File: `client/src/components/layout/DashboardLayout.tsx`
- Props:
  - `header?: ReactNode` — optional header content; default renders `UniversalNavbar`.
  - `quickActions?: ReactNode` — optional circular quick actions row.
  - `aside?: ReactNode` — optional transitional sidebar/rail during migration.
  - `children: ReactNode` — main dashboard content.
- Behavior:
  - Provides outer container with universal page background (via `.page-bg`).
  - Centers content to `max-w-5xl` with `px-6 py-12` (matching Sales page).

## Quick Actions row (standard)

- Shape: circular cards, **w-32 h-32 (8rem)**, `rounded-full`.
- Surface: `.kb-quick-action` glaze + `.kb-hover-motion` motion (already defined in `index.css`).
- Grid:
  - Sales baseline: `grid gap-8 justify-items-center grid-cols-5`.
  - Admin may show `grid-cols-6` when needed (e.g., extra action present).
- Content anatomy:
  - Inner icon chip: `p-3 bg-gradient-* rounded-full mb-3`.
  - Title: `text-sm font-bold text-center text-white leading-tight px-1`.

Example (conceptual) placement:

```tsx
<DashboardLayout
  quickActions={
    <div className="mb-12">
      <div className="grid gap-8 justify-items-center grid-cols-5">
        {/* Reuse existing Sales quick action cards as-is */}
      </div>
    </div>
  }
>
  {children}
</DashboardLayout>
```

## Page background

- Apply `className="min-h-screen page-bg theme-seed-dark"` at the layout root (dark).
- Light uses `page-bg` (teal → #f4f4f4), keeping motion unchanged.

## Migration plan

1. Create `DashboardLayout.tsx` and move only the outer shell/spacing from Sales into it.
2. Wrap `sales-dashboard.tsx` with `DashboardLayout` (no content changes).
3. Wrap `service-dashboard.tsx` and `admin-dashboard.tsx`. If they have sidebars, inject them via `aside` temporarily; schedule deprecation.
4. Ensure the Quick Actions row is consistent in size/placement across all dashboards.

## Acceptance criteria

- All dashboard pages share identical outer spacing/background and Quick Actions sizing.
- No UI copy/structure changes inside dashboards.

## References

- `client/src/pages/sales-dashboard.tsx`: root container and Quick Actions grid/classes are the canonical baseline.
- `client/src/index.css`: `.kb-quick-action`, `.kb-hover-motion` utilities.

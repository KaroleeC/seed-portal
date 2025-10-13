# Phase 0 — Command Dock Specification (Bottom-left)

Goal: App-wide launcher for navigation and actions. Keyboard: Cmd/Ctrl+K to open. AI widget: Cmd/Ctrl+L.

## Components/locations

- `client/src/components/command/CommandDock.tsx` — Dock UI and command palette sheet.
- `client/src/hooks/useCommandDock.ts` — state + keyboard bindings.
- Global mount: in `App` (or root layout) so it is available on every page (like AI widget).

## Interaction

- **Open/close**: Cmd/Ctrl+K toggles the Dock. Escape to close.
- **AI widget**: Cmd/Ctrl+L toggles the AI widget (existing).
- **Focus guard**: Ignore shortcuts when an input/textarea/select/contenteditable is focused unless `metaKey+shiftKey` used.
- **Debounce**: prevent rapid toggles.

## Content

- **Quick Nav**: Dashboards, Calculator, Leads Inbox, Client Profiles, Knowledge Base, Settings Hub.
- **Quick Actions**: Contextual items (RBAC-gated) sourced from current page (e.g., create lead, open client profile, start quote).
- **Recent**: Recent locations based on navigation history.

## RBAC & telemetry

- Hide or disable items based on existing permissions.
- Emit open/close, selection, and no-result events to analytics.

## Accessibility

- Focus trap inside the sheet/popover.
- Keyboard navigation (arrow keys, enter) and screen reader labels on items.

## Visual/placement

- Launcher button anchored bottom-left (z-index above content, below toasts/modals), opening a sheet/popover aligned from bottom-left.
- Respect theme tokens for backgrounds/borders.

## Keyboard spec (exact)

- CmdOrCtrl+K → toggle Command Dock.
- CmdOrCtrl+L → toggle AI widget.
- Prevent default browser search on Cmd/Ctrl+K.

## Acceptance criteria

- Command Dock is visible app-wide and opens with Cmd/Ctrl+K.
- AI widget toggles with Cmd/Ctrl+L.
- No conflicts with inputs; accessible navigation works.

## Out of scope (Phase 0)

- Implementation details of fetching dynamic actions.
- Visual polish beyond functional usability.

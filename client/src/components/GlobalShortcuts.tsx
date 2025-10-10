import { useEffect } from "react";

/**
 * GlobalShortcuts registers app-wide keyboard shortcuts.
 * - Cmd/Ctrl+K: toggle Command Dock (dispatches 'seed-toggle-command-dock')
 * - Cmd/Ctrl+L: toggle AI Assistant widget (dispatches 'seed-toggle-assistant')
 *
 * It guards against firing while typing in inputs unless Shift is held.
 */
export function GlobalShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const metaOrCtrl = e.metaKey || e.ctrlKey;
      if (!metaOrCtrl) return;

      // Ignore when user is typing in inputs unless Shift is held
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (isTyping && !e.shiftKey) return;

      const key = String(e.key || "").toLowerCase();

      if (key === "k") {
        // Command Dock
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("seed-toggle-command-dock"));
      } else if (key === "l") {
        // AI Assistant Widget
        window.dispatchEvent(new CustomEvent("seed-toggle-assistant"));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return null;
}

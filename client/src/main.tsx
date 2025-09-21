import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@/theme";
import "./index.css";

// Expose React at runtime for components referencing global React (typing handled per-file)
(globalThis as any).React = React;

// Apply theme variant class to <html> based on query param or localStorage
// Usage:
//   - Add ?themeVariant=seedkb or ?themeVariant=classic to the URL
//   - Or set localStorage.themeVariant = 'seedkb' | 'classic'
// This only toggles CSS tokens and does not change layout/copy.
const THEME_VARIANT_KEY = 'themeVariant';
const THEME_PARAM_KEY = 'theme'; // 'light' | 'dark' | 'system'
type ThemeVariant = 'seedkb' | 'classic';

function applyThemeVariant(variant: ThemeVariant | null) {
  const rootEl = document.documentElement;
  rootEl.classList.remove('theme-seedkb', 'theme-classic');
  if (variant === 'seedkb') rootEl.classList.add('theme-seedkb');
  if (variant === 'classic') rootEl.classList.add('theme-classic');
}

(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const qp = params.get(THEME_VARIANT_KEY);
    const themeParam = params.get(THEME_PARAM_KEY);
    if (themeParam === 'light' || themeParam === 'dark' || themeParam === 'system') {
      try { localStorage.setItem('seedos-theme', themeParam); } catch {}
    }
    if (qp === 'seedkb' || qp === 'classic') {
      localStorage.setItem(THEME_VARIANT_KEY, qp);
      applyThemeVariant(qp);
      // Clean the URL without reloading to avoid sharing the flag by accident
      params.delete(THEME_VARIANT_KEY);
      params.delete(THEME_PARAM_KEY);
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', newUrl);
    } else {
      const saved = localStorage.getItem(THEME_VARIANT_KEY) as ThemeVariant | null;
      applyThemeVariant(saved);
    }
  } catch {
    // Non-blocking if storage or URL parsing fails
  }
})();

// Let Vite handle all error reporting - no custom global handlers

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

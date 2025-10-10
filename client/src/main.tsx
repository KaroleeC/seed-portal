import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@/theme";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./index.css";

// Expose React at runtime for components referencing global React (typing handled per-file)
(globalThis as any).React = React;

// Apply theme variant class to <html> based on query param or localStorage
// New naming: "Seed Dark Theme" (seed-dark) and "Seed Light Theme" (seed-light)
// Back-compat: keep supporting 'seedkb' (alias of seed-dark) and 'classic'.
// Usage:
//   - Add ?themeVariant=seed-dark|seed-light|seedkb|classic & ?theme=dark|light|system
//   - Or set localStorage.themeVariant accordingly
// This only toggles CSS tokens and does not change layout/copy.
const THEME_VARIANT_KEY = "themeVariant";
const THEME_PARAM_KEY = "theme"; // 'light' | 'dark' | 'system'
type ThemeVariant = "seed-dark" | "seed-light" | "seedkb" | "classic";

function applyThemeVariant(variant: ThemeVariant | null) {
  const rootEl = document.documentElement;
  rootEl.classList.remove("theme-seedkb", "theme-classic", "theme-seed-dark", "theme-seed-light");
  if (variant === "seedkb" || variant === "seed-dark") rootEl.classList.add("theme-seed-dark");
  if (variant === "seed-light") rootEl.classList.add("theme-seed-light");
  if (variant === "classic") rootEl.classList.add("theme-classic");
}

(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const qp = params.get(THEME_VARIANT_KEY);
    const themeParam = params.get(THEME_PARAM_KEY);
    if (themeParam === "light" || themeParam === "dark" || themeParam === "system") {
      try {
        localStorage.setItem("seedos-theme", themeParam);
      } catch {}
    }
    if (qp === "seedkb" || qp === "classic" || qp === "seed-dark" || qp === "seed-light") {
      localStorage.setItem(THEME_VARIANT_KEY, qp);
      applyThemeVariant(qp);
      // Clean the URL without reloading to avoid sharing the flag by accident
      params.delete(THEME_VARIANT_KEY);
      params.delete(THEME_PARAM_KEY);
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", newUrl);
    } else {
      let saved = localStorage.getItem(THEME_VARIANT_KEY) as ThemeVariant | null;
      // Default to Seed Dark Theme if no variant found
      if (!saved) {
        saved = "seed-dark";
        try {
          localStorage.setItem(THEME_VARIANT_KEY, saved);
        } catch {}
      }
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
    <SpeedInsights />
  </ThemeProvider>
);

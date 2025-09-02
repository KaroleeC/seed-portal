import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Make React globally available for components that don't import it
declare global {
  const React: typeof import('react');
}
(globalThis as any).React = React;

// Let Vite handle all error reporting - no custom global handlers

createRoot(document.getElementById("root")!).render(<App />);

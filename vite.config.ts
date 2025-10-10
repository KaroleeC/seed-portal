import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import dotenv from "dotenv";

// Ensure env vars are available at config time (both root and client/.env)
dotenv.config({ path: path.resolve(import.meta.dirname, ".env") });
dotenv.config({ path: path.resolve(import.meta.dirname, "client", ".env") });

export default defineConfig({
  plugins: [
    react(),
    // Disable the runtime error overlay by default to avoid intercepting benign errors
    // Enable explicitly by setting VITE_RUNTIME_ERROR_OVERLAY=1
    ...(process.env["VITE_RUNTIME_ERROR_OVERLAY"] === "1" ? [runtimeErrorOverlay()] : []),
    ...(process.env["NODE_ENV"] !== "production" && process.env["REPL_ID"] !== undefined
      ? [await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer())]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "client", "src", "assets"),
    },
  },
  optimizeDeps: {
    exclude: ["@playwright/test", "playwright", "playwright-core", "fsevents"],
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    fs: {
      strict: true,
      deny: ["**/.*"],
      // Allow reading files from project root (server) and attached_assets outside client root
      allow: [
        path.resolve(import.meta.dirname),
        path.resolve(import.meta.dirname, "attached_assets"),
      ],
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

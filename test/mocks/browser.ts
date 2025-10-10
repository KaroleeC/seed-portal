/**
 * MSW Browser Setup for Storybook (Browser Environment)
 *
 * This worker runs in the browser and intercepts API calls during development.
 * Import this in Storybook's preview.tsx.
 */

import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

// Create MSW worker with all handlers
export const worker = setupWorker(...handlers);

/**
 * Initialize MSW in the browser
 * Call this in Storybook's preview.tsx
 */
export async function initializeMSW() {
  if (typeof window === "undefined") {
    return;
  }

  await worker.start({
    onUnhandledRequest: "bypass", // Don't warn about external resources (fonts, images, etc.)
    quiet: false, // Show MSW logs in console for debugging
  });

  console.log("🔶 MSW: Mock Service Worker initialized");
}

// Export handlers for story-specific overrides
export { handlers };

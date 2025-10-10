/**
 * MSW Server Setup for Vitest (Node Environment)
 *
 * This server runs in Node.js and intercepts API calls during tests.
 * Import this in your test setup file.
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Create MSW server with all handlers
export const server = setupServer(...handlers);

// Export handlers for test-specific overrides
export { handlers };

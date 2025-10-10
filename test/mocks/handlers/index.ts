/**
 * MSW Handlers Index
 *
 * This is the single source of truth for all API mocks.
 * These handlers are shared between Vitest tests and Storybook stories.
 */

import { emailHandlers } from "./email.handlers";
import { quoteHandlers } from "./quote.handlers";
import { hubspotHandlers } from "./hubspot.handlers";
import { authHandlers } from "./auth.handlers";
import { jobsHandlers } from "./jobs.handlers";

// Export all handlers as a single array
export const handlers = [
  ...authHandlers,
  ...emailHandlers,
  ...quoteHandlers,
  ...hubspotHandlers,
  ...jobsHandlers,
];

// Export individual handler groups for selective use
export { authHandlers, emailHandlers, quoteHandlers, hubspotHandlers, jobsHandlers };

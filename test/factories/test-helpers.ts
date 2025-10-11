/**
 * Test Helpers for HTTP Integration Tests
 */

import { Pool } from "pg";
import { createTestLead as createLead } from "./lead-factory";
import { createTestThread as createThread } from "./thread-factory";

export { createTestLead, createTestThread } from "./lead-factory";

/**
 * Clean all test data from database
 */
export async function cleanTestData(pool: Pool): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE 
      email_lead_links,
      "crmLeads",
      "emailMessages",
      "emailThreads",
      "emailAccounts"
    CASCADE
  `);
}

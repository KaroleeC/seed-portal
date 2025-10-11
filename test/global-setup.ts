/**
 * Vitest Global Setup
 *
 * Runs once before all tests start
 */

import { globalTestSetup, globalTestTeardown } from "./setup-test-db";

export async function setup() {
  console.log("\n🚀 Starting test suite...\n");
  await globalTestSetup();
}

export async function teardown() {
  console.log("\n✨ Test suite complete\n");
  await globalTestTeardown();
}

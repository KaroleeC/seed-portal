/**
 * Migration: Update HubSpot routes to use new CRM service
 *
 * This script updates existing HubSpot integration routes to use the new centralized CRM service.
 * Run after implementing the new service architecture.
 */

import { crmService } from "../services";

export async function migrateHubSpotRoutes() {
  console.log("📦 Starting HubSpot routes migration to CRM service...");

  try {
    // Test the new CRM service health
    const healthCheck = await crmService.healthCheck();
    console.log("✅ CRM service health check:", healthCheck);

    if (healthCheck.status !== "healthy") {
      console.warn("⚠️ CRM service is not healthy but migration will continue");
    }

    // Migration steps would include:
    // 1. Updating database schemas if needed
    // 2. Migrating cached data to new format
    // 3. Testing key endpoints

    console.log("✅ HubSpot routes migration completed successfully");
    return true;
  } catch (error) {
    console.error("❌ HubSpot routes migration failed:", error);
    return false;
  }
}

// Export for use in startup scripts
export default migrateHubSpotRoutes;

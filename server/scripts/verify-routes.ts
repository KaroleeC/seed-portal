/**
 * Quick verification script to test if CRM routes are loaded
 * Run: tsx server/scripts/verify-routes.ts
 */

import crmRouter from "../routes/crm";

console.log("✅ CRM Router imported successfully");
console.log("Router type:", typeof crmRouter);
console.log("Router stack length:", crmRouter.stack?.length || 0);

// List all registered routes
if (crmRouter.stack) {
  console.log("\n📋 Registered CRM Routes:");
  crmRouter.stack.forEach((layer: any) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(", ").toUpperCase();
      console.log(`  ${methods} ${layer.route.path}`);
    }
  });
}

console.log("\n✅ Verification complete!");

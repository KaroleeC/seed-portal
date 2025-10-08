/**
 * Upload local assets to Supabase Storage
 * 
 * Usage:
 *   npx tsx scripts/upload-assets-to-supabase.ts [dev|prod]
 * 
 * Examples:
 *   npx tsx scripts/upload-assets-to-supabase.ts dev   # Upload to dev project
 *   npx tsx scripts/upload-assets-to-supabase.ts prod  # Upload to prod project
 *   npx tsx scripts/upload-assets-to-supabase.ts       # Upload to both
 * 
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (prod)
 *   - SUPABASE_DEV_URL and SUPABASE_DEV_SERVICE_ROLE_KEY in .env (dev)
 *   - Storage bucket "seed-portal-assets" must exist in both projects
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const BUCKET_NAME = 'seed-portal-assets';

// Supabase project configurations
// Note: In Doppler seed-portal-api, SUPABASE_SERVICE_ROLE_KEY points to dev project
// For true prod uploads, you'd need a separate SUPABASE_PROD_SERVICE_ROLE_KEY
const projects = {
  dev: {
    url: process.env.SUPABASE_URL || 'https://gbrwvokprjdibuxibpyh.supabase.co',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
    name: 'SeedOS Portal - DEV',
  },
  prod: {
    url: process.env.SUPABASE_PROD_URL || 'https://pacowjgyxbhgyrfrkmxf.supabase.co',
    key: process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
    name: 'SeedOS Portal - PROD',
  },
};

// Parse command line args
const args = process.argv.slice(2);
const targetEnv = args[0] as 'dev' | 'prod' | undefined;

// Asset mapping: local file -> CDN path
const assetMap = [
  // Brand logos
  { local: 'attached_assets/Seed Financial Logo - Light Mode.png', remote: 'logos/brand/seed-financial-light.png' },
  { local: 'attached_assets/Seed Financial Logo - Dark Mode.png', remote: 'logos/brand/seed-financial-dark.png' },
  
  // SEEDOS dashboard logos
  { local: 'client/src/assets/SEEDOS -SALES- light bg.png', remote: 'logos/seedos/sales-light.png' },
  { local: 'client/src/assets/SEEDOS -SALES- dark bg.png', remote: 'logos/seedos/sales-dark.png' },
  { local: 'client/src/assets/SEEDOS -SERVICE- light bg.png', remote: 'logos/seedos/service-light.png' },
  { local: 'client/src/assets/SEEDOS -SERVICE- dark bg.png', remote: 'logos/seedos/service-dark.png' },
  { local: 'client/src/assets/SEEDOS -ADMIN- light bg.png', remote: 'logos/seedos/admin-light.png' },
  { local: 'client/src/assets/SEEDOS -ADMIN- dark bg.png', remote: 'logos/seedos/admin-dark.png' },
  
  // App logos
  { local: 'client/src/assets/SEEDQC light bg.png', remote: 'logos/apps/seedqc-light.png' },
  { local: 'client/src/assets/SEEDQC dark bg.png', remote: 'logos/apps/seedqc-dark.png' },
  { local: 'client/src/assets/SEEDPAY light bg.png', remote: 'logos/apps/seedpay-light.png' },
  { local: 'client/src/assets/SEEDPAY dark bg.png', remote: 'logos/apps/seedpay-dark.png' },
  { local: 'client/src/assets/SEEDAI light bg.png', remote: 'logos/apps/seedai-light.png' },
  { local: 'client/src/assets/SEEDAI dark bg.png', remote: 'logos/apps/seedai-dark.png' },
  { local: 'client/src/assets/SEEDKB light bg.png', remote: 'logos/apps/seedkb-light.png' },
  { local: 'client/src/assets/SEEDKB dark bg.png', remote: 'logos/apps/seedkb-dark.png' },
  { local: 'client/src/assets/SEEDCADENCE light bg.png', remote: 'logos/apps/seedcadence-light.png' },
  { local: 'client/src/assets/SEEDCADENCE dark bg.png', remote: 'logos/apps/seedcadence-dark.png' },
  { local: 'client/src/assets/SEEDMAIL light bg.png', remote: 'logos/apps/seedmail-light.png' },
  { local: 'client/src/assets/SEEDMAIL dark bg.png', remote: 'logos/apps/seedmail-dark.png' },
  { local: 'client/src/assets/SEEDDRIVE light bg.png', remote: 'logos/apps/seeddrive-light.png' },
  { local: 'client/src/assets/SEEDDRIVE dark bg.png', remote: 'logos/apps/seeddrive-dark.png' },
  { local: 'client/src/assets/SEEDKPI light bg.png', remote: 'logos/apps/seedkpi-light.png' },
  { local: 'client/src/assets/SEEDKPI dark bg.png', remote: 'logos/apps/seedkpi-dark.png' },
  { local: 'client/src/assets/CLIENTIQ light bg.png', remote: 'logos/apps/clientiq-light.png' },
  { local: 'client/src/assets/CLIENTIQ dark bg.png', remote: 'logos/apps/clientiq-dark.png' },
  { local: 'client/src/assets/SERVICEIQ light bg.png', remote: 'logos/apps/serviceiq-light.png' },
  { local: 'client/src/assets/SERVICEIQ dark bg.png', remote: 'logos/apps/serviceiq-dark.png' },
  { local: 'client/src/assets/SALESIQ light bg.png', remote: 'logos/apps/salesiq-light.png' },
  { local: 'client/src/assets/SALESIQ dark bg.png', remote: 'logos/apps/salesiq-dark.png' },
  { local: 'client/src/assets/LEADIQ light bg.png', remote: 'logos/apps/leadiq-light.png' },
  { local: 'client/src/assets/LEADIQ dark bg.png', remote: 'logos/apps/leadiq-dark.png' },
  { local: 'client/src/assets/COMMSHUB light bg.png', remote: 'logos/apps/commshub-light.png' },
  { local: 'client/src/assets/COMMSHUB dark bg.png', remote: 'logos/apps/commshub-dark.png' },
  
  // Misc assets
  { local: 'client/src/assets/SeedCommandDockLogo.png', remote: 'misc/command-dock-logo.png' },
  { local: 'client/src/assets/assistant-bot.png', remote: 'misc/assistant-bot.png' },
];

async function uploadAsset(
  supabaseClient: ReturnType<typeof createClient>,
  localPath: string,
  remotePath: string
): Promise<boolean> {
  const fullPath = path.resolve(__dirname, '..', localPath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️  Skipping ${remotePath} (not found)`);
    return false;
  }

  try {
    const fileBuffer = fs.readFileSync(fullPath);
    const contentType = 'image/png'; // All our assets are PNG
    
    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .upload(remotePath, fileBuffer, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error(`  ❌ Failed: ${remotePath} - ${error.message}`);
      return false;
    }

    console.log(`  ✅ ${remotePath}`);
    return true;
  } catch (err: any) {
    console.error(`  ❌ Error: ${remotePath} - ${err.message}`);
    return false;
  }
}

async function uploadToProject(env: 'dev' | 'prod') {
  const project = projects[env];
  
  if (!project.key) {
    console.error(`\n❌ Missing service key for ${env} project`);
    console.error(`   Add ${env === 'dev' ? 'SUPABASE_DEV_SERVICE_ROLE_KEY' : 'SUPABASE_SERVICE_ROLE_KEY'} to .env`);
    return { success: 0, skip: 0, fail: assetMap.length };
  }

  const supabaseClient = createClient(project.url, project.key);
  
  console.log(`\n📦 ${project.name} (${env})`);
  console.log(`🌐 ${project.url}`);
  console.log(`📁 Bucket: ${BUCKET_NAME}\n`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const asset of assetMap) {
    const result = await uploadAsset(supabaseClient, asset.local, asset.remote);
    if (result) {
      successCount++;
    } else if (fs.existsSync(path.resolve(__dirname, '..', asset.local))) {
      failCount++;
    } else {
      skipCount++;
    }
  }

  console.log(`\n  📊 Summary: ✅ ${successCount} uploaded, ⚠️ ${skipCount} skipped, ❌ ${failCount} failed`);
  
  return { success: successCount, skip: skipCount, fail: failCount };
}

async function main() {
  console.log('🚀 Uploading assets to Supabase Storage CDN\n');

  const envsToUpload: Array<'dev' | 'prod'> = targetEnv 
    ? [targetEnv]
    : ['dev', 'prod'];

  const results = {
    dev: { success: 0, skip: 0, fail: 0 },
    prod: { success: 0, skip: 0, fail: 0 },
  };

  for (const env of envsToUpload) {
    results[env] = await uploadToProject(env);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY\n');
  
  for (const env of envsToUpload) {
    const { success, skip, fail } = results[env];
    console.log(`${projects[env].name} (${env}):`);
    console.log(`  ✅ Uploaded: ${success}`);
    console.log(`  ⚠️  Skipped: ${skip}`);
    console.log(`  ❌ Failed: ${fail}\n`);
  }

  if (results.dev.success > 0 || results.prod.success > 0) {
    console.log('🎉 Assets uploaded successfully!\n');
    console.log('📝 Next steps:\n');
    
    if (results.dev.success > 0) {
      console.log('1. Add to Doppler (seed-portal-web dev config):');
      console.log(`   VITE_SUPABASE_STORAGE_URL=${projects.dev.url}/storage/v1/object/public/${BUCKET_NAME}\n`);
    }
    
    if (results.prod.success > 0) {
      console.log('2. Add to Doppler (seed-portal-web stg/prd configs):');
      console.log(`   VITE_SUPABASE_STORAGE_URL=${projects.prod.url}/storage/v1/object/public/${BUCKET_NAME}\n`);
    }
    
    console.log('3. Restart your dev server: npm run dev:web:doppler');
    console.log('4. Verify logos load from CDN in browser DevTools → Network tab');
  }

  const totalFail = results.dev.fail + results.prod.fail;
  process.exit(totalFail > 0 ? 1 : 0);
}

main();

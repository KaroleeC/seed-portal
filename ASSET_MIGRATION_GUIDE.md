# Asset Migration to Supabase CDN - Complete Guide

## What We Did

✅ Created centralized asset registry (`client/src/assets/index.ts`)  
✅ Created upload script (`scripts/upload-assets-to-supabase.ts`)  
✅ Updated `UniversalNavbar.tsx` to use new registry (demo migration)  
✅ Made `logos.ts` backwards-compatible

## What You Need to Do

### Step 1: Create Supabase Storage Bucket (5 min)

1. Go to: https://supabase.com/dashboard/project/pacowjgyxbhgyrfrkmxf/storage/buckets
2. Click **"New bucket"**
3. Configure:
   - **Name:** `seed-portal-assets`
   - **Public bucket:** ✅ Yes (enable)
   - **File size limit:** 50MB
   - **Allowed MIME types:** `image/png, image/jpeg, image/svg+xml`
4. Click **"Create bucket"**

### Step 2: Upload Assets to Supabase

Run the upload script:

```bash
# Make sure you have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
npx tsx scripts/upload-assets-to-supabase.ts
```

Expected output:
```
✅ Uploaded 37 assets
📝 Next steps: Add env var to Doppler
```

### Step 3: Add CDN URL to Doppler

**Doppler Project:** `seed-portal-web`  
**Config:** `dev` (and later `stg`, `prd`)

Add this variable:
```
VITE_SUPABASE_STORAGE_URL=https://pacowjgyxbhgyrfrkmxf.supabase.co/storage/v1/object/public/seed-portal-assets
```

**How to add via CLI:**
```bash
doppler secrets set VITE_SUPABASE_STORAGE_URL="https://pacowjgyxbhgyrfrkmxf.supabase.co/storage/v1/object/public/seed-portal-assets" --project seed-portal-web --config dev
```

**How to add via dashboard:**
1. Go to: https://dashboard.doppler.com/workplace/[your-workspace]/projects/seed-portal-web/configs/dev
2. Click **"Add Secret"**
3. Name: `VITE_SUPABASE_STORAGE_URL`
4. Value: `https://pacowjgyxbhgyrfrkmxf.supabase.co/storage/v1/object/public/seed-portal-assets`

### Step 4: Restart Dev Server

```bash
# Stop current web server (Ctrl+C)
npm run dev:web:doppler
```

The app will now load logos from Supabase CDN! 🎉

### Step 5: Verify Assets Load

1. Open browser DevTools → Network tab
2. Visit `/sales-dashboard`
3. Look for image requests to `pacowjgyxbhgyrfrkmxf.supabase.co`
4. Confirm logos display correctly

### Step 6: Migrate Other Components (Optional)

Other files still using old imports:
- `client/src/pages/auth-page.tsx`
- `client/src/pages/login.tsx`
- `client/src/pages/kb-admin.tsx`
- `client/src/pages/knowledge-base.tsx`
- `client/src/pages/profile.tsx`

**Migration pattern:**
```typescript
// Before:
import { logoLight, logoDark } from "@/assets/logos";
const logoSrc = resolvedTheme === "dark" ? logoDark : logoLight;

// After:
import { brand, getThemedLogo } from "@/assets";
const logoSrc = getThemedLogo(brand, resolvedTheme === 'dark' ? 'dark' : 'light');
```

### Step 7: Clean Up Local Assets (After Testing)

Once CDN is confirmed working:

```bash
# Delete PNG files from repo (they're now on CDN)
git rm client/src/assets/*.png
git rm attached_assets/*.png

# Keep the registry files
git add client/src/assets/index.ts
git add client/src/assets/logos.ts

# Commit
git commit -m "feat: migrate assets to Supabase CDN"
```

## Benefits Achieved

✅ **No more git bloat** - PNGs removed from repo  
✅ **Instant updates** - Change logos without deployments  
✅ **Browser caching** - CDN serves cached images  
✅ **Cleaner imports** - 1 registry vs 14+ imports  
✅ **Dev/prod parity** - Same CDN URLs everywhere  

## Rollback Plan

If something breaks:

1. **Immediate:** Remove `VITE_SUPABASE_STORAGE_URL` from Doppler
2. **Fallback:** App will use empty string for CDN, images won't load but won't crash
3. **Restore:** Revert `UniversalNavbar.tsx` and `client/src/assets/index.ts` from git

## Production Deployment

For staging/prod:

1. Upload assets to Supabase production project
2. Add `VITE_SUPABASE_STORAGE_URL` to Doppler `stg` and `prd` configs
3. Deploy as normal

## Questions?

- **Why Supabase Storage?** Already using Supabase, free tier generous, global CDN
- **What about SVGs?** Future enhancement - convert logos to SVG for better scaling
- **Cache invalidation?** Append `?v=2` to URLs when updating logos

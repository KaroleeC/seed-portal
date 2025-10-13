# Vercel Deployment Guide - Fixed Configuration

This guide covers the critical fixes made to enable proper Vercel deployment with Railway backend integration.

## 🚀 Critical Issues Fixed

### 1. CORS Configuration (Railway Backend)

**Issue**: Backend used wildcard CORS that blocked session authentication across domains.

**Fix**: Updated `server/index.ts` with proper origin validation:

- ✅ Specific Vercel domain patterns (`*.vercel.app`)
- ✅ Development environments (localhost, Replit)
- ✅ Custom production domains
- ✅ Proper credentials support for allowed origins
- ✅ Security logging for blocked origins

### 2. Environment Variables Configuration

**Issue**: `vercel.json` used incorrect `@secret` pattern for environment variables.

**Fix**: Updated to use proper `$VARIABLE` syntax that Vercel expects.

### 3. Build Configuration

**Issue**: Build output directory configuration needed verification.

**Fix**: Confirmed `dist/public` is correct based on Vite build output.

## 📋 Vercel Setup Steps

### Step 1: Set Environment Variables in Vercel Dashboard

Set these environment variables in your Vercel project dashboard:

```
VITE_API_URL=https://your-railway-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_HUBSPOT_CLIENT_ID=your-hubspot-client-id
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

### Step 2: Configure Railway Backend Environment

Add your Vercel frontend URL to Railway backend environment variables:

```
# Add your Vercel deployment URL for CORS validation
FRONTEND_URL=https://your-app.vercel.app
```

### Step 3: Deploy Configuration Files

The following files have been updated and are ready for deployment:

- ✅ `vercel.json` - Fixed environment variable syntax
- ✅ `server/index.ts` - Fixed CORS configuration

## 🔧 Fixed Configuration Details

### CORS Configuration (Backend)

The backend now validates origins against specific patterns:

```javascript
const allowedOrigins = [
  // Development
  "http://localhost:3000",
  "http://localhost:5000",

  // Replit development
  /^https:\/\/[a-f0-9-]+\.replit\.dev$/,

  // Vercel deployments
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/seed-portal.*\.vercel\.app$/,

  // Production domains
  "https://portal.seedfinancial.io",
  "https://app.seedfinancial.io",
];
```

### Environment Variables (Frontend)

Updated `vercel.json` uses correct Vercel syntax:

```json
{
  "env": {
    "VITE_API_URL": "$VITE_API_URL",
    "VITE_GOOGLE_CLIENT_ID": "$VITE_GOOGLE_CLIENT_ID",
    "VITE_HUBSPOT_CLIENT_ID": "$VITE_HUBSPOT_CLIENT_ID",
    "VITE_STRIPE_PUBLISHABLE_KEY": "$VITE_STRIPE_PUBLISHABLE_KEY"
  }
}
```

## 🔒 Security Features

### Enhanced Security Headers

Added additional security headers to `vercel.json`:

- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Session Cookie Security

Backend already configured for cross-origin authentication:

- `sameSite: 'none'` in production
- `secure: true` for HTTPS
- `httpOnly: true` for security

## 🧪 Testing Cross-Origin Authentication

### Test Checklist

1. ✅ Frontend loads on Vercel
2. ✅ API requests reach Railway backend
3. ✅ Session cookies work across domains
4. ✅ Authentication persists across page refreshes
5. ✅ No CORS errors in browser console

### Debugging Commands

```bash
# Test CORS from your Vercel domain
curl -H "Origin: https://your-app.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://your-railway-backend.railway.app/api/health

# Check if cookies are being set
curl -c cookies.txt -b cookies.txt \
     -X POST \
     -H "Content-Type: application/json" \
     -H "Origin: https://your-app.vercel.app" \
     -d '{"email":"test@seedfinancial.io","password":"test"}' \
     https://your-railway-backend.railway.app/api/login
```

## 🚨 Common Issues & Solutions

### Issue: "Access to fetch blocked by CORS policy"

**Solution**: Verify your Vercel domain is included in the backend's allowed origins list.

### Issue: "Session not persisting"

**Solution**: Ensure:

- Backend has `sameSite: 'none'` and `secure: true`
- Frontend and backend are both served over HTTPS
- CORS credentials are enabled for your domain

### Issue: "Environment variables undefined"

**Solution**: Check Vercel dashboard environment variable names match exactly what's in `vercel.json`.

## 🔄 Deployment Commands

### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel --prod
```

### Deploy Backend to Railway

```bash
# Already configured in Railway
# Just push to your connected Git repository
git push origin main
```

## ✅ Verification Steps

After deployment, verify:

1. **CORS Headers**: Check browser network tab shows proper CORS headers
2. **Authentication**: Login should work and persist across page refreshes
3. **API Calls**: All API endpoints should work from Vercel frontend
4. **Session Cookies**: Should see session cookies in browser dev tools
5. **No Console Errors**: Browser console should show no CORS or auth errors

## 📞 Support

If you encounter issues:

1. Check browser console for CORS/auth errors
2. Verify environment variables in Vercel dashboard
3. Confirm Railway backend logs show allowed origin
4. Test API endpoints directly with curl

The configuration is now production-ready for Vercel + Railway deployment with proper cross-origin session authentication.

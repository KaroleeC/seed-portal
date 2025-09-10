# Vercel Deployment Configuration

This document outlines how to deploy the frontend to Vercel while connecting to the Railway backend at `https://web-production-1fb61.up.railway.app`.

## Configuration Overview

The project has been configured to support both local development (with relative URLs) and production deployment (with absolute URLs to Railway backend).

### Files Modified

1. **vercel.json** - Vercel deployment configuration
2. **client/src/lib/queryClient.ts** - API client with configurable base URL support

## Required Environment Variables

Configure these environment variables in your Vercel project settings:

### Required Variables

```bash
# Backend API URL (Railway)
VITE_API_URL=https://web-production-1fb61.up.railway.app

# Google OAuth (if using Google authentication)
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# HubSpot Integration (if using HubSpot)
VITE_HUBSPOT_CLIENT_ID=your-hubspot-client-id

# Stripe Integration (if using Stripe)
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

### Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with the appropriate value
4. Make sure to select the correct environments (Production, Preview, Development)

## Deployment Instructions

### 1. Prerequisites

- Ensure your Railway backend is running at `https://web-production-1fb61.up.railway.app`
- Verify CORS is configured on the Railway backend to accept requests from your Vercel domain

### 2. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy
vercel

# Set environment variables (if not set via dashboard)
vercel env add VITE_API_URL
vercel env add VITE_GOOGLE_CLIENT_ID
# ... add other variables as needed
```

#### Option B: Connect GitHub Repository

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the Vite configuration
3. Set environment variables in the Vercel dashboard
4. Deploy automatically on push to main branch

### 3. Vercel Configuration Details

The `vercel.json` file includes:

- **Build Settings**: Configured for Vite with `dist/public` output directory
- **Routing**: SPA routing support with fallback to `index.html`
- **Security Headers**: Basic security headers for production
- **Environment Variables**: Build-time environment variable configuration

## API Client Configuration

The API client (`client/src/lib/queryClient.ts`) now supports:

### Environment-Based URL Resolution

```javascript
// Development (VITE_API_URL not set)
// Uses relative URLs: /api/health, /api/user, etc.

// Production (VITE_API_URL = "https://web-production-1fb61.up.railway.app")
// Uses absolute URLs: https://web-production-1fb61.up.railway.app/api/health
```

### Cross-Origin Authentication

The API client maintains session-based authentication with:
- `credentials: 'include'` - Sends cookies with cross-origin requests
- Proper CORS headers for authentication

## Railway Backend Requirements

Ensure your Railway backend is configured for cross-origin requests:

### Required CORS Configuration

```javascript
// Example Express.js CORS configuration
app.use(cors({
  origin: [
    'https://your-vercel-app.vercel.app', // Your Vercel domain
    'http://localhost:5173', // Local development
    'http://localhost:3000'  // Alternative local port
  ],
  credentials: true, // Allow cookies/session data
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-csrf-token']
}));
```

### Session Configuration

Ensure session cookies work across domains:

```javascript
// Example Express session configuration
app.use(session({
  // ... other config
  cookie: {
    secure: true, // HTTPS only in production
    sameSite: 'none', // Allow cross-origin cookies
    domain: '.up.railway.app' // Allow cookies across Railway subdomains
  }
}));
```

## Testing the Deployment

### 1. Verify Environment Variables

Check that environment variables are loaded correctly:

```javascript
// In browser console on your Vercel deployment
console.log(import.meta.env.VITE_API_URL);
// Should output: https://web-production-1fb61.up.railway.app
```

### 2. Test API Connectivity

1. Open browser developer tools
2. Navigate to your Vercel deployment
3. Check Network tab for API requests
4. Verify requests are going to the Railway backend URL
5. Check for CORS errors in console

### 3. Authentication Flow

1. Test login functionality
2. Verify session cookies are set
3. Check that protected routes work correctly
4. Ensure logout clears authentication state

## Troubleshooting

### Common Issues

#### CORS Errors
```
Access to fetch at 'https://web-production-1fb61.up.railway.app/api/user' 
from origin 'https://your-app.vercel.app' has been blocked by CORS policy
```

**Solution**: Update CORS configuration on Railway backend to include your Vercel domain.

#### Authentication Issues
```
401 Unauthorized errors on protected routes
```

**Solution**: 
1. Verify `credentials: 'include'` is set in API client
2. Check Railway backend session configuration
3. Ensure cookies are allowed for cross-origin requests

#### Environment Variables Not Loading
```
VITE_API_URL is undefined
```

**Solution**:
1. Verify variables are set in Vercel dashboard
2. Ensure variables start with `VITE_` prefix
3. Redeploy after adding variables

## Performance Considerations

- **Build Optimization**: Vite automatically optimizes the build for production
- **Caching**: Vercel provides automatic static asset caching
- **CDN**: Vercel's global CDN serves your frontend from edge locations

## Security Considerations

- **HTTPS Only**: All communication is encrypted via HTTPS
- **Security Headers**: Applied via `vercel.json` configuration
- **Environment Variables**: Sensitive values are injected at build time
- **CORS Policy**: Restricts which domains can access your backend

## Monitoring and Logs

- **Vercel Dashboard**: Monitor deployment status and build logs
- **Railway Dashboard**: Monitor backend health and API logs
- **Browser DevTools**: Debug API requests and CORS issues
- **Error Tracking**: Consider adding Sentry or similar for production error tracking
# Cerbos Railway Deployment Guide

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install the Railway CLI
3. **Git Repository**: Your code should be in a Git repository

## Step 1: Install Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Or using curl
curl -fsSL https://railway.app/install.sh | sh

# Login to Railway
railway login
```

## Step 2: Prepare Cerbos Directory

Your `cerbos/` directory should have this structure:

```
cerbos/
├── Dockerfile
├── config.yaml
├── railway.json
└── policies/
    ├── commission.yaml
    ├── quote.yaml
    └── diagnostics.yaml
```

## Step 3: Deploy to Railway

### Option A: Using Railway CLI (Recommended)

1. **Navigate to the Cerbos directory**:

   ```bash
   cd cerbos/
   ```

2. **Initialize Railway project**:

   ```bash
   railway init
   # Choose "Empty Project"
   # Name it "seed-cerbos" or similar
   ```

3. **Deploy the service**:

   ```bash
   railway up
   ```

4. **Set up custom domain (optional)**:
   ```bash
   railway domain
   ```

### Option B: Using Railway Dashboard

1. **Go to Railway Dashboard**: https://railway.app/dashboard

2. **Create New Project**:
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Connect your repository
   - Select the repository containing your cerbos folder

3. **Configure Build Settings**:
   - Root Directory: `cerbos`
   - Build Command: (leave empty - Docker handles this)
   - Start Command: (leave empty - Docker handles this)

4. **Set Environment Variables** (if needed):
   - No environment variables required for basic setup

## Step 4: Configure Networking

1. **Get the Railway URL**:
   - After deployment, Railway will provide a URL like: `https://seed-cerbos-production.up.railway.app`

2. **Note the ports**:
   - HTTP: Port 3592 (mapped to Railway's port 80/443)
   - gRPC: Port 3593 (mapped to Railway's internal networking)

## Step 5: Update Your Application Configuration

Add these environment variables to your Doppler configuration:

```bash
# In Doppler (seed-portal-api project, dev config)
CERBOS_HOST=seed-cerbos-production.up.railway.app
CERBOS_PORT=443  # Use 443 for HTTPS on Railway
USE_CERBOS=false  # Start with false for testing
```

## Step 6: Test the Deployment

1. **Check Cerbos Health**:

   ```bash
   curl https://your-cerbos-url.up.railway.app/
   ```

2. **Test gRPC Connection**:
   ```bash
   # From your application
   curl -H "Accept: application/json" "http://localhost:5000/api/_rbac-test"
   ```

## Step 7: Enable Cerbos in Your Application

1. **Update Doppler Configuration**:

   ```bash
   # Set in Doppler
   USE_CERBOS=true
   ```

2. **Restart your application**:
   ```bash
   # Your app will now use Cerbos for authorization decisions
   npm run dev:doppler
   ```

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check that Dockerfile is in the cerbos/ directory
   - Verify all policy files are present

2. **Connection Issues**:
   - Ensure CERBOS_HOST points to your Railway URL
   - Use port 443 for HTTPS connections
   - Check Railway logs for errors

3. **Policy Errors**:
   - Validate YAML syntax in policy files
   - Check Cerbos logs in Railway dashboard

### Railway Commands

```bash
# View logs
railway logs

# Check status
railway status

# Redeploy
railway up

# Open in browser
railway open

# Connect to shell (if needed)
railway shell
```

## Step 8: Verify Everything Works

1. **Test Authorization Endpoint**:

   ```bash
   curl -H "Accept: application/json" "http://localhost:5000/api/_rbac-test"
   ```

2. **Check for Cerbos in Logs**:
   Look for log messages like:

   ```
   🎯 [Authz] Using Cerbos authorization
   ✅ [Cerbos] Authorization result: allowed=true
   ```

3. **Test Policy Decisions**:
   ```bash
   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "http://localhost:5000/api/_cerbos-explain?action=commissions.sync&resourceType=commission"
   ```

## Production Considerations

1. **Custom Domain**: Set up a custom domain for production
2. **SSL/TLS**: Railway provides SSL automatically
3. **Monitoring**: Set up Railway monitoring and alerts
4. **Scaling**: Configure auto-scaling if needed
5. **Backup**: Policies are in Git, so they're backed up

## Cost Estimation

- **Railway Hobby Plan**: $5/month (should be sufficient for Cerbos)
- **Railway Pro Plan**: $20/month (for production workloads)

## Next Steps

After successful deployment:

1. Test all authorization scenarios
2. Monitor performance and logs
3. Set up alerts for service health
4. Document the new authorization flow for your team

---

**Your Cerbos service should now be running on Railway!** 🎉

The authorization system will now use policy-as-code for all access decisions, enabling you to add new roles and permissions without code changes.

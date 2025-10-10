#!/bin/bash

# Cerbos Railway Deployment Script
# This script automates the deployment of Cerbos to Railway

set -e

echo "🚀 Starting Cerbos deployment to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway..."
    railway login
fi

# Navigate to cerbos directory
cd cerbos/

# Check if required files exist
if [ ! -f "Dockerfile" ]; then
    echo "❌ Dockerfile not found in cerbos/ directory"
    exit 1
fi

if [ ! -f "config.yaml" ]; then
    echo "❌ config.yaml not found in cerbos/ directory"
    exit 1
fi

if [ ! -d "policies" ]; then
    echo "❌ policies/ directory not found in cerbos/ directory"
    exit 1
fi

echo "✅ All required files found"

# Initialize Railway project if not already done
if [ ! -f ".railway" ]; then
    echo "🚂 Initializing Railway project..."
    railway init --name "seed-cerbos"
else
    echo "✅ Railway project already initialized"
fi

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

# Get the deployment URL
echo "🔍 Getting deployment URL..."
RAILWAY_URL=$(railway status --json 2>/dev/null | jq -r '.deployments[0].url // empty' 2>/dev/null || echo "")

if [ -n "$RAILWAY_URL" ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Cerbos URL: $RAILWAY_URL"
    echo ""
    echo "📝 Next steps:"
    echo "1. Add these environment variables to your Doppler configuration:"
    echo "   CERBOS_HOST=$(echo $RAILWAY_URL | sed 's|https://||')"
    echo "   CERBOS_PORT=443"
    echo "   USE_CERBOS=false  # Start with false for testing"
    echo ""
    echo "2. Test the deployment:"
    echo "   curl $RAILWAY_URL"
    echo ""
    echo "3. Enable Cerbos in your application by setting USE_CERBOS=true"
else
    echo "⚠️  Deployment completed but URL not available yet"
    echo "   Check Railway dashboard: https://railway.app/dashboard"
    echo "   You can get the URL later with: railway status"
fi

echo "🎉 Cerbos deployment script completed!"

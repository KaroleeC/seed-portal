# Google Service Account Setup (No More Manual Token Refresh!)

## Why Service Account Authentication?

- ✅ **Never expires automatically** - No more manual token refresh
- ✅ **Production-ready** - Designed for server-to-server applications
- ✅ **More secure** - No user credentials stored
- ✅ **Zero maintenance** - Set it once, works forever

## Setup Instructions

### Step 1: Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Go to **IAM & Admin > Service Accounts**
4. Click **Create Service Account**
5. Name it: `seed-portal-admin`
6. Description: `Seed Financial Portal Admin API Access`
7. Click **Create and Continue**
8. Skip role assignment for now (we'll use domain-wide delegation)
9. Click **Done**

### Step 2: Generate Service Account Key

1. Click on your new service account
2. Go to **Keys** tab
3. Click **Add Key > Create New Key**
4. Select **JSON** format
5. Click **Create** - this downloads the JSON file
6. **Save this JSON file securely** - you'll need its contents

### Step 3: Enable Domain-Wide Delegation

1. In the service account details, click **Advanced settings**
2. Check **Enable Google Workspace Domain-wide Delegation**
3. Add Product name: `Seed Financial Portal`
4. Click **Save**
5. **Copy the Client ID** that appears (you'll need this)

### Step 4: Configure Google Workspace Admin

1. Go to [Google Workspace Admin Console](https://admin.google.com/)
2. Sign in with your `@seedfinancial.io` admin account
3. Go to **Security > API Controls > Domain-wide Delegation**
4. Click **Add new**
5. Paste the **Client ID** from Step 3
6. Add these OAuth Scopes (comma-separated):
   ```
   https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.group.readonly,https://www.googleapis.com/auth/admin.directory.group.member.readonly
   ```
7. Click **Authorize**

### Step 5: Add to Replit Secrets

1. In Replit, go to your project's **Secrets** tab
2. Add a new secret:
   - **Key**: `GOOGLE_SERVICE_ACCOUNT_JSON`
   - **Value**: The entire contents of the JSON file from Step 2

### Step 6: Test the Setup

The system will automatically try service account authentication first, then fall back to user credentials if needed.

## What This Eliminates

- ❌ No more manual token refresh every 6 months
- ❌ No more expired credential errors
- ❌ No more OAuth playground setup
- ❌ No more "invalid_grant" errors

## Fallback Protection

Your current user credential system remains as a fallback, so you get:

1. **Primary**: Service Account (never expires)
2. **Fallback**: User Credentials with auto-refresh
3. **Last Resort**: Manual refresh (current process)

This gives you the most robust Google authentication possible!

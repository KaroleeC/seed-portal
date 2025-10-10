# Google Workspace Domain-Wide Delegation Setup

## Current Issue

Your service account `seed-admin-api@seedportal.iam.gserviceaccount.com` is authenticated successfully, but it lacks domain-wide delegation permissions to access Google Workspace users.

## Required Setup Steps

### 1. Your Service Account Details

- **Service Account Email**: `seed-admin-api@seedportal.iam.gserviceaccount.com`
- **Client ID**: `101858662159388688784`
- **Project ID**: `seedportal`

### 2. Configure Domain-Wide Delegation in Google Workspace Admin

1. **Go to Google Workspace Admin Console**
   - Visit: https://admin.google.com
   - Sign in with your `@seedfinancial.io` admin account

2. **Navigate to API Controls**
   - Security → API Controls → Domain-wide Delegation

3. **Add Your Service Account**
   - Click "Add new"
   - Enter this **Client ID**: `101858662159388688784`
   - Add these OAuth Scopes (copy exactly):
     ```
     https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.group.readonly,https://www.googleapis.com/auth/admin.directory.group.member.readonly
     ```

4. **Authorize the Service Account**
   - Click "Authorize"
   - Save the settings

### 3. How to Find Your Service Account Client ID

**Option A: From Google Cloud Console**

1. Go to https://console.cloud.google.com
2. Select project: `seedportal`
3. Navigate to IAM & Admin → Service Accounts
4. Click on `seed-admin-api@seedportal.iam.gserviceaccount.com`
5. The Client ID will be displayed in the details

**Option B: From Your Service Account JSON**
The client ID is in the `client_id` field of your GOOGLE_SERVICE_ACCOUNT_JSON secret.

## Verification

After setting up domain-wide delegation:

1. Wait 5-10 minutes for changes to propagate
2. Click "Test Connection" button in the User Management page
3. The connection should show as "Connected"

## Troubleshooting

- Make sure you use the exact OAuth scopes listed above
- Ensure you're logged into Google Admin Console with an admin account
- The service account must be from the same Google Cloud project
- Changes can take up to 10 minutes to take effect

#!/bin/bash

# check-banned-imports.sh
# Phase 0: Check for banned SDK imports outside of allowed provider files
# Exit with error code if any violations are found

set -e

echo "🔍 Checking for banned SDK imports..."

ERRORS=0

# Files to exclude from checks (provider implementations and test files)
EXCLUDE_PATTERN="node_modules|dist|build|\.git|package-lock\.json|hubspot-provider\.ts|storage-service\.ts|box-integration\.ts|airtable\.ts|client-intel\.ts|crm-service\.ts|services/hubspot/|__tests__|\.test\.ts|\.test\.tsx|\.spec\.ts|\.spec\.tsx"

# Check for @hubspot/api-client imports
echo "  Checking for @hubspot/api-client imports..."
HUBSPOT_MATCHES=$(grep -r "@hubspot/api-client" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | grep -vE "$EXCLUDE_PATTERN" || true)
if [ -n "$HUBSPOT_MATCHES" ]; then
  echo "❌ Found restricted @hubspot/api-client imports:"
  echo "$HUBSPOT_MATCHES"
  ERRORS=$((ERRORS + 1))
fi

# Check for box-node-sdk imports
echo "  Checking for box-node-sdk imports..."
BOX_MATCHES=$(grep -r "box-node-sdk" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | grep -vE "$EXCLUDE_PATTERN" || true)
if [ -n "$BOX_MATCHES" ]; then
  echo "❌ Found restricted box-node-sdk imports:"
  echo "$BOX_MATCHES"
  ERRORS=$((ERRORS + 1))
fi

# Check for airtable imports
echo "  Checking for airtable imports..."
AIRTABLE_MATCHES=$(grep -rE "from ['\"]airtable['\"]|require\(['\"]airtable['\"]\)" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | grep -vE "$EXCLUDE_PATTERN" || true)
if [ -n "$AIRTABLE_MATCHES" ]; then
  echo "❌ Found restricted airtable imports:"
  echo "$AIRTABLE_MATCHES"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
  echo "✅ No banned imports found!"
  exit 0
else
  echo ""
  echo "❌ Found $ERRORS type(s) of banned imports."
  echo "See docs/INTEGRATION_REMOVAL_PLAN.md for details on provider abstractions."
  exit 1
fi

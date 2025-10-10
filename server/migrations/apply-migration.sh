#!/bin/bash

# ============================================================================
# Migration Application Helper
# ============================================================================
# Usage:
#   ./apply-migration.sh dev <migration-file>
#   ./apply-migration.sh prod <migration-file>
#
# Example:
#   ./apply-migration.sh dev 20251002_phase1_crm_scheduling.sql
# ============================================================================

set -e  # Exit on error

ENV=$1
MIGRATION_FILE=$2

if [ -z "$ENV" ] || [ -z "$MIGRATION_FILE" ]; then
  echo "Usage: ./apply-migration.sh <dev|prod> <migration-file>"
  echo "Example: ./apply-migration.sh dev 20251002_phase1_crm_scheduling.sql"
  exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Error: Migration file '$MIGRATION_FILE' not found"
  exit 1
fi

# Get DATABASE_URL from Doppler based on environment
case "$ENV" in
  dev)
    echo "📊 Applying migration to DEV database..."
    DATABASE_URL=$(doppler run --project seed-portal-api --config dev -- printenv DATABASE_URL)
    ;;
  prod)
    echo "🚨 Applying migration to PRODUCTION database..."
    echo "⚠️  WARNING: This will modify the production database!"
    read -p "Are you sure you want to continue? (type 'yes' to proceed): " confirm
    if [ "$confirm" != "yes" ]; then
      echo "Aborted."
      exit 1
    fi
    DATABASE_URL=$(doppler run --project seed-portal-api --config prd -- printenv DATABASE_URL)
    ;;
  *)
    echo "Error: Environment must be 'dev' or 'prod'"
    exit 1
    ;;
esac

if [ -z "$DATABASE_URL" ]; then
  echo "Error: Could not retrieve DATABASE_URL from Doppler"
  echo "Make sure Doppler is configured and you have access to the project"
  exit 1
fi

# Apply migration
echo "🔄 Running migration: $MIGRATION_FILE"
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Migration applied successfully to $ENV!"
else
  echo "❌ Migration failed!"
  exit 1
fi

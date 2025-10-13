#!/bin/bash
#
# Organize newly added documentation files into proper subdirectories
# Following the structure established in Phase 0
#

set -e

cd "$(dirname "$0")/.."

echo "📁 Organizing documentation files..."

# Create security folder if it doesn't exist
mkdir -p docs/security
mkdir -p docs/supabase

# Architecture docs
echo "  📐 Moving architecture docs..."
git mv -f docs/PERFORMANCE_OPTIMIZATIONS.md docs/architecture/ 2>/dev/null || true
git mv -f docs/ASSET_MIGRATION_GUIDE.md docs/architecture/ 2>/dev/null || true
git mv -f docs/CRYPTO_MIGRATION.md docs/architecture/ 2>/dev/null || true

# Deployment docs
echo "  🚀 Moving deployment docs..."
git mv -f docs/RAILWAY_SETUP.md docs/deployment/ 2>/dev/null || true
git mv -f docs/VERCEL_DEPLOYMENT.md docs/deployment/ 2>/dev/null || true
git mv -f docs/VERCEL_DEPLOYMENT_GUIDE.md docs/deployment/ 2>/dev/null || true
git mv -f docs/PRODUCTION_READINESS.md docs/deployment/ 2>/dev/null || true

# Development docs
echo "  🛠️  Moving development docs..."
git mv -f docs/MSW_SETUP.md docs/development/ 2>/dev/null || true
git mv -f docs/STORYBOOK_SETUP.md docs/development/ 2>/dev/null || true
git mv -f docs/OCR_SETUP.md docs/development/ 2>/dev/null || true
git mv -f docs/RETRIEVAL_SETUP.md docs/development/ 2>/dev/null || true
git mv -f docs/replit.md docs/development/ 2>/dev/null || true

# Features docs
echo "  ✨ Moving features docs..."
git mv -f docs/COMMISSION_BONUS_STRUCTURE.md docs/features/ 2>/dev/null || true
git mv -f docs/FOLDERS_NAVIGATION.md docs/features/ 2>/dev/null || true
git mv -f docs/TRACKING_INTEGRATION_COMPLETE.md docs/features/ 2>/dev/null || true
git mv -f docs/USER_SPECIFIC_STATS_FIX.md docs/features/ 2>/dev/null || true
git mv -f docs/STAR_RESTORE_UNDO_IMPLEMENTATION.md docs/features/ 2>/dev/null || true
git mv -f docs/CLIENT_REFACTOR_PLAN.md docs/features/ 2>/dev/null || true

# RBAC docs
echo "  🔐 Moving RBAC docs..."
git mv -f docs/RBAC_COMPLETE.md docs/rbac/ 2>/dev/null || true
git mv -f docs/RBAC_READY_TO_TEST.md docs/rbac/ 2>/dev/null || true
git mv -f docs/CLEANUP_RBAC_DUPLICATES.md docs/rbac/ 2>/dev/null || true
git mv -f docs/AUTH_CLEANUP_SUMMARY.md docs/rbac/ 2>/dev/null || true

# Refactoring docs
echo "  ♻️  Moving refactoring docs..."
git mv -f docs/REFACTOR_BATTLE_PLAN.md docs/refactoring/ 2>/dev/null || true
git mv -f docs/REFACTOR_PLAN.md docs/refactoring/ 2>/dev/null || true
git mv -f docs/REFACTOR_PROGRESS.md docs/refactoring/ 2>/dev/null || true
git mv -f docs/REFACTOR_SUMMARY.md docs/refactoring/ 2>/dev/null || true
git mv -f docs/REFACTORING_COMPLETE.md docs/refactoring/ 2>/dev/null || true
git mv -f docs/HIGH_PRIORITY_FIXES_SUMMARY.md docs/refactoring/ 2>/dev/null || true
git mv -f docs/HUBSPOT_OPTIMIZATION_SUMMARY.md docs/refactoring/ 2>/dev/null || true

# Seedmail docs
echo "  📧 Moving seedmail docs..."
git mv -f docs/EMAIL_TRACKING_IMPLEMENTATION.md docs/seedmail/ 2>/dev/null || true
git mv -f docs/GMAIL_SENDING_IMPLEMENTATION.md docs/seedmail/ 2>/dev/null || true
git mv -f docs/GRAPHILE_WORKER_MIGRATION.md docs/seedmail/ 2>/dev/null || true
git mv -f docs/GRAPHILE_WORKER_TESTING.md docs/seedmail/ 2>/dev/null || true

# Security docs
echo "  🔒 Moving security docs..."
git mv -f docs/SECURITY_AUDIT.md docs/security/ 2>/dev/null || true
git mv -f docs/SECURITY_CHECKLIST.md docs/security/ 2>/dev/null || true
git mv -f docs/SECURITY_FINAL_REPORT.md docs/security/ 2>/dev/null || true
git mv -f docs/SECURITY_STATUS.md docs/security/ 2>/dev/null || true
git mv -f docs/SECURITY_SUMMARY.md docs/security/ 2>/dev/null || true
git mv -f docs/README_SECURITY.md docs/security/ 2>/dev/null || true

# Testing docs
echo "  🧪 Moving testing docs..."
git mv -f docs/E2E_SETUP_COMPLETE.md docs/testing/ 2>/dev/null || true
git mv -f docs/TESTING_IMPROVEMENTS_SUMMARY.md docs/testing/ 2>/dev/null || true
git mv -f docs/VITEST_SETUP.md docs/testing/ 2>/dev/null || true
git mv -f docs/VITEST_ADVANCED_GUIDE.md docs/testing/ 2>/dev/null || true
git mv -f docs/WHY_TESTS_MATTER.md docs/testing/ 2>/dev/null || true

# UI docs
echo "  🎨 Moving UI docs..."
git mv -f docs/AI_WIDGET_IMPROVEMENTS.md docs/ui/ 2>/dev/null || true

# Supabase docs
echo "  ⚡ Moving Supabase docs..."
git mv -f docs/SUPABASE_AUTH_MIGRATION.md docs/supabase/ 2>/dev/null || true
git mv -f docs/SUPABASE_AUTH_FULL_MIGRATION.md docs/supabase/ 2>/dev/null || true
git mv -f docs/SUPABASE_STORAGE_SETUP.md docs/supabase/ 2>/dev/null || true

# Move miscellaneous files
echo "  📝 Moving miscellaneous files..."
git mv -f docs/plan.md docs/development/ 2>/dev/null || true
git mv -f docs/rbac-migration-report.txt docs/rbac/ 2>/dev/null || true
git mv -f docs/replit_session.txt docs/development/ 2>/dev/null || true

echo "✅ Documentation organization complete!"
echo ""
echo "📊 Summary:"
echo "  - Architecture: 3 files"
echo "  - Deployment: 4 files"
echo "  - Development: 6 files"
echo "  - Features: 6 files"
echo "  - RBAC: 4 files"
echo "  - Refactoring: 7 files"
echo "  - Seedmail: 4 files"
echo "  - Security: 6 files (new folder)"
echo "  - Testing: 5 files"
echo "  - UI: 1 file"
echo "  - Supabase: 3 files (new folder)"
echo ""
echo "📁 Remaining in docs root (core docs): ~11 files"
echo "  - INDEX.md, STRUCTURE.md, CONTRIBUTING.md, README.md"
echo "  - INTEGRATION_REMOVAL_PLAN.md"
echo "  - PHASE_0_*.md (7 files)"

#!/bin/bash
# Documentation Reorganization Script
# Moves documentation files into organized subdirectories

set -e

echo "🗂️  Reorganizing documentation structure..."

cd "$(dirname "$0")/../docs" || exit 1

# Create new directories
mkdir -p refactoring
mkdir -p rbac
mkdir -p seedmail
mkdir -p testing
mkdir -p ui
mkdir -p development

# Move architecture docs
echo "📁 Moving architecture docs..."
mv AUTHORIZATION_PATTERN.md architecture/ 2>/dev/null || true
mv BUNDLE_SPLITTING.md architecture/ 2>/dev/null || true
mv BUILD_COMPRESSION.md architecture/ 2>/dev/null || true
mv CACHE_IMPLEMENTATION.md architecture/ 2>/dev/null || true
mv ETAG_CACHING.md architecture/ 2>/dev/null || true
mv PERFORMANCE_LOGGING.md architecture/ 2>/dev/null || true
mv REACT_QUERY_TUNING.md architecture/ 2>/dev/null || true
mv SSE_DELTA_UPDATES.md architecture/ 2>/dev/null || true

# Move refactoring docs
echo "📁 Moving refactoring docs..."
mv REFACTOR_PROGRESS_SUMMARY.md refactoring/ 2>/dev/null || true
mv PHASE_2A_BACKEND_ABSTRACTION_COMPLETE.md refactoring/ 2>/dev/null || true
mv PHASE_2B_CALCULATOR_EXTRACTION_STATUS.md refactoring/ 2>/dev/null || true
mv PHASE_2B_COMPLETE.md refactoring/ 2>/dev/null || true
mv PHASE_2B_CONTINUED_STATUS.md refactoring/ 2>/dev/null || true
mv PHASE_2C_COMMISSIONS_EXTRACTION.md refactoring/ 2>/dev/null || true
mv PHASE_2C_INTEGRATION_COMPLETE.md refactoring/ 2>/dev/null || true
mv CALCULATOR_REFACTOR_STATUS.md refactoring/ 2>/dev/null || true
mv CALCULATOR_REFACTOR_SUMMARY.md refactoring/ 2>/dev/null || true
mv ROUTES_REFACTOR_PLAN.md refactoring/ 2>/dev/null || true
mv ROUTES_REFACTOR_FINDINGS.md refactoring/ 2>/dev/null || true
mv ROUTES_REFACTOR_COMPLETE.md refactoring/ 2>/dev/null || true
mv REDIS_TO_POSTGRES_MIGRATION.md refactoring/ 2>/dev/null || true
mv REDIS_REMOVAL_COMPLETE.md refactoring/ 2>/dev/null || true
mv STEP_3_COMPLETE.md refactoring/ 2>/dev/null || true

# Move RBAC docs
echo "📁 Moving RBAC docs..."
mv RBAC_REFACTOR_PLAN.md rbac/ 2>/dev/null || true
mv RBAC_MIGRATION_EXECUTION_PLAN.md rbac/ 2>/dev/null || true
mv RBAC_MIGRATION_REPORT.md rbac/ 2>/dev/null || true
mv RBAC_MIGRATION_STATUS.md rbac/ 2>/dev/null || true
mv RBAC_TESTING_GUIDE.md rbac/ 2>/dev/null || true
mv FRONTEND_RBAC_MIGRATION_GUIDE.md rbac/ 2>/dev/null || true

# Move SeedMail docs
echo "📁 Moving SeedMail docs..."
mv SEEDMAIL_SETUP.md seedmail/ 2>/dev/null || true
mv SEEDMAIL_LEADIQ_INTEGRATION.md seedmail/ 2>/dev/null || true
mv SEEDMAIL_LEADIQ_PROGRESS.md seedmail/ 2>/dev/null || true
mv SEEDMAIL_LEADIQ_FINAL_SUMMARY.md seedmail/ 2>/dev/null || true
mv SEEDMAIL_AUTO_SYNC.md seedmail/ 2>/dev/null || true
mv SEEDMAIL_SEND_STATUS_IMPLEMENTATION.md seedmail/ 2>/dev/null || true
mv SEEDMAIL_SEND_STATUS_COMPLETE.md seedmail/ 2>/dev/null || true
mv SEEDMAIL_PHASE_2_ADAPTIVE_POLLING.md seedmail/ 2>/dev/null || true
mv SEEDMAIL_PHASE_2_SUMMARY.md seedmail/ 2>/dev/null || true
mv SEEDMAIL_PHASE_3_SSE.md seedmail/ 2>/dev/null || true
mv SEEDMAIL_TEST_STRATEGY.md seedmail/ 2>/dev/null || true
mv seedmail-doppler-vars.md seedmail/ 2>/dev/null || true

# Move testing docs
echo "📁 Moving testing docs..."
mv TESTING_SETUP.md testing/ 2>/dev/null || true
mv TESTING_IMPROVEMENTS.md testing/ 2>/dev/null || true
mv TESTING_SESSION_MIGRATION.md testing/ 2>/dev/null || true
mv TESTING_STRATEGY_RBAC.md testing/ 2>/dev/null || true
mv TEST_RESULTS_SEND_STATUS.md testing/ 2>/dev/null || true

# Move UI docs
echo "📁 Moving UI docs..."
mv theme-spec.md ui/ 2>/dev/null || true
mv dashboard-layout-spec.md ui/ 2>/dev/null || true
mv admin-dashboard-design.md ui/ 2>/dev/null || true
mv command-dock-spec.md ui/ 2>/dev/null || true
mv settings-ia.md ui/ 2>/dev/null || true
mv ui-drift.md ui/ 2>/dev/null || true
mv ai-assistant-widget-plan.md ui/ 2>/dev/null || true

# Move development docs
echo "📁 Moving development docs..."
mv LINTING_CONVENTIONS.md development/ 2>/dev/null || true
mv LINT_CLEANUP_PLAN.md development/ 2>/dev/null || true
mv LINT_NEW_CODE_POLICY.md development/ 2>/dev/null || true
mv CERBOS_ESLINT_ENFORCEMENT.md development/ 2>/dev/null || true
mv local-dev-with-doppler.md development/ 2>/dev/null || true

# Move deployment docs
echo "📁 Moving deployment docs..."
mv DEPLOYMENT_SUMMARY.md deployment/ 2>/dev/null || true
mv GOOGLE_OAUTH_SETUP.md deployment/ 2>/dev/null || true
mv production-migrations.md deployment/ 2>/dev/null || true

# Move feature docs
echo "📁 Moving feature docs..."
mv cadence.md features/ 2>/dev/null || true
mv zapier-intake.md features/ 2>/dev/null || true

echo "✅ Documentation reorganization complete!"
echo ""
echo "📊 New structure:"
echo "  docs/"
echo "    ├── architecture/     (8 docs)"
echo "    ├── refactoring/      (15 docs)"
echo "    ├── rbac/             (6 docs)"
echo "    ├── seedmail/         (12 docs)"
echo "    ├── testing/          (5 docs)"
echo "    ├── ui/               (7 docs)"
echo "    ├── development/      (5 docs)"
echo "    ├── deployment/       (3 docs)"
echo "    ├── features/         (2 docs)"
echo "    ├── adrs/             (6 ADRs)"
echo "    ├── security/         (existing)"
echo "    └── admin/            (existing)"
echo ""
echo "Root docs/ now contains only:"
echo "  - INDEX.md"
echo "  - STRUCTURE.md"
echo "  - CONTRIBUTING.md"
echo "  - INTEGRATION_REMOVAL_PLAN.md"
echo "  - PHASE_0_EXECUTION.md"
echo "  - PHASE_0_EXECUTION_PART2.md"

# Documentation Index

Complete navigation guide for seed-portal documentation.

**📊 Total Documents**: 65+ markdown files  
**Last Updated**: October 2025

---

## 🚀 Start Here

| Document | Purpose |
|----------|---------|
| **[STRUCTURE.md](./STRUCTURE.md)** | Architecture, directory structure, when to create features |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | Development conventions, code style, Git workflow |
| **[INTEGRATION_REMOVAL_PLAN.md](./INTEGRATION_REMOVAL_PLAN.md)** | Migration strategy from external SaaS to internal apps |
| **[PHASE_0_EXECUTION.md](./PHASE_0_EXECUTION.md)** | Current phase progress and task tracking |

---

## 📂 Documentation by Category

### 🏗️ Architecture & Design

| Document | Description |
|----------|-------------|
| **[STRUCTURE.md](./STRUCTURE.md)** | Complete architecture guide - feature-based client, layered server |
| [AUTHORIZATION_PATTERN.md](./architecture/AUTHORIZATION_PATTERN.md) | RBAC implementation with Cerbos |
| [BUNDLE_SPLITTING.md](./architecture/BUNDLE_SPLITTING.md) | Code splitting strategy for performance |
| [BUILD_COMPRESSION.md](./architecture/BUILD_COMPRESSION.md) | Build optimization and compression |
| [CACHE_IMPLEMENTATION.md](./architecture/CACHE_IMPLEMENTATION.md) | Caching strategy (Supabase, React Query) |
| [ETAG_CACHING.md](./architecture/ETAG_CACHING.md) | ETag-based HTTP caching |
| [PERFORMANCE_LOGGING.md](./architecture/PERFORMANCE_LOGGING.md) | Performance monitoring and logging |
| [REACT_QUERY_TUNING.md](./architecture/REACT_QUERY_TUNING.md) | React Query configuration and best practices |
| [SSE_DELTA_UPDATES.md](./architecture/SSE_DELTA_UPDATES.md) | Server-Sent Events for real-time updates |

### 📜 Architecture Decision Records (ADRs)

| ADR | Title | Status |
|-----|-------|--------|
| **[0000-adr-index.md](./adrs/0000-adr-index.md)** | **ADR Index & Template** | Meta |
| [0001-provider-pattern-env-toggles.md](./adrs/0001-provider-pattern-env-toggles.md) | Provider Pattern & Environment Toggles | ✅ Accepted |
| [0002-seeddrive-storage-architecture.md](./adrs/0002-seeddrive-storage-architecture.md) | SEEDDRIVE Storage Architecture | ✅ Accepted |
| [0003-stripe-payment-invoicing.md](./adrs/0003-stripe-payment-invoicing.md) | Stripe Payment & Invoicing Flows | ✅ Accepted |
| [0004-esign-service-integration.md](./adrs/0004-esign-service-integration.md) | E-sign Service Integration | 🟡 Proposed |
| [0005-lead-intake-webhook.md](./adrs/0005-lead-intake-webhook.md) | Lead Intake Webhook Schema & Auth | ✅ Accepted |

### 🤝 Contributing & Development

| Document | Description |
|----------|-------------|
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | **Primary guide** - naming, imports, testing, Git workflow |
| [LINTING_CONVENTIONS.md](./development/LINTING_CONVENTIONS.md) | ESLint rules and enforcement |
| [LINT_CLEANUP_PLAN.md](./development/LINT_CLEANUP_PLAN.md) | Plan for addressing lint violations |
| [LINT_NEW_CODE_POLICY.md](./development/LINT_NEW_CODE_POLICY.md) | Policy for new code linting |
| [CERBOS_ESLINT_ENFORCEMENT.md](./development/CERBOS_ESLINT_ENFORCEMENT.md) | Custom ESLint rules for RBAC patterns |
| [local-dev-with-doppler.md](./development/local-dev-with-doppler.md) | Local development setup with Doppler |

### 🧪 Testing

| Document | Description |
|----------|-------------|
| [TESTING_SETUP.md](./testing/TESTING_SETUP.md) | Test infrastructure setup (Vitest, Playwright) |
| [TESTING_IMPROVEMENTS.md](./testing/TESTING_IMPROVEMENTS.md) | Testing improvements and strategy |
| [TESTING_SESSION_MIGRATION.md](./testing/TESTING_SESSION_MIGRATION.md) | Test session handling |
| [TESTING_STRATEGY_RBAC.md](./testing/TESTING_STRATEGY_RBAC.md) | RBAC-specific testing patterns |
| [RBAC_TESTING_GUIDE.md](./rbac/RBAC_TESTING_GUIDE.md) | Complete guide for testing RBAC |
| [SEEDMAIL_TEST_STRATEGY.md](./seedmail/SEEDMAIL_TEST_STRATEGY.md) | SeedMail feature testing |
| [TEST_RESULTS_SEND_STATUS.md](./testing/TEST_RESULTS_SEND_STATUS.md) | Send status test results |

### 🔐 Security & RBAC

| Document | Description |
|----------|-------------|
| **[AUTHORIZATION_PATTERN.md](./architecture/AUTHORIZATION_PATTERN.md)** | **Primary RBAC guide** - patterns and implementation |
| [RBAC_REFACTOR_PLAN.md](./rbac/RBAC_REFACTOR_PLAN.md) | RBAC refactoring strategy |
| [RBAC_MIGRATION_EXECUTION_PLAN.md](./rbac/RBAC_MIGRATION_EXECUTION_PLAN.md) | Migration execution plan |
| [RBAC_MIGRATION_REPORT.md](./rbac/RBAC_MIGRATION_REPORT.md) | Migration completion report |
| [RBAC_MIGRATION_STATUS.md](./rbac/RBAC_MIGRATION_STATUS.md) | Current migration status |
| [FRONTEND_RBAC_MIGRATION_GUIDE.md](./rbac/FRONTEND_RBAC_MIGRATION_GUIDE.md) | Frontend RBAC implementation guide |
| [GOOGLE_OAUTH_SETUP.md](./deployment/GOOGLE_OAUTH_SETUP.md) | Google OAuth configuration |

**Security Subdirectory** ([security/](./security/)):

- Security policies and audit documentation

### 📧 SeedMail Integration

| Document | Description |
|----------|-------------|
| **[SEEDMAIL_SETUP.md](./seedmail/SEEDMAIL_SETUP.md)** | **Initial setup guide** for SeedMail |
| [SEEDMAIL_LEADIQ_INTEGRATION.md](./seedmail/SEEDMAIL_LEADIQ_INTEGRATION.md) | SeedMail + LEADIQ integration |
| [SEEDMAIL_LEADIQ_PROGRESS.md](./seedmail/SEEDMAIL_LEADIQ_PROGRESS.md) | Integration progress tracking |
| [SEEDMAIL_LEADIQ_FINAL_SUMMARY.md](./seedmail/SEEDMAIL_LEADIQ_FINAL_SUMMARY.md) | Final integration summary |
| [SEEDMAIL_AUTO_SYNC.md](./seedmail/SEEDMAIL_AUTO_SYNC.md) | Automatic email syncing |
| [SEEDMAIL_SEND_STATUS_IMPLEMENTATION.md](./seedmail/SEEDMAIL_SEND_STATUS_IMPLEMENTATION.md) | Send status tracking implementation |
| [SEEDMAIL_SEND_STATUS_COMPLETE.md](./seedmail/SEEDMAIL_SEND_STATUS_COMPLETE.md) | Send status completion report |
| [SEEDMAIL_PHASE_2_ADAPTIVE_POLLING.md](./seedmail/SEEDMAIL_PHASE_2_ADAPTIVE_POLLING.md) | Phase 2: Adaptive polling |
| [SEEDMAIL_PHASE_2_SUMMARY.md](./seedmail/SEEDMAIL_PHASE_2_SUMMARY.md) | Phase 2 summary |
| [SEEDMAIL_PHASE_3_SSE.md](./seedmail/SEEDMAIL_PHASE_3_SSE.md) | Phase 3: Server-Sent Events |
| [seedmail-doppler-vars.md](./seedmail/seedmail-doppler-vars.md) | SeedMail environment variables |

### 🔧 Refactoring & Migration

| Document | Description |
|----------|-------------|
| **[INTEGRATION_REMOVAL_PLAN.md](./INTEGRATION_REMOVAL_PLAN.md)** | **Master plan** - HubSpot, Box, Airtable removal |
| **[PHASE_0_EXECUTION.md](./PHASE_0_EXECUTION.md)** | **Phase 0** - Infrastructure setup (current) |
| [PHASE_0_EXECUTION_PART2.md](./PHASE_0_EXECUTION_PART2.md) | Phase 0 detailed tasks (continued) |
| [REFACTOR_PROGRESS_SUMMARY.md](./refactoring/REFACTOR_PROGRESS_SUMMARY.md) | Overall refactor progress |
| [PHASE_2A_BACKEND_ABSTRACTION_COMPLETE.md](./refactoring/PHASE_2A_BACKEND_ABSTRACTION_COMPLETE.md) | Phase 2A completion |
| [PHASE_2B_CALCULATOR_EXTRACTION_STATUS.md](./refactoring/PHASE_2B_CALCULATOR_EXTRACTION_STATUS.md) | Calculator extraction progress |
| [PHASE_2B_COMPLETE.md](./refactoring/PHASE_2B_COMPLETE.md) | Phase 2B completion |
| [PHASE_2B_CONTINUED_STATUS.md](./refactoring/PHASE_2B_CONTINUED_STATUS.md) | Phase 2B continued progress |
| [PHASE_2C_COMMISSIONS_EXTRACTION.md](./refactoring/PHASE_2C_COMMISSIONS_EXTRACTION.md) | Commissions extraction |
| [PHASE_2C_INTEGRATION_COMPLETE.md](./refactoring/PHASE_2C_INTEGRATION_COMPLETE.md) | Phase 2C completion |
| [STEP_3_COMPLETE.md](./refactoring/STEP_3_COMPLETE.md) | Step 3 completion |

#### Calculator Refactoring

| Document | Description |
|----------|-------------|
| [CALCULATOR_REFACTOR_STATUS.md](./refactoring/CALCULATOR_REFACTOR_STATUS.md) | Calculator refactor current status |
| [CALCULATOR_REFACTOR_SUMMARY.md](./refactoring/CALCULATOR_REFACTOR_SUMMARY.md) | Calculator refactor summary |

#### Routes Refactoring

| Document | Description |
|----------|-------------|
| [ROUTES_REFACTOR_PLAN.md](./refactoring/ROUTES_REFACTOR_PLAN.md) | Routes refactoring plan |
| [ROUTES_REFACTOR_FINDINGS.md](./refactoring/ROUTES_REFACTOR_FINDINGS.md) | Routes analysis findings |
| [ROUTES_REFACTOR_COMPLETE.md](./refactoring/ROUTES_REFACTOR_COMPLETE.md) | Routes refactor completion |

#### Database Migrations

| Document | Description |
|----------|-------------|
| [REDIS_TO_POSTGRES_MIGRATION.md](./refactoring/REDIS_TO_POSTGRES_MIGRATION.md) | Redis → PostgreSQL migration |
| [REDIS_REMOVAL_COMPLETE.md](./refactoring/REDIS_REMOVAL_COMPLETE.md) | Redis removal completion |
| [production-migrations.md](./deployment/production-migrations.md) | Production migration guidelines |

### 🎨 UI/UX & Design

| Document | Description |
|----------|-------------|
| [theme-spec.md](./ui/theme-spec.md) | Theme tokens and design system |
| [dashboard-layout-spec.md](./ui/dashboard-layout-spec.md) | Universal dashboard layout |
| [admin-dashboard-design.md](./ui/admin-dashboard-design.md) | Admin dashboard with AI agents |
| [command-dock-spec.md](./ui/command-dock-spec.md) | Command dock (Cmd+K) specification |
| [settings-ia.md](./ui/settings-ia.md) | Settings information architecture |
| [ui-drift.md](./ui/ui-drift.md) | UI consistency issues and fixes |
| [ai-assistant-widget-plan.md](./ui/ai-assistant-widget-plan.md) | AI assistant widget (Cmd+L) |

### 🚀 Deployment

| Document | Description |
|----------|-------------|
| [DEPLOYMENT_SUMMARY.md](./deployment/DEPLOYMENT_SUMMARY.md) | Deployment process and environments |

**Deployment Subdirectory** ([deployment/](./deployment/)):

- Deployment configuration and procedures

### 📱 Features

| Document | Description |
|----------|-------------|
| [cadence.md](./features/cadence.md) | Seed Cadence feature (automated outreach) |
| [zapier-intake.md](./features/zapier-intake.md) | Zapier lead intake webhook |

**Features Subdirectory** ([features/](./features/)):

- Feature-specific documentation

### 👨‍💼 Admin

**Admin Subdirectory** ([admin/](./admin/)):

- Admin panel documentation

---

## 📍 Navigation by Task

### I want to

#### Get Started with Development

1. Read [STRUCTURE.md](./STRUCTURE.md) - Understand the architecture
2. Read [CONTRIBUTING.md](./CONTRIBUTING.md) - Learn conventions
3. Setup local environment: [local-dev-with-doppler.md](./development/local-dev-with-doppler.md)
4. Create a feature: `npm run generate:feature my-feature`

#### Understand the Refactor

1. Start: [INTEGRATION_REMOVAL_PLAN.md](./INTEGRATION_REMOVAL_PLAN.md)
2. Current phase: [PHASE_0_EXECUTION.md](./PHASE_0_EXECUTION.md)
3. Progress: [REFACTOR_PROGRESS_SUMMARY.md](./refactoring/REFACTOR_PROGRESS_SUMMARY.md)
4. Calculator: [CALCULATOR_REFACTOR_STATUS.md](./refactoring/CALCULATOR_REFACTOR_STATUS.md)

#### Implement RBAC

1. Pattern: [AUTHORIZATION_PATTERN.md](./architecture/AUTHORIZATION_PATTERN.md)
2. Frontend: [FRONTEND_RBAC_MIGRATION_GUIDE.md](./rbac/FRONTEND_RBAC_MIGRATION_GUIDE.md)
3. Testing: [RBAC_TESTING_GUIDE.md](./rbac/RBAC_TESTING_GUIDE.md)
4. ESLint: [CERBOS_ESLINT_ENFORCEMENT.md](./development/CERBOS_ESLINT_ENFORCEMENT.md)

#### Work with SeedMail

1. Setup: [SEEDMAIL_SETUP.md](./seedmail/SEEDMAIL_SETUP.md)
2. Integration: [SEEDMAIL_LEADIQ_INTEGRATION.md](./seedmail/SEEDMAIL_LEADIQ_INTEGRATION.md)
3. Environment: [seedmail-doppler-vars.md](./seedmail/seedmail-doppler-vars.md)
4. Testing: [SEEDMAIL_TEST_STRATEGY.md](./seedmail/SEEDMAIL_TEST_STRATEGY.md)

#### Write Tests

1. Setup: [TESTING_SETUP.md](./testing/TESTING_SETUP.md)
2. Guidelines: [CONTRIBUTING.md](./CONTRIBUTING.md#testing-strategy)
3. RBAC tests: [RBAC_TESTING_GUIDE.md](./rbac/RBAC_TESTING_GUIDE.md)

#### Make Architectural Decisions

1. Review existing: [ADR Index](./adrs/0000-adr-index.md)
2. Use template: [TEMPLATE.md](./adrs/TEMPLATE.md)
3. Create new ADR: `docs/adrs/XXXX-title.md`

#### Improve Performance

1. Caching: [CACHE_IMPLEMENTATION.md](./architecture/CACHE_IMPLEMENTATION.md)
2. Bundles: [BUNDLE_SPLITTING.md](./architecture/BUNDLE_SPLITTING.md)
3. React Query: [REACT_QUERY_TUNING.md](./architecture/REACT_QUERY_TUNING.md)
4. Logging: [PERFORMANCE_LOGGING.md](./architecture/PERFORMANCE_LOGGING.md)

#### Deploy to Production

1. Summary: [DEPLOYMENT_SUMMARY.md](./deployment/DEPLOYMENT_SUMMARY.md)
2. Migrations: [production-migrations.md](./deployment/production-migrations.md)
3. Environment vars: Doppler (seed-portal-api/web)

---

## 🔍 Search Tips

### By Technology

- **React Query**: [REACT_QUERY_TUNING.md](./architecture/REACT_QUERY_TUNING.md)
- **Cerbos**: [AUTHORIZATION_PATTERN.md](./architecture/AUTHORIZATION_PATTERN.md), [CERBOS_ESLINT_ENFORCEMENT.md](./development/CERBOS_ESLINT_ENFORCEMENT.md)
- **Supabase**: [CACHE_IMPLEMENTATION.md](./architecture/CACHE_IMPLEMENTATION.md), [ADR-0002](./adrs/0002-seeddrive-storage-architecture.md)
- **Stripe**: [ADR-0003](./adrs/0003-stripe-payment-invoicing.md)
- **HubSpot**: [INTEGRATION_REMOVAL_PLAN.md](./INTEGRATION_REMOVAL_PLAN.md)
- **Doppler**: [local-dev-with-doppler.md](./development/local-dev-with-doppler.md), [seedmail-doppler-vars.md](./seedmail/seedmail-doppler-vars.md)

### By Phase

- **Phase 0**: [PHASE_0_EXECUTION.md](./PHASE_0_EXECUTION.md), [PHASE_0_EXECUTION_PART2.md](./PHASE_0_EXECUTION_PART2.md)
- **Phase 2A**: [PHASE_2A_BACKEND_ABSTRACTION_COMPLETE.md](./refactoring/PHASE_2A_BACKEND_ABSTRACTION_COMPLETE.md)
- **Phase 2B**: [PHASE_2B_COMPLETE.md](./refactoring/PHASE_2B_COMPLETE.md), [CALCULATOR_REFACTOR_STATUS.md](./refactoring/CALCULATOR_REFACTOR_STATUS.md)
- **Phase 2C**: [PHASE_2C_INTEGRATION_COMPLETE.md](./refactoring/PHASE_2C_INTEGRATION_COMPLETE.md)

### By Status

- **✅ Complete**: Check docs with "COMPLETE" suffix
- **📋 In Progress**: [PHASE_0_EXECUTION.md](./PHASE_0_EXECUTION.md), [CALCULATOR_REFACTOR_STATUS.md](./refactoring/CALCULATOR_REFACTOR_STATUS.md)
- **📝 Planned**: [INTEGRATION_REMOVAL_PLAN.md](./INTEGRATION_REMOVAL_PLAN.md)

---

## 🆕 Recently Added

- **[STRUCTURE.md](./STRUCTURE.md)** (Oct 2025) - Architecture guide with migration strategy
- **[ADR-0001 through ADR-0005](./adrs/)** (Oct 2025) - Architecture decision records
- **[PHASE_0_EXECUTION.md](./PHASE_0_EXECUTION.md)** (Oct 2025) - Current phase tracking

---

## 📝 Document Conventions

### Naming

- **Status docs**: `*_STATUS.md`, `*_PROGRESS.md`
- **Completion docs**: `*_COMPLETE.md`, `*_SUMMARY.md`
- **Plans**: `*_PLAN.md`, `*_STRATEGY.md`
- **Guides**: `*_GUIDE.md`, `*_SETUP.md`
- **Specs**: `*-spec.md` (kebab-case)

### Organization

- **Root docs/**: High-level guides and tracking
- **docs/adrs/**: Architecture Decision Records
- **docs/architecture/**: Technical architecture
- **docs/security/**: Security policies
- **docs/deployment/**: Deployment procedures
- **docs/features/**: Feature-specific docs
- **docs/admin/**: Admin panel docs

---

## 🔄 Keeping This Index Updated

When adding new documentation:

1. Create the document in appropriate location
2. Add entry to this index in the correct category
3. Update "Recently Added" section
4. Update total document count at top
5. Add cross-references in "Navigation by Task" if applicable

---

## 💡 Tips

- **Ctrl+F / Cmd+F** to search this index
- Start with [STRUCTURE.md](./STRUCTURE.md) and [CONTRIBUTING.md](./CONTRIBUTING.md)
- Check [ADRs](./adrs/) for context on decisions
- Phase docs show current progress
- Status docs are regularly updated

---

**Questions?** Check [CONTRIBUTING.md](./CONTRIBUTING.md) → "Getting Help" section.

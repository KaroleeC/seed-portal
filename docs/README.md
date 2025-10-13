# seed-portal

Enterprise financial services portal built with React, TypeScript, and Express.

## Quick Links

- 📚 **[Documentation Index](./docs/INDEX.md)** - Complete documentation navigator
- 🏗️ **[Architecture & Structure](./docs/STRUCTURE.md)** - Codebase architecture guide
- 🤝 **[Contributing Guide](./docs/CONTRIBUTING.md)** - Development conventions & workflow
- 📋 **[Integration Removal Plan](./docs/INTEGRATION_REMOVAL_PLAN.md)** - Migration strategy
- 🎯 **[Phase 0 Status](./docs/PHASE_0_EXECUTION.md)** - Current phase progress

## Overview

seed-portal is a full-stack financial services application featuring:

- **SEEDQC** - Quote calculator with HubSpot integration
- **SEEDPAY** - Payments, invoicing, and commissions
- **LEADIQ** - Lead management with SeedMail integration
- **CLIENTIQ** - Client relationship management
- **SEEDDRIVE** - Document storage (Supabase/Box)
- **Seed Cadence** - Automated outreach campaigns
- **Seed Scheduler** - Appointment scheduling
- **SEEDMAIL** - Email/SMS/voice messaging

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express + Node.js + TypeScript
- **Database**: PostgreSQL (Supabase) + Drizzle ORM
- **Auth**: Supabase Auth + Cerbos RBAC
- **Storage**: Supabase Storage (S3-compatible)
- **Background Jobs**: Graphile Worker
- **Testing**: Vitest + Playwright + React Testing Library
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase)
- Doppler CLI (for environment management)

### Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
# See docs/local-dev-with-doppler.md

# Start development servers
npm run dev:web    # Frontend (port 3000)
npm run dev:api    # Backend (port 5001)

# Run tests
npm test           # Unit tests (watch mode)
npm run test:e2e   # End-to-end tests
```

### Environment Configuration

We use **Doppler** for environment variable management:

- **seed-portal-web** (dev/stg/prd) - Frontend `VITE_*` variables
- **seed-portal-api** (dev/stg/prd) - Backend variables

See [Local Development with Doppler](./docs/local-dev-with-doppler.md) for setup instructions.

## Project Structure

```txt
seed-portal/
├── client/               # React frontend
│   └── src/
│       ├── components/   # Shared UI components
│       ├── features/     # Feature modules (self-contained)
│       ├── hooks/        # Shared React hooks
│       ├── lib/          # Utilities and helpers
│       └── pages/        # Route-level components
├── server/               # Express backend
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic layer
│   ├── db/               # Database schema (Drizzle)
│   ├── middleware/       # Express middleware
│   └── workers/          # Background jobs
├── shared/               # Isomorphic code (client + server)
├── docs/                 # Documentation (see INDEX.md)
└── e2e/                  # End-to-end tests (Playwright)
```

See [STRUCTURE.md](./docs/STRUCTURE.md) for detailed architecture documentation.

## Development Workflow

### Creating a New Feature

```bash
# Use the feature generator
npm run generate:feature my-feature-name

# Creates feature structure with:
# - components/
# - hooks/
# - utils/
# - types/
# - api/
# - __tests__/
```

### Code Quality

```bash
# Linting
npm run lint           # Check for issues
npm run lint:fix       # Auto-fix issues

# Type checking
npm run type-check

# Formatting
npm run format

# Run all checks
npm run validate
```

### Testing

```bash
# Unit tests
npm test                    # Watch mode
npm run test:run            # Single run
npm run test:coverage       # With coverage

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
npm run test:e2e:ui         # With Playwright UI
```

## Documentation

### Essential Reading

- **[Documentation Index](./docs/INDEX.md)** - Start here for navigation
- **[STRUCTURE.md](./docs/STRUCTURE.md)** - Architecture & organization
- **[CONTRIBUTING.md](./docs/CONTRIBUTING.md)** - Development conventions
- **[ADR Index](./docs/adrs/0000-adr-index.md)** - Architecture decisions

### Key Topics

- **Architecture**: [STRUCTURE.md](./docs/STRUCTURE.md), [ADRs](./docs/adrs/)
- **Setup**: [Local Dev](./docs/local-dev-with-doppler.md), [Doppler Vars](./docs/seedmail-doppler-vars.md)
- **Testing**: [Testing Strategy](./docs/TESTING_SETUP.md), [RBAC Testing](./docs/RBAC_TESTING_GUIDE.md)
- **RBAC**: [Authorization Pattern](./docs/AUTHORIZATION_PATTERN.md), [Migration Guide](./docs/FRONTEND_RBAC_MIGRATION_GUIDE.md)
- **SeedMail**: [Setup](./docs/SEEDMAIL_SETUP.md), [Integration](./docs/SEEDMAIL_LEADIQ_INTEGRATION.md)

### Migration & Refactoring

- [Integration Removal Plan](./docs/INTEGRATION_REMOVAL_PLAN.md)
- [Phase 0 Execution](./docs/PHASE_0_EXECUTION.md)
- [Phase 2 Progress](./docs/REFACTOR_PROGRESS_SUMMARY.md)
- [Calculator Refactor](./docs/CALCULATOR_REFACTOR_STATUS.md)

## Conventions

### Naming

- **Components**: `PascalCase.tsx`
- **Hooks**: `use-kebab-case.ts`
- **Utilities**: `kebab-case.ts`
- **Tests**: Match source with `.test.ts` suffix

### Path Aliases

Use path aliases for cleaner imports:

```typescript
// ❌ Avoid
import { Button } from "../../../components/ui/button";

// ✅ Use path aliases
import { Button } from "@components/ui/button";
import { useAuth } from "@hooks/use-auth";
import { QuoteCalculator } from "@features/quote-calculator";
```

Available aliases: `@/*`, `@features/*`, `@components/*`, `@hooks/*`, `@utils/*`, `@types/*`, `@shared/*`, `@server/*`

### Git Workflow

- **Branches**: `feature/name`, `fix/name`, `chore/name`, `docs/name`
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) format
  - `feat: add quote PDF generation`
  - `fix: resolve authentication loop`
  - `docs: update API documentation`

## Contributing

Please read [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for:

- Naming conventions
- Import order
- Testing requirements
- Code style guidelines
- Pull request process
- ESLint and pre-commit hooks

## Architecture Decisions

We document significant architectural decisions in [Architecture Decision Records (ADRs)](./docs/adrs/):

- [ADR-0001: Provider Pattern & Environment Toggles](./docs/adrs/0001-provider-pattern-env-toggles.md)
- [ADR-0002: SEEDDRIVE Storage Architecture](./docs/adrs/0002-seeddrive-storage-architecture.md)
- [ADR-0003: Stripe Payment & Invoicing](./docs/adrs/0003-stripe-payment-invoicing.md)
- [ADR-0004: E-sign Service Integration](./docs/adrs/0004-esign-service-integration.md)
- [ADR-0005: Lead Intake Webhook](./docs/adrs/0005-lead-intake-webhook.md)

See [ADR Index](./docs/adrs/0000-adr-index.md) for complete list.

## Deployment

- **Development**: Auto-deploys from `develop` branch
- **Staging**: Auto-deploys from `staging` branch
- **Production**: Auto-deploys from `main` branch

See [Deployment Summary](./docs/DEPLOYMENT_SUMMARY.md) for details.

## Support

- Check [Documentation Index](./docs/INDEX.md) for guides
- Review [ADRs](./docs/adrs/) for architectural context
- Open an issue for bugs or unclear conventions
- Ask in team chat for questions

## License

Proprietary - Seed Financial

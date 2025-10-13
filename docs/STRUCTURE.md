# seed-portal Architecture & Structure

This document describes the codebase architecture, directory structure, and conventions for seed-portal.

## Table of Contents

- [Overview](#overview)
- [High-Level Architecture](#high-level-architecture)
- [Client Structure](#client-structure)
- [Server Structure](#server-structure)
- [Shared Code](#shared-code)
- [Feature-Based Architecture](#feature-based-architecture)
- [Import/Export Conventions](#importexport-conventions)
- [When to Create a New Feature](#when-to-create-a-new-feature)
- [Path Aliases](#path-aliases)

---

## Overview

seed-portal is a full-stack TypeScript application with:

- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express + Node.js
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Background Jobs**: Graphile Worker
- **Testing**: Vitest (unit/integration) + Playwright (E2E)

The codebase follows a **feature-based architecture** on the client side and a **layered architecture** on the server side.

---

## High-Level Architecture

```
seed-portal/
├── client/               # Frontend React application
│   └── src/
│       ├── components/   # Shared UI components
│       ├── features/     # Feature modules (self-contained)
│       ├── hooks/        # Shared React hooks
│       ├── lib/          # Utilities and helpers
│       ├── pages/        # Route-level page components
│       ├── services/     # API clients and external services
│       └── types/        # Shared TypeScript types
├── server/               # Backend Express application
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic layer
│   ├── db/               # Database access layer (Drizzle ORM)
│   ├── middleware/       # Express middleware
│   ├── workers/          # Background job handlers
│   └── utils/            # Server utilities
├── shared/               # Isomorphic code (client + server)
│   ├── types/            # Shared type definitions
│   └── constants/        # Shared constants
├── __tests__/            # Test utilities and fixtures
├── e2e/                  # End-to-end tests (Playwright)
└── docs/                 # Documentation
```

---

## Client Structure

### Directory Layout

```
client/src/
├── components/           # Shared UI components
│   ├── ui/              # Base UI primitives (shadcn/ui)
│   ├── layout/          # Layout components (nav, sidebar, etc.)
│   ├── forms/           # Form components
│   └── ...              # Domain-specific shared components
├── features/            # Feature modules (self-contained)
│   └── quote-calculator/
│       ├── components/  # Feature-specific components
│       ├── hooks/       # Feature-specific hooks
│       ├── logic/       # Business logic
│       ├── services/    # API calls
│       ├── types/       # Feature types
│       ├── providers/   # Context providers
│       └── index.ts     # Barrel export
├── hooks/               # Shared React hooks
│   ├── use-auth.tsx
│   ├── use-api.ts
│   └── ...
├── lib/                 # Shared utilities
│   ├── api.ts          # API client
│   ├── queryClient.ts  # React Query setup
│   ├── supabaseClient.ts
│   └── utils.ts
├── pages/               # Route-level page components
│   ├── home.tsx
│   ├── login.tsx
│   ├── seedmail/       # Page-specific components
│   └── ...
├── services/            # External service clients
│   ├── analytics.ts
│   └── monitoring.ts
└── types/               # Shared TypeScript types
    └── index.ts
```

### Key Principles

1. **Feature Modules**: Large, self-contained features live in `features/`
2. **Page Components**: Route-level components live in `pages/`
3. **Shared Components**: Reusable UI components in `components/`
4. **Shared Hooks**: Reusable React hooks in `hooks/`
5. **Utilities**: Pure functions and helpers in `lib/`

---

## Server Structure

### Directory Layout

```
server/
├── routes/              # API route handlers
│   ├── auth-routes.ts
│   ├── quote-routes.ts
│   ├── payment-routes.ts
│   ├── webhook-routes.ts
│   └── ...
├── services/            # Business logic layer
│   ├── providers/      # Provider abstraction layer
│   │   ├── index.ts    # Provider factory
│   │   ├── hubspot-provider.ts
│   │   └── seedpay-provider.ts
│   ├── quote-service.ts
│   ├── payment-service.ts
│   ├── storage-service.ts
│   └── ...
├── db/                  # Database access layer
│   ├── schema/         # Drizzle schema definitions
│   │   ├── users.ts
│   │   ├── quotes.ts
│   │   └── ...
│   ├── queries/        # Database queries
│   └── migrations/     # Database migrations
├── middleware/          # Express middleware
│   ├── auth.ts
│   ├── rbac.ts
│   ├── rate-limit.ts
│   ├── error-handler.ts
│   └── ...
├── workers/             # Background job handlers
│   ├── email-worker.ts
│   ├── sync-worker.ts
│   └── ...
├── utils/               # Server utilities
│   ├── logger.ts
│   ├── crypto.ts
│   └── validation.ts
├── types/               # Server-specific types
└── index.ts             # Application entry point
```

### Layered Architecture

1. **Routes Layer**: HTTP request handling, validation, response formatting
2. **Services Layer**: Business logic, orchestration, provider interaction
3. **Data Layer**: Database queries, ORM operations
4. **Middleware Layer**: Cross-cutting concerns (auth, logging, errors)
5. **Worker Layer**: Async background jobs

### Provider Pattern

The server uses a **provider pattern** for external integrations:

```typescript
// server/services/providers/index.ts
export function getQuoteProvider(): IQuoteProvider {
  const provider = process.env.QUOTE_PROVIDER || 'seedpay';
  
  switch (provider) {
    case 'hubspot': return hubspotProvider;
    case 'seedpay': return seedpayProvider;
    default: return hubspotProvider;
  }
}
```

**Benefits**:

- Environment-based toggling
- Safe rollback capability
- Clean abstraction
- Easy testing

---

## Shared Code

The `shared/` directory contains isomorphic code that runs on both client and server:

```
shared/
├── types/               # Shared type definitions
│   ├── quote.ts
│   ├── user.ts
│   └── api.ts
├── constants/           # Shared constants
│   ├── roles.ts
│   └── config.ts
└── utils/               # Shared utilities (rare)
    └── validation.ts
```

**Guidelines**:

- Keep `shared/` minimal - most code should be client or server specific
- Only share types, constants, and pure utility functions
- Never import client or server code in `shared/`

---

## Feature-Based Architecture

### What is a Feature?

A **feature** is a self-contained module with:

- Its own UI components
- Business logic
- State management
- API integration
- Types and schemas

### Feature Structure

```
features/quote-calculator/
├── components/          # Feature-specific components
│   ├── QuoteForm.tsx
│   ├── QuoteForm.test.tsx
│   ├── QuoteSummary.tsx
│   └── ...
├── hooks/               # Feature-specific hooks
│   ├── useQuoteCalculation.ts
│   ├── useQuoteCalculation.test.ts
│   └── ...
├── logic/               # Business logic (pure functions)
│   ├── calculations.ts
│   ├── calculations.test.ts
│   └── ...
├── services/            # API calls
│   ├── quote-api.ts
│   └── ...
├── types/               # Feature types
│   └── index.ts
├── providers/           # Context providers
│   └── QuoteProvider.tsx
├── constants/           # Feature constants
│   └── defaults.ts
├── validators/          # Validation schemas
│   └── quote-schema.ts
├── schema.ts            # Zod/validation schemas
├── QuoteCalculator.tsx  # Main feature component
└── index.ts             # Barrel export
```

### Barrel Exports

Each feature should export its public API via `index.ts`:

```typescript
// features/quote-calculator/index.ts
export { QuoteCalculator } from './QuoteCalculator';
export { useQuoteCalculation } from './hooks/useQuoteCalculation';
export type { QuoteData, QuoteResult } from './types';

// Internal components NOT exported - encapsulated
```

**Benefits**:

- Clean public API
- Encapsulation of internal details
- Easy to refactor internals
- Clear dependency boundaries

---

## Import/Export Conventions

### Import Order

Organize imports in this order:

```typescript
// 1. External dependencies
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 2. Path aliases (internal code)
import { Button } from '@components/ui/button';
import { useAuth } from '@hooks/use-auth';
import { api } from '@/lib/api';

// 3. Relative imports (same feature/directory)
import { QuoteForm } from './components/QuoteForm';
import { calculateTotal } from './logic/calculations';

// 4. Types (if separate)
import type { QuoteData } from './types';

// 5. Styles (last)
import './styles.css';
```

### Export Conventions

**Named exports** (preferred):

```typescript
export function calculateQuote(data: QuoteData): QuoteResult {
  // ...
}

export const DEFAULT_RATE = 0.1;
```

**Default exports** (for main component only):

```typescript
// Only for the main feature/page component
export default function QuoteCalculator() {
  // ...
}
```

**Barrel exports** (feature public API):

```typescript
// features/quote-calculator/index.ts
export { QuoteCalculator } from './QuoteCalculator';
export { useQuoteData } from './hooks/useQuoteData';
export type * from './types';
```

---

## When to Create a New Feature

### Create a NEW Feature when

✅ **Self-Contained Domain**: The functionality represents a distinct business domain

- Example: Quote Calculator, Commission Tracker, Lead Inbox

✅ **Large Scope**: The feature will have 5+ components and significant logic

- Multiple related UI components
- Complex business logic
- Own state management
- Multiple API endpoints

✅ **Reusable Across Pages**: Feature used in multiple places

- Can be embedded in different page contexts
- Has clear boundaries and public API

✅ **Team Ownership**: Different team/person will own the feature

- Clear ownership boundaries
- Independent development
- Separate testing

### Add to EXISTING Feature/Page when

❌ **Small Addition**: Just adding a button or minor UI element

- Add to existing page component
- No need for separate feature

❌ **Tightly Coupled**: Logic deeply tied to specific page

- Keep with page-specific code in `pages/`
- Not reusable elsewhere

❌ **Shared Component**: Generic UI component without business logic

- Add to `components/` instead
- Example: Button, Modal, Table

❌ **Single Use**: Only used in one place with no plan for reuse

- Keep in page directory: `pages/quotes/components/`
- Can promote to feature later if needed

### Feature vs. Page Example

**Feature** (self-contained, reusable):

```
features/quote-calculator/
  ├── components/
  ├── hooks/
  ├── logic/
  └── index.ts (public API)

Used in: pages/quotes.tsx, pages/dashboard.tsx
```

**Page-specific** (single use):

```
pages/quotes/
  ├── quotes.tsx (main page)
  └── components/
      └── QuoteFilters.tsx (only used here)
```

---

## Path Aliases

Use path aliases for cleaner imports:

| Alias | Path | Usage |
|-------|------|-------|
| `@/*` | `client/src/*` | General client code |
| `@features/*` | `client/src/features/*` | Feature modules |
| `@components/*` | `client/src/components/*` | Shared components |
| `@hooks/*` | `client/src/hooks/*` | Shared hooks |
| `@utils/*` | `client/src/lib/*` | Utilities |
| `@types/*` | `client/src/types/*` | Shared types |
| `@shared/*` | `shared/*` | Isomorphic code |
| `@server/*` | `server/*` | Server code |

**Example**:

```typescript
// ❌ Avoid
import { Button } from '../../../components/ui/button';

// ✅ Use path aliases
import { Button } from '@components/ui/button';
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

---

## Shared vs. Feature-Specific Guidelines

### Shared Code (`components/`, `hooks/`, `lib/`)

**When to make code shared**:

- ✅ Used in 2+ features/pages
- ✅ Generic, domain-agnostic functionality
- ✅ UI primitives and layout components
- ✅ Authentication, API clients, utilities

**Examples**:

- `components/ui/button.tsx` - Used everywhere
- `hooks/use-auth.tsx` - Used across app
- `lib/api.ts` - API client for all features

### Feature-Specific Code

**Keep code feature-specific when**:

- ❌ Only used within one feature
- ❌ Contains feature-specific business logic
- ❌ Tightly coupled to feature domain

**Examples**:

- `features/quote-calculator/logic/calculations.ts` - Quote-specific
- `features/quote-calculator/hooks/useQuoteData.ts` - Quote-specific

### Promotion Path

When code is used in multiple features:

1. **Start**: Feature-specific code
2. **If used in 2nd feature**: Copy temporarily
3. **If used in 3rd feature**: Promote to shared
4. **Extract**: Move to appropriate shared directory
5. **Generalize**: Remove feature-specific assumptions

**Example**:

```typescript
// 1. Start in feature
features/quote-calculator/logic/formatCurrency.ts

// 2. Used in commission-tracker too
features/commission-tracker/logic/formatCurrency.ts (copied)

// 3. Promote to shared
lib/format.ts (generalized, both features import)
```

---

## Code Organization Best Practices

### Colocation

**Place files close to where they're used**:

```
features/quote-calculator/
  ├── components/
  │   ├── QuoteForm.tsx
  │   └── QuoteForm.test.tsx          # Test next to source
  └── logic/
      ├── calculations.ts
      └── calculations.test.ts         # Test next to source
```

### Separation of Concerns

**Separate UI from Logic**:

```typescript
// ✅ Good: Logic separated
// features/quote-calculator/logic/calculations.ts
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// features/quote-calculator/components/QuoteForm.tsx
import { calculateTotal } from '../logic/calculations';

function QuoteForm() {
  const total = calculateTotal(items); // Use logic
  return <div>Total: {total}</div>;
}

// ❌ Bad: Logic in component
function QuoteForm() {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return <div>Total: {total}</div>;
}
```

### Single Responsibility

**Each file should have one clear purpose**:

- ✅ `quote-api.ts` - API calls for quotes
- ✅ `calculations.ts` - Quote calculations
- ✅ `QuoteForm.tsx` - Quote form UI
- ❌ `quote-utils.ts` - Generic dumping ground (avoid!)

---

## Application Structure by Domain

### Internal Applications

seed-portal includes several internal applications:

| App | Route | Purpose |
|-----|-------|---------|
| **LEADIQ** | `/apps/leads` | Lead management + email/SMS/voice |
| **Seed Cadence** | `/apps/cadence` | Automated outreach campaigns |
| **Seed Scheduler** | `/apps/scheduler` | Appointment scheduling |
| **SEEDQC** | `/apps/seedqc` | Quote calculator |
| **SEEDPAY** | `/apps/seedpay` | Payments, invoices, commissions |
| **CLIENTIQ** | `/apps/clients` | Post-sale client hub |
| **SEEDDRIVE** | `/apps/drive` | File storage (Box replacement) |

Each app follows **conventions-over-configuration**:

- Stable routes: `/apps/:appname`
- Settings: `/apps/:appname/settings`
- No runtime app registry - static routes
- Use existing RBAC for permissions

---

## Testing Structure

```
__tests__/              # Global test utilities
├── fixtures/          # Test data
├── mocks/             # MSW handlers
├── smoke/             # Smoke tests
└── utils/             # Test helpers

features/quote-calculator/
├── components/
│   ├── QuoteForm.tsx
│   └── QuoteForm.test.tsx        # Component tests
├── logic/
│   ├── calculations.ts
│   └── calculations.test.ts      # Unit tests
└── __tests__/
    └── integration/
        └── quote-flow.test.ts    # Integration tests

e2e/                   # End-to-end tests
├── specs/
│   ├── auth.spec.ts
│   └── quote.spec.ts
└── fixtures/
```

**Test placement**:

- **Unit tests**: Next to source file (`.test.ts`)
- **Integration tests**: `__tests__/integration/`
- **E2E tests**: `e2e/specs/`

See [CONTRIBUTING.md](./CONTRIBUTING.md) for testing guidelines.

---

## Migration from Legacy Structure

### Current State

The codebase is **partially migrated** to the documented architecture:

**Client Side:**

- ✅ `features/quote-calculator/` follows new structure
- ⚠️ Most code still in `pages/` and `components/` (legacy pattern)
- ⚠️ Minimal path alias adoption (existing code uses relative imports)
- ⚠️ Only 1 feature module exists (92 page components)

**Server Side:**

- ✅ `routes/`, `services/`, `db/` directories exist
- ⚠️ Root clutter: Many files at server root (`hubspot.ts`, `storage.ts`, `airtable.ts`)
- ⚠️ Mixed patterns: Some provider pattern, but also direct integrations

### Target State

All code follows the documented architecture:

- Feature-based client architecture with path aliases
- Clean server layering (routes → services → data)
- Provider pattern for all external integrations
- Consistent import/export conventions

### Migration Strategy

**Approach**: **Incremental migration** - avoid big-bang refactor

#### Phase 0: Foundation (Complete)

- ✅ Path aliases configured
- ✅ ESLint rules enforced
- ✅ Feature generator script
- ✅ Documentation and templates
- ✅ Infrastructure ready for new code

#### Phase 1: Pilot Migration (Quote Calculator)

**Goal**: Validate patterns with high-priority feature

**Client Work:**

1. Refactor calculator business logic out of UI
2. Extract reusable hooks and utilities
3. Apply path aliases throughout
4. Document lessons learned

**Server Work:**

1. Consolidate quote-related routes
2. Extract quote service layer
3. Implement provider pattern fully
4. Clean up hubspot direct dependencies

**Success Criteria:**

- Calculator logic 100% unit tested
- Clear separation of concerns
- Pattern validated and documented

#### Phase 2+: Gradual Migration

**New Code (Required):**

- ✅ All new features MUST use new structure
- ✅ Use feature generator: `npm run generate:feature`
- ✅ Follow documented patterns
- ✅ Use path aliases

**Existing Code (Opportunistic):**

- 🔄 When touching existing code → migrate to new structure
- 🔄 Refactor one file/component at a time
- 🔄 Update imports to path aliases
- ❌ No forced migration of working code

**Server Consolidation:**

- Move `hubspot.ts` → `services/hubspot-service.ts`
- Move `storage.ts` → `services/storage-service.ts`
- Move `airtable.ts` → `services/airtable-service.ts`
- Consolidate route files in `routes/` directory
- Apply provider pattern consistently

### Migration Guidelines

#### When Refactoring a File

1. **Update imports** to use path aliases

   ```typescript
   // Before
   import { api } from '../../../lib/api';
   
   // After
   import { api } from '@/lib/api';
   ```

2. **Extract business logic** from components

   ```typescript
   // Before: Logic in component
   function QuoteForm() {
     const total = items.reduce((sum, item) => sum + item.price, 0);
     return <div>{total}</div>;
   }
   
   // After: Logic extracted
   // logic/calculations.ts
   export const calculateTotal = (items) => 
     items.reduce((sum, item) => sum + item.price, 0);
   
   // components/QuoteForm.tsx
   import { calculateTotal } from '../logic/calculations';
   function QuoteForm() {
     const total = calculateTotal(items);
     return <div>{total}</div>;
   }
   ```

3. **Colocate tests** with source

   ```
   Before:
   src/components/QuoteForm.tsx
   test/components/QuoteForm.test.tsx
   
   After:
   features/quote-calculator/components/QuoteForm.tsx
   features/quote-calculator/components/QuoteForm.test.tsx
   ```

4. **Create barrel exports** for feature public API

   ```typescript
   // features/quote-calculator/index.ts
   export { QuoteCalculator } from './QuoteCalculator';
   export { useQuoteData } from './hooks/useQuoteData';
   export type * from './types';
   ```

### Migration Tracking

Track migration progress in the following places:

- **Phase 1 Execution Doc**: Calculator refactor tasks
- **PR descriptions**: Note structural improvements
- **Code reviews**: Enforce new patterns for new code

### Red Flags (Don't Do This)

❌ **Big Bang Refactor**: Moving everything at once

- Too risky, hard to review
- Breaks active development
- Difficult to rollback

❌ **Inconsistent Patterns**: Half old, half new in same feature

- Finish what you start
- Complete migration of touched files

❌ **Breaking Working Code**: Refactoring for refactoring's sake

- Only refactor when touching for a reason
- Don't break working features

### Success Metrics

**Phase 1 Success:**

- Calculator follows documented structure
- 90%+ test coverage on business logic
- Path aliases used throughout
- Pattern validated, ready to replicate

**Long-term Success:**

- 80%+ of active code follows new structure
- All new code follows patterns
- Legacy code migrated opportunistically
- Consistent codebase architecture

---

## References

- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [INTEGRATION_REMOVAL_PLAN.md](./INTEGRATION_REMOVAL_PLAN.md) - Migration strategy
- [Phase 0 Execution](./PHASE_0_EXECUTION.md) - Current phase details
- [ADRs](./adrs/) - Architecture Decision Records

---

## Questions?

If you're unsure where code should live:

1. **Is it used in 2+ places?** → Shared
2. **Is it a large, self-contained domain?** → New feature
3. **Is it tightly coupled to one page?** → Page-specific
4. **Is it a generic UI component?** → Shared components
5. **Is it business logic?** → Feature logic or service

When in doubt, start **feature-specific** and promote to shared when needed.

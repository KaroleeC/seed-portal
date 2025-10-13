# Contributing Guide

Welcome to the seed-portal project! This guide outlines conventions, best practices, and workflows for contributing to the codebase.

## Table of Contents

- [Naming Conventions](#naming-conventions)
- [File Organization](#file-organization)
- [Import Order](#import-order)
- [Path Aliases](#path-aliases)
- [Testing Strategy](#testing-strategy)
- [Code Style](#code-style)
- [Git Workflow](#git-workflow)

---

## Naming Conventions

### File Naming

We enforce consistent file naming through ESLint rules:

#### **Components** (React/UI)

- Use **PascalCase** for React component files
- Examples: `UserProfile.tsx`, `QuoteCalculator.tsx`, `DashboardCard.tsx`
- Exception: Multi-word acronyms stay uppercase (e.g., `APSection` → `ap-section.tsx` for consistency)

#### **Hooks**

- Use **kebab-case** with `use-` prefix
- Examples: `use-auth.ts`, `use-quote-data.ts`, `use-navigation-history.tsx`
- Alternative: `useAuth.ts` (camelCase) is acceptable but kebab-case preferred

#### **Utilities**

- Use **kebab-case** for utility files
- Examples: `format-currency.ts`, `validate-email.ts`, `api-helpers.ts`

#### **Services**

- Use **kebab-case** for service files
- Examples: `email-service.ts`, `storage-service.ts`, `auth-service.ts`

#### **Routes/API Handlers**

- Use **kebab-case** for route files
- Examples: `quote-routes.ts`, `user-routes.ts`, `admin-routes.ts`

#### **Types**

- Use **kebab-case** for type definition files
- Examples: `user-types.ts`, `quote-types.ts`
- Alternatively: co-locate with feature in `types/index.ts`

#### **Tests**

- Match source filename with `.test.ts` or `.spec.ts` suffix
- Examples: `UserProfile.test.tsx`, `use-auth.test.ts`, `format-currency.test.ts`

### Variable & Function Naming

```typescript
// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// Functions: camelCase
function calculateTotal(items: Item[]): number { }
async function fetchUserData(id: string): Promise<User> { }

// React Components: PascalCase
function UserProfile({ userId }: Props) { }
export const QuoteCalculator: React.FC<Props> = ({ data }) => { };

// Hooks: camelCase with 'use' prefix
function useAuth() { }
function useQuoteData(id: string) { }

// Types/Interfaces: PascalCase
interface User { }
type QuoteStatus = 'draft' | 'sent' | 'accepted';

// Type parameters: Single uppercase letter or PascalCase
function identity<T>(value: T): T { }
function map<TInput, TOutput>(fn: (item: TInput) => TOutput) { }
```

---

## File Organization

### Feature-Based Architecture

Organize code by **feature** rather than by technical type:

```txt
client/src/
  features/
    quote-calculator/
      components/
        QuoteForm.tsx
        QuoteSummary.tsx
      hooks/
        use-quote-data.ts
        use-quote-sync.ts
      utils/
        calculate-pricing.ts
        validate-quote.ts
      types/
        index.ts
      api/
        quote-api.ts
      __tests__/
        QuoteForm.test.tsx
        calculate-pricing.test.ts
      index.ts              # Barrel export
```

### Shared Code

Place shared/reusable code in top-level directories:

```txt
client/src/
  components/           # Shared components
    Button.tsx
    Modal.tsx
  hooks/                # Shared hooks
    use-api.ts
    use-auth.ts
  lib/                  # Shared utilities
    api.ts
    format.ts
  types/                # Shared types
    common.ts
```

### Server Organization

```txt
server/
  routes/               # Express route handlers
  services/             # Business logic
    providers/          # Provider implementations
  middleware/           # Express middleware
  db/                   # Database schema (Drizzle)
  jobs/                 # Background jobs
```

---

## Import Order

Organize imports in the following order:

```typescript
// 1. External libraries (React, third-party)
import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { Button } from '@radix-ui/react-button';

// 2. Path aliases (internal - alphabetical by alias)
import { QuoteForm } from '@features/quote-calculator';
import { Modal } from '@components/Modal';
import { useAuth } from '@hooks/use-auth';
import { formatCurrency } from '@utils/format';

// 3. Relative imports (same feature/directory)
import { calculateTotal } from './utils';
import type { QuoteData } from './types';

// 4. Types-only imports (if separate)
import type { User } from '@shared/types';

// 5. CSS/Styles (last)
import './QuoteForm.css';
```

---

## Path Aliases

Use path aliases for cleaner imports:

### Available Aliases

| Alias | Path | Usage |
|-------|------|-------|
| `@/*` | `client/src/*` | General client code |
| `@features/*` | `client/src/features/*` | Feature modules |
| `@components/*` | `client/src/components/*` | Shared components |
| `@hooks/*` | `client/src/hooks/*` | Shared hooks |
| `@utils/*` | `client/src/lib/*` | Shared utilities |
| `@types/*` | `client/src/types/*` | Shared types |
| `@shared/*` | `shared/*` | Isomorphic code |
| `@server/*` | `server/*` | Server code |

### Examples

```typescript
// ❌ Avoid relative imports across features
import { Button } from '../../../components/ui/Button';

// ✅ Use path aliases instead
import { Button } from '@components/ui/Button';

// ✅ Import from feature barrel exports
import { QuoteCalculator, useQuoteData } from '@features/quote-calculator';
```

---

## Testing Strategy

### Test Placement

- Place tests **alongside** source files
- Use `__tests__/` directory for complex test suites

```txt
quote-calculator/
  components/
    QuoteForm.tsx
    QuoteForm.test.tsx       ← Next to source
  __tests__/
    integration/             ← Complex test suites
      quote-flow.test.ts
```

### Test Types

#### Unit Tests (Vitest)

```typescript
// utils/format-currency.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format-currency';

describe('formatCurrency', () => {
  it('should format dollars correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
  
  it('should handle edge cases', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(-100)).toBe('-$100.00');
  });
});
```

#### Component Tests (React Testing Library)

```typescript
// components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Integration Tests (Supertest)

```typescript
// server/__tests__/quote-routes.test.ts
import request from 'supertest';
import { app } from '../index';

describe('POST /api/quotes', () => {
  it('should create a new quote', async () => {
    const response = await request(app)
      .post('/api/quotes')
      .send({ customerId: '123', items: [] })
      .expect(201);
      
    expect(response.body).toHaveProperty('id');
  });
});
```

#### E2E Tests (Playwright)

```typescript
// e2e/quote-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete quote creation flow', async ({ page }) => {
  await page.goto('/calculator');
  await page.fill('[name="customerEmail"]', 'test@example.com');
  await page.click('text=Generate Quote');
  await expect(page.locator('.quote-summary')).toBeVisible();
});
```

### Running Tests

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

---

## Code Style

### DRY Principles

- **Extract shared logic** into utilities or hooks
- **Avoid duplication** across features
- **Use abstractions** (providers, services) for cross-cutting concerns

```typescript
// ❌ Duplicated logic
function ComponentA() {
  const data = await fetch('/api/data').then(r => r.json());
  return <div>{data.value}</div>;
}

function ComponentB() {
  const data = await fetch('/api/data').then(r => r.json());
  return <span>{data.value}</span>;
}

// ✅ Extracted into shared hook
function useData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
  }, []);
  return data;
}

function ComponentA() {
  const data = useData();
  return <div>{data?.value}</div>;
}
```

### TypeScript Best Practices

```typescript
// ✅ Use explicit return types for public APIs
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Prefer interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ Use type for unions/aliases
type Status = 'pending' | 'approved' | 'rejected';
type Callback = (value: string) => void;

// ✅ Avoid `any` - use `unknown` if type truly unknown
function process(data: unknown) {
  if (typeof data === 'string') {
    // TypeScript narrows type here
  }
}
```

### React Best Practices

```typescript
// ✅ Use functional components
export function UserProfile({ userId }: { userId: string }) {
  // Implementation
}

// ✅ Extract complex logic to hooks
function UserProfile({ userId }: Props) {
  const { user, isLoading, error } = useUserData(userId);
  // Simple render logic
}

// ✅ Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// ✅ Use callback memoization for child components
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

---

## Git Workflow

### Branch Naming

```txt
feature/quote-calculator-improvements
fix/login-validation-bug
chore/update-dependencies
docs/add-contributing-guide
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```txt
feat: add quote PDF generation
fix: resolve authentication redirect loop
docs: update API documentation
chore: bump dependencies
refactor: extract pricing logic to service
test: add calculator smoke tests
```

### Pull Request Process

1. **Create feature branch** from `main`
2. **Implement changes** following conventions
3. **Write/update tests**
4. **Run linters**: `npm run lint:fix`
5. **Run tests**: `npm run test:run`
6. **Push and create PR**
7. **Request review** from team
8. **Address feedback**
9. **Squash and merge** once approved

---

## Feature Generator

Use the built-in generator for new features:

```bash
npm run generate:feature my-feature-name
```

This creates:

```txt
features/my-feature-name/
  components/
  hooks/
  utils/
  types/
  api/
  __tests__/
  index.ts
  README.md
```

---

## ESLint and Pre-commit Hooks

### ESLint Configuration

The project enforces code quality through ESLint rules:

#### **Filename Conventions** (eslint-plugin-check-file)

Automatically enforces naming patterns:

- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Utilities: `kebab-case.ts`
- Tests: Match source filename with `.test.ts` suffix

```bash
# Check for violations
npm run lint

# Auto-fix where possible
npm run lint:fix
```

#### **Restricted Imports**

Prevents problematic import patterns:

- ❌ No direct `../../../` relative imports across features
- ❌ No importing from feature internals (use barrel exports)
- ✅ Use path aliases (`@components/*`, `@features/*`)

#### **Import Restrictions** (eslint-plugin-import)

- Enforce import order
- Prevent circular dependencies
- No duplicate imports
- No unused imports

### Pre-commit Hooks (Husky + lint-staged)

Git hooks run automatically before commits:

```bash
# Installed via Husky in .husky/pre-commit
# Configured in .lintstagedrc.json
```

**What runs on commit:**

1. **ESLint** - Lints and auto-fixes staged files
2. **Prettier** - Formats staged files
3. **TypeScript** - Type checks (no-emit mode)

**Configuration**:

```json
// .lintstagedrc.json
{
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

### Bypassing Hooks (Use Sparingly)

```bash
# Skip pre-commit hooks (not recommended)
git commit --no-verify -m "emergency fix"

# Only skip on genuine emergencies (hotfixes, CI issues)
```

### CI Enforcement

The CI pipeline enforces quality gates:

```yaml
# .github/workflows/ci.yml
- Lint check (no auto-fix)
- Type check
- Unit tests
- Integration tests
- Build verification
```

**All checks must pass before merge.**

### Common Lint Fixes

```bash
# Fix all auto-fixable issues
npm run lint:fix

# Check types
npm run type-check

# Format all files
npm run format

# Run all checks (CI-equivalent)
npm run validate
```

### Disabling Rules (Rare)

Only disable rules with good reason and comment why:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function legacyApi(data: any) {
  // TODO: Type this properly when API is documented
}

// Disable for entire file (last resort)
/* eslint-disable @typescript-eslint/no-explicit-any */
```

---

## Additional Resources

- [Integration Removal Plan](./INTEGRATION_REMOVAL_PLAN.md)
- [Structure Guide](./STRUCTURE.md)
- [Phase 0 Execution](./PHASE_0_EXECUTION.md)
- [ADR Index](./adrs/0000-adr-index.md)

---

## Getting Help

- Check existing documentation in `docs/`
- Review ADRs for architectural decisions
- Ask in team chat for clarification
- Open an issue for bugs or unclear conventions

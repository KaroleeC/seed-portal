# Code Templates

This directory contains templates for creating new code files with consistent structure and documentation.

## 📋 Available Templates

| Template | Purpose | Key Features |
|----------|---------|--------------|
| **[Component.tsx](./Component.tsx)** | React component | JSDoc, props interface, accessibility notes |
| **[Hook.ts](./Hook.ts)** | React hook | Usage examples, return types, type safety |
| **[util.ts](./util.ts)** | Utility function | Params documentation, return value docs |
| **[Test.test.ts](./Test.test.ts)** | Test file | Describe/it blocks, setup/teardown |
| **[service.ts](./service.ts)** | Business logic service | Class/function pattern, error handling |
| **[route.ts](./route.ts)** | API route handler | Express pattern, validation, error handling |

---

## 🚀 Usage

### Automated (Recommended)

Use the feature generator script to automatically create a complete feature structure:

```bash
npm run generate:feature my-feature-name
```

**What this creates:**

```txt
features/my-feature-name/
├── components/
│   └── MyFeature.tsx       (from Component.tsx template)
├── hooks/
│   └── useMyFeature.ts     (from Hook.ts template)
├── utils/
│   └── helpers.ts          (from util.ts template)
├── types/
│   └── index.ts
├── services/
│   └── api.ts              (from service.ts template)
├── __tests__/
│   └── MyFeature.test.tsx  (from Test.test.ts template)
└── index.ts
```

### Manual Usage

When you need a single file:

1. **Copy the template**

   ```bash
   cp .templates/Component.tsx client/src/components/MyComponent.tsx
   ```

2. **Replace placeholders** (see [Placeholders](#placeholders) section below)

3. **Implement your logic**

4. **Create co-located test**

   ```bash
   cp .templates/Test.test.ts client/src/components/MyComponent.test.tsx
   ```

---

## 🔄 Placeholder Replacement Guide

### Component Template

Replace these in `Component.tsx`:

| Placeholder | Replace With | Example |
|------------|--------------|---------|
| `ComponentName` | Your PascalCase component name | `UserProfile`, `QuoteCalculator` |
| `[Brief description...]` | Short one-liner | `Displays user profile information` |
| `[Detailed description...]` | Full description | `This component renders...` |
| `prop1`, `prop2` | Actual prop names | `userId`, `onSubmit` |
| `[Description of prop1]` | Prop documentation | `The unique identifier for the user` |

**Accessibility Notes:**

- Update `role` attribute as needed (`button`, `dialog`, `navigation`, etc.)
- Update `aria-label` with descriptive text
- Add `aria-describedby`, `aria-expanded`, etc. as needed
- Ensure keyboard navigation works (`onKeyDown`, `tabIndex`)

### Hook Template

Replace these in `Hook.ts`:

| Placeholder | Replace With | Example |
|------------|--------------|---------|
| `useHookName` | Your camelCase hook name (with `use` prefix) | `useAuth`, `useQuoteData` |
| `[Brief description...]` | Short one-liner | `Manages authentication state` |
| `[Usage example...]` | Code example | `const { user, login } = useAuth();` |

### Utility Template

Replace these in `util.ts`:

| Placeholder | Replace With | Example |
|------------|--------------|---------|
| `functionName` | Your camelCase function name | `formatCurrency`, `validateEmail` |
| `[Description...]` | Function purpose | `Formats a number as USD currency` |
| `param1`, `param2` | Actual parameter names | `amount`, `options` |

### Test Template

Replace these in `Test.test.ts`:

| Placeholder | Replace With | Example |
|------------|--------------|---------|
| `FeatureName` | Feature/component being tested | `UserProfile` |
| `functionName` | Function being tested | `formatCurrency` |
| Test descriptions | Actual test cases | `'should format USD correctly'` |

### Service Template

Replace these in `service.ts`:

| Placeholder | Replace With | Example |
|------------|--------------|---------|
| `ServiceName` | Your service name | `UserService`, `QuoteService` |
| Method names | Actual methods | `getUser`, `createQuote` |

### Route Template

Replace these in `route.ts`:

| Placeholder | Replace With | Example |
|------------|--------------|---------|
| `resourceName` | API resource name | `users`, `quotes` |
| Route paths | Actual endpoints | `/api/users/:id` |

---

## 📏 Naming Conventions

Follow these conventions for consistency:

### Files

- **Components**: `PascalCase.tsx`
  - ✅ `UserProfile.tsx`, `QuoteCalculator.tsx`
  - ❌ `userProfile.tsx`, `quote-calculator.tsx`

- **Hooks**: `use-kebab-case.ts` (preferred) or `useHookName.ts`
  - ✅ `use-auth.ts`, `use-quote-data.ts`
  - ✅ `useAuth.ts` (also acceptable)
  - ❌ `auth-hook.ts`, `authHook.ts`

- **Utils**: `kebab-case.ts`
  - ✅ `format-currency.ts`, `validate-email.ts`
  - ❌ `formatCurrency.ts`, `utils.ts`

- **Services**: `kebab-case-service.ts`
  - ✅ `quote-service.ts`, `user-service.ts`
  - ❌ `QuoteService.ts`, `quoteservice.ts`

- **Routes**: `kebab-case-routes.ts`
  - ✅ `quote-routes.ts`, `user-routes.ts`
  - ❌ `QuoteRoutes.ts`, `quotes.ts`

- **Tests**: Match source file with `.test.ts` or `.spec.ts`
  - ✅ `UserProfile.test.tsx`, `format-currency.test.ts`

### Code Naming

```typescript
// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://api.example.com';

// Functions: camelCase
function calculateTotal() {}
async function fetchUserData() {}

// Classes: PascalCase
class UserService {}
class QuoteCalculator {}

// Types/Interfaces: PascalCase
interface User {}
type Status = 'active' | 'inactive';

// Components: PascalCase (function or const)
function UserProfile() {}
export const QuoteForm: React.FC = () => {};

// Hooks: camelCase with 'use' prefix
function useAuth() {}
function useQuoteData() {}
```

---

## 📝 Documentation Standards

All templates include JSDoc comments. When filling them out:

### Component Documentation

```typescript
/**
 * UserProfile
 *
 * Displays comprehensive user profile information including avatar,
 * contact details, and account status.
 *
 * @example
 * ```tsx
 * <UserProfile userId="123" onEdit={handleEdit} />
 * ```
 */
```

### Function Documentation

```typescript
/**
 * Formats a number as USD currency
 *
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "$1,234.56")
 *
 * @example
 * ```ts
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency(0) // "$0.00"
 * ```
 */
```

### Test Documentation

```typescript
describe('formatCurrency', () => {
  it('should format positive numbers correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should handle negative numbers', () => {
    expect(formatCurrency(-100)).toBe('-$100.00');
  });
});
```

---

## 🎯 Best Practices

### DO ✅

- ✅ Use templates for **all** new code
- ✅ Fill out **all** JSDoc comments
- ✅ Add **usage examples** in documentation
- ✅ Write **tests** alongside implementation
- ✅ Follow **naming conventions** strictly
- ✅ Include **accessibility** considerations for UI components
- ✅ Add **error handling** in services and routes
- ✅ Use **TypeScript types** everywhere

### DON'T ❌

- ❌ Skip documentation because "code is self-documenting"
- ❌ Leave placeholder text in production code
- ❌ Mix naming conventions (be consistent!)
- ❌ Write code without tests
- ❌ Use `any` type - use `unknown` or proper types
- ❌ Forget accessibility for components
- ❌ Skip error handling in services

---

## 🔗 Related Documentation

- **[CONTRIBUTING.md](../docs/CONTRIBUTING.md)** - Complete development guidelines
- **[STRUCTURE.md](../docs/STRUCTURE.md)** - Project architecture and organization
- **[Feature Generator Script](../scripts/new-feature.ts)** - Automated feature scaffolding
- **[Path Aliases Guide](../docs/CONTRIBUTING.md#path-aliases)** - Using `@features/*`, `@components/*`, etc.

---

## 💡 Tips

### Quick Start Checklist

When creating new code from templates:

1. ⬜ Choose appropriate template
2. ⬜ Copy to correct location (see [STRUCTURE.md](../docs/STRUCTURE.md))
3. ⬜ Replace all placeholders
4. ⬜ Fill out JSDoc documentation
5. ⬜ Implement logic
6. ⬜ Create test file from Test template
7. ⬜ Write tests
8. ⬜ Run linter: `npm run lint:fix`
9. ⬜ Run tests: `npm test`
10. ⬜ Commit with conventional commit message

### Template Improvements

Templates are living documents! If you find ways to improve them:

1. Update the template file
2. Document the change
3. Update this README if needed
4. Share with the team

---

**Questions?** Check [CONTRIBUTING.md](../docs/CONTRIBUTING.md) or ask in team chat!

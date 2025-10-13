# Lint Policy: New Code Only

## TL;DR

✅ **New files:** Must pass lint  
⚠️ **Editing existing files:** Fix what you touch  
🚫 **Legacy code:** Ignore until you need it  

## The Rule

**If you create a new file, it must have:**

- 0 errors
- 0 warnings (or only unavoidable warnings with inline comments explaining why)

**If you edit an existing file:**

- Don't make lint worse
- Ideally make it a bit better
- Use `// eslint-disable-next-line` with a comment if you must

## How to Check

Before committing:

```bash
# Check only the files you changed
npm run lint -- path/to/your/file.ts

# Auto-fix safe issues
npm run lint:fix
```

## Ignored Paths

We're **not** linting these paths because the code is being removed:

- `server/services/hubspot/**`
- `server/services/box/**`
- `server/services/airtable/**`
- Any file with `hubspot`, `box`, or `airtable` in the name

Don't waste time fixing lint in code that's going away.

## Priority Files (Fix These When You Touch Them)

1. **Calculator** - Our #1 feature
   - `client/src/components/Calculator/**`
   - `shared/pricing.ts`

2. **Auth & Security** - Critical
   - `server/middleware/auth.ts`
   - `server/middleware/require-permission.ts`

3. **Database** - Core integrity
   - `server/db/**`
   - `server/storage/**`

## Common Fixes

### Floating Promises

```ts
// ❌ Bad
someAsyncFunction();

// ✅ Good
someAsyncFunction().catch(err => logger.error('Failed:', err));

// ✅ Also good
await someAsyncFunction();
```

### Explicit Any

```ts
// ❌ Bad
function doThing(data: any) { }

// ✅ Good
function doThing(data: unknown) {
  // Type guard here
}

// ✅ Also good
interface MyData { name: string; }
function doThing(data: MyData) { }
```

### Missing Return Types

```ts
// ❌ Bad
export function calculatePrice(qty) {
  return qty * 10;
}

// ✅ Good
export function calculatePrice(qty: number): number {
  return qty * 10;
}
```

## When in Doubt

- **New feature?** Make it lint-clean
- **Bug fix in legacy code?** Fix the bug, ignore lint
- **Refactoring?** Perfect time to clean up lint
- **Time crunch?** Ship the feature, add a TODO

**The goal is progress, not perfection.**

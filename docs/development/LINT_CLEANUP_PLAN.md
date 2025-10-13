# Lint Cleanup Plan

## Current State

- **2404 lint issues** in existing codebase (289 errors, 2115 warnings)
- **Our new code is clean** - 0 errors, only 15 warnings in lead linking + smoke tests

## Strategy: Fix Systematically, Not Hide

### Phase 1: Critical Errors (Next PR)

Fix the 289 errors first. Priority order:

1. **React Hooks Violations** (~80 errors)
   - Conditional hook calls in commission tracker
   - Move hooks outside conditionals
   - Test after each fix

2. **Accessibility Issues** (~30 errors)
   - Labels without associated controls
   - Click handlers without keyboard listeners
   - Add proper ARIA attributes

3. **Storybook Renderer** (~10 errors)
   - Update imports to use framework packages
   - `@storybook/react` → `@storybook/react-vite`

4. **Security Rule Violations** (~15 errors)
   - `req.user.role` inline checks
   - Refactor to use `requirePermission()` middleware
   - Document in AUTHORIZATION_PATTERN.md

5. **Other Errors** (~154 errors)
   - `prefer-const` for variables never reassigned
   - `no-this-alias` in legacy code
   - `@typescript-eslint/no-var-requires` in config files

### Phase 2: High-Value Warnings (Following Sprint)

Fix warnings that catch real bugs:

1. **Floating Promises** (1800+ warnings)
   - Promises without `.catch()` or `await`
   - Add proper error handling
   - Prevents silent failures

2. **Explicit Any** (400+ warnings)
   - Type unknown data properly
   - Use generics where appropriate
   - Better type safety

3. **Missing Return Types** (100+ warnings)
   - Add explicit return types to public functions
   - Better IntelliSense and documentation

### Phase 3: Code Quality (Ongoing)

Fix remaining warnings:

1. **Nested Ternaries** (~80 warnings)
   - Extract to if/else or helper functions
   - Improve readability

2. **Console Statements** (~50 warnings)
   - Replace with proper logging
   - Use `logger.info()` instead

3. **Param Reassignment** (~40 warnings)
   - Refactor middleware patterns
   - Use immutable patterns

## Implementation Approach

### DO

- ✅ Fix one category at a time
- ✅ Run tests after each fix
- ✅ Commit fixes in logical groups
- ✅ Document patterns for team

### DON'T

- ❌ Turn errors into warnings
- ❌ Disable rules globally
- ❌ Fix everything in one massive PR
- ❌ Skip tests

## Tooling

```bash
# Run lint with auto-fix (safe changes only)
npm run lint:fix

# Run lint on specific files
npx eslint path/to/file.ts --fix

# Check what auto-fix will do
npx eslint path/to/file.ts --fix-dry-run

# Get error count
npm run lint 2>&1 | grep "✖"
```

## Metrics

Track progress:

- **Errors:** 289 → 0
- **Warnings:** 2115 → 0
- **Test Coverage:** Maintain above 80%
- **Build Time:** Don't increase

## Timeline

- **Phase 1:** 1 week (289 errors → 0)
- **Phase 2:** 2 weeks (2300 warnings → 400)
- **Phase 3:** Ongoing (400 warnings → 0)

## Why This Matters

1. **Catches Real Bugs** - Floating promises = silent failures
2. **Better DX** - Proper types = better IntelliSense
3. **Team Standards** - Consistent code style
4. **CI Confidence** - Lint passes = code quality gate
5. **Refactor Safety** - Types catch breaking changes

## REVISED: Pragmatic Path Forward (Jan 2025)

**Reality Check:** We've made good progress on Phase 2, but lint cleanup is an uphill battle that's blocking feature work. Time to be strategic.

### Immediate Actions (1-2 hours)

1. **✅ Ignore Legacy Integrations**
   - Added HubSpot, Box, Airtable files to `.eslintignore`
   - These integrations are being removed soon
   - No point fixing lint in code that's going away
   - Removes ~30-40% of lint issues

2. **Establish "New Code Only" Policy**
   - All NEW files must pass lint (enforce in PR reviews)
   - Existing files: fix only what you touch
   - Use `eslint-disable-next-line` sparingly for legacy code

3. **Enable Gradual Cleanup**
   - When you edit an existing file, fix obvious issues in that file
   - Don't let lint count grow
   - Let it shrink organically as we work

### What to Fix Now (1 week)

Only fix lint issues in **core business logic** that's staying:

1. **Calculator** (`client/src/components/Calculator/`, `shared/pricing.ts`)
   - This is our #1 priority feature
   - Fix floating promises and explicit-any
   - Add proper error handling

2. **Auth & RBAC** (`server/middleware/auth.ts`, role checks)
   - Security-critical code
   - Fix security rule violations
   - Use `requirePermission()` consistently

3. **Database Layer** (`server/db/`, `server/storage/`)
   - Core data integrity
   - Fix type issues and floating promises

### What to Ignore for Now

- Commission tracker (legacy, being refactored anyway)
- Dashboard widgets (UI polish comes later)
- Admin tools (low traffic, non-critical)
- Anything in HubSpot/Box/Airtable paths

### New Metric: Block List Growth

Stop tracking total count. Instead track:

- **New files:** Must have 0 errors, 0 warnings
- **Edited files:** Should reduce lint count vs. before
- **Legacy files:** Ignored until touched

## Resume Feature Work

You can now:

1. Build features without fighting legacy lint
2. Maintain quality in new code
3. Let lint issues resolve naturally over time
4. Focus on high-value work (Calculator, Client Profiles, etc.)

**The goal is shipping features, not achieving lint perfection.**

# Phase 0: Rollback Plan

**Purpose**: Document procedures to safely rollback Phase 0 changes if issues arise.

**Risk Level**: 🟢 **LOW** - Phase 0 is primarily documentation and configuration with zero breaking changes.

---

## When to Rollback

Consider rollback if:

- ❌ ESLint rules block critical development work
- ❌ Path aliases cause build failures
- ❌ Provider defaults cause runtime errors
- ❌ Team cannot proceed with Phase 1

**Note**: Phase 0 introduced zero breaking changes, so rollback should not be necessary.

---

## Quick Rollback (Emergency)

If immediate rollback is needed, disable ESLint rules temporarily:

### 1. Disable ESLint Restricted Imports

Edit `.eslintrc.cjs`:

```javascript
// Comment out restricted imports temporarily
rules: {
  // 'no-restricted-imports': ['error', { ... }], // DISABLED FOR ROLLBACK
}
```

### 2. Disable Filename Rules

```javascript
rules: {
  // 'filenames/match-exported': ['error', 'kebab'], // DISABLED FOR ROLLBACK
}
```

### 3. Clear ESLint Cache

```bash
rm -rf node_modules/.cache/eslint
npm run lint
```

---

## Complete Rollback Procedures

### Step 1: Revert Environment Variables in Doppler

**Doppler Project**: `seed-portal-api`  
**Doppler Config**: `dev`

Remove the following environment variables:

```bash
# Connect to Doppler
doppler login

# Switch to project
doppler setup --project seed-portal-api --config dev

# Remove provider variables
doppler secrets delete QUOTE_PROVIDER
doppler secrets delete STORAGE_PROVIDER
doppler secrets delete CLIENT_INTEL_SOURCE
doppler secrets delete PAYMENT_PROVIDER
doppler secrets delete ESIGN_PROVIDER
doppler secrets delete LEAD_INTAKE_PROVIDER
```

**Or** Update to previous values if they existed:

```bash
doppler secrets set QUOTE_PROVIDER=hubspot
doppler secrets set STORAGE_PROVIDER=box
doppler secrets set CLIENT_INTEL_SOURCE=airtable
```

### Step 2: Revert .env.example

Remove Phase 0 additions from `.env.example`:

```bash
git diff HEAD~1 .env.example
git checkout HEAD~1 -- .env.example
```

Or manually remove these lines:

```ini
# Provider Toggles (Phase 0)
QUOTE_PROVIDER=seedpay
STORAGE_PROVIDER=supabase
CLIENT_INTEL_SOURCE=internal
PAYMENT_PROVIDER=stripe
ESIGN_PROVIDER=docuseal
LEAD_INTAKE_PROVIDER=internal
```

---

### Step 3: Revert ESLint Configuration

#### 3.1 Remove Restricted Imports

Edit `.eslintrc.cjs`, remove the `no-restricted-imports` rule:

```javascript
rules: {
  // Remove this entire block
  'no-restricted-imports': [
    'error',
    {
      paths: [
        {
          name: '@hubspot/api-client',
          message: 'Use server/services/hubspot/* instead',
        },
        {
          name: 'box-node-sdk',
          message: 'Use server/services/storage/* instead',
        },
        {
          name: 'airtable',
          message: 'Use server/services/client-intel/* instead',
        },
      ],
    },
  ],
}
```

#### 3.2 Remove Filename Rules

Remove the `filenames/match-exported` rule:

```javascript
rules: {
  // Remove this line
  'filenames/match-exported': ['error', 'kebab'],
}
```

#### 3.3 Update .eslintignore

Remove Phase 0 exclusions from `.eslintignore`:

```bash
# Remove these lines if they were added
.templates/
scripts/
```

---

### Step 4: Revert Path Aliases (Optional)

Only needed if path aliases cause build issues.

#### 4.1 Revert tsconfig.json

Remove path aliases from `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      // Remove these lines
      "@features/*": ["client/src/features/*"],
      "@components/*": ["client/src/components/*"],
      "@hooks/*": ["client/src/hooks/*"],
      "@utils/*": ["client/src/utils/*"],
      "@shared/*": ["shared/*"],
      "@types/*": ["types/*"]
    }
  }
}
```

#### 4.2 Revert vite.config.ts

Remove path aliases from `vite.config.ts`:

```typescript
resolve: {
  alias: {
    // Remove these lines
    '@features': path.resolve(__dirname, 'client/src/features'),
    '@components': path.resolve(__dirname, 'client/src/components'),
    '@hooks': path.resolve(__dirname, 'client/src/hooks'),
    '@utils': path.resolve(__dirname, 'client/src/utils'),
    '@shared': path.resolve(__dirname, 'shared'),
    '@types': path.resolve(__dirname, 'types'),
  }
}
```

---

### Step 5: Revert Provider Factory Defaults (If Modified)

If `server/services/providers/index.ts` was modified to default to `seedpay`:

```typescript
// Change back to original default
const quoteProvider = process.env.QUOTE_PROVIDER || 'hubspot'; // Original
const storageProvider = process.env.STORAGE_PROVIDER || 'box'; // Original
```

---

### Step 6: Remove New Files (Optional)

Only if rollback requires removing Phase 0 documentation:

```bash
# Remove Phase 0 documentation
rm docs/PHASE_0_EXECUTION.md
rm docs/PHASE_0_EXECUTION_PART2.md
rm docs/PHASE_0_COMPLETE.md
rm docs/PHASE_0_ROLLBACK.md
rm docs/PHASE_0_FILES_MODIFIED.md
rm docs/PHASE_0_LINT_AUDIT.md
rm docs/PHASE_0_TEST_RESULTS.md

# Remove STRUCTURE.md if needed
# rm docs/STRUCTURE.md

# Remove enhanced CONTRIBUTING.md (restore from git)
# git checkout HEAD~1 -- docs/CONTRIBUTING.md

# Remove ADRs
rm -rf docs/adrs/

# Remove templates
rm -rf .templates/

# Remove feature generator tests
rm scripts/__tests__/new-feature.test.ts

# Restore original feature generator if it was modified
# git checkout HEAD~1 -- scripts/new-feature.ts
```

**Warning**: Removing documentation is generally not recommended. Keep docs for reference.

---

### Step 7: Rebuild and Test

After rollback changes:

```bash
# Clear caches
rm -rf node_modules/.cache
rm -rf dist/

# Reinstall if needed
npm install

# Test build
npm run build

# Test linting
npm run lint

# Test type checking
npm run check

# Run tests
npm run test:run
```

---

## Partial Rollback Options

You can rollback specific pieces without reverting everything:

### Option A: Keep Documentation, Rollback ESLint Only

- ✅ Keep: STRUCTURE.md, CONTRIBUTING.md, ADRs, templates
- ❌ Rollback: ESLint rules, path aliases

**Rationale**: Documentation is valuable even if enforcement is disabled temporarily.

### Option B: Keep ESLint, Rollback Doppler Only

- ✅ Keep: ESLint rules, path aliases, documentation
- ❌ Rollback: Doppler environment variables

**Rationale**: ESLint can warn without blocking if Doppler variables are causing issues.

### Option C: Keep Everything, Disable Enforcement

- ✅ Keep: All files, configuration
- ⚠️ Change: ESLint from `error` to `warn`

```javascript
rules: {
  'no-restricted-imports': ['warn', { /* ... */ }], // Changed to 'warn'
  'filenames/match-exported': ['warn', 'kebab'], // Changed to 'warn'
}
```

**Rationale**: Get warnings without blocking development.

---

## Rollback Validation

After rollback, verify:

1. ✅ **Build succeeds**: `npm run build`
2. ✅ **Linting passes**: `npm run lint`
3. ✅ **Type checking passes**: `npm run check`
4. ✅ **Tests pass**: `npm run test:run`
5. ✅ **Dev server starts**: `npm run dev`

---

## Recovery from Rollback

If rollback was unnecessary and you want to restore Phase 0:

### Option 1: Git Revert the Rollback Commit

```bash
git log --oneline  # Find rollback commit hash
git revert <rollback-commit-hash>
```

### Option 2: Cherry-pick Phase 0 Commits

```bash
git log --oneline  # Find Phase 0 commits
git cherry-pick <phase0-commit-1> <phase0-commit-2> ...
```

### Option 3: Restore from Backup Branch

```bash
# Assuming Phase 0 was merged from a branch
git checkout phase-0-complete
git checkout -b phase-0-restore
git rebase main
```

---

## Support & Escalation

### Before Rollback

1. Review [PHASE_0_COMPLETE.md](./PHASE_0_COMPLETE.md) to understand what was changed
2. Check if issue can be resolved without rollback
3. Consult with team lead

### During Rollback

1. Document reason for rollback in rollback commit message
2. Update [INTEGRATION_REMOVAL_PLAN.md](./INTEGRATION_REMOVAL_PLAN.md) status
3. Notify team of rollback and reason

### After Rollback

1. Create post-mortem document explaining rollback reason
2. Plan fix for issue that caused rollback
3. Schedule re-attempt of Phase 0 if appropriate

---

## Risk Assessment

### Low Risk (Safe to Rollback)

- ESLint rules - Can be disabled without side effects
- Path aliases - Revert without breaking existing code
- Documentation - Can be kept even if config is rolled back
- Provider defaults - Revert to original values

### Medium Risk (Test Carefully)

- Doppler changes - Ensure original values are restored correctly
- .eslintignore changes - Verify lint still works after revert

### No Risk (Keep Even on Rollback)

- Documentation files (STRUCTURE.md, CONTRIBUTING.md, etc.)
- ADRs - Architecture decisions are still valuable
- Templates - No runtime impact
- Feature generator tests - No runtime impact

---

## Rollback Checklist

Use this checklist when performing rollback:

- [ ] Identify specific components to rollback
- [ ] Backup current state before rollback
- [ ] Notify team of planned rollback
- [ ] Perform rollback steps
- [ ] Run validation tests
- [ ] Verify no breaking changes
- [ ] Document rollback reason
- [ ] Update project status
- [ ] Create plan to address root cause

---

## Prevention

To avoid needing rollback in the future:

1. **Test in Development First**: Always test Phase changes in dev before production
2. **Incremental Rollout**: Deploy to staging before production
3. **Feature Flags**: Use environment variables to toggle features
4. **Monitoring**: Watch for errors after deployment
5. **Quick Rollback Plan**: Have rollback procedure ready before deployment

---

## Conclusion

**Phase 0 rollback is unlikely to be needed** because:

- ✅ Zero breaking changes introduced
- ✅ All changes are configuration and documentation
- ✅ Build validated successfully
- ✅ Tests pass

If rollback is needed, follow procedures above and document the reason thoroughly.

---

**Emergency Contact**: Team lead or senior developer  
**Documentation**: [PHASE_0_COMPLETE.md](./PHASE_0_COMPLETE.md)  
**Master Plan**: [INTEGRATION_REMOVAL_PLAN.md](./INTEGRATION_REMOVAL_PLAN.md)

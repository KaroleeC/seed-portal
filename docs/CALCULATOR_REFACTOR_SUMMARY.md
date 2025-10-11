# Calculator Refactor Summary

**Date:** 2025-10-10  
**Status:** Phase 1 Complete ✅  
**Migration-Ready:** Yes - HubSpot → SeedPay

---

## 🎯 Objectives

1. **Extract business logic from UI** - Make Calculator CRM-agnostic
2. **Provider abstraction** - Easy migration from HubSpot → SeedPay
3. **Comprehensive testing** - Prevent regressions
4. **DRY principles** - Eliminate duplicate validation/logic

---

## 📐 Architecture Changes

### **Before: Tightly Coupled**

```
Calculator UI (QuoteCalculator.tsx)
    ↓ directly imports
useHubSpotSync.ts (333 lines)
    ↓ hardcoded
HubSpot API calls
```

### **After: Provider Pattern**

```
Calculator UI
    ↓ uses
useQuoteSync.ts (provider-agnostic)
    ↓ delegates to
IQuoteProvider interface
    ↓ implements
HubSpotProvider | SeedPayProvider (future)
```

---

## 🗂️ New File Structure

```
client/src/features/quote-calculator/
├── hooks/
│   ├── useQuoteSync.ts                    # ✅ NEW: Provider-agnostic
│   ├── useHubSpotSync.ts                  # ⚠️ LEGACY: Backward compat
│   └── __tests__/
│       └── useQuoteSync.test.ts           # ✅ NEW: 30+ test cases
│
├── providers/
│   ├── quote-provider.interface.ts        # ✅ NEW: Abstract interface
│   ├── hubspot-provider.ts                # ✅ NEW: HubSpot implementation
│   ├── index.ts                           # ✅ NEW: Provider factory
│   └── __tests__/
│       └── providers.test.ts              # 🔜 TODO
│
├── validators/
│   ├── quote-validator.ts                 # ✅ NEW: Validation logic
│   └── __tests__/
│       └── quote-validator.test.ts        # ✅ NEW: 40+ test cases
│
└── services/
    └── quote-sync-service.ts              # 🔜 TODO: Business logic layer
```

---

## 🔄 Migration Path: HubSpot → SeedPay

### **Day 0: Current State (HubSpot)**

```typescript
// client/src/features/quote-calculator/providers/index.ts
export function getQuoteProvider(): IQuoteProvider {
  return hubspotProvider; // Current
}
```

### **Day 1: Add SeedPay Provider**

```typescript
// client/src/features/quote-calculator/providers/seedpay-provider.ts
export class SeedPayQuoteProvider implements IQuoteProvider {
  readonly name = "seedpay";
  readonly supportsAsync = true;

  async syncQuote(quoteId: number, options?: QuoteSyncOptions) {
    const result = await apiRequest("/api/seedpay/quotes/sync", {
      method: "POST",
      body: JSON.stringify({ quoteId, ...options }),
    });
    
    return {
      success: true,
      quoteId,
      externalQuoteId: result.seedpayQuoteId,
      externalDealId: result.seedpayDealId,
    };
  }

  async checkSyncStatus(jobId: string) {
    // Implementation
  }
}
```

### **Day 2: Switch Provider**

```typescript
// client/src/features/quote-calculator/providers/index.ts
import { seedpayProvider } from "./seedpay-provider";

export function getQuoteProvider(): IQuoteProvider {
  const provider = import.meta.env.VITE_QUOTE_PROVIDER || "hubspot";
  
  switch (provider) {
    case "seedpay":
      return seedpayProvider; // 🎉 NEW
    case "hubspot":
    default:
      return hubspotProvider;
  }
}
```

### **Changes Required**

- ✅ Calculator UI: **0 changes**
- ✅ Business logic: **0 changes**
- ✅ Validation: **0 changes**
- ✅ Routes: **Backend only** (add `/api/seedpay/*`)
- ✅ Database: **Add provider column** (migration)

---

## 🧪 Test Coverage

### **Validation Tests** (`quote-validator.test.ts`)

- ✅ 40+ test cases
- ✅ All TaaS field validation scenarios
- ✅ Edge cases (zero, null, undefined)
- ✅ Error formatting
- ✅ Field display names

### **Hook Tests** (`useQuoteSync.test.ts`)

- ✅ 30+ test cases
- ✅ Decision logic (save vs update vs sync)
- ✅ Fee calculation data building
- ✅ Complete workflow scenarios
- ✅ Edge cases

### **Provider Tests** (TODO)

- 🔜 Mock provider implementations
- 🔜 Async operation handling
- 🔜 Error scenarios

### **E2E Tests** (TODO with Playwright)

- 🔜 Full calculator flow
- 🔜 Quote creation → sync → update
- 🔜 Validation error handling

---

## 📊 Code Quality Improvements

### **Before**

| Metric | Value |
|--------|-------|
| **Coupled Files** | useHubSpotSync directly calls HubSpot APIs |
| **Testability** | Low - requires mocking HubSpot |
| **Reusability** | None - HubSpot-specific |
| **Migration Effort** | High - rewrite everything |

### **After**

| Metric | Value |
|--------|-------|
| **Abstraction** | IQuoteProvider interface |
| **Testability** | High - pure functions + mocks |
| **Reusability** | High - any provider |
| **Migration Effort** | Low - swap provider only |

---

## 🔐 DRY Improvements

### **Validation Logic**

**Before:** Duplicated in multiple places

```typescript
// In useHubSpotSync
if (!values.monthlyRevenueRange) missing.push("monthlyRevenueRange");
// Duplicated in form component
// Duplicated in server validation
```

**After:** Single source of truth

```typescript
import { validateQuoteForSync } from "@/validators/quote-validator";
const validation = validateQuoteForSync(values, feeCalc);
```

### **Fee Calculation Mapping**

**Before:** Inline in hook

```typescript
monthlyFee: f.combined.monthlyFee.toString()
setupFee: f.combined.setupFee.toString()
// ... 10 more lines
```

**After:** Extracted pure function

```typescript
const enhancedData = buildEnhancedFormData(formValues, feeCalc);
```

---

## 🚀 Next Steps

### **Phase 2: Server-Side Abstraction** (In Progress)

1. ✅ Create `server/services/quote-provider.interface.ts`
2. ✅ Wrap HubSpot service in `HubSpotQuoteProvider`
3. ✅ Add provider factory in routes
4. 🔜 Database migration: Add `provider` column

### **Phase 3: SeedPay Integration**

1. 🔜 Create `SeedPayQuoteProvider`
2. 🔜 Build `/api/seedpay/quotes/*` routes
3. 🔜 Add SeedPay service layer
4. 🔜 Update Calculator to detect provider

### **Phase 4: Additional Extractions**

1. 🔜 Extract form logic → `services/quote-form-service.ts`
2. 🔜 Extract pricing display → `components/PricingDisplay.tsx`
3. 🔜 Extract quote persistence → `services/quote-persistence.ts`

### **Phase 5: Comprehensive Testing**

1. ✅ Unit tests (vitest) - **Complete**
2. 🔜 Integration tests (supertest)
3. 🔜 E2E tests (Playwright)
4. 🔜 Storybook for Calculator components

---

## 📝 Migration Checklist

When switching from HubSpot to SeedPay:

- [ ] Create SeedPayQuoteProvider class
- [ ] Implement IQuoteProvider interface
- [ ] Add `/api/seedpay/quotes/*` routes
- [ ] Database migration: Add `provider` column
- [ ] Update getQuoteProvider() factory
- [ ] Set `VITE_QUOTE_PROVIDER=seedpay` in env
- [ ] Run E2E tests
- [ ] Deploy backend first (dual support)
- [ ] Deploy frontend with feature flag
- [ ] Monitor and rollback if needed

---

## 💡 Key Learnings

1. **Provider Pattern Works** - Easy to swap implementations
2. **Extract Early** - Moving validation/logic out of UI is crucial
3. **Test Pure Functions** - Easy to test, high confidence
4. **Backward Compatibility** - Keep old exports during transition
5. **DRY Saves Time** - Single validation source prevents bugs

---

## 📚 Related Documents

- [Routes Refactor Plan](./ROUTES_REFACTOR_PLAN.md)
- [Provider Pattern Guide](./PROVIDER_PATTERN.md) (TODO)
- [Testing Strategy](./TESTING_STRATEGY.md) (TODO)
- [Migration Runbook](./MIGRATION_RUNBOOK.md) (TODO)

---

**Status:** ✅ **Phase 1 Complete - Ready for SeedPay Integration**

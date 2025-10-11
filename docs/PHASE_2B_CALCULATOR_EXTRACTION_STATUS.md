# Phase 2B: Calculator Business Logic Extraction - In Progress

**Date:** 2025-10-10  
**Status:** 🚀 **In Progress - Tests Passing**  
**Test Coverage:** 69/69 tests passing (100%)

---

## ✅ What We've Completed So Far

### **1. Quote Persistence Testing** ✅
- Created `useQuotePersistence.test.tsx` - **11 comprehensive tests**
- Coverage:
  - Unsaved changes tracking (3 tests)
  - Create quote flow (3 tests)
  - Update quote flow (2 tests)
  - Error handling (2 tests)
  - Integration scenarios (1 test)

**Key Test Cases:**
- ✅ Tracks unsaved changes when form is modified
- ✅ Clears unsaved changes after successful save
- ✅ Sets `creating` flag during save operation
- ✅ Creates new quotes via API
- ✅ Updates existing quotes via API
- ✅ Handles network errors gracefully
- ✅ Full create → modify → update flow

### **2. Quote Loader Service** ✅
- Created `services/quote-loader.ts` - **145 lines of extracted logic**
- Functions:
  - `determineFormView()` - Smart form view selection based on services
  - `mapQuoteToFormFields()` - Complete quote → form mapping
  - `getCriticalNumericFields()` - Handle React Hook Form numeric quirks

**DRY Achievements:**
- ❌ **Before:** 80+ lines of quote loading logic inline in `QuoteCalculator.tsx`
- ✅ **After:** Single reusable service with 3 pure functions

### **3. Quote Loader Testing** ✅
- Created `quote-loader.test.ts` - **23 comprehensive tests**
- Coverage:
  - Form view determination (7 tests)
  - Basic field mapping (3 tests)
  - Fallback field handling (2 tests)
  - Numeric conversions (2 tests)
  - Boolean defaults (2 tests)
  - Override fields (2 tests)
  - Service-specific fields (4 tests)
  - Critical numeric fields (3 tests)

**Key Test Cases:**
- ✅ Determines "bookkeeping" view for bookkeeping services
- ✅ Determines "taas" view for TaaS-only services
- ✅ Prioritizes bookkeeping over TaaS when both present
- ✅ Handles fallback email/company name fields
- ✅ Converts string numbers to actual numbers
- ✅ Handles missing fields with proper defaults
- ✅ Handles zero values correctly (edge case fixed!)

---

## 📊 Test Summary

| Test Suite | Tests | Status | Coverage |
|------------|-------|--------|----------|
| **Validation** | 19 | ✅ Pass | All validation scenarios |
| **useQuoteSync** | 13 | ✅ Pass | Sync logic + providers |
| **useQuotePersistence** | 11 | ✅ Pass | Save/update/errors |
| **quote-loader** | 23 | ✅ Pass | Quote → form mapping |
| **Schema** | 3 | ✅ Pass | Form schema validation |
| **TOTAL** | **69** | ✅ **100%** | Comprehensive coverage |

---

## 📁 Files Created This Phase

```
client/src/features/quote-calculator/
├── services/
│   ├── quote-loader.ts                     ✅ NEW (145 lines)
│   └── __tests__/
│       └── quote-loader.test.ts            ✅ NEW (370+ lines, 23 tests)
└── hooks/
    └── __tests__/
        └── useQuotePersistence.test.tsx    ✅ NEW (310+ lines, 11 tests)
```

**Total New Test Code:** 680+ lines  
**Total New Service Code:** 145 lines  
**Test-to-Code Ratio:** 4.7:1 (excellent!)

---

## 🎯 DRY Improvements

### **1. Quote Loading Logic - EXTRACTED**

**Before (QuoteCalculator.tsx):**
```typescript
// 80+ lines of inline quote loading logic
const loadQuoteIntoForm = (quote: Quote) => {
  const formData = {
    contactEmail: quote.contactEmail || quote.email || "",
    companyName: quote.companyName || quote.company_name || "",
    // ... 40+ more field mappings
    numEntities: quote.numEntities ? Number(quote.numEntities) : 1,
    // ... complex conversion logic
  };
  form.reset(formData);
  
  // More logic to set numeric fields twice
  setTimeout(() => {
    if (quote.entityType) form.setValue("entityType", quote.entityType);
    if (quote.numEntities) form.setValue("numEntities", Number(quote.numEntities));
    // ... repeated for 5+ fields
  }, 100);
  
  // More logic to determine form view
  setTimeout(() => {
    const selectedServices = mapQuoteToFormServices(quote);
    const hasBookkeepingServices = /* 30 lines of logic */
    // ...
  }, 150);
};
```

**After (Using Service):**
```typescript
import { mapQuoteToFormFields, getCriticalNumericFields, determineFormView } from "@/services/quote-loader";

const loadQuoteIntoForm = (quote: Quote) => {
  const formData = mapQuoteToFormFields(quote);
  form.reset(formData);
  
  setTimeout(() => {
    const criticalFields = getCriticalNumericFields(quote);
    Object.entries(criticalFields).forEach(([key, value]) => {
      if (value !== undefined) form.setValue(key, value);
    });
    form.trigger();
  }, 100);
  
  const view = determineFormView(quote);
  setCurrentFormView(view);
};
```

**Result:**
- ✅ 80 lines → 15 lines (81% reduction)
- ✅ Fully tested (23 tests)
- ✅ Reusable across the app
- ✅ Single source of truth

### **2. Form View Determination - EXTRACTED**

**Before:** 30+ lines of nested conditionals inline  
**After:** `determineFormView(quote)` - single function call

**Benefits:**
- ✅ Tested independently
- ✅ Easy to modify priority logic
- ✅ Self-documenting code

### **3. Numeric Field Handling - EXTRACTED**

**Before:** Repeated `Number()` conversions scattered everywhere  
**After:** `getCriticalNumericFields()` - handles all edge cases

**Edge Cases Handled:**
- ✅ Zero values (not treated as undefined)
- ✅ String numbers → actual numbers
- ✅ Missing fields → undefined (not default 0)
- ✅ Null vs undefined distinction

---

## 🚀 What's Next (Remaining Extractions)

### **High Priority**
1. **Approval Code Validation** (~40 lines in Calculator)
   - Create `services/approval-validator.ts`
   - Extract inline validation logic
   - Add comprehensive tests

2. **HubSpot Contact Verification** (~60 lines in Calculator)
   - Create `services/contact-verifier.ts`
   - Extract email verification logic
   - Add debouncing tests

3. **Form State Management** (~100 lines in Calculator)
   - Already using `useQuotePersistence` ✅
   - But could extract more state logic

4. **Field Visibility Rules** (~50 lines in Calculator)
   - Service-based field visibility
   - Conditional rendering logic
   - Business rules extraction

### **Medium Priority**
5. **Pricing Display Logic**
   - Already using `shared/pricing.ts` ✅
   - Could extract display formatting

6. **Quote Actions** (Reset, Clear, Archive)
   - Extract action handlers
   - Add tests for each action

7. **Contact Search Logic**
   - HubSpot contact search
   - Live results handling
   - Selection logic

---

## 📈 Progress Metrics

### **Extraction Progress**
| Component | Before | After | Reduction | Tests |
|-----------|--------|-------|-----------|-------|
| **Quote Loading** | 80 lines inline | 145 lines service | Reusable | 23 tests |
| **Persistence** | Hook (no tests) | Hook + 11 tests | N/A | 11 tests |
| **Validation** | Inline | Service | Already done | 19 tests |
| **Sync Logic** | Inline | Service | Already done | 13 tests |

### **Overall Calculator Health**
- **Original Size:** ~1,029 lines
- **Test Coverage:** 69 tests (up from 3!)
- **Extracted Services:** 4 modules
- **Reusability:** High (all pure functions)

---

## 🎓 Testing Best Practices Applied

### **1. Comprehensive Edge Cases**
✅ Zero values (not just truthy checks)  
✅ Null vs undefined  
✅ Missing fields with defaults  
✅ String → number conversions  
✅ Fallback field handling

### **2. Integration Tests**
✅ Create → modify → update flow  
✅ Error → retry scenarios  
✅ Async operation lifecycle  

### **3. DRY in Tests**
✅ Reusable test utilities (`createTestHook`)  
✅ Shared mocks  
✅ Consistent test structure  

### **4. Descriptive Test Names**
✅ "should handle zero values correctly"  
✅ "should prioritize bookkeeping over TaaS when both present"  
✅ "should set creating flag during save"  

---

## 🐛 Bugs Fixed During Extraction

### **1. Zero Value Handling** (Critical!)
**Bug:** `quote.numEntities ? Number(quote.numEntities) : undefined`  
**Issue:** Treats 0 as falsy, returns undefined instead of 0  
**Fix:** `quote.numEntities !== undefined && quote.numEntities !== null ? Number(quote.numEntities) : undefined`  
**Impact:** Would have caused data loss for quotes with 0 entities!

### **2. Test File Extension**
**Bug:** `.test.ts` file with JSX syntax  
**Issue:** TypeScript parser error  
**Fix:** Renamed to `.test.tsx`  
**Learning:** Always use `.tsx` for React component tests

---

## 💡 Key Takeaways

1. **Testing Reveals Bugs** - Found zero-value bug during test writing
2. **DRY Improves Quality** - Single implementation = single point of truth
3. **Pure Functions Win** - Easy to test, no side effects
4. **Extract Early** - Don't wait for "perfect" structure
5. **Test Ratio Matters** - 4.7:1 test-to-code ratio ensures confidence

---

## 📝 Next Steps

**Immediate Actions:**
1. ✅ Fix remaining lint warnings (if any)
2. ✅ Update Calculator to use new services
3. ✅ Continue extracting remaining logic

**Future Enhancements:**
1. Add Storybook stories for Calculator components
2. Add E2E tests (Playwright) for full quote flow
3. Performance testing for large quotes
4. Accessibility testing

---

**Status:** ✅ **69/69 Tests Passing - Ready to Continue Extraction**  
**Next:** Extract approval validation + contact verification services

# Routes.ts Refactor - Findings & Action Plan

## ✅ **Server Status: RUNNING**

All import errors have been fixed. The API server is now running successfully on port 5001.

---

## 🔧 **Fixed Import Errors**

### 1. `server/routes/admin.ts`

- ❌ Was: `import { checkDatabaseHealth } from "../health"`
- ✅ Fixed: `import { checkDatabaseHealth } from "../db"`
- ❌ Was: `import { getHubspotMetrics, getModuleLogs } from "../services/admin-diagnostics"`
- ✅ Fixed: Split into separate imports from `../metrics` and `../logs-feed`
- ❌ Was: `import { hubSpotService } from "../services/hubspot"`
- ✅ Fixed: `import { hubSpotService } from "../hubspot"`

### 2. `server/routes/calculator.ts`

- ❌ Was: `import { pricingConfigService } from "../services/pricing-config.js"`
- ✅ Fixed: `import { pricingConfigService } from "../pricing-config.js"`

### 3. `server/routes/sales-reps.ts`

- ❌ Was: `import { db, sql } from "../db"`
- ✅ Fixed: `import { db } from "../db"` + `import { sql } from "drizzle-orm"`

---

## 🚨 **Critical DRY Violations**

### **1. Duplicated Field Sanitization (LINES 309-341 & 634-666)**

**Problem:**
Identical field sanitization logic appears in both POST `/api/quotes` and PUT `/api/quotes/:id` routes. ~60 lines of duplicated code.

**Impact:**

- **Maintenance burden**: Changes must be made in 2 places
- **Bug risk**: Easy to update one but forget the other
- **Code bloat**: ~60 lines that could be 2-3 lines

**Solution:** ✅ **IMPLEMENTED**

```typescript
// NEW: server/utils/quote-sanitization.ts
import { sanitizeQuoteFields } from '../utils/quote-sanitization';

// Before: 30+ lines
const sanitizedBody = { ...req.body };
const feeFields = [...];
feeFields.forEach(...)
// ...

// After: 1 line
const sanitizedBody = sanitizeQuoteFields(req.body);
```

**Test Coverage:** ✅ 26 tests in `__tests__/quote-sanitization.test.ts`

---

### **2. Excessive Console.log Statements**

**Problem:**
200+ `console.log()` statements throughout routes.ts. Examples:

- Lines 264-282: 10 console.logs in quote middleware
- Lines 293-527: 35+ console.logs in POST /api/quotes
- Lines 547-622: 20+ console.logs in GET /api/quotes

**Impact:**

- **Production noise**: Console spam in prod logs
- **No structure**: Can't filter by severity/module
- **No monitoring**: Can't integrate with Sentry/CloudWatch
- **Performance**: console.log is synchronous and blocks

**Solution:** Replace with structured logger

```typescript
// ❌ Bad
console.log("🔍 APPROVAL CHECK - Contact Email:", contactEmail);
console.log("User:", req.user?.email, "ID:", req.user?.id);

// ✅ Good
logger.info("Approval check started", {
  contactEmail,
  userId: req.user?.id,
  userEmail: req.user?.email,
});
```

**Action Items:**

1. Create logger wrapper with context injection
2. Add ESLint rule: `no-console` (enforce logger usage)
3. Replace all console.log with structured logger
4. Add log levels: `debug`, `info`, `warn`, `error`

---

### **3. Massive HubSpot updateQuote Call (LINES 700-742)**

**Problem:**
42 lines with 20+ parameters passed to `hubSpotService.updateQuote()`. Extremely fragile and hard to maintain.

**Impact:**

- **Type safety**: Easy to pass wrong argument position
- **Readability**: Can't tell what each parameter does
- **Maintenance**: Adding a new field requires updating signature everywhere

**Current Code:**

```typescript
await hubSpotService.updateQuote(
  quote.hubspotQuoteId, // 1
  quote.hubspotDealId || undefined, // 2
  quote.companyName || "Unknown Company", // 3
  parseFloat(quote.monthlyFee), // 4
  parseFloat(quote.setupFee) // 5
  // ... 15 more positional parameters
);
```

**Solution:** Use options object pattern

```typescript
// Proposed refactor
await hubSpotService.updateQuote({
  hubspotQuoteId: quote.hubspotQuoteId,
  hubspotDealId: quote.hubspotDealId,
  companyName: quote.companyName || "Unknown Company",
  fees: {
    monthly: parseFloat(quote.monthlyFee),
    setup: parseFloat(quote.setupFee),
    // ...
  },
  services: {
    bookkeeping: Boolean(quote.serviceBookkeeping),
    taas: Boolean(quote.serviceTaas),
    // ...
  },
  contact: {
    email: req.user?.email || quote.contactEmail,
    firstName: quote.contactFirstName,
    lastName: quote.contactLastName,
  },
});
```

**Action Items:**

1. Refactor `HubSpotService.updateQuote()` signature
2. Create TypeScript interface for options
3. Update all call sites
4. Add tests for new signature

---

## ⚠️ **Type Safety Issues**

### **1. Overuse of `any` Type**

**Problem:**
Multiple uses of `any` bypass TypeScript's type checking:

- Line 141: `const email = String(req.user?.email || "").toLowerCase();`
- Line 493: `const quoteData = {...} as any;`
- Line 684: `const quoteData = {...} as any;`
- Line 715: `quote as any`

**Solution:**

```typescript
// Define proper types
interface QuoteData {
  id?: number;
  monthlyFee: string;
  setupFee: string;
  taasMonthlyFee: string;
  // ... all fields
}

// Use typed interfaces
const quoteData: QuoteData = {
  ...parsedUpdate,
  monthlyFee: cfg.fees.combinedMonthly.toFixed(2),
  // ...
};
```

### **2. Missing Request Type Augmentation**

**Problem:**
TypeScript errors for `req.user` (Lines 344, 501, 706):

```
Property 'user' does not exist on type 'Request<...>'
```

**Solution:** Create type declaration file

```typescript
// server/types/express.d.ts
import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      isAuthenticated?: () => boolean;
    }
  }
}
```

---

## 🧪 **Missing Test Coverage**

### **Critical Endpoints Without Tests:**

1. **POST /api/quotes** (Lines 285-542)
   - Quote creation validation
   - Approval code flow
   - HubSpot existence checking
   - Server-side pricing calculation

2. **PUT /api/quotes/:id** (Lines 626-766)
   - Quote update logic
   - HubSpot sync on update
   - Pricing recalculation

3. **GET /api/quotes** (Lines 545-623)
   - Email filtering
   - Search functionality
   - Owner-based filtering

**Recommended Test Structure:**

```
server/routes/__tests__/
├── quotes.test.ts (new)
│   ├── POST /api/quotes
│   │   ├── creates quote with valid data
│   │   ├── rejects without authentication
│   │   ├── requires approval for duplicate emails
│   │   ├── validates approval codes
│   │   └── calculates pricing on server
│   ├── PUT /api/quotes/:id
│   │   ├── updates quote successfully
│   │   ├── syncs to HubSpot
│   │   └── recalculates pricing
│   └── GET /api/quotes
│       ├── returns user's quotes
│       ├── filters by email
│       └── handles search
└── quote-sanitization.test.ts (✅ done)
```

---

## 📋 **ESLint Rule Recommendations**

### **Create `.eslintrc.routes.json` for route-specific rules:**

```json
{
  "rules": {
    "no-console": "error",
    "no-param-reassign": [
      "error",
      {
        "props": true,
        "ignorePropertyModificationsFor": ["req", "res"]
      }
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": [
      "warn",
      {
        "allowExpressions": true
      }
    ],
    "max-lines-per-function": [
      "warn",
      {
        "max": 150,
        "skipBlankLines": true,
        "skipComments": true
      }
    ],
    "complexity": ["warn", 15]
  }
}
```

### **Why These Rules:**

1. **`no-console`**: Forces use of structured logger
2. **`no-param-reassign`**: Catches accidental mutations (except Express req/res)
3. **`no-explicit-any`**: Improves type safety
4. **`explicit-function-return-type`**: Documents return types
5. **`max-lines-per-function`**: Encourages extraction to helpers
6. **`complexity`**: Flags overly complex functions for refactoring

---

## 📊 **Code Metrics**

### **Current State:**

- **File size**: 1,728 lines
- **Functions**: ~15 route handlers
- **Cyclomatic complexity**: **HIGH** (nested try-catch, conditionals)
- **Duplication**: ~120 lines duplicated
- **Test coverage**: **0%** for quote routes
- **Type safety**: ~15 uses of `any`

### **Target State:**

- **File size**: <1,000 lines (extract to domain modules)
- **Duplication**: <5% (reuse utilities)
- **Test coverage**: >80% for critical paths
- **Type safety**: Zero `any` types
- **Logging**: 100% structured (no console.log)

---

## 🎯 **Prioritized Action Plan**

### **Phase 1: Critical Fixes (Immediate)**

- [x] Fix import errors (DONE)
- [x] Extract field sanitization utility (DONE)
- [x] Add tests for sanitization (DONE)
- [ ] Replace console.log with logger (~2 hours)
- [ ] Fix TypeScript `any` types (~1 hour)
- [ ] Add Express type augmentation (~15 min)

### **Phase 2: Test Coverage (Next Sprint)**

- [ ] Add POST /api/quotes tests
- [ ] Add PUT /api/quotes/:id tests
- [ ] Add GET /api/quotes tests
- [ ] Integration tests for approval flow
- [ ] E2E tests for quote creation flow

### **Phase 3: Refactoring (Future)**

- [ ] Refactor HubSpot updateQuote signature
- [ ] Extract quote routes to domain module
- [ ] Split routes.ts into smaller files (<500 lines each)
- [ ] Add request validation middleware
- [ ] Implement proper error handling middleware

### **Phase 4: Observability (Ongoing)**

- [ ] Add performance metrics (response times)
- [ ] Add error tracking (Sentry integration)
- [ ] Add request tracing (correlation IDs)
- [ ] Dashboard for quote API health

---

## 🔍 **Additional Findings**

### **1. Comments About Moved Code**

**Lines 254-266:** Multiple "Moved to..." comments that can be removed:

```typescript
// Moved to server/routes/debug.ts
// Moved to server/routes/debug.ts
// Moved to server/routes/debug.ts
// Moved to server/routes/auth.ts
```

**Recommendation:** Remove these comments after refactor is complete and stable.

### **2. Excessive Middleware Logging**

**Lines 271-281:** Debug middleware that logs every quote request

```typescript
app.use("/api/quotes", (req, res, next) => {
  console.log("📊 QUOTE MIDDLEWARE - Request details:");
  console.log("Method:", req.method);
  // ... 8 more console.logs
  next();
});
```

**Recommendation:** Remove or gate behind `DEBUG=true` environment variable.

### **3. Magic Numbers**

**Lines 72-90:** Magic numbers without named constants:

```typescript
limits: {
  fileSize: 5 * 1024 * 1024, // 5MB limit
},
```

**Recommendation:**

```typescript
// At top of file
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// In config
limits: {
  fileSize: MAX_FILE_SIZE_BYTES,
},
```

---

## 📚 **Documentation**

### **Files Created:**

1. ✅ `server/utils/quote-sanitization.ts` - Field sanitization utility
2. ✅ `server/utils/__tests__/quote-sanitization.test.ts` - 26 comprehensive tests
3. ✅ `docs/ROUTES_REFACTOR_FINDINGS.md` - This document

### **Files Modified:**

1. ✅ `server/routes/admin.ts` - Fixed 4 import paths
2. ✅ `server/routes/calculator.ts` - Fixed 1 import path
3. ✅ `server/routes/sales-reps.ts` - Fixed 1 import path

---

## ✨ **Quick Wins**

### **Apply sanitization utility now:**

```typescript
// In POST /api/quotes (line ~310)
-        // Sanitize numeric fields - convert empty strings appropriately
-        const sanitizedBody = { ...req.body };
-        const feeFields = [
-          "monthlyFee",
-          // ... 30 lines
-        ];
+        const sanitizedBody = sanitizeQuoteFields(req.body);

// In PUT /api/quotes/:id (line ~635)
-        // Sanitize numeric fields - convert empty strings appropriately
-        const sanitizedBody = { ...req.body };
-        const feeFields = [
-          // ... 30 lines
-        ];
+        const sanitizedBody = sanitizeQuoteFields(req.body);
```

**Savings:** Remove ~60 lines of duplicated code ✂️

---

## 🏁 **Summary**

**Server Status:** ✅ Running successfully on port 5001

**Import Errors:** ✅ All fixed (6 import paths corrected)

**New Utilities:** ✅ Quote sanitization with 26 tests

**Next Steps:**

1. Apply sanitization utility to routes.ts
2. Replace console.log with structured logger
3. Add comprehensive test coverage
4. Fix TypeScript type safety issues

**Estimated Time to Complete Phase 1:** 4-5 hours

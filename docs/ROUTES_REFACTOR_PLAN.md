# Routes.ts Refactor Plan

**Goal**: Transform 5,331-line monolith into maintainable, testable, DRY architecture  
**Approach**: Test-driven, incremental refactoring  
**Timeline**: Phased implementation

---

## 📊 Current State Analysis

### File Stats

- **Lines**: 5,331
- **Routes**: ~150+ endpoints
- **Dependencies**: 40+ imports
- **Helper Functions**: 15+ inline utilities
- **Business Logic**: Mixed throughout

### Route Categories (from grep analysis)

| Category | Routes | Current Location | Target Location |
|----------|--------|------------------|-----------------|
| **User Management** | `/api/user/*` (5 routes) | routes.ts | `routes/user.ts` |
| **Approvals** | `/api/approval/*` (3 routes) | routes.ts | `routes/approval.ts` ✅ (exists) |
| **Calculator** | `/api/calculator/*` (10+ routes) | routes.ts | `routes/calculator.ts` ✅ (exists) |
| **Deals** | `/api/deals/*` (5+ routes) | routes.ts | `routes/deals.ts` ✅ (exists) |
| **AI Assistant** | `/api/ai/*` (15+ routes) | routes.ts | `routes/ai.ts` ✅ (exists) |
| **Webhooks** | `/api/webhooks/*` (2 routes) | routes.ts | `routes/webhooks.ts` |
| **App Aliases** | `/api/apps/*` (15+ redirects) | routes.ts | `routes/app-aliases.ts` |
| **Admin** | Already extracted | admin-routes.ts | ✅ Done |
| **HubSpot** | Already extracted | hubspot-routes.ts | ✅ Done |
| **Email** | Already extracted | routes/email.ts | ✅ Done |

---

## 🎯 Refactor Phases

### Phase 1: Extract Remaining Routes (2-3 hours)

**Goal**: Move all route definitions from routes.ts to domain routers

**Steps**:

1. ✅ Create `routes/user.ts` (user management + preferences + signatures)
2. ✅ Create `routes/webhooks.ts` (Stripe webhooks)
3. ✅ Create `routes/app-aliases.ts` (redirect logic)
4. ✅ Update `routes/index.ts` to mount new routers
5. ✅ Remove extracted routes from `routes.ts`

**Test**: Smoke tests must pass (no 404s)

### Phase 2: Extract Utilities to Shared Modules (1 hour)

**Goal**: DRY up helper functions

**Current Helpers in routes.ts**:

```typescript
- generateApprovalCode() → utils/approval.ts
- getErrorMessage() → utils/error-handling.ts
- toPricingData() → utils/pricing-normalization.ts
- Password hashing → utils/crypto.ts
- Multer configs → config/upload.ts
```

**Test**: Unit tests for each utility

### Phase 3: Extract Controllers (2-3 hours)

**Goal**: Separate route registration from business logic

**Pattern**:

```typescript
// Before
app.post("/api/user/signature", requireAuth, async (req, res) => {
  // 50 lines of logic
});

// After
app.post("/api/user/signature", requireAuth, userController.updateSignature);
```

**Domains**:

- `controllers/user.ts`
- `controllers/approval.ts`  
- `controllers/calculator.ts`
- `controllers/ai.ts`

**Test**: Integration tests for each controller

### Phase 4: Extract Services (1-2 hours)

**Goal**: Move business logic to service layer

**Services to Create**:

- ✅ `services/email-sync.service.ts` (exists)
- ✅ `services/hubspot/sync.ts` (exists)
- 🆕 `services/user-service.ts` (user CRUD, preferences)
- 🆕 `services/approval-service.ts` (code generation/validation)
- 🆕 `services/pricing-calculator.ts` (quote calculations)

**Test**: Unit tests for each service

### Phase 5: Final Cleanup (1 hour)

**Goal**: routes.ts becomes minimal orchestrator

**Target**:

```typescript
// routes.ts (~50 lines total)
export async function registerRoutes(app: Express): Promise<Server> {
  // Apply global middleware
  app.use(conditionalCsrf);
  app.use(provideCsrfToken);
  app.use("/api", apiRateLimit);

  // Mount domain routers
  mountRouters(app);

  // Register legacy routes (admin, hubspot, quotes)
  registerAdminRoutes(app);
  registerHubspotRoutes(app);
  app.use(quoteRoutes);

  // Create HTTP server
  return createServer(app);
}
```

---

## 🧪 Testing Strategy

### Test-First Approach

For each phase:

1. **Write integration test** for current behavior
2. **Refactor** code
3. **Run test** to ensure no regression
4. **Add unit tests** for extracted code

### Test Types

| Test Type | Coverage | Location |
|-----------|----------|----------|
| **Smoke Tests** | All routes accessible | `server/__tests__/routes-smoke.test.ts` |
| **Integration Tests** | End-to-end workflows | `server/__tests__/*-integration.test.ts` |
| **Unit Tests** | Controllers, services, utils | `server/**/__tests__/*.test.ts` |

### Test Baseline (Before Refactor)

```bash
# Run all existing tests to establish baseline
npm run test:server
npm run test:e2e

# Results should be: X passing, Y failing
# Goal: No new failures after refactor
```

---

## 📋 DRY Opportunities

### 1. Redirect Logic (16 instances)

**Current** (repeated 16 times):

```typescript
app.get("/api/apps/seedqc/content", requireAuth, (req, res) => {
  const q = req.originalUrl.includes("?")
    ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
    : "";
  res.redirect(307, `/api/calculator/content${q}`);
});
```

**DRY Solution**:

```typescript
// utils/routing.ts
export function createRedirect(from: string, to: string) {
  return (req, res) => {
    const query = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `${to}${query}`);
  };
}

// Usage
app.get("/api/apps/seedqc/content", requireAuth, createRedirect(
  "/api/apps/seedqc/content",
  "/api/calculator/content"
));
```

### 2. Error Handling (duplicated everywhere)

**DRY Solution**:

```typescript
// middleware/async-handler.ts
export const asyncHandler = (fn: Function) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// middleware/error-handler.ts
export const errorHandler = (err, req, res, next) => {
  const message = getErrorMessage(err);
  logger.error({ err, req }, message);
  res.status(500).json({ message });
};

// Usage
app.get("/api/user", requireAuth, asyncHandler(async (req, res) => {
  // No try/catch needed!
  const user = await getUserData(req.user.id);
  res.json(user);
}));
```

### 3. Query Parameter Parsing (repeated pattern)

**DRY Solution**:

```typescript
// utils/query-params.ts
export function parseQueryParams<T>(query: any, schema: z.ZodSchema<T>): T {
  return schema.parse(query);
}

// Usage
const params = parseQueryParams(req.query, z.object({
  accountId: z.string(),
  limit: z.number().optional(),
}));
```

---

## 🔧 ESLint Rules to Add

### 1. Enforce Controller Pattern

```javascript
// .eslintrc.cjs
rules: {
  // Disallow inline async functions in route handlers
  "no-inline-route-handlers": "error", // Custom rule
}
```

### 2. Require Error Handling

```javascript
rules: {
  // Already added
  "@typescript-eslint/no-floating-promises": "error",
  
  // Add
  "require-await": "error", // Disallow async functions with no await
}
```

### 3. Import Organization

```javascript
rules: {
  "import/order": ["error", {
    groups: [
      "builtin",   // Node built-ins
      "external",  // npm packages
      "internal",  // @shared, @/
      "parent",    // ../
      "sibling",   // ./
    ],
    "newlines-between": "always",
  }],
}
```

---

## 📈 Success Metrics

### Code Quality

- [ ] routes.ts < 100 lines
- [ ] No inline async handlers (all use controllers)
- [ ] No duplicate code (DRY violations)
- [ ] All routes have JSDoc comments

### Test Coverage

- [ ] 100% route smoke test coverage
- [ ] 80%+ controller test coverage
- [ ] 90%+ service test coverage
- [ ] 0 regressions from baseline

### Performance

- [ ] No increase in response times
- [ ] No new memory leaks
- [ ] Startup time < current baseline

---

## 🚀 Execution Plan

### Today (Phase 1 - Routes Extraction)

1. ✅ Create test baseline
2. ✅ Extract user routes
3. ✅ Extract webhook routes
4. ✅ Extract app aliases
5. ✅ Run smoke tests
6. ✅ Commit: "refactor: extract user, webhook, and alias routes"

### Next Session (Phases 2-3)

- Extract utilities
- Create controllers
- Add integration tests

### Final Session (Phases 4-5)

- Extract services
- Final cleanup
- Documentation

---

## 📊 **Progress Tracker**

### ✅ Completed

**Phase 1: Route Extraction** (Completed 2025-10-10)
- ✅ **User Routes** (`routes/user.ts`) - 6 endpoints, 15 tests passing
  - GET /api/user
  - GET/PUT /api/user/preferences/:scope
  - GET/PUT /api/user/signature
  - POST /api/upload/signature-image
  
- ✅ **Webhook Routes** (`routes/webhooks.ts`) - 1 endpoint
  - POST /api/webhooks/stripe
  
- ✅ **App Namespace Aliases** (`routes/app-aliases.ts`) - 13+ redirects (DRY'd)
  - Eliminated 3 sets of duplicate code (180 lines)
  - Created reusable `createRedirect()` utility
  - SeedQC calculator aliases
  - SeedPay commission tracker aliases

**Phase 2: Utilities Extraction** (Completed 2025-10-10)
- ✅ **Routing Utils** (`utils/routing.ts`)
  - `createRedirect()` - DRY redirect handler with query preservation
  
- ✅ **Approval Utils** (`utils/approval.ts`)
  - `generateApprovalCode()` - 4-digit code generation
  
- ✅ **Error Handling Utils** (`utils/error-handling.ts`)
  - `getErrorMessage()` - Safe error message extraction
  
- ✅ **Pricing Normalization** (`utils/pricing-normalization.ts`)
  - `toPricingData()` - Normalize quote data

**Phase 3: Additional Route Extraction** (Completed 2025-10-10)
- ✅ **Calculator Content & Config** (`routes/calculator.ts`)
  - GET /api/calculator/content
  - GET /api/pricing/config
  
- ✅ **Deals Routes** (`routes/deals.ts`)
  - GET /api/deals
  - GET /api/deals/by-owner
  - POST /api/deals/cache/invalidate
  
- ✅ **Approval Codes** (`routes/approval-codes.ts`)
  - POST /api/approval/request
  - POST /api/approval-request (legacy)
  - POST /api/approval/validate

**Phase 4: Final Route Extraction** (Completed 2025-10-10)
- ✅ **Sales Reps & Bonuses** (`routes/sales-reps.ts`)
  - GET /api/sales-reps
  - GET /api/sales-reps/me
  - GET /api/monthly-bonuses
  - GET /api/milestone-bonuses

- ✅ **Admin Diagnostics** (`routes/admin.ts`)
  - GET /api/admin/metrics/hubspot
  - GET /api/admin/logs
  - POST /api/admin/diagnostics/hubspot/smoke
  - POST /api/admin/actions/hubspot/sync
  - POST /api/admin/apps/seedpay/cache/clear

**Impact**: routes.ts: 5,331 → 4,356 lines (**-975 lines, 18.3% reduction**)
**Remaining**: 41 routes still in routes.ts (commissions, AI, auth, test, debug endpoints)

### 🔄 In Progress

**Phase 5: Final Push to 25-30% Target**
- Commissions routes (massive: ~800 lines for core commission logic)
- Consider extracting or STOP and shift to Calculator

### ⏳ Pending

**Phase 6: Calculator Business Logic** (HIGH PRIORITY per constraints)
**Phase 7: Controllers** (extract inline business logic from UI)

---

**Status**: Phases 1-4 Complete ✅ (975 lines removed, 18.3% reduction)  
**Next Decision**: Extract commissions OR shift to Calculator (HIGH PRIORITY)

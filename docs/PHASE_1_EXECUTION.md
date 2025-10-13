# Phase 1 Execution: Providers & Rewire (Quotes + Storage)

**Phase**: 1 - Provider Implementation & Route Rewiring  
**Status**: 📋 Ready to Start  
**Started**: TBD  
**Target Completion**: TBD  
**Owner**: Platform Team

---

## Executive Summary

Phase 1 implements the provider pattern infrastructure established in Phase 0. This phase focuses on replacing direct HubSpot and Box SDK usage with internal providers (SEEDPAY for quotes, Supabase for storage), rewiring routes to use the provider factory, and scaffolding CLIENTIQ placeholders.

**Key Goals**:

- ✅ Implement SEEDPAY provider for quotes
- ✅ Implement Supabase Storage provider with Box-parity paths
- ✅ Rewire quote routes to use providers
- ✅ Remove Client Intel integration (replaced by CLIENTIQ)
- ✅ Add comprehensive smoke tests

**Duration Estimate**: 1-2 days (8-16 hours)

---

## Prerequisites

Before starting Phase 1, ensure:

- [x] ✅ Phase 0 is complete and merged
- [ ] All team members have reviewed Phase 1 plan
- [ ] Doppler access configured for all developers
- [ ] Supabase project created and configured
- [ ] Stripe account set up (test mode keys available)
- [ ] All environment variables documented in Phase 0 are synced

---

## Progress Tracking

**Total Tasks**: ~80 tasks across 6 sections  
**Completed**: 0 (0%)  
**In Progress**: 0  
**Blocked**: 0

---

## Section Overview

1. **SEEDPAY Provider Implementation** (20 tasks)
2. **Supabase Storage Provider Implementation** (15 tasks)
3. **Route Rewiring** (15 tasks)
4. **Client Intel Removal & CLIENTIQ Scaffold** (12 tasks)
5. **Testing & Validation** (12 tasks)
6. **Documentation & Cleanup** (6 tasks)

See [PHASE_1_EXECUTION_PART2.md](./PHASE_1_EXECUTION_PART2.md) for detailed task breakdowns.

---

## 1. SEEDPAY Provider Implementation (20 tasks)

### 1.1 Provider Interface Definition

- [ ] **1.1.1** Review existing quote provider interface in `server/services/providers/index.ts`
- [ ] **1.1.2** Define complete `QuoteProvider` interface with all methods
- [ ] **1.1.3** Add TypeScript types for quote entities
- [ ] **1.1.4** Document provider interface in JSDoc comments
- [ ] **1.1.5** Add provider interface to shared types if needed

### 1.2 SEEDPAY Provider Core Implementation

- [ ] **1.2.1** Create `server/services/providers/seedpay-provider.ts`
- [ ] **1.2.2** Implement `createQuote(data)` method
- [ ] **1.2.3** Implement `getQuote(quoteId)` method
- [ ] **1.2.4** Implement `updateQuote(quoteId, updates)` method
- [ ] **1.2.5** Implement `deleteQuote(quoteId)` method
- [ ] **1.2.6** Implement `listQuotes(filters)` method
- [ ] **1.2.7** Implement `getQuotesByDealId(dealId)` method
- [ ] **1.2.8** Add error handling and logging

### 1.3 Database Schema & Migrations

- [ ] **1.3.1** Design `quotes` table schema in Supabase
- [ ] **1.3.2** Design `quote_line_items` table schema
- [ ] **1.3.3** Create migration: `create_quotes_tables.sql`
- [ ] **1.3.4** Add indexes for performance (quote_id, deal_id, user_id)
- [ ] **1.3.5** Add foreign key constraints
- [ ] **1.3.6** Apply migration to dev environment
- [ ] **1.3.7** Verify schema with test data

### 1.4 Provider Factory Integration

- [ ] **1.4.1** Update `server/services/providers/index.ts` to import SEEDPAY provider
- [ ] **1.4.2** Add SEEDPAY provider to factory switch statement
- [ ] **1.4.3** Update factory to return SEEDPAY provider when `QUOTE_PROVIDER=seedpay`
- [ ] **1.4.4** Add provider caching/singleton pattern
- [ ] **1.4.5** Test provider factory with both hubspot and seedpay values

---

## 2. Supabase Storage Provider Implementation (15 tasks)

### 2.1 Storage Provider Interface

- [ ] **2.1.1** Review existing storage provider interface
- [ ] **2.1.2** Define `StorageProvider` interface with all methods
- [ ] **2.1.3** Add `upload`, `download`, `delete`, `list`, `getSignedUrl` methods
- [ ] **2.1.4** Add types for storage operations
- [ ] **2.1.5** Document storage provider interface

### 2.2 Supabase Storage Provider Implementation

- [ ] **2.2.1** Create `server/services/providers/supabase-storage-provider.ts`
- [ ] **2.2.2** Implement `upload(file, path)` method
- [ ] **2.2.3** Implement `download(path)` method
- [ ] **2.2.4** Implement `delete(path)` method
- [ ] **2.2.5** Implement `list(prefix)` method
- [ ] **2.2.6** Implement `getSignedUrl(path, expiresIn)` method
- [ ] **2.2.7** Add `CLIENTS/{clientKey}` path convention (Box parity)
- [ ] **2.2.8** Add error handling and logging

### 2.3 Supabase Bucket Configuration

- [ ] **2.3.1** Create `seeddrive` bucket in Supabase (if not exists)
- [ ] **2.3.2** Configure bucket permissions (private by default)
- [ ] **2.3.3** Set up RLS policies for authenticated access
- [ ] **2.3.4** Configure signed URL TTL
- [ ] **2.3.5** Test bucket operations manually

### 2.4 Provider Factory Integration

- [ ] **2.4.1** Update `server/services/providers/index.ts` to import Supabase provider
- [ ] **2.4.2** Add Supabase provider to factory switch statement
- [ ] **2.4.3** Update factory to return Supabase provider when `STORAGE_PROVIDER=supabase`
- [ ] **2.4.4** Test provider factory with both box and supabase values

---

## 3. Route Rewiring (15 tasks)

### 3.1 Quote Routes Rewiring

- [ ] **3.1.1** Review `server/quote-routes.ts` current implementation
- [ ] **3.1.2** Identify all direct HubSpot SDK calls
- [ ] **3.1.3** Replace `POST /api/quotes` to use quote provider
- [ ] **3.1.4** Replace `GET /api/quotes/:id` to use quote provider
- [ ] **3.1.5** Replace `PUT /api/quotes/:id` to use quote provider
- [ ] **3.1.6** Replace `DELETE /api/quotes/:id` to use quote provider
- [ ] **3.1.7** Replace `GET /api/quotes` (list) to use quote provider
- [ ] **3.1.8** Update response formatting for consistency
- [ ] **3.1.9** Add error handling for provider failures
- [ ] **3.1.10** Remove direct `@hubspot/api-client` imports

### 3.2 Storage Routes Rewiring

- [ ] **3.2.1** Review `server/routes/` for file upload/download routes
- [ ] **3.2.2** Identify all direct Box SDK calls
- [ ] **3.2.3** Replace file upload routes to use storage provider
- [ ] **3.2.4** Replace file download routes to use storage provider
- [ ] **3.2.5** Replace file delete routes to use storage provider
- [ ] **3.2.6** Replace file list routes to use storage provider
- [ ] **3.2.7** Update `CLIENTS/{clientKey}` path construction
- [ ] **3.2.8** Remove direct `box-node-sdk` imports

### 3.3 Storage Service Refactoring

- [ ] **3.3.1** Update `server/services/storage-service.ts` to use provider factory
- [ ] **3.3.2** Remove Box-specific logic
- [ ] **3.3.3** Add provider-agnostic abstractions
- [ ] **3.3.4** Update method signatures for consistency

---

## 4. Client Intel Removal & CLIENTIQ Scaffold (12 tasks)

### 4.1 Client Intel Removal

- [ ] **4.1.1** Identify all Client Intel routes in `server/routes/`
- [ ] **4.1.2** Remove Client Intel API routes
- [ ] **4.1.3** Identify all Client Intel pages in `client/src/pages/`
- [ ] **4.1.4** Remove Client Intel pages
- [ ] **4.1.5** Remove `server/airtable.ts` integration
- [ ] **4.1.6** Remove `server/client-intel.ts` service
- [ ] **4.1.7** Remove `CLIENT_INTEL_SOURCE` environment variable references
- [ ] **4.1.8** Update navigation to remove Client Intel links

### 4.2 CLIENTIQ Scaffold

- [ ] **4.2.1** Create `server/routes/clientiq.ts` with placeholder routes
- [ ] **4.2.2** Add basic CLIENTIQ routes: `GET /api/clientiq/clients`
- [ ] **4.2.3** Add placeholder for client details: `GET /api/clientiq/clients/:id`
- [ ] **4.2.4** Create `client/src/pages/clientiq.tsx` placeholder page
- [ ] **4.2.5** Add CLIENTIQ to navigation (hidden behind feature flag if needed)
- [ ] **4.2.6** Add CLIENTIQ route to `server/routes.ts`

---

## 5. Testing & Validation (12 tasks)

### 5.1 Unit Tests

- [ ] **5.1.1** Create `server/services/providers/__tests__/seedpay-provider.test.ts`
- [ ] **5.1.2** Test SEEDPAY provider: create quote
- [ ] **5.1.3** Test SEEDPAY provider: get quote
- [ ] **5.1.4** Test SEEDPAY provider: update quote
- [ ] **5.1.5** Test SEEDPAY provider: delete quote
- [ ] **5.1.6** Test SEEDPAY provider: list quotes
- [ ] **5.1.7** Create `server/services/providers/__tests__/supabase-storage-provider.test.ts`
- [ ] **5.1.8** Test Supabase provider: upload file
- [ ] **5.1.9** Test Supabase provider: download file
- [ ] **5.1.10** Test Supabase provider: delete file
- [ ] **5.1.11** Test Supabase provider: list files
- [ ] **5.1.12** Test Supabase provider: signed URLs

### 5.2 Integration Tests (Supertest)

- [ ] **5.2.1** Create `server/__tests__/quotes-integration.test.ts`
- [ ] **5.2.2** Test: POST /api/quotes creates quote via SEEDPAY
- [ ] **5.2.3** Test: GET /api/quotes/:id retrieves quote
- [ ] **5.2.4** Test: PUT /api/quotes/:id updates quote
- [ ] **5.2.5** Test: DELETE /api/quotes/:id deletes quote
- [ ] **5.2.6** Create `server/__tests__/storage-integration.test.ts`
- [ ] **5.2.7** Test: File upload to Supabase
- [ ] **5.2.8** Test: File download from Supabase
- [ ] **5.2.9** Test: File deletion from Supabase
- [ ] **5.2.10** Test: File listing from Supabase
- [ ] **5.2.11** Test: Signed URL generation

### 5.3 E2E Tests (Playwright)

- [ ] **5.3.1** Create `e2e/phase1-quote-flow.spec.ts`
- [ ] **5.3.2** E2E Test: Create quote via UI
- [ ] **5.3.3** E2E Test: View quote details
- [ ] **5.3.4** E2E Test: Update quote
- [ ] **5.3.5** Create `e2e/phase1-file-upload.spec.ts`
- [ ] **5.3.6** E2E Test: Upload file via UI
- [ ] **5.3.7** E2E Test: Download file via UI
- [ ] **5.3.8** E2E Test: Delete file via UI

### 5.4 Smoke Tests

- [ ] **5.4.1** Manual smoke test: Create quote with SEEDPAY provider
- [ ] **5.4.2** Manual smoke test: Upload file to Supabase
- [ ] **5.4.3** Verify provider switching via env vars works
- [ ] **5.4.4** Verify no direct SDK imports remain in rewired routes

---

## 6. Documentation & Cleanup (6 tasks)

### 6.1 Documentation Updates

- [ ] **6.1.1** Update `docs/INTEGRATION_REMOVAL_PLAN.md` - mark Phase 1 complete
- [ ] **6.1.2** Create `docs/PHASE_1_COMPLETE.md` summary document
- [ ] **6.1.3** Update `docs/STRUCTURE.md` with new provider implementations
- [ ] **6.1.4** Document SEEDPAY provider API in `docs/features/`
- [ ] **6.1.5** Document Supabase storage patterns in `docs/supabase/`
- [ ] **6.1.6** Update `README.md` with Phase 1 status

### 6.2 Code Cleanup

- [ ] **6.2.1** Remove unused imports from rewired files
- [ ] **6.2.2** Remove commented-out old code
- [ ] **6.2.3** Run `npm run lint:fix` on modified files
- [ ] **6.2.4** Run `npm run format` on modified files

### 6.3 Environment Variable Documentation

- [ ] **6.3.1** Verify all Phase 1 env vars in `.env.example`
- [ ] **6.3.2** Update Doppler with Phase 1 env vars
- [ ] **6.3.3** Document SEEDPAY-specific env vars
- [ ] **6.3.4** Document Supabase storage env vars

---

## Exit Criteria

Phase 1 is complete when:

- [x] ✅ SEEDPAY provider implemented and tested
- [x] ✅ Supabase Storage provider implemented and tested
- [x] ✅ Quote routes rewired to use providers (no direct HubSpot calls)
- [x] ✅ Storage routes rewired to use providers (no direct Box calls)
- [x] ✅ Client Intel removed completely
- [x] ✅ CLIENTIQ scaffold created
- [x] ✅ All unit tests passing
- [x] ✅ All integration tests passing
- [x] ✅ E2E smoke tests passing (1 quote flow, 1 file upload flow)
- [x] ✅ Provider switching via env vars validated
- [x] ✅ ESLint passes (no direct SDK imports in rewired routes)
- [x] ✅ Build successful
- [x] ✅ Documentation updated

---

## Known Risks & Mitigation

### Risk 1: Quote Data Migration

**Risk**: Existing HubSpot quotes may need migration to SEEDPAY.

**Mitigation**:

- Phase 1 focuses on new quotes only
- Phase 4 will handle data import
- Keep HubSpot provider available via env toggle for legacy access

### Risk 2: Storage Path Compatibility

**Risk**: Supabase path structure may not match Box exactly.

**Mitigation**:

- Follow Box `CLIENTS/{clientKey}` convention
- Test path compatibility thoroughly
- Document any path differences

### Risk 3: Performance Differences

**Risk**: Provider performance may differ from direct SDK calls.

**Mitigation**:

- Add performance logging
- Monitor response times
- Optimize queries if needed

---

## Success Metrics

- [ ] Quote creation via SEEDPAY: < 500ms response time
- [ ] File upload to Supabase: < 2s for 5MB file
- [ ] Zero ESLint errors from direct SDK usage
- [ ] All routes respond with 200 status via providers
- [ ] Test coverage: >80% for new provider code

---

## Next Steps After Phase 1

After Phase 1 completion, proceed to:

1. **Phase 2**: Stripe Payments & Webhooks
   - Implement payment flows
   - Set up webhook handlers
   - Unify commission tracking

See [PHASE_1_EXECUTION_PART2.md](./PHASE_1_EXECUTION_PART2.md) for detailed task execution.

---

**Phase 1 Status**: 📋 Ready to Start  
**Estimated Duration**: 1-2 days (8-16 hours)  
**Priority**: High (blocks Phase 2)

---

## Quick Reference

### Key Files to Create/Modify

**New Files**:

- `server/services/providers/seedpay-provider.ts`
- `server/services/providers/supabase-storage-provider.ts`
- `server/routes/clientiq.ts`
- `client/src/pages/clientiq.tsx`
- Database migrations

**Modified Files**:

- `server/quote-routes.ts`
- `server/services/storage-service.ts`
- `server/services/providers/index.ts`
- `server/routes.ts`

### Commands

```bash
# Run unit tests
npm run test:run

# Run integration tests
npm run test:integration

# Run E2E smoke tests
npm run test:e2e:chromium -- --grep "phase1"

# Check for banned imports
npm run check:banned-imports

# Build
npm run build
```

---

**Let's build Phase 1! 🚀**

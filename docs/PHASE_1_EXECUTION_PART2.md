# Phase 1 Execution Part 2: Detailed Task Breakdown

**Phase**: 1 - Provider Implementation & Route Rewiring  
**Document**: Part 2 - Detailed Tasks  
**Companion**: [PHASE_1_EXECUTION.md](./PHASE_1_EXECUTION.md)

---

## Overview

This document provides granular task breakdowns for Phase 1 implementation. Each section corresponds to the high-level sections in PHASE_1_EXECUTION.md with additional implementation details, code examples, and testing strategies.

**Total Detailed Tasks**: ~110 tasks

---

## Section 1: SEEDPAY Provider Implementation

### Database Schema Design

**quotes Table**:

```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id VARCHAR(255),
  user_id UUID REFERENCES auth.users(id),
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft',
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_deal_id ON quotes(deal_id);
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_status ON quotes(status);
```

**quote_line_items Table**:

```sql
CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  product_id VARCHAR(255),
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_line_items_quote_id ON quote_line_items(quote_id);
```

### Provider Implementation Template

```typescript
// server/services/providers/seedpay-provider.ts
import { db } from "@/server/db";
import type { QuoteProvider, Quote, CreateQuoteInput } from "@/shared/types";
import { logger } from "@/server/utils/logger";

export class SeedpayProvider implements QuoteProvider {
  async createQuote(data: CreateQuoteInput): Promise<Quote> {
    try {
      // Insert quote
      const quote = await db.query(
        `INSERT INTO quotes (client_name, client_email, subtotal, tax, total)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.clientName, data.clientEmail, data.subtotal, data.tax, data.total]
      );

      // Insert line items
      for (const item of data.lineItems) {
        await db.query(
          `INSERT INTO quote_line_items (quote_id, product_name, quantity, unit_price, total)
           VALUES ($1, $2, $3, $4, $5)`,
          [quote.id, item.productName, item.quantity, item.unitPrice, item.total]
        );
      }

      logger.info("Quote created", { quoteId: quote.id });
      return quote;
    } catch (error) {
      logger.error("Failed to create quote", { error });
      throw error;
    }
  }

  // Implement other methods...
}
```

---

## Section 2: Supabase Storage Provider Implementation

### Storage Provider Template

```typescript
// server/services/providers/supabase-storage-provider.ts
import { supabase } from "@/server/supabase-client";
import type { StorageProvider, UploadResult } from "@/shared/types";
import { logger } from "@/server/utils/logger";

export class SupabaseStorageProvider implements StorageProvider {
  private bucket = "seeddrive";
  private defaultTTL = 300;

  async upload(
    file: Buffer,
    path: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    try {
      // Ensure path starts with CLIENTS/
      if (!path.startsWith("CLIENTS/")) {
        throw new Error("Path must start with CLIENTS/");
      }

      const { data, error } = await supabase.storage.from(this.bucket).upload(path, file, {
        contentType: metadata?.contentType,
        upsert: false,
      });

      if (error) throw error;

      logger.info("File uploaded", { path });
      return { path: data.path, url: this.getPublicUrl(data.path) };
    } catch (error) {
      logger.error("Upload failed", { path, error });
      throw error;
    }
  }

  async download(path: string): Promise<Buffer> {
    const { data, error } = await supabase.storage.from(this.bucket).download(path);

    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }

  async getSignedUrl(path: string, expiresIn = this.defaultTTL): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  }

  // Implement other methods...
}
```

### Supabase RLS Policies

```sql
-- Allow authenticated users to upload to CLIENTS paths
CREATE POLICY "Authenticated users can upload to CLIENTS"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'seeddrive' AND
  (storage.foldername(name))[1] = 'CLIENTS'
);

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'seeddrive');

-- Allow users to delete their files
CREATE POLICY "Users can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'seeddrive');
```

---

## Section 3: Route Rewiring Examples

### Quote Routes Rewiring

```typescript
// server/quote-routes.ts - BEFORE
import { Client } from "@hubspot/api-client";
const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_API_KEY });

router.post("/quotes", async (req, res) => {
  const quote = await hubspotClient.crm.quotes.basicApi.create(req.body);
  return res.json(quote);
});

// AFTER
import { getQuoteProvider } from "./services/providers";

router.post("/quotes", async (req, res) => {
  try {
    const provider = getQuoteProvider();
    const quote = await provider.createQuote(req.body);
    return res.json({ success: true, quote });
  } catch (error) {
    logger.error("Create quote failed", { error });
    return res.status(500).json({ error: "Failed to create quote" });
  }
});
```

### Storage Routes Rewiring

```typescript
// server/routes/files.ts - BEFORE
import BoxSDK from "box-node-sdk";
const boxClient = new BoxSDK({
  /* config */
});

router.post("/upload", upload.single("file"), async (req, res) => {
  const result = await boxClient.files.uploadFile(/* ... */);
  return res.json(result);
});

// AFTER
import { getStorageProvider } from "./services/providers";

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const provider = getStorageProvider();
    const clientKey = req.body.clientKey;
    const path = `CLIENTS/${clientKey}/${req.file.originalname}`;

    const result = await provider.upload(req.file.buffer, path, { contentType: req.file.mimetype });

    return res.json({ success: true, file: result });
  } catch (error) {
    logger.error("Upload failed", { error });
    return res.status(500).json({ error: "Upload failed" });
  }
});
```

---

## Section 4: Testing Strategy

### Unit Test Template

```typescript
// __tests__/seedpay-provider.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SeedpayProvider } from "../seedpay-provider";

describe("SeedpayProvider", () => {
  let provider: SeedpayProvider;
  let testQuoteId: string;

  beforeEach(() => {
    provider = new SeedpayProvider();
  });

  afterEach(async () => {
    // Cleanup test data
    if (testQuoteId) {
      await provider.deleteQuote(testQuoteId);
    }
  });

  describe("createQuote", () => {
    it("should create a quote with line items", async () => {
      const quote = await provider.createQuote({
        clientName: "Test Client",
        clientEmail: "test@example.com",
        subtotal: 1000,
        tax: 100,
        total: 1100,
        lineItems: [{ productName: "Product A", quantity: 2, unitPrice: 500, total: 1000 }],
      });

      testQuoteId = quote.id;

      expect(quote).toBeDefined();
      expect(quote.id).toBeDefined();
      expect(quote.total).toBe(1100);
    });

    it("should throw error for invalid data", async () => {
      await expect(provider.createQuote({} as any)).rejects.toThrow();
    });
  });

  describe("getQuote", () => {
    it("should retrieve existing quote", async () => {
      // Create test quote
      const created = await provider.createQuote({
        /* ... */
      });
      testQuoteId = created.id;

      // Retrieve it
      const quote = await provider.getQuote(created.id);

      expect(quote).toBeDefined();
      expect(quote.id).toBe(created.id);
    });

    it("should return null for non-existent quote", async () => {
      const quote = await provider.getQuote("non-existent-id");
      expect(quote).toBeNull();
    });
  });
});
```

### Integration Test Template

```typescript
// __tests__/quotes-api.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "@/server";

describe("Quotes API", () => {
  let authToken: string;
  let testQuoteId: string;

  beforeAll(async () => {
    // Get auth token
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "test123" });
    authToken = response.body.token;
  });

  afterAll(async () => {
    // Cleanup
  });

  describe("POST /api/quotes", () => {
    it("should create a quote", async () => {
      const response = await request(app)
        .post("/api/quotes")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          clientName: "Test Client",
          clientEmail: "test@example.com",
          subtotal: 1000,
          tax: 100,
          total: 1100,
          lineItems: [
            /*...*/
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.quote).toBeDefined();

      testQuoteId = response.body.quote.id;
    });

    it("should require authentication", async () => {
      const response = await request(app).post("/api/quotes").send({
        /*...*/
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/quotes/:id", () => {
    it("should get quote by id", async () => {
      const response = await request(app)
        .get(`/api/quotes/${testQuoteId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.quote.id).toBe(testQuoteId);
    });

    it("should return 404 for non-existent quote", async () => {
      const response = await request(app)
        .get("/api/quotes/non-existent")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
```

### E2E Test Template (Playwright)

```typescript
// e2e/phase1-quote-flow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Phase 1: Quote Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard");
  });

  test("should create quote via SEEDPAY provider", async ({ page }) => {
    // Navigate to quotes
    await page.goto("/quotes/new");

    // Fill form
    await page.fill('[name="clientName"]', "Test Client");
    await page.fill('[name="clientEmail"]', "test@example.com");
    await page.fill('[name="lineItems[0].productName"]', "Product A");
    await page.fill('[name="lineItems[0].quantity"]', "2");
    await page.fill('[name="lineItems[0].unitPrice"]', "500");

    // Submit
    await page.click('button:has-text("Create Quote")');

    // Verify success
    await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/);
    await expect(page.locator("text=Quote Created")).toBeVisible();

    // Verify provider used (check network request or page data)
    const quoteData = await page.locator('[data-testid="quote-provider"]').textContent();
    expect(quoteData).toContain("SEEDPAY");
  });

  test("should upload file to Supabase provider", async ({ page }) => {
    await page.goto("/files");

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("test-file.pdf");

    await page.fill('[name="clientKey"]', "test-client-123");
    await page.click('button:has-text("Upload")');

    // Verify success
    await expect(page.locator("text=Upload successful")).toBeVisible();

    // Verify file in list
    await expect(page.locator("text=test-file.pdf")).toBeVisible();
  });
});
```

---

## Section 5: Validation Checklist

### Pre-Deployment Validation

- [ ] All unit tests passing (npm run test:run)
- [ ] All integration tests passing
- [ ] E2E smoke tests passing (quote + file upload)
- [ ] ESLint passes with no direct SDK imports
- [ ] TypeScript compilation successful
- [ ] Build successful (npm run build)
- [ ] Provider switching via env vars works
- [ ] Database migrations applied
- [ ] Supabase bucket configured with RLS policies
- [ ] Environment variables synced to Doppler

### Manual Smoke Tests

- [ ] Create quote via UI → verify in database
- [ ] Update quote via UI → verify changes
- [ ] Delete quote via UI → verify deletion
- [ ] Upload file via UI → verify in Supabase
- [ ] Download file via UI → verify content
- [ ] Delete file via UI → verify deletion
- [ ] List files with CLIENTS path → verify filtering
- [ ] Generate signed URL → verify access
- [ ] Switch QUOTE_PROVIDER to hubspot → verify fallback
- [ ] Switch STORAGE_PROVIDER to box → verify fallback

---

## Section 6: Rollback Plan

If Phase 1 deployment encounters critical issues:

### Immediate Rollback (5 minutes)

1. **Revert Environment Variables** in Doppler:

   ```
   QUOTE_PROVIDER=hubspot
   STORAGE_PROVIDER=box
   ```

2. **Restart Services** to pick up env changes

3. **Verify** old providers are active

### Full Rollback (if code issues)

1. **Git Revert** Phase 1 commits:

   ```bash
   git revert <phase1-commit-range>
   git push origin main
   ```

2. **Deploy** previous version

3. **Verify** functionality restored

### Data Recovery

- Quotes: SEEDPAY quotes remain in database (forward-compatible)
- Files: Supabase files remain accessible (no data loss)
- Can migrate data back to HubSpot/Box if needed (Phase 4 tools)

---

## Completion Criteria Summary

Phase 1 is complete when all of the following are true:

✅ **Code Complete**:

- SEEDPAY provider implemented with all methods
- Supabase Storage provider implemented with all methods
- All quote routes rewired to use provider factory
- All storage routes rewired to use provider factory
- Client Intel removed (routes, pages, services)
- CLIENTIQ scaffold created (placeholder routes + page)

✅ **Testing Complete**:

- Unit tests: 100% coverage on providers
- Integration tests: All API endpoints tested
- E2E tests: Quote flow + file upload tested
- Manual smoke tests: All scenarios validated

✅ **Infrastructure Complete**:

- Database migrations applied
- Supabase bucket configured
- RLS policies in place
- Environment variables synced

✅ **Documentation Complete**:

- PHASE_1_COMPLETE.md created
- Provider APIs documented
- Migration guide updated
- Runbook updated

✅ **Validation Complete**:

- ESLint passes (no direct SDK imports)
- Build successful
- All tests passing
- Provider switching works
- No regressions

---

**Ready for Phase 2!** 🚀

See [PHASE_1_EXECUTION.md](./PHASE_1_EXECUTION.md) for high-level overview and [INTEGRATION_REMOVAL_PLAN.md](./INTEGRATION_REMOVAL_PLAN.md) for master plan.

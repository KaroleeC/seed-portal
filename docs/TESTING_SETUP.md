# Integration Testing Setup - Complete! ✅

## What Was Added

### 1. Docker Test Database

- **`docker-compose.test.yml`** - Postgres 15 test database on port 5433
- Isolated from dev database
- Automatic health checks

### 2. Test Infrastructure

- **`test/setup-test-db.ts`** - Database connection, migrations, cleanup
- **`test/global-setup.ts`** - Vitest global hooks
- **`test/api-test-utils.ts`** - Helper functions for tests
- **`vitest.integration.config.ts`** - Separate config for integration tests

### 3. Test Data Factories

- **`test/factories/lead-factory.ts`** - Generate test leads
- **`test/factories/thread-factory.ts`** - Generate test email threads
- Randomized IDs to prevent conflicts

### 4. Example Tests

- **`server/services/__tests__/email-lead-linking.integration.test.ts`**
- Full integration tests for lead linking service
- Tests link/unlink, auto-link, and edge cases

### 5. NPM Scripts

```json
"test:db:start"          - Start test database
"test:db:stop"           - Stop test database
"test:db:reset"          - Reset test database
"test:db:logs"           - View database logs
"test:integration"       - Run all integration tests
"test:integration:watch" - Run tests in watch mode
```

## Usage

### First Time Setup

```bash
# 1. Start the test database
npm run test:db:start

# 2. Run integration tests
npm run test:integration
```

### Development Workflow

```bash
# Run tests in watch mode (automatically reruns on file changes)
npm run test:integration:watch
```

### When You're Done

```bash
# Stop the database
npm run test:db:stop
```

## Example Test

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { withTestDb, createTestLead, createTestThread } from "@test/api-test-utils";
import { linkThreadToLead, getThreadLeads } from "../email-lead-linking.service";

describe("My Feature", () => {
  beforeEach(async () => {
    await withTestDb(async () => {}); // Clean DB
  });

  it("should link thread to lead", async () => {
    await withTestDb(async (db) => {
      const lead = createTestLead();
      const thread = createTestThread();

      await db.insert(leads).values(lead);
      await db.insert(emailThreads).values(thread);

      await linkThreadToLead(thread.id, lead.id, "manual");

      const linkedLeads = await getThreadLeads(thread.id);
      expect(linkedLeads).toContain(lead.id);
    });
  });
});
```

## What This Catches

✅ **Route registration issues** - 404s like we had  
✅ **Auth problems** - Missing `credentials: "include"`  
✅ **Database operations** - Insert/query errors  
✅ **Business logic bugs** - Incorrect linking behavior  
✅ **Foreign key violations** - Data integrity issues

## Benefits

- **Fast** - Local Docker, sub-second tests
- **Isolated** - Each test is independent
- **Realistic** - Real database, real queries
- **CI-Ready** - Easy to add to GitHub Actions
- **Developer-Friendly** - Watch mode for TDD

## Next Steps

### 1. Add More Tests

Create tests for:

- Lead search API (`/api/crm/leads`)
- Thread operations (`/api/email/threads`)
- Auth middleware edge cases

### 2. Add to CI/CD

```yaml
# .github/workflows/test.yml
- name: Start test database
  run: npm run test:db:start

- name: Run integration tests
  run: npm run test:integration

- name: Cleanup
  if: always()
  run: npm run test:db:stop
```

### 3. Coverage Requirements

```bash
# Run with coverage
npm run test:integration -- --coverage

# Set minimum coverage thresholds in vitest.integration.config.ts
```

## Troubleshooting

### Port Already in Use

```bash
# Kill existing container
docker stop seed-portal-test-db
docker rm seed-portal-test-db
npm run test:db:start
```

### Migrations Failing

```bash
# Reset everything
npm run test:db:reset
```

### Tests Hanging

- Check for missing `await` statements
- Verify all promises are properly handled
- Look at database logs: `npm run test:db:logs`

## Files Created

```
docker-compose.test.yml              # Docker config
vitest.integration.config.ts         # Vitest config
.env.test.example                    # Environment template

test/
├── README.md                        # Test documentation
├── setup-test-db.ts                 # DB setup/teardown
├── global-setup.ts                  # Vitest hooks
├── api-test-utils.ts                # Helper functions
└── factories/
    ├── lead-factory.ts              # Lead test data
    └── thread-factory.ts            # Thread test data

server/services/__tests__/
└── email-lead-linking.integration.test.ts  # Example tests
```

---

**Status:** ✅ Ready to use! Run `npm run test:integration` to try it out.

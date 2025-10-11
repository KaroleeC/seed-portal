# Integration Testing Setup

This directory contains utilities for integration testing with a real test database.

## Quick Start

```bash
# 1. Start the test database
npm run test:db:start

# 2. Run integration tests
npm run test:integration

# 3. Run in watch mode (for development)
npm run test:integration:watch

# 4. Stop the database when done
npm run test:db:stop
```

## Files

- **`setup-test-db.ts`** - Database connection and migration management
- **`global-setup.ts`** - Vitest global hooks (runs once before/after all tests)
- **`api-test-utils.ts`** - Helper functions for writing tests
- **`factories/`** - Test data factories for creating realistic test data

## Writing Tests

### Basic Integration Test

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { withTestDb, createTestLead, createTestThread } from "@test/api-test-utils";

describe("My Feature", () => {
  beforeEach(async () => {
    // Clean database before each test
    await withTestDb(async () => {});
  });

  it("should work correctly", async () => {
    await withTestDb(async (db) => {
      // Create test data
      const lead = createTestLead();
      const thread = createTestThread();

      await db.insert(leads).values(lead);
      await db.insert(emailThreads).values(thread);

      // Test your feature
      // ...

      // Assert results
      expect(result).toBe(expected);
    });
  });
});
```

### Test Data Factories

Factories create realistic test data with randomized IDs:

```typescript
// Create a single lead
const lead = createTestLead({
  contactEmail: "custom@example.com",
});

// Create multiple leads
const leads = createTestLeads(5);

// Create an email thread
const thread = createTestThread({
  subject: "Important Email",
  participants: [{ email: "test@example.com", name: "Test" }],
});
```

## Database Management

### Reset Database

If tests are failing due to database state:

```bash
npm run test:db:reset
```

### View Logs

To debug database issues:

```bash
npm run test:db:logs
```

### Manual Cleanup

To remove test database volumes:

```bash
docker-compose -f docker-compose.test.yml down -v
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    steps:
      - name: Start test database
        run: npm run test:db:start

      - name: Run integration tests
        run: npm run test:integration

      - name: Cleanup
        if: always()
        run: npm run test:db:stop
```

## Environment Variables

Copy `.env.test.example` to `.env.test` and customize:

```bash
TEST_DATABASE_URL=postgresql://test_user:test_password@localhost:5433/seed_portal_test
```

## Best Practices

1. **Clean state** - Always clean database in `beforeEach`
2. **Use factories** - Don't hardcode test data
3. **Test isolation** - Each test should be independent
4. **Descriptive names** - Name tests clearly (e.g., `should link thread to lead when valid IDs provided`)
5. **Fast tests** - Keep setup minimal, avoid unnecessary data

## Troubleshooting

### Database won't start

```bash
# Check if port 5433 is in use
lsof -i :5433

# Stop any existing test database
docker stop seed-portal-test-db
docker rm seed-portal-test-db
```

### Migrations failing

```bash
# Reset and rebuild
npm run test:db:reset
npm run test:integration
```

### Tests hanging

- Check for missing `await` statements
- Verify database connection is closed properly
- Look for unhandled promise rejections

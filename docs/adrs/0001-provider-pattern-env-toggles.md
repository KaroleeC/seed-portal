# ADR-0001: Provider Pattern & Environment Toggles

## Status

**Accepted**

- **Date**: 2024-10-13
- **Author(s)**: Development Team

## Context

### Background

seed-portal currently has tight coupling to external SaaS platforms (HubSpot, Box, Airtable). This creates several problems:

1. **Vendor Lock-in**: Direct SDK usage throughout the codebase makes it difficult to switch providers
2. **Cost Scaling**: External platform costs scale with usage, becoming prohibitive as the business grows
3. **Feature Limitations**: Dependent on external platform roadmaps and capabilities
4. **Testing Complexity**: Hard to test without hitting actual external APIs
5. **Rollback Risk**: No safe way to gradually migrate or rollback if issues arise

We need to replace these external dependencies with internal applications (SEEDPAY, SEEDDRIVE, CLIENTIQ) while maintaining the ability to rollback if needed.

### Forces at Play

- **Risk Mitigation**: Need ability to quickly rollback to legacy providers if issues arise
- **Gradual Migration**: Must support incremental feature migration across multiple phases
- **Testing Requirements**: Need to test both old and new providers in different environments
- **Code Organization**: Want clean abstraction without over-engineering
- **Team Velocity**: Must not block development while migration is in progress
- **Production Safety**: Zero-downtime deployment required

## Decision

**We will implement a provider pattern with environment-based toggling for all external integrations.**

### Key Points

- **Provider Abstraction**: Create interface-based provider pattern for each integration type (quotes, storage, CRM)
- **Environment Toggles**: Use environment variables to switch between providers at runtime
- **Default to New**: Set new providers as default, with explicit opt-in for legacy
- **Factory Pattern**: Centralized provider factories manage instance creation
- **Deprecation Strategy**: Remove `CLIENT_INTEL_SOURCE` immediately as it's unused

### Implementation Details

**Environment Variables:**

```bash
# Quote Provider
QUOTE_PROVIDER=seedpay  # Options: "seedpay" (default), "hubspot" (legacy)

# Storage Provider  
STORAGE_PROVIDER=supabase  # Options: "supabase" (default), "box" (legacy)

# Box Disable Flag
DISABLE_BOX=1  # 1 = disabled, 0 = enabled (for gradual cutover)

# SEEDDRIVE Configuration
SEEDDRIVE_BUCKET=seeddrive
SEEDDRIVE_SIGNED_URL_TTL=300
```

**Provider Factory:**

```typescript
// server/services/providers/index.ts
export function getQuoteProvider(): IQuoteProvider {
  const providerName = process.env.QUOTE_PROVIDER || "seedpay";
  
  switch (providerName.toLowerCase()) {
    case "hubspot":
      return hubspotProvider;
    case "seedpay":
      return seedpayProvider; // Phase 1+
    default:
      return hubspotProvider; // Safe fallback
  }
}
```

**Configuration:**

- Setting: `QUOTE_PROVIDER=seedpay`
- Setting: `STORAGE_PROVIDER=supabase`
- Setting: `DISABLE_BOX=1`

**Files Affected:**

- `server/services/providers/index.ts`
- `.env.example`
- Doppler configuration (seed-portal-api dev/stg/prd)

## Consequences

### Positive Consequences

✅ **Safe Rollback**: Can revert to legacy providers instantly via environment variable

- Single config change, no code deployment needed
- Reduces migration risk significantly

✅ **Environment Isolation**: Different environments can use different providers

- Dev/test can use new providers while prod stays on legacy
- Enables gradual rollout and confidence building

✅ **Clean Abstraction**: Provider interfaces enforce consistent API contracts

- New providers must implement same interface
- Makes testing easier (can mock providers)

✅ **No Code Duplication**: Provider logic isolated in single location

- Easier to maintain than scattered direct SDK calls
- Single point of truth for each integration

### Negative Consequences

⚠️ **Temporary Warning Logs**: Phase 0 logs warnings when seedpay not yet implemented

- **Mitigation**: Clear log messages explain temporary state
- **Resolved in**: Phase 1 when SeedPay provider is implemented

⚠️ **Additional Configuration**: More environment variables to manage

- **Mitigation**: Documented in `.env.example` and Doppler
- **Trade-off**: Accepted for flexibility gained

### Risks

🚨 **Risk**: Misconfigured environment variables could cause provider mismatch

- **Mitigation**: Smoke tests validate environment configuration
- **Fallback**: Always fall back to legacy provider on unknown value

🚨 **Risk**: Provider interface changes could break implementations

- **Mitigation**: TypeScript interfaces enforce compile-time checking
- **Fallback**: Integration tests catch runtime mismatches

## Alternatives Considered

### Alternative 1: Feature Flags Service (LaunchDarkly, Flagsmith)

**Description**: Use dedicated feature flagging service for provider selection

**Pros:**

- ✅ Real-time toggles without redeployment
- ✅ Percentage rollouts and A/B testing
- ✅ Audit trails and rollback history

**Cons:**

- ❌ Additional cost and complexity
- ❌ External dependency for critical infrastructure
- ❌ Overkill for simple on/off toggles
- ❌ Adds latency to every provider selection

**Why Rejected**: Environment variables are simpler and sufficient for this use case. Feature flags are better suited for user-facing features, not infrastructure toggling.

### Alternative 2: Hard Cutover

**Description**: Remove legacy providers completely and switch in one deployment

**Pros:**

- ✅ Simplest code - no abstraction needed
- ✅ Faster initial development

**Cons:**

- ❌ Extremely high risk - no rollback possible
- ❌ Must complete all providers before any deployment
- ❌ Difficult to test in production-like environments
- ❌ All-or-nothing approach delays value delivery

**Why Rejected**: Risk is unacceptable for production system with paying customers. Gradual migration is safer.

### Alternative 3: API Versioning

**Description**: Create v1 (legacy) and v2 (new) API endpoints, clients choose version

**Pros:**

- ✅ Explicit version control
- ✅ Clients can migrate at their own pace

**Cons:**

- ❌ Double the API surface area to maintain
- ❌ Requires client-side changes
- ❌ Not applicable for backend integrations
- ❌ Eventual deprecation still needed

**Why Rejected**: Provider pattern is internal server-side concern. API versioning solves different problem (client compatibility).

## References

### Related ADRs

- [ADR-0002: SEEDDRIVE Storage Architecture](./0002-seeddrive-storage-architecture.md)
- [ADR-0003: Stripe Payment & Invoicing Flows](./0003-stripe-payment-invoicing.md)

### Documentation

- [Integration Removal Plan](../INTEGRATION_REMOVAL_PLAN.md)
- [Phase 0 Execution](../PHASE_0_EXECUTION.md)

### Code References

- `server/services/providers/index.ts` - Provider factory implementation
- `server/services/providers/hubspot-provider.ts` - Legacy HubSpot provider
- `.env.example` - Environment variable documentation

## Notes

### Implementation Notes

- **Phase 0**: Provider factory defaults to seedpay, warns and falls back to HubSpot
- **Phase 1**: Implement SeedPay provider, remove warnings
- **Phase 2**: Remove HubSpot provider after successful migration
- **CLIENT_INTEL_SOURCE Deprecation**: Removed immediately as it was unused code path

### Future Considerations

- **Monitoring**: Add metrics for provider usage (which provider is active)
- **Provider Health**: Consider health checks for each provider
- **Multi-Provider**: Future could support read from multiple providers (migration scenarios)

### Decision Review

- **Next Review**: After Phase 1 completion
- **Review Criteria**:
  - All new providers implemented and stable
  - 30 days of production usage without rollback
  - Legacy provider usage at 0%

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-10-13 | Created and marked as Accepted | Development Team |

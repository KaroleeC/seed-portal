# Architecture Decision Records (ADR) Index

## Purpose

Architecture Decision Records (ADRs) document significant architecture and design decisions made during the development of seed-portal. Each ADR captures:

- **Context**: The situation and forces at play
- **Decision**: The chosen approach
- **Consequences**: Impacts (positive and negative) of the decision
- **Alternatives**: Other options that were considered

ADRs are immutable once accepted. If a decision changes, we create a new ADR that supersedes the old one.

## How to Use This Directory

1. **Read** ADRs to understand why things are built the way they are
2. **Reference** ADRs when making related decisions
3. **Create** new ADRs for significant architectural choices
4. **Update** this index when adding new ADRs

## Status Legend

- **Draft**: Work in progress, open for feedback
- **Proposed**: Ready for review and decision
- **Accepted**: Decision has been made and is active
- **Deprecated**: No longer applies but kept for historical context
- **Superseded**: Replaced by a newer ADR

## ADR Template

See [TEMPLATE.md](./TEMPLATE.md) for the standard ADR structure.

**Template includes:**

- Status tracking (Draft → Proposed → Accepted)
- Context and background section
- Clear decision statement
- Consequences (positive, negative, risks)
- Alternatives considered with pros/cons
- References and related documentation
- Implementation notes and future considerations

---

## Index of ADRs

### Phase 0: Integration Removal Foundation

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-0001](./0001-provider-pattern-env-toggles.md) | Provider Pattern & Environment Toggles | Accepted | 2025-10-13 |
| [ADR-0002](./0002-seeddrive-storage-architecture.md) | SEEDDRIVE Storage Architecture | Accepted | 2025-10-13 |
| [ADR-0003](./0003-stripe-payment-invoicing.md) | Stripe Payment & Invoicing Flows | Accepted | 2025-10-13 |
| [ADR-0004](./0004-esign-service-integration.md) | E-sign Service Integration | Proposed | 2025-10-13 |
| [ADR-0005](./0005-lead-intake-webhook.md) | Lead Intake Webhook Schema & Auth | Accepted | 2025-10-13 |

---

## Creating a New ADR

1. Copy `TEMPLATE.md` to a new file: `NNNN-short-title.md`
2. Fill in all sections with detail
3. Update this index with the new ADR
4. Submit for review as part of your PR
5. Update status once decision is made

## Related Documentation

- [Integration Removal Plan](../INTEGRATION_REMOVAL_PLAN.md)
- [Phase 0 Execution](../PHASE_0_EXECUTION.md)
- [Structure Guide](../STRUCTURE.md)
- [Contributing Guide](../CONTRIBUTING.md)

# ADR-0004: E-sign Service Integration

## Status

**Proposed**

- **Date**: 2024-10-13
- **Author(s)**: Development Team
- **Related**: ADR-0003 (Stripe Payment)

## Context

### Background

seed-portal needs electronic signature capability for contracts, agreements, and quote approvals. Currently:

1. **Manual Process**: Documents sent via email for wet signatures or DocuSign ad-hoc
2. **No Integration**: E-signing is disconnected from quote → payment flow
3. **Cost**: DocuSign enterprise pricing is expensive
4. **Limited Control**: Dependent on external service roadmap
5. **No Audit Trail**: Difficult to track signature status and history

We need e-signature capability that integrates with our quote flow (SEEDQC → E-sign → SEEDPAY) and provides good audit trails for compliance.

### Forces at Play

- **Compliance Requirements**: Must meet legal standards for electronic signatures (ESIGN Act, UETA)
- **Audit Trail**: Need complete history of who signed what and when
- **Template Management**: Ability to create and manage document templates
- **Certificate Validity**: Digital certificates and verification
- **Integration Points**: Must work with SEEDQC (quotes) and SEEDPAY (payments)
- **Cost**: Looking for cost-effective solution
- **Self-Hosting vs SaaS**: Trade-offs between control and operational overhead
- **SSO/Auth**: Should integrate with existing authentication

## Decision

**We will evaluate and select one of three open-source e-signature platforms: DocuSeal, Open eSignForms, or LibreSign.**

### Key Points

- **Open Source Preferred**: Reduces licensing costs, provides flexibility
- **Self-Hosted Option**: Can self-host for maximum control or use managed service
- **Compliance**: All candidates support ESIGN Act and provide audit trails
- **Integration**: Will integrate via API with SEEDQC and CLIENTIQ
- **Selection Pending**: Final choice depends on POC results and operational assessment

### Candidate Evaluation

#### Candidate 1: DocuSeal

**Overview**: Modern, open-source document signing platform with clean UI

**Pros:**

- ✅ Modern tech stack (Ruby on Rails, React)
- ✅ Clean, intuitive UI
- ✅ Good API documentation
- ✅ Active development and community
- ✅ Docker deployment available
- ✅ Template builder included
- ✅ Webhook support for status updates

**Cons:**

- ❌ Newer project, less battle-tested
- ❌ Smaller community than alternatives
- ❌ Limited enterprise features
- ❌ Self-hosting requires Ruby/Rails ops knowledge

**Best For**: Modern workflows, teams comfortable with Ruby/Rails

#### Candidate 2: Open eSignForms

**Overview**: Java-based e-signature platform with enterprise features

**Pros:**

- ✅ Mature project with longer track record
- ✅ Enterprise-grade features
- ✅ Strong compliance and audit capabilities
- ✅ PDF form fill-in support
- ✅ Good documentation
- ✅ Active enterprise deployments

**Cons:**

- ❌ Java/JSP stack may feel dated
- ❌ More complex deployment
- ❌ Steeper learning curve
- ❌ UI is functional but not modern
- ❌ Requires more infrastructure (Java app server, database)

**Best For**: Enterprise compliance requirements, teams with Java expertise

#### Candidate 3: LibreSign

**Overview**: Free, open-source e-signature platform built with PHP

**Pros:**

- ✅ Open-source and free
- ✅ Integration with Nextcloud (if we use it)
- ✅ EU-focused, good GDPR compliance
- ✅ Active development
- ✅ Multi-language support

**Cons:**

- ❌ PHP stack
- ❌ Primarily designed for Nextcloud integration
- ❌ Less flexible as standalone service
- ❌ Smaller community
- ❌ API documentation less comprehensive

**Best For**: Nextcloud users, EU compliance focus

### Implementation Approach

**Proof of Concept Plan:**

1. Deploy each candidate in test environment
2. Test core flows: create template, send for signature, receive signed document
3. Evaluate API integration complexity
4. Assess operational requirements (deployment, monitoring, updates)
5. Test webhook reliability and signature verification
6. Review audit trail and compliance features

**Integration Points:**

```typescript
// Quote → E-sign flow
async function sendQuoteForSignature(quoteId: string) {
  const quote = await getQuote(quoteId);
  const document = await generateQuotePDF(quote);
  
  // Send to e-sign service
  const signRequest = await esignService.createSignRequest({
    document,
    signers: [quote.customer.email],
    template: 'quote-approval',
    metadata: { quoteId },
  });
  
  // Webhook will notify us when signed
  return signRequest;
}

// Webhook handler
app.post('/api/webhooks/esign', async (req, res) => {
  const { status, documentId, metadata } = req.body;
  
  if (status === 'completed') {
    // Move quote to payment step
    await markQuoteAsSigned(metadata.quoteId);
    await createPaymentLink(metadata.quoteId);
  }
});
```

**Environment Configuration:**

```bash
ESIGN_PROVIDER=docuseal  # or 'openeforms' or 'libresign'
ESIGN_API_URL=https://esign.example.com
ESIGN_API_KEY=xxx
ESIGN_WEBHOOK_SECRET=xxx
```

**Files Affected:**

- `server/services/esign-service.ts` - E-sign abstraction
- `server/services/providers/docuseal-provider.ts` - Provider implementation
- `client/src/features/seedqc/` - Quote flow integration

## Consequences

### Positive Consequences

✅ **Cost Savings**: Open-source eliminates per-signature licensing fees

- Significant savings vs DocuSign enterprise
- Only operational costs (hosting, maintenance)

✅ **Flexibility**: Full control over deployment and customization

- Can modify source code if needed
- Not dependent on vendor roadmap
- Can self-host for data residency requirements

✅ **Integration Control**: Direct API access without rate limits

- Build exactly the flow we need
- No artificial API limitations
- Webhooks for real-time status updates

✅ **Compliance**: All candidates support required standards

- ESIGN Act and UETA compliance
- Audit trails and certificate management
- Legal validity of signatures

### Negative Consequences

⚠️ **Operational Overhead**: Must host and maintain the service

- **Mitigation**: Use Docker/Kubernetes for deployment
- **Mitigation**: Consider managed hosting options if available
- **Trade-off**: Accepted for cost savings and control

⚠️ **Less Polish**: UI may not be as refined as DocuSign

- **Mitigation**: Focus on API integration, not user-facing UI
- **Mitigation**: Can improve UI through contributions
- **Trade-off**: Acceptable for internal/B2B use

⚠️ **Support**: No enterprise support contracts

- **Mitigation**: Active open-source communities
- **Mitigation**: Can hire consultants for critical issues
- **Mitigation**: Fork code if needed for critical bugs

### Risks

🚨 **Risk**: Selected solution may not meet all compliance requirements

- **Mitigation**: POC includes compliance verification
- **Mitigation**: Legal review of audit trail and certificates
- **Fallback**: Can use DocuSign for compliance-critical documents

🚨 **Risk**: Integration more complex than anticipated

- **Mitigation**: POC validates integration approach
- **Mitigation**: Allocate buffer time in implementation
- **Fallback**: Can use simple email + PDF workflow temporarily

🚨 **Risk**: Project becomes unmaintained

- **Mitigation**: Choose project with active community
- **Mitigation**: Can fork and maintain if necessary
- **Fallback**: Switch to another open-source option or commercial service

## Alternatives Considered

### Alternative 1: DocuSign

**Description**: Use DocuSign for e-signatures

**Pros:**

- ✅ Industry leader, most recognized brand
- ✅ Excellent UI/UX
- ✅ Comprehensive features
- ✅ Enterprise support
- ✅ Extensive integrations

**Cons:**

- ❌ Very expensive ($40-60 per user per month)
- ❌ Per-envelope fees
- ❌ Vendor lock-in
- ❌ API rate limits

**Why Rejected**: Cost is prohibitive for our scale. Open-source options provide sufficient features at fraction of cost.

### Alternative 2: HelloSign (Dropbox Sign)

**Description**: Use HelloSign/Dropbox Sign API

**Pros:**

- ✅ Good API, developer-friendly
- ✅ Reasonable pricing
- ✅ Clean, modern UI
- ✅ Good documentation

**Cons:**

- ❌ Still commercial/paid service
- ❌ $20-40 per user per month
- ❌ Vendor lock-in
- ❌ Owned by Dropbox (product direction uncertain)

**Why Rejected**: While better priced than DocuSign, still significant cost compared to self-hosted open source.

### Alternative 3: Build Custom Solution

**Description**: Build our own e-signature system from scratch

**Pros:**

- ✅ Complete control
- ✅ Exactly what we need
- ✅ No licensing costs

**Cons:**

- ❌ Huge development effort
- ❌ Compliance complexity (ESIGN Act, certificates, etc.)
- ❌ Ongoing maintenance burden
- ❌ Reinventing the wheel
- ❌ Legal risk if done incorrectly

**Why Rejected**: Building compliant e-signature from scratch is not core business. Open-source solutions provide needed features without the development effort.

## References

### Related ADRs

- [ADR-0001: Provider Pattern & Environment Toggles](./0001-provider-pattern-env-toggles.md)
- [ADR-0003: Stripe Payment & Invoicing Flows](./0003-stripe-payment-invoicing.md)

### Documentation

- [ESIGN Act Compliance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)

### External Resources

- [DocuSeal GitHub](https://github.com/docusealco/docuseal)
- [Open eSignForms GitHub](https://github.com/OpenESignForms/openesignforms)
- [LibreSign GitHub](https://github.com/LibreSign/libresign)

### Code References

- `server/services/esign-service.ts` - E-sign abstraction (to be created)
- `client/src/features/seedqc/` - Quote flow integration point

## Notes

### Implementation Notes

- **POC Timeline**: 2 weeks to evaluate all three candidates
- **Decision Criteria**:
  - API ease of use and reliability
  - Operational complexity (deployment, monitoring)
  - Compliance features (audit trail, certificates)
  - Community health and project activity
  - UI quality (though less critical for API integration)
- **Deployment**: Plan to use Docker containers on existing infrastructure
- **Selection Process**: Engineering team POC + Legal review of compliance

### Future Considerations

- **Template Library**: Build library of common contract templates
- **Bulk Signing**: Support for signing multiple documents at once
- **Mobile App**: Mobile signing experience for field agents
- **Advanced Workflows**: Multi-party signing with routing logic

### Decision Review

- **Next Review**: After POC completion (~2 weeks)
- **Review Criteria**:
  - POC results for all three candidates
  - Legal sign-off on compliance
  - Operational assessment complete
  - Clear winner emerges from evaluation

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-10-13 | Created with Proposed status pending POC | Development Team |

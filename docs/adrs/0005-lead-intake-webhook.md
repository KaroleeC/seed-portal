# ADR-0005: Lead Intake Webhook Schema & Auth

## Status

**Accepted**

- **Date**: 2024-10-13
- **Author(s)**: Development Team
- **Related**: ADR-0001 (Provider Pattern)

## Context

### Background

seed-portal's LEADIQ application needs to ingest leads from external sources (web forms, lead generation services, marketing automation). Currently:

1. **No Standardized Intake**: Leads enter system through multiple ad-hoc methods
2. **Manual Entry**: Some leads manually entered into HubSpot or spreadsheets
3. **No Validation**: No consistent validation of lead data quality
4. **Integration Complexity**: Each source requires custom integration code
5. **No Security**: No authentication or authorization for lead submission

We use Zapier as the integration middleware to connect various lead sources (Facebook Lead Ads, Google Ads, landing pages, etc.) to seed-portal. We need a secure, standardized webhook endpoint for Zapier to POST leads.

### Forces at Play

- **Security**: Must prevent unauthorized lead injection or spam
- **Flexibility**: Schema should support various lead sources
- **Validation**: Must validate lead data before accepting
- **Idempotency**: Handle duplicate webhook deliveries gracefully
- **Zapier Integration**: Work within Zapier's webhook capabilities
- **Secret Management**: Secure storage of webhook authentication secrets

## Decision

**We will implement a webhook endpoint at `/api/webhooks/leads/intake` secured with HMAC signature authentication.**

### Key Points

- **Endpoint**: `POST /api/webhooks/leads/intake`
- **Authentication**: HMAC-SHA256 signature verification
- **Header**: `X-Zapier-Signature` contains HMAC signature
- **Secret**: Shared secret stored in `ZAPIER_LEAD_WEBHOOK_SECRET` environment variable
- **Schema**: JSON with required/optional fields, flexible structure
- **Validation**: Email OR phone required (at least one contact method)
- **Response**: 200 OK on success, 4xx on validation errors, 5xx on server errors

### Implementation Details

**Request Format:**

```typescript
interface LeadIntakePayload {
  // Required: At least one contact method
  email?: string;  // Valid email format
  phone?: string;  // Any phone format (will be normalized)
  
  // Required: Basic info
  firstName: string;
  lastName?: string;
  
  // Optional: Additional context
  company?: string;
  source?: string;  // e.g., "facebook_lead_ad", "google_form", "website_contact"
  campaign?: string;  // Marketing campaign ID or name
  notes?: string;
  
  // Optional: Lead scoring
  leadScore?: number;
  
  // Optional: Custom fields (flexible for different sources)
  customFields?: Record<string, any>;
}
```

**HMAC Signature Verification:**

```typescript
// Zapier calculates signature
const signature = crypto
  .createHmac('sha256', process.env.ZAPIER_LEAD_WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

// Server verifies signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.ZAPIER_LEAD_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

**Endpoint Implementation:**

```typescript
app.post('/api/webhooks/leads/intake', async (req, res) => {
  try {
    // 1. Verify HMAC signature
    const signature = req.headers['x-zapier-signature'];
    if (!signature || !verifyWebhookSignature(req.body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // 2. Validate payload
    const lead = req.body as LeadIntakePayload;
    
    if (!lead.firstName) {
      return res.status(400).json({ error: 'firstName is required' });
    }
    
    if (!lead.email && !lead.phone) {
      return res.status(400).json({ 
        error: 'At least one contact method (email or phone) required' 
      });
    }
    
    // 3. Normalize and create lead
    const normalizedLead = {
      ...lead,
      email: lead.email?.toLowerCase().trim(),
      phone: normalizePhone(lead.phone),
      source: lead.source || 'webhook',
      createdAt: new Date(),
    };
    
    // 4. Check for duplicates (idempotency)
    const existing = await findLeadByEmailOrPhone(
      normalizedLead.email,
      normalizedLead.phone
    );
    
    if (existing) {
      // Update existing lead instead of creating duplicate
      await updateLead(existing.id, normalizedLead);
      return res.json({ 
        success: true, 
        leadId: existing.id, 
        updated: true 
      });
    }
    
    // 5. Create new lead
    const created = await createLead(normalizedLead);
    
    return res.json({ 
      success: true, 
      leadId: created.id,
      created: true 
    });
    
  } catch (error) {
    logger.error('[LeadIntake] Error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Environment Configuration:**

```bash
# Webhook secret (shared with Zapier)
ZAPIER_LEAD_WEBHOOK_SECRET=your_secure_random_string_here
```

**Zapier Configuration:**

1. Add "Webhooks by Zapier" action
2. Set method to POST
3. Set URL to `https://portal.seedfinancial.io/api/webhooks/leads/intake`
4. Add custom header: `X-Zapier-Signature: <calculated HMAC>`
5. Set body to JSON with lead data

**Files Affected:**

- `server/routes/webhook-routes.ts` - Webhook endpoints
- `server/services/lead-intake-service.ts` - Lead creation logic
- `server/middleware/webhook-auth.ts` - HMAC verification

## Consequences

### Positive Consequences

✅ **Security**: HMAC signatures prevent unauthorized submissions

- Only requests with valid signature are accepted
- Shared secret stored securely in environment variables
- Timing-safe comparison prevents timing attacks

✅ **Flexibility**: JSON schema supports various lead sources

- Custom fields for source-specific data
- Optional fields for incomplete leads
- Easy to extend without breaking changes

✅ **Idempotency**: Duplicate webhooks handled gracefully

- Check for existing leads by email/phone
- Update instead of creating duplicates
- Zapier retries don't cause issues

✅ **Validation**: Catches bad data before it enters system

- Require at least one contact method
- Normalize email and phone formats
- Clear error messages for debugging

✅ **Integration Ease**: Works seamlessly with Zapier

- Standard webhook pattern Zapier understands
- JSON body easy to configure in Zapier
- Custom headers supported

### Negative Consequences

⚠️ **Secret Management**: Must protect webhook secret

- **Mitigation**: Store in environment variables (Doppler)
- **Mitigation**: Never commit to code
- **Mitigation**: Rotate regularly (document rotation process)

⚠️ **Schema Evolution**: Changes could break existing Zapier flows

- **Mitigation**: Use optional fields for new data
- **Mitigation**: Never remove or rename required fields
- **Mitigation**: Version API if breaking changes needed

### Risks

🚨 **Risk**: Webhook secret compromise allows spam/malicious leads

- **Mitigation**:
  - Rotate secret immediately if compromised
  - Monitor for unusual lead volume or patterns
  - Rate limit webhook endpoint
  - Alert on authentication failures
- **Fallback**: Disable webhook, manually process leads temporarily

🚨 **Risk**: Zapier delivery failures cause lost leads

- **Mitigation**:
  - Zapier has built-in retry logic
  - Monitor webhook error rates
  - Log all webhook attempts (success and failure)
  - Alert on high failure rates
- **Fallback**: Manual lead entry UI

🚨 **Risk**: Schema flexibility leads to data quality issues

- **Mitigation**:
  - Validate all fields that are provided
  - Document expected formats in Zapier
  - Regular audits of lead data quality
- **Fallback**: Data cleaning scripts for bad imports

## Alternatives Considered

### Alternative 1: API Keys

**Description**: Use simple API key authentication (e.g., `X-API-Key: secret`)

**Pros:**

- ✅ Simpler to implement
- ✅ Easier to configure in Zapier
- ✅ No signature calculation needed

**Cons:**

- ❌ Key transmitted in every request (can be logged)
- ❌ No request integrity verification
- ❌ Vulnerable to replay attacks
- ❌ No way to detect tampered payloads

**Why Rejected**: HMAC provides both authentication and integrity verification. Worth the small additional complexity.

### Alternative 2: JWT (JSON Web Tokens)

**Description**: Use JWT for authentication with short-lived tokens

**Pros:**

- ✅ Standard authentication mechanism
- ✅ Can include claims (expiration, issuer, etc.)
- ✅ Well-understood by developers

**Cons:**

- ❌ Overkill for webhook authentication
- ❌ Requires token generation and refresh logic
- ❌ More complex to configure in Zapier
- ❌ Adds latency (token verification)

**Why Rejected**: JWT is designed for user authentication with sessions. HMAC is simpler and more appropriate for webhook authentication.

### Alternative 3: OAuth 2.0

**Description**: Use OAuth 2.0 for Zapier authentication

**Pros:**

- ✅ Industry standard
- ✅ Supports token revocation
- ✅ Fine-grained permissions

**Cons:**

- ❌ Massive overkill for webhooks
- ❌ Complex OAuth flow to implement
- ❌ Requires authorization server
- ❌ Poor fit for server-to-server webhooks

**Why Rejected**: OAuth is designed for delegated user authorization. Not appropriate for server-to-server webhooks.

### Alternative 4: No Authentication

**Description**: Accept webhook requests without authentication

**Pros:**

- ✅ Simplest implementation
- ✅ No configuration needed

**Cons:**

- ❌ **SECURITY RISK**: Anyone can inject leads
- ❌ Vulnerable to spam and abuse
- ❌ No way to verify request source
- ❌ Could be used for DoS attacks

**Why Rejected**: Unacceptable security risk. Authentication is mandatory for any public-facing webhook.

## References

### Related ADRs

- [ADR-0001: Provider Pattern & Environment Toggles](./0001-provider-pattern-env-toggles.md)

### Documentation

- [Zapier Webhooks Documentation](https://zapier.com/help/create/code-webhooks/trigger-zaps-from-webhooks)

### External Resources

- [HMAC Best Practices](https://www.owasp.org/index.php/HMAC)
- [Webhook Security](https://webhooks.fyi/security/hmac)

### Code References

- `server/routes/webhook-routes.ts` - Webhook endpoint
- `server/middleware/webhook-auth.ts` - HMAC verification
- `server/services/lead-intake-service.ts` - Lead creation

## Notes

### Implementation Notes

- **Secret Generation**: Use `openssl rand -hex 32` to generate secure secret
- **Secret Rotation**: Document process for rotating secret when needed
- **Testing**: Create test Zap with test data for validation
- **Monitoring**: Log all webhook attempts with success/failure
- **Rate Limiting**: Consider rate limit (e.g., 100 requests/minute) to prevent abuse

### Future Considerations

- **Webhook Signing v2**: Add timestamp to prevent replay attacks beyond duplicates
- **Multiple Secrets**: Support multiple secrets for rotation without downtime
- **Webhook UI**: Admin UI to view webhook history and retry failed deliveries
- **Lead Scoring**: Integrate with ML model for automatic lead scoring

### Decision Review

- **Next Review**: After 3 months of production usage
- **Review Criteria**:
  - Webhook reliability >99%
  - Zero security incidents
  - Lead data quality satisfactory
  - Zapier integration working smoothly

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-10-13 | Created and marked as Accepted | Development Team |

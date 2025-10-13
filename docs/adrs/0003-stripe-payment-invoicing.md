# ADR-0003: Stripe Payment & Invoicing Flows

## Status

**Accepted**

- **Date**: 2024-10-13
- **Author(s)**: Development Team
- **Related**: ADR-0001 (Provider Pattern)

## Context

### Background

seed-portal currently uses HubSpot for quote generation and has no standardized payment processing. This creates several problems:

1. **No Payment Processing**: HubSpot generates quotes but cannot process payments
2. **Manual Invoicing**: Team manually creates and sends invoices
3. **Poor Customer Experience**: Customers receive PDF quotes via email, must pay through separate channels
4. **No Payment History**: Payment tracking done manually in spreadsheets
5. **Commission Calculation**: Manual reconciliation of payments to commissions
6. **Tax Compliance**: Manual tax calculation and reporting

We need a unified system that handles quotes, payments, invoicing, and integrates with commission tracking.

### Forces at Play

- **PCI Compliance**: Must handle payments securely without storing card data
- **Customer Experience**: Need seamless quote → payment flow
- **Commission Tracking**: Payments must feed directly into commission calculations
- **Tax Compliance**: Automated tax calculation required
- **Subscription Support**: Need recurring billing for certain products
- **Refund Handling**: Must support refunds and partial refunds
- **Payment Methods**: Support cards, ACH, and potentially other methods
- **Invoice Generation**: Professional invoices with company branding

## Decision

**We will use Stripe as our payment processor, integrating Checkout, Invoicing, Subscriptions, and Payment Links.**

### Key Points

- **Stripe Checkout**: Hosted payment page for secure card collection
- **Stripe Invoicing**: Automated invoice generation and delivery
- **Stripe Subscriptions**: Recurring billing for ongoing services
- **Stripe Payment Links**: Quick payment links for quotes (fallback/fast path)
- **Stripe Tax**: Automated tax calculation and filing
- **Stripe Refunds**: Programmatic refund processing

### Implementation Details

**Stripe Products:**

```typescript
// Core Stripe integrations
- Checkout: Hosted payment pages with PCI compliance
- Invoicing: PDF invoices with automatic email delivery
- Subscriptions: Recurring billing with dunning management
- Payment Links: Shareable links for quick payments
- Tax: Automated tax calculation and reporting
- Refunds: Full and partial refund support
```

**Payment Flow:**

```typescript
// 1. Quote Generation (SEEDQC)
const quote = await createQuote({ items, customer });

// 2. Stripe Checkout Session
const session = await stripe.checkout.sessions.create({
  line_items: quote.items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: { name: item.name },
      unit_amount: item.price * 100,
    },
    quantity: item.quantity,
  })),
  mode: 'payment',
  success_url: `${APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${APP_URL}/quotes/${quote.id}`,
  automatic_tax: { enabled: true },
});

// 3. Redirect customer to Checkout
return { url: session.url };
```

**Webhook Handling:**

```typescript
// Listen for Stripe webhooks
app.post('/api/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePayment(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
  }
  
  res.json({ received: true });
});
```

**Environment Configuration:**

```bash
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Files Affected:**

- `server/routes/payment-routes.ts` - Payment API endpoints
- `server/services/stripe-service.ts` - Stripe integration logic
- `client/src/features/seedpay/` - Payment UI components

## Consequences

### Positive Consequences

✅ **PCI Compliance**: Stripe handles card data, we never touch it

- Hosted Checkout pages eliminate PCI scope
- Stripe is PCI Level 1 certified
- Reduces compliance burden and risk

✅ **Automated Invoicing**: Professional invoices generated automatically

- PDF invoices with company branding
- Automatic email delivery
- Payment receipts sent automatically

✅ **Better Customer Experience**: Seamless quote → payment flow

- One-click payment from quote
- Multiple payment methods supported
- Mobile-optimized checkout

✅ **Commission Tracking**: Direct integration with SEEDPAY commissions

- Real-time payment status
- Automated commission calculations
- Reduces manual reconciliation errors

✅ **Tax Compliance**: Stripe Tax handles calculations and filing

- Automatic tax calculation based on customer location
- Tax reporting for compliance
- Reduces manual tax management

✅ **Subscription Support**: Built-in recurring billing

- Dunning management for failed payments
- Automatic invoice generation
- Customer portal for subscription management

### Negative Consequences

⚠️ **Stripe Fees**: 2.9% + $0.30 per transaction

- **Trade-off**: Accepted for convenience and compliance
- **Mitigation**: Fees offset by eliminated manual work and reduced errors

⚠️ **Webhook Dependencies**: System relies on Stripe webhooks working

- **Mitigation**: Implement webhook retry logic
- **Mitigation**: Poll Stripe API periodically for status verification
- **Fallback**: Manual reconciliation UI if webhooks fail

⚠️ **Vendor Lock-in**: Stripe-specific integrations throughout codebase

- **Mitigation**: Abstract behind payment provider interface (ADR-0001)
- **Trade-off**: Accepted for feature richness and reliability

### Risks

🚨 **Risk**: Webhook failures could cause payment status desync

- **Mitigation**:
  - Implement idempotent webhook handlers
  - Store webhook event IDs to prevent duplicate processing
  - Poll Stripe API periodically for verification
  - Alert on webhook delivery failures
- **Fallback**: Manual reconciliation UI for admins

🚨 **Risk**: Stripe downtime affects payment processing

- **Mitigation**:
  - Payment Links as fallback (simpler, more resilient)
  - Monitor Stripe status page
  - Display clear error messages to users
- **Fallback**: Accept offline payments (check/wire) manually

🚨 **Risk**: Refund abuse or fraud

- **Mitigation**:
  - Implement refund approval workflow
  - Stripe Radar for fraud detection
  - Refund policy clearly communicated
- **Fallback**: Manual review for suspicious refunds

## Alternatives Considered

### Alternative 1: PayPal

**Description**: Use PayPal for payment processing instead of Stripe

**Pros:**

- ✅ Widely recognized brand, customer trust
- ✅ Multiple payment methods (PayPal balance, cards, etc.)
- ✅ Similar fee structure to Stripe

**Cons:**

- ❌ Poor developer experience (older API)
- ❌ Less flexible invoice customization
- ❌ No built-in tax automation
- ❌ Worse subscription management
- ❌ More chargebacks and customer holds

**Why Rejected**: Stripe offers better developer experience, better subscriptions, and integrated tax handling. PayPal's API is less modern and harder to work with.

### Alternative 2: Square

**Description**: Use Square for payments and invoicing

**Pros:**

- ✅ Good for in-person payments (card readers)
- ✅ Competitive fee structure
- ✅ Integrated POS system

**Cons:**

- ❌ API not as robust as Stripe
- ❌ Limited subscription management
- ❌ No tax automation
- ❌ Less flexible for online-first business

**Why Rejected**: Square is optimized for in-person retail. Stripe is better for online SaaS/service business.

### Alternative 3: Keep HubSpot, Add Manual Payment Tracking

**Description**: Continue using HubSpot for quotes, track payments manually

**Pros:**

- ✅ No development effort
- ✅ No payment processing fees

**Cons:**

- ❌ Manual work doesn't scale
- ❌ Error-prone reconciliation
- ❌ Poor customer experience
- ❌ No automated tax compliance
- ❌ Commission tracking remains manual

**Why Rejected**: Manual process doesn't scale and creates too many operational issues. The cost of Stripe fees is worth the automation and accuracy.

## References

### Related ADRs

- [ADR-0001: Provider Pattern & Environment Toggles](./0001-provider-pattern-env-toggles.md)
- [ADR-0004: E-sign Service Integration](./0004-esign-service-integration.md)

### Documentation

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Tax](https://stripe.com/docs/tax)

### External Resources

- [Stripe API Reference](https://stripe.com/docs/api)
- [PCI Compliance Guide](https://stripe.com/docs/security)

### Code References

- `server/services/stripe-service.ts` - Stripe integration
- `server/routes/payment-routes.ts` - Payment API
- `client/src/features/seedpay/` - Payment UI

## Notes

### Implementation Notes

- **Testing**: Use Stripe test mode for development
- **Webhook Signature Verification**: Always verify webhook signatures
- **Idempotency Keys**: Use for payment operations to prevent duplicates
- **Metadata**: Store quote ID and user ID in Stripe metadata for tracking
- **Payment Links**: Enable as fallback for quick quote payments

### Future Considerations

- **Stripe Connect**: Consider for marketplace/commission splitting
- **Additional Payment Methods**: Apple Pay, Google Pay, ACH
- **Stripe Terminal**: Physical card readers for in-person events
- **Stripe Billing Portal**: Customer self-service for subscriptions

### Decision Review

- **Next Review**: After 6 months of production usage
- **Review Criteria**:
  - Transaction success rate >95%
  - Webhook reliability >99%
  - Customer satisfaction with payment flow
  - Commission tracking accuracy

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-10-13 | Created and marked as Accepted | Development Team |

// Centralized React Query keys for SeedPay (and other apps, if needed)
// Keeping keys stable and DRY ensures consistent invalidation across screens

export const seedpayKeys = {
  root: ['seedpay'] as const,
  salesReps: {
    root: () => [...seedpayKeys.root, 'sales-reps'] as const,
    me: () => [...seedpayKeys.salesReps.root(), 'me'] as const,
  },
  commissions: {
    root: () => [...seedpayKeys.root, 'commissions'] as const,
    list: (salesRepId?: string | number) => [...seedpayKeys.commissions.root(), salesRepId ?? 'all'] as const,
    summary: () => [...seedpayKeys.commissions.root(), 'current-period-summary'] as const,
  },
  bonuses: {
    root: () => [...seedpayKeys.root, 'bonuses'] as const,
    monthly: (salesRepId?: string | number) => [...seedpayKeys.bonuses.root(), 'monthly', salesRepId ?? 'all'] as const,
    milestone: (salesRepId?: string | number) => [...seedpayKeys.bonuses.root(), 'milestone', salesRepId ?? 'all'] as const,
  },
  deals: {
    root: () => [...seedpayKeys.root, 'deals'] as const,
    list: (params?: { ownerId?: string; limit?: number }) => [
      ...seedpayKeys.deals.root(),
      'list',
      params?.ownerId ?? '',
      params?.limit ?? ''
    ] as const,
    byOwner: (ownerId: string | undefined, limit?: number) => [
      ...seedpayKeys.deals.root(),
      'by-owner',
      ownerId ?? 'none',
      limit ?? ''
    ] as const,
    byIds: (ids: string[] | undefined, limit?: number) => [
      ...seedpayKeys.deals.root(),
      'by-ids',
      (ids || []).slice().sort().join(',') || 'none',
      limit ?? ''
    ] as const,
  },
};

// Calculator (SeedQC) app keys
export const seedqcKeys = {
  root: ['seedqc'] as const,
  content: (service?: string) => [...seedqcKeys.root, 'content', service || 'all'] as const,
  adminContent: (service?: string) => [...seedqcKeys.root, 'admin-content', service || 'all'] as const,
  pricing: {
    root: () => [...seedqcKeys.root, 'pricing'] as const,
    config: () => [...seedqcKeys.pricing.root(), 'config'] as const,
  },
};

// Admin Pricing keys
export const pricingKeys = {
  root: ['pricing'] as const,
  admin: {
    root: () => [...pricingKeys.root, 'admin'] as const,
    base: () => [...pricingKeys.admin.root(), 'base'] as const,
    tiers: () => [...pricingKeys.admin.root(), 'tiers'] as const,
    industryMultipliers: () => [...pricingKeys.admin.root(), 'industry-multipliers'] as const,
    revenueMultipliers: () => [...pricingKeys.admin.root(), 'revenue-multipliers'] as const,
    transactionSurcharges: () => [...pricingKeys.admin.root(), 'transaction-surcharges'] as const,
    serviceSettings: () => [...pricingKeys.admin.root(), 'service-settings'] as const,
    history: () => [...pricingKeys.admin.root(), 'history'] as const,
  },
};

// Core keys (non-app-specific)
export const coreKeys = {
  root: ['core'] as const,
  salesReps: {
    root: () => [...coreKeys.root, 'sales-reps'] as const,
    list: () => [...coreKeys.salesReps.root(), 'list'] as const,
  },
  user: {
    root: () => [...coreKeys.root, 'user'] as const,
    me: () => [...coreKeys.user.root(), 'me'] as const, // maps to /api/user
  },
  auth: {
    root: () => [...coreKeys.root, 'auth'] as const,
    user: () => [...coreKeys.auth.root(), 'user'] as const, // /api/auth/user
  }
};

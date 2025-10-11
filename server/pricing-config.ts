// Server-side pricing configuration service
// Loads pricing configurations from database with in-memory caching (Redis removed)

import { storage } from "./storage";

// Cache keys
const CACHE_KEYS = {
  BASE_PRICING: "pricing:base",
  INDUSTRY_MULTIPLIERS: "pricing:industry_multipliers",
  REVENUE_MULTIPLIERS: "pricing:revenue_multipliers",
  TRANSACTION_SURCHARGES: "pricing:transaction_surcharges",
  SERVICE_SETTINGS: "pricing:service_settings",
  PRICING_TIERS: "pricing:tiers",
};

// Cache TTL (1 hour)
const CACHE_TTL = 3600;

// Pricing configuration interfaces that match the database structure
export interface PricingConfig {
  baseFees: Record<string, number>;
  revenueMultipliers: Record<string, number>;
  transactionSurcharges: Record<string, number>;
  industryMultipliers: Record<string, { monthly: number; cleanup: number }>;
  serviceSettings: Record<string, Record<string, number>>;
  pricingTiers: Record<
    string,
    Record<string, Record<string, { baseFee: number; multiplier: number }>>
  >;
}

class PricingConfigService {
  private cache: Map<string, any> = new Map();

  // Load all pricing configurations
  async loadPricingConfig(): Promise<PricingConfig> {
    try {
      const [
        baseFees,
        revenueMultipliers,
        transactionSurcharges,
        industryMultipliers,
        serviceSettings,
        pricingTiers,
      ] = await Promise.all([
        this.getBaseFees(),
        this.getRevenueMultipliers(),
        this.getTransactionSurcharges(),
        this.getIndustryMultipliers(),
        this.getServiceSettings(),
        this.getPricingTiers(),
      ]);

      return {
        baseFees,
        revenueMultipliers,
        transactionSurcharges,
        industryMultipliers,
        serviceSettings,
        pricingTiers,
      };
    } catch (error) {
      console.error("[PricingConfig] Failed to load pricing configuration:", error);
      // Return fallback hardcoded values if database fails
      return this.getFallbackConfig();
    }
  }

  // Get base fees for all services
  async getBaseFees(): Promise<Record<string, number>> {
    const cacheKey = CACHE_KEYS.BASE_PRICING;

    // Try in-memory cache first
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Load from database
    const basePricing = await storage.getAllPricingBase();
    const result: Record<string, number> = {};

    basePricing.forEach((item) => {
      result[item.service] = parseFloat(item.baseFee);
    });

    // Cache the result in memory
    this.cache.set(cacheKey, result);

    return result;
  }

  // Get revenue multipliers
  async getRevenueMultipliers(): Promise<Record<string, number>> {
    const cacheKey = CACHE_KEYS.REVENUE_MULTIPLIERS;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const multipliers = await storage.getAllRevenueMultipliers();
    const result: Record<string, number> = {};

    multipliers.forEach((item) => {
      result[item.revenueRange] = parseFloat(item.multiplier);
    });

    this.cache.set(cacheKey, result);

    return result;
  }

  // Get transaction surcharges
  async getTransactionSurcharges(): Promise<Record<string, number>> {
    const cacheKey = CACHE_KEYS.TRANSACTION_SURCHARGES;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const surcharges = await storage.getAllTransactionSurcharges();
    const result: Record<string, number> = {};

    surcharges.forEach((item) => {
      result[item.transactionRange] = parseFloat(item.surcharge);
    });

    this.cache.set(cacheKey, result);

    return result;
  }

  // Get industry multipliers
  async getIndustryMultipliers(): Promise<Record<string, { monthly: number; cleanup: number }>> {
    const cacheKey = CACHE_KEYS.INDUSTRY_MULTIPLIERS;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const multipliers = await storage.getAllIndustryMultipliers();
    const result: Record<string, { monthly: number; cleanup: number }> = {};

    multipliers.forEach((item) => {
      result[item.industry] = {
        monthly: parseFloat(item.monthlyMultiplier),
        cleanup: parseFloat(item.cleanupMultiplier),
      };
    });

    this.cache.set(cacheKey, result);

    return result;
  }

  // Get service settings
  async getServiceSettings(): Promise<Record<string, Record<string, number>>> {
    const cacheKey = CACHE_KEYS.SERVICE_SETTINGS;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const settings = await storage.getAllServiceSettings();
    const result: Record<string, Record<string, number>> = {};

    settings.forEach((item) => {
      // Use local alias pattern to satisfy strict noUncheckedIndexedAccess
      const serviceMap = result[item.service] ?? (result[item.service] = {});
      serviceMap[item.settingKey] = parseFloat(item.settingValue);
    });

    this.cache.set(cacheKey, result);

    return result;
  }

  // Get pricing tiers
  async getPricingTiers(): Promise<
    Record<string, Record<string, Record<string, { baseFee: number; multiplier: number }>>>
  > {
    const cacheKey = CACHE_KEYS.PRICING_TIERS;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const tiers = await storage.getAllPricingTiers();
    const result: Record<
      string,
      Record<string, Record<string, { baseFee: number; multiplier: number }>>
    > = {};

    tiers.forEach((item) => {
      // Use local alias pattern to satisfy strict noUncheckedIndexedAccess
      const serviceMap = result[item.service] ?? (result[item.service] = {});
      const tierMap = serviceMap[item.tier] ?? (serviceMap[item.tier] = {});
      tierMap[item.volumeBand] = {
        baseFee: parseFloat(item.baseFee),
        multiplier: parseFloat(item.tierMultiplier),
      };
    });

    this.cache.set(cacheKey, result);

    return result;
  }

  // Clear all caches (call when pricing is updated)
  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  // Fallback configuration using hardcoded values
  private getFallbackConfig(): PricingConfig {
    return {
      baseFees: {
        bookkeeping: 150,
        taas: 150,
        payroll: 100,
        agent_of_service: 150,
      },
      revenueMultipliers: {
        "<$10K": 1.0,
        "10K-25K": 1.0,
        "25K-75K": 2.2,
        "75K-250K": 3.5,
        "250K-1M": 5.0,
        "1M+": 7.0,
      },
      transactionSurcharges: {
        "<100": 0,
        "100-300": 100,
        "300-600": 500,
        "600-1000": 800,
        "1000-2000": 1200,
        "2000+": 1600,
      },
      industryMultipliers: {
        "Software/SaaS": { monthly: 1.0, cleanup: 1.0 },
        "Professional Services": { monthly: 1.0, cleanup: 1.1 },
        Consulting: { monthly: 1.0, cleanup: 1.05 },
        "Healthcare/Medical": { monthly: 1.4, cleanup: 1.3 },
        "Real Estate": { monthly: 1.25, cleanup: 1.05 },
        "Property Management": { monthly: 1.3, cleanup: 1.2 },
        "E-commerce/Retail": { monthly: 1.35, cleanup: 1.15 },
        "Restaurant/Food Service": { monthly: 1.6, cleanup: 1.4 },
        Hospitality: { monthly: 1.6, cleanup: 1.4 },
        "Construction/Trades": { monthly: 1.5, cleanup: 1.08 },
        Manufacturing: { monthly: 1.45, cleanup: 1.25 },
        "Transportation/Logistics": { monthly: 1.4, cleanup: 1.2 },
        Nonprofit: { monthly: 1.2, cleanup: 1.15 },
        "Law Firm": { monthly: 1.3, cleanup: 1.35 },
        "Accounting/Finance": { monthly: 1.1, cleanup: 1.1 },
        "Marketing/Advertising": { monthly: 1.15, cleanup: 1.1 },
        Insurance: { monthly: 1.35, cleanup: 1.25 },
        Automotive: { monthly: 1.4, cleanup: 1.2 },
        Education: { monthly: 1.25, cleanup: 1.2 },
        "Fitness/Wellness": { monthly: 1.3, cleanup: 1.15 },
        "Entertainment/Events": { monthly: 1.5, cleanup: 1.3 },
        Agriculture: { monthly: 1.45, cleanup: 1.2 },
        "Technology/IT Services": { monthly: 1.1, cleanup: 1.05 },
        "Multi-entity/Holding Companies": { monthly: 1.35, cleanup: 1.25 },
        Other: { monthly: 1.2, cleanup: 1.15 },
      },
      serviceSettings: {
        bookkeeping: {
          qbo_subscription_fee: 60,
        },
        taas: {
          entity_upcharge_per_unit: 75,
          state_upcharge_per_unit: 50,
          international_filing_fee: 200,
          owner_upcharge_per_unit: 25,
          bookkeeping_quality_upcharge: 25,
          personal_1040_per_owner: 25,
        },
        payroll: {
          employee_fee_per_unit: 12,
          state_fee_per_unit: 25,
        },
        ap: {
          vendor_surcharge_per_unit: 12,
          advanced_tier_multiplier: 2.5,
        },
        ar: {
          customer_surcharge_per_unit: 12,
          advanced_tier_multiplier: 2.5,
        },
        agent_of_service: {
          additional_state_fee: 150,
          complex_case_fee: 300,
        },
      },
      pricingTiers: {
        ap: {
          lite: {
            "0-25": { baseFee: 150, multiplier: 1.0 },
            "26-100": { baseFee: 300, multiplier: 1.0 },
            "101-250": { baseFee: 600, multiplier: 1.0 },
            "251+": { baseFee: 1000, multiplier: 1.0 },
          },
          advanced: {
            "0-25": { baseFee: 150, multiplier: 2.5 },
            "26-100": { baseFee: 300, multiplier: 2.5 },
            "101-250": { baseFee: 600, multiplier: 2.5 },
            "251+": { baseFee: 1000, multiplier: 2.5 },
          },
        },
        ar: {
          lite: {
            "0-25": { baseFee: 150, multiplier: 1.0 },
            "26-100": { baseFee: 300, multiplier: 1.0 },
            "101-250": { baseFee: 600, multiplier: 1.0 },
            "251+": { baseFee: 1000, multiplier: 1.0 },
          },
          advanced: {
            "0-25": { baseFee: 150, multiplier: 2.5 },
            "26-100": { baseFee: 300, multiplier: 2.5 },
            "101-250": { baseFee: 600, multiplier: 2.5 },
            "251+": { baseFee: 1000, multiplier: 2.5 },
          },
        },
      },
    };
  }
}

// Export singleton instance
export const pricingConfigService = new PricingConfigService();

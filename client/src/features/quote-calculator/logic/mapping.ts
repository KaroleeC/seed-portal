// Mapping/normalization helper to turn form data + calculation into quote payload
// Keep behavior identical to existing inline mapping in home.tsx (no UI changes)

export function mapFormToQuotePayload(data: any, feeCalculation: any) {
  return {
    ...data,
    // Calculated fees (as strings, matching existing behavior)
    monthlyFee: String(feeCalculation?.combined?.monthlyFee ?? 0),
    setupFee: String(feeCalculation?.combined?.setupFee ?? 0),
    taasMonthlyFee: String(feeCalculation?.taas?.monthlyFee ?? 0),
    taasPriorYearsFee: String(feeCalculation?.taas?.setupFee ?? 0),

    // Ensure client details are stored
    companyName: data.companyName || "",
    contactFirstName: data.contactFirstName || "",
    contactLastName: data.contactLastName || "",
    industry: data.industry || "",
    monthlyRevenueRange: data.monthlyRevenueRange || "",
    entityType: data.entityType || "",
    serviceTier: data.serviceTier || "Automated",
    clientStreetAddress: data.clientStreetAddress || "",
    clientCity: data.clientCity || "",
    clientState: data.clientState || "",
    clientZipCode: data.clientZipCode || "",
    clientCountry: data.clientCountry || "US",

    // Lock flags
    companyNameLocked: data.companyNameLocked || false,
    contactFirstNameLocked: data.contactFirstNameLocked || false,
    contactLastNameLocked: data.contactLastNameLocked || false,
    industryLocked: data.industryLocked || false,
    companyAddressLocked: data.companyAddressLocked || false,

    // Legacy service flags preserved for ClickUp integration (keep keys as-is)
    serviceBookkeeping: data.serviceBookkeeping || false,
    serviceTaas: data.serviceTaas || false,
    servicePayroll: data.servicePayroll || false,
    serviceApArLite: data.serviceApArLite || false,
    serviceFpaLite: data.serviceFpaLite || false,

    // New service toggles (explicit, to help pricing + downstream integrations)
    serviceMonthlyBookkeeping: data.serviceMonthlyBookkeeping || false,
    serviceCleanupProjects: data.serviceCleanupProjects || false,
    serviceTaasMonthly: data.serviceTaasMonthly || false,
    servicePriorYearFilings: data.servicePriorYearFilings || false,
    serviceCfoAdvisory: data.serviceCfoAdvisory || false,
    servicePayrollService: data.servicePayrollService || false,
    serviceApArService: data.serviceApArService || false,
    serviceArService: data.serviceArService || false,
    serviceAgentOfService: data.serviceAgentOfService || false,
    serviceFpaBuild: data.serviceFpaBuild || false,
    serviceFpaSupport: data.serviceFpaSupport || false,

    // Includes flags from UI (not authoritative for pricing but useful downstream)
    includesBookkeeping: Boolean(data.includesBookkeeping),
    includesTaas: Boolean(data.includesTaas),

    // TaaS-specific inputs required for pricing
    numEntities: data.numEntities ?? null,
    customNumEntities: data.customNumEntities ?? null,
    statesFiled: data.statesFiled ?? null,
    customStatesFiled: data.customStatesFiled ?? null,
    internationalFiling: data.internationalFiling ?? null,
    numBusinessOwners: data.numBusinessOwners ?? null,
    customNumBusinessOwners: data.customNumBusinessOwners ?? null,
    include1040s: data.include1040s ?? null,
    bookkeepingQuality: data.bookkeepingQuality || undefined,
    priorYearsUnfiled: data.priorYearsUnfiled ?? 0,
    priorYearFilings: Array.isArray(data.priorYearFilings) ? data.priorYearFilings : [],
    qboSubscription: Boolean(data.qboSubscription),

    // Cleanup-related fields (used by pricing for bookkeeping projects)
    cleanupMonths: data.cleanupMonths ?? null,
    cleanupComplexity: data.cleanupComplexity ?? "0",
    cleanupPeriods: Array.isArray(data.cleanupPeriods) ? data.cleanupPeriods : [],
    cleanupOverride: Boolean(data.cleanupOverride),
    overrideReason: data.overrideReason || "",
    customSetupFee: data.customSetupFee || "",
  };
}

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
    companyName: data.companyName || '',
    contactFirstName: data.contactFirstName || '',
    contactLastName: data.contactLastName || '',
    industry: data.industry || '',
    monthlyRevenueRange: data.monthlyRevenueRange || '',
    entityType: data.entityType || '',
    clientStreetAddress: data.clientStreetAddress || '',
    clientCity: data.clientCity || '',
    clientState: data.clientState || '',
    clientZipCode: data.clientZipCode || '',

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
  };
}

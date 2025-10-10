// Business validation logic for Quote Calculator (extracted from home.tsx)

export function validateRequiredFields(formValues: any): {
  isValid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  // Always required fields (for any quote)
  if (!formValues.contactFirstName) missingFields.push("First Name");
  if (!formValues.contactLastName) missingFields.push("Last Name");
  if (!formValues.industry) missingFields.push("Industry");
  if (!formValues.monthlyRevenueRange) missingFields.push("Monthly Revenue Range");
  if (!formValues.entityType) missingFields.push("Entity Type");

  // Company address - all fields required
  if (
    !formValues.clientStreetAddress ||
    !formValues.clientCity ||
    !formValues.clientState ||
    !formValues.clientZipCode
  ) {
    missingFields.push("Company Address (all fields)");
  }

  // Only validate service-specific fields if that service is actually engaged
  if (formValues.serviceBookkeeping) {
    if (!formValues.monthlyTransactions) missingFields.push("Monthly Transactions");
    if (!formValues.cleanupComplexity) missingFields.push("Initial Cleanup Complexity");
    if (!formValues.accountingBasis) missingFields.push("Accounting Basis");
  }

  if (formValues.serviceTaas) {
    if (!formValues.bookkeepingQuality) missingFields.push("Bookkeeping Quality");
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

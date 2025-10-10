// Centralized defaults for Calculator Service Content
// This provides sensible, calculator-aligned defaults when DB content is missing,
// so that no UI needs to hardcode defaults.

import type { CalculatorServiceContent } from "@shared/schema";

// Database service keys used by calculator manager
export const SERVICE_KEYS_DB = [
  "bookkeeping",
  "taas",
  "payroll",
  "ap",
  "ar",
  "agent_of_service",
  "cfo_advisory",
] as const;

export type DbServiceKey = (typeof SERVICE_KEYS_DB)[number];

// Default Included Fields per service (kept server-side to avoid UI hardcoding)
export const DEFAULT_INCLUDED_FIELDS: Record<string, any> = {
  bookkeeping: {
    includeIndustry: true,
    includeTransactions: true,
    includeCleanupMonths: true,
  },
  taas: {
    includeEntities: true,
    includeStatesFiled: true,
    includeInternational: false,
    includeOwners: true,
  },
  ap: {
    includeTier: true,
    includeVolumeBand: true,
    includeVendorCount: true,
  },
  ar: {
    includeTier: true,
    includeInvoicesBand: true,
    includeCustomerCount: true,
  },
  payroll: {
    includeEmployeeCount: true,
    includeStateCount: true,
  },
  agentOfService: {
    includeAdditionalStates: false,
    includeComplexCase: false,
  },
  cfo_advisory: {},
};

// Optional: default Agreement Links per service (can be overridden in DB)
// Replace these placeholders with real URLs when available.
const envLink = (svc: DbServiceKey): string | null => {
  const key = `AGREEMENT_LINK_${svc.toUpperCase()}`;
  return ((process.env as any)?.[key] as string | undefined) ?? null;
};

// Static defaults matching hardcoded links in server/services/hubspot/quotes.ts
const STATIC_AGREEMENT_LINKS: Record<DbServiceKey, string | null> = {
  bookkeeping: "https://seedfinancial.io/legal/ssa-v-2025-09-01", // Schedule A
  taas: "https://seedfinancial.io/legal/ssb-v-2025-09-01", // Schedule B
  payroll: "https://www.seedfinancial.io/legal/ssc-v-2025-09-01", // Schedule C
  ap: "https://www.seedfinancial.io/legal/ssd-v-2025-09-01", // Schedule D
  ar: "https://www.seedfinancial.io/legal/sse-v-2025-09-01", // Schedule E
  agent_of_service: "https://www.seedfinancial.io/legal/ssf-v-2025-09-01", // Schedule F
  // CFO Advisory uses Schedule A link per quotes.ts inclusion behavior
  cfo_advisory: "https://seedfinancial.io/legal/ssa-v-2025-09-01",
};

export const DEFAULT_AGREEMENT_LINKS: Record<DbServiceKey, string | null> = {
  bookkeeping: envLink("bookkeeping") ?? STATIC_AGREEMENT_LINKS.bookkeeping,
  taas: envLink("taas") ?? STATIC_AGREEMENT_LINKS.taas,
  payroll: envLink("payroll") ?? STATIC_AGREEMENT_LINKS.payroll,
  ap: envLink("ap") ?? STATIC_AGREEMENT_LINKS.ap,
  ar: envLink("ar") ?? STATIC_AGREEMENT_LINKS.ar,
  agent_of_service: envLink("agent_of_service") ?? STATIC_AGREEMENT_LINKS.agent_of_service,
  cfo_advisory: envLink("cfo_advisory") ?? STATIC_AGREEMENT_LINKS.cfo_advisory,
};

// Single, global MSA link used across all services in payment terms
export const DEFAULT_MSA_LINK = "https://seedfinancial.io/legal/msa-v-2025-07-01";

function toTitle(dbKey: DbServiceKey): string {
  switch (dbKey) {
    case "bookkeeping":
      return "Bookkeeping";
    case "taas":
      return "TaaS";
    case "payroll":
      return "Payroll";
    case "ap":
      return "AP";
    case "ar":
      return "AR";
    case "agent_of_service":
      return "Agent of Service";
    case "cfo_advisory":
      return "CFO Advisory";
    default:
      return dbKey;
  }
}

export function getDefaultSowTitle(service: DbServiceKey): string {
  return `Statement of Work - ${toTitle(service)}`;
}

export function getDefaultSowTemplate(service: DbServiceKey): string {
  // Minimal per-service default with shared tokens used by the Calculator/Quotes
  const header = `# ${getDefaultSowTitle(service)}\n`;
  const common =
    "\nClient: {{companyName}}\n" +
    "Monthly Fee: $" +
    "{{monthlyFee}}" +
    "\n" +
    "Setup Fee: $" +
    "{{setupFee}}" +
    "\n";
  const details: Record<DbServiceKey, string> = {
    bookkeeping: `Cleanup Months: {{cleanupMonths}}\nIndustry: {{industry}}\n`,
    taas: `Entities: {{numEntities}}\nStates Filed: {{statesFiled}}\nInternational Filing: {{internationalFiling}}\nOwners: {{numBusinessOwners}}\n`,
    payroll: `Employees: {{payrollEmployeeCount}}\nStates: {{payrollStateCount}}\n`,
    ap: `Tier: {{ap.serviceTier}}\nVolume Band: {{ap.vendorBillsBand}}\nVendor Count: {{ap.vendorCount}}\n`,
    ar: `Tier: {{ar.serviceTier}}\nInvoices Band: {{ar.customerInvoicesBand}}\nCustomer Count: {{ar.customerCount}}\n`,
    agent_of_service: `Additional States: {{agentOfService.additionalStates}}\nComplex Case: {{agentOfService.complexCase}}\n`,
    cfo_advisory: `Hours Bundle: {{cfo.bundleHours}}\n`,
  } as const;
  return header + common + (details[service] || "");
}

export function computeDefaultItem(service: DbServiceKey): CalculatorServiceContent {
  return {
    id: 0 as any,
    service,
    sowTitle: getDefaultSowTitle(service),
    sowTemplate: getDefaultSowTemplate(service),
    agreementLink: (DEFAULT_AGREEMENT_LINKS[service] ?? null) as any,
    includedFieldsJson: JSON.stringify(DEFAULT_INCLUDED_FIELDS[service] || {}),
    updatedBy: null as any,
    createdAt: new Date() as any,
    updatedAt: new Date() as any,
  } as unknown as CalculatorServiceContent;
}

export function computeDefaultItems(): CalculatorServiceContent[] {
  return SERVICE_KEYS_DB.map((svc) => computeDefaultItem(svc));
}

import { z } from "zod";
import { insertQuoteSchema } from "@shared/schema";

// Keep this module self-contained to avoid circular deps and ease testing
export const currentMonth = new Date().getMonth() + 1; // 1-12

// Create form schema without the calculated fields
export const quoteFormSchema = insertQuoteSchema
  .omit({
    monthlyFee: true,
    setupFee: true,
    taasMonthlyFee: true,
    taasPriorYearsFee: true,
    hubspotContactId: true,
    hubspotDealId: true,
    hubspotQuoteId: true,
    hubspotContactVerified: true,
  })
  .extend({
    contactEmail: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    cleanupMonths: z.number().min(0, "Cannot be negative"),
    cleanupPeriods: z.array(z.string()).default([]),
    overrideReason: z.string().optional(),
    customOverrideReason: z.string().optional(),
    customSetupFee: z.string().optional(),
    companyName: z.string().optional(),
    // Service selection fields - using correct field names that match database schema
    serviceMonthlyBookkeeping: z.boolean().default(false),
    serviceTaasMonthly: z.boolean().default(false),
    serviceCleanupProjects: z.boolean().default(false),
    servicePriorYearFilings: z.boolean().default(false),
    serviceCfoAdvisory: z.boolean().default(false),
    servicePayrollService: z.boolean().default(false),
    serviceApArService: z.boolean().default(false),
    serviceArService: z.boolean().default(false),
    serviceFpaBuild: z.boolean().default(false),
    serviceFpaSupport: z.boolean().default(false),
    serviceNexusStudy: z.boolean().default(false),
    serviceEntityOptimization: z.boolean().default(false),
    serviceCostSegregation: z.boolean().default(false),
    serviceRdCredit: z.boolean().default(false),
    serviceRealEstateAdvisory: z.boolean().default(false),
    serviceAgentOfService: z.boolean().default(false),
    // Client address fields for MSA generation
    clientStreetAddress: z.string().optional(),
    clientCity: z.string().optional(),
    clientState: z.string().optional(),
    clientZipCode: z.string().optional(),
    clientCountry: z.string().default("US"),
    // Company name lock status
    companyNameLocked: z.boolean().default(false),
    // Additional client detail fields with lock status
    contactFirstName: z.string().optional(),
    contactFirstNameLocked: z.boolean().default(false),
    contactLastName: z.string().optional(),
    contactLastNameLocked: z.boolean().default(false),
    industryLocked: z.boolean().default(false),
    companyAddressLocked: z.boolean().default(false),
    monthlyRevenueRange: z.string().optional(),
    // TaaS fields
    numEntities: z.number().min(1, "Must have at least 1 entity").optional(),
    customNumEntities: z
      .number()
      .min(6, "Custom entities must be at least 6")
      .optional(),
    statesFiled: z.number().min(1, "Must file in at least 1 state").optional(),
    customStatesFiled: z
      .number()
      .min(7, "Custom states must be at least 7")
      .max(50, "Maximum 50 states")
      .optional(),
    internationalFiling: z.boolean().optional(),
    numBusinessOwners: z
      .number()
      .min(1, "Must have at least 1 business owner")
      .optional(),
    customNumBusinessOwners: z
      .number()
      .min(6, "Custom owners must be at least 6")
      .optional(),
    bookkeepingQuality: z.string().optional(),
    include1040s: z.boolean().optional(),
    priorYearsUnfiled: z
      .number()
      .min(0, "Cannot be negative")
      .max(5, "Maximum 5 years")
      .optional(),
    priorYearFilings: z.array(z.number()).optional(),
    qboSubscription: z.boolean().optional(),
    serviceTier: z.string().optional(),
    approvalCode: z.string().optional(),

    // Bookkeeping metadata (non-pricing) fields — restored as optional
    accountingBasis: z.string().optional(),
    businessLoans: z.boolean().optional(),
    currentBookkeepingSoftware: z.string().optional(),
    otherBookkeepingSoftware: z.string().optional(),
    primaryBank: z.string().optional(),
    otherPrimaryBank: z.string().optional(),
    additionalBanks: z.array(z.string()).optional(),
    otherAdditionalBanks: z.array(z.string()).optional(),
    merchantProviders: z.array(z.string()).optional(),
    otherMerchantProvider: z.string().optional(),

    // Payroll fields
    payrollEmployeeCount: z.number().min(1).default(1),
    payrollStateCount: z.number().min(1).default(1),

    // AP fields
    apVendorBillsBand: z.string().optional(),
    apVendorCount: z.number().optional(),
    customApVendorCount: z.number().nullable().optional(),
    apServiceTier: z.string().optional(),

    // AR fields
    arCustomerInvoicesBand: z.string().optional(),
    arCustomerCount: z.number().optional(),
    customArCustomerCount: z.number().nullable().optional(),
    arServiceTier: z.string().optional(),

    // CFO Advisory fields
    cfoAdvisoryType: z.string().optional(),
    cfoAdvisoryBundleHours: z.number().optional(),
    cfoAdvisoryHubspotProductId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Enforce minimum initial cleanup months for bookkeeping quotes
    if (
      (data as any).quoteType === "bookkeeping" &&
      data.cleanupMonths < currentMonth
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Minimum ${currentMonth} months required (current calendar year)`,
        path: ["cleanupMonths"],
      });
    }

    // TaaS validations
    if ((data as any).quoteType === "taas") {
      if (!data.numEntities) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Number of entities is required for TaaS quotes",
          path: ["numEntities"],
        });
      }
      if (!data.statesFiled) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "States filed is required for TaaS quotes",
          path: ["statesFiled"],
        });
      }
      if (!data.numBusinessOwners) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Number of business owners is required for TaaS quotes",
          path: ["numBusinessOwners"],
        });
      }
      // Bookkeeping quality is only required if bookkeeping service is NOT selected
      if (
        !(data as any).serviceMonthlyBookkeeping &&
        !(data as any).bookkeepingQuality
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Bookkeeping quality is required for TaaS quotes when bookkeeping service is not included",
          path: ["bookkeepingQuality"],
        });
      }
    }

    // Prior Year Filings validation
    if (data.servicePriorYearFilings) {
      if (!data.priorYearFilings || data.priorYearFilings.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select at least one prior year for filing",
          path: ["priorYearFilings"],
        });
      }
    }
  });

export type QuoteFormFields = z.infer<typeof quoteFormSchema>;

import {
  pgTable,
  pgEnum,
  text,
  serial,
  integer,
  decimal,
  timestamp,
  boolean,
  jsonb,
  customType,
} from "drizzle-orm/pg-core";

// pgvector custom type for embeddings
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// ============================================================================
// Scheduler Enums
// ============================================================================

export const eventStatusEnum = pgEnum("event_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const attendeeRoleEnum = pgEnum("attendee_role", ["organizer", "attendee", "optional"]);

export const attendeeStatusEnum = pgEnum("attendee_status", [
  "pending",
  "accepted",
  "declined",
  "tentative",
]);

export const meetingModeEnum = pgEnum("meeting_mode", ["in_person", "phone", "video"]);

import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  contactEmail: text("contact_email").notNull(),
  monthlyRevenueRange: text("monthly_revenue_range").notNull(),
  monthlyTransactions: text("monthly_transactions").notNull(),
  industry: text("industry").notNull(),
  cleanupMonths: integer("cleanup_months").notNull(),
  cleanupComplexity: decimal("cleanup_complexity", {
    precision: 3,
    scale: 2,
  }).notNull(),
  cleanupPeriods: text("cleanup_periods").array(), // Store year-month combinations like ["2024-01", "2024-02", "2023-12"]
  cleanupOverride: boolean("cleanup_override").default(false).notNull(),
  overrideReason: text("override_reason"),
  approvalRequired: boolean("approval_required").default(false).notNull(),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull(),
  setupFee: decimal("setup_fee", { precision: 10, scale: 2 }).notNull(),
  // TaaS pricing fields
  taasMonthlyFee: decimal("taas_monthly_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  taasPriorYearsFee: decimal("taas_prior_years_fee", {
    precision: 10,
    scale: 2,
  })
    .default("0")
    .notNull(),
  // Combined service flags
  includesBookkeeping: boolean("includes_bookkeeping").default(true).notNull(),
  includesTaas: boolean("includes_taas").default(false).notNull(),
  archived: boolean("archived").default(false).notNull(),
  // Quote type - 'bookkeeping' or 'taas'
  quoteType: text("quote_type").default("bookkeeping").notNull(),
  // TaaS-specific fields
  entityType: text("entity_type"), // LLC, S-Corp, C-Corp, Partnership, Sole Prop, Non-Profit
  numEntities: integer("num_entities"),
  customNumEntities: integer("custom_num_entities"), // For when "more" is selected
  statesFiled: integer("states_filed"),
  customStatesFiled: integer("custom_states_filed"), // For when "more" is selected
  internationalFiling: boolean("international_filing"),
  numBusinessOwners: integer("num_business_owners"),
  customNumBusinessOwners: integer("custom_num_business_owners"), // For when "more" is selected
  bookkeepingQuality: text("bookkeeping_quality"), // Outside CPA, Self-Managed, Not Done / Behind
  include1040s: boolean("include_1040s"),
  priorYearsUnfiled: integer("prior_years_unfiled"),
  priorYearFilings: integer("prior_year_filings").array(),
  qboSubscription: boolean("qbo_subscription").default(false),
  serviceTier: text("service_tier").default("Automated"), // Automated, Guided, Concierge
  // Bookkeeping-specific information fields (do not impact pricing)
  accountingBasis: text("accounting_basis"), // Cash, Accrual
  businessLoans: boolean("business_loans"),
  // New SaaS-style service selection fields
  currentBookkeepingSoftware: text("current_bookkeeping_software"),
  otherBookkeepingSoftware: text("other_bookkeeping_software"),
  primaryBank: text("primary_bank"),
  otherPrimaryBank: text("other_primary_bank"),
  additionalBanks: text("additional_banks").array(),
  otherAdditionalBanks: text("other_additional_banks").array(),
  merchantProviders: text("merchant_providers").array(),
  otherMerchantProvider: text("other_merchant_provider"),
  // Service selections - new 5-card system (preserved for backwards compatibility)
  serviceBookkeeping: boolean("service_bookkeeping").default(false),
  serviceTaas: boolean("service_taas").default(false),
  servicePayroll: boolean("service_payroll").default(false),
  serviceApArLite: boolean("service_ap_ar_lite").default(false),
  serviceFpaLite: boolean("service_fpa_lite").default(false),

  // New separated service selections
  serviceMonthlyBookkeeping: boolean("service_monthly_bookkeeping").default(false),
  serviceCleanupProjects: boolean("service_cleanup_projects").default(false),
  serviceTaasMonthly: boolean("service_taas_monthly").default(false),
  servicePriorYearFilings: boolean("service_prior_year_filings").default(false),
  serviceCfoAdvisory: boolean("service_cfo_advisory").default(false),
  // CFO Advisory specific fields
  cfoAdvisoryType: text("cfo_advisory_type"), // 'pay_as_you_go' or 'bundled'
  cfoAdvisoryBundleHours: integer("cfo_advisory_bundle_hours"), // 8, 16, 32, 40 hours
  cfoAdvisoryHubspotProductId: text("cfo_advisory_hubspot_product_id"), // HubSpot product record ID
  servicePayrollService: boolean("service_payroll_service").default(false),
  // Payroll specific fields
  payrollEmployeeCount: integer("payroll_employee_count").default(1), // Total W2 employees
  payrollStateCount: integer("payroll_state_count").default(1), // Number of states employees are in
  // AP/AR service selection
  serviceApArService: boolean("service_ap_ar_service").default(false),
  // AP specific fields
  apVendorBillsBand: text("ap_vendor_bills_band"), // '0-25', '26-100', '101-250', '251+'
  apVendorCount: integer("ap_vendor_count"), // Number of unique vendors/payees
  customApVendorCount: integer("custom_ap_vendor_count"), // For when 5+ is selected
  apServiceTier: text("ap_service_tier"), // 'lite' or 'advanced'
  // AR service selection
  serviceArService: boolean("service_ar_service").default(false),
  // AR specific fields
  arCustomerInvoicesBand: text("ar_customer_invoices_band"), // '0-25', '26-100', '101-250', '251+'
  arCustomerCount: integer("ar_customer_count"), // Number of unique customers/clients
  customArCustomerCount: integer("custom_ar_customer_count"), // For when 5+ is selected
  arServiceTier: text("ar_service_tier"), // 'lite' or 'advanced'
  // Agent of Service selection
  serviceAgentOfService: boolean("service_agent_of_service").default(false),
  // Agent of Service specific fields
  agentOfServiceAdditionalStates: integer("agent_of_service_additional_states").default(0), // Number of additional states beyond base
  agentOfServiceComplexCase: boolean("agent_of_service_complex_case").default(false), // Complex Case upgrade (+$300)

  // Additional FP&A service selections
  serviceFpaBuild: boolean("service_fpa_build").default(false),
  serviceFpaSupport: boolean("service_fpa_support").default(false),

  // Additional specialized service selections
  serviceNexusStudy: boolean("service_nexus_study").default(false),
  serviceEntityOptimization: boolean("service_entity_optimization").default(false),
  serviceCostSegregation: boolean("service_cost_segregation").default(false),
  serviceRdCredit: boolean("service_rd_credit").default(false),
  serviceRealEstateAdvisory: boolean("service_real_estate_advisory").default(false),

  // Individual AP/AR service selections (separate from combined serviceApArService)
  serviceApLite: boolean("service_ap_lite").default(false),
  serviceArLite: boolean("service_ar_lite").default(false),
  serviceApAdvanced: boolean("service_ap_advanced").default(false),
  serviceArAdvanced: boolean("service_ar_advanced").default(false),

  // Client address information for MSA generation
  clientStreetAddress: text("client_street_address"),
  clientCity: text("client_city"),
  clientState: text("client_state"),
  clientZipCode: text("client_zip_code"),
  clientCountry: text("client_country").default("US"),
  // Company name unlock status
  companyNameLocked: boolean("company_name_locked").default(true),
  // Additional client detail fields with lock status
  contactFirstName: text("contact_first_name"),
  contactFirstNameLocked: boolean("contact_first_name_locked").default(true),
  contactLastName: text("contact_last_name"),
  contactLastNameLocked: boolean("contact_last_name_locked").default(true),
  industryLocked: boolean("industry_locked").default(true),
  companyAddressLocked: boolean("company_address_locked").default(true),

  // User ownership
  ownerId: integer("owner_id").notNull(),
  // HubSpot integration fields
  hubspotContactId: text("hubspot_contact_id"),
  hubspotDealId: text("hubspot_deal_id"),
  hubspotQuoteId: text("hubspot_quote_id"),
  hubspotContactVerified: boolean("hubspot_contact_verified").default(false),
  companyName: text("company_name"),
  // E-signature fields
  signedAt: timestamp("signed_at"),
  signedByName: text("signed_by_name"),
  signedIp: text("signed_ip"),
  // Payment fields (Stripe)
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paidAt: timestamp("paid_at"),
  paymentStatus: text("payment_status"), // 'pending' | 'paid' | 'failed' | 'refunded'
  // Phase 1: Quote signing and lifecycle
  quoteStage: text("quote_stage").default("draft").notNull(), // 'draft' | 'sent' | 'negotiation' | 'closed_won' | 'closed_lost'
  proposalVersion: integer("proposal_version").default(1).notNull(),
  signaturePngPath: text("signature_png_path"), // Path to stored canvas signature
  signatureCertificateJson: jsonb("signature_certificate_json"), // Audit trail: {ipAddress, timestamp, signerEmail, userAgent}
  signedByEmail: text("signed_by_email"), // Email of signer
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  ownerId: true, // Added server-side from authenticated user
  createdAt: true,
  updatedAt: true,
});

export const updateQuoteSchema = createInsertSchema(quotes)
  .omit({
    createdAt: true,
  })
  .partial()
  .required({ id: true });

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// Google Workspace Users table - synced nightly from Google Admin API
export const workspaceUsers = pgTable("workspace_users", {
  id: serial("id").primaryKey(),
  googleId: text("google_id").notNull().unique(), // Google user ID
  email: text("email").notNull().unique(), // Primary email from Google Workspace
  firstName: text("first_name"),
  lastName: text("last_name"),
  fullName: text("full_name"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  suspended: boolean("suspended").default(false).notNull(),
  orgUnitPath: text("org_unit_path").default("/"),
  lastLoginTime: timestamp("last_login_time"),
  creationTime: timestamp("creation_time"),
  thumbnailPhotoUrl: text("thumbnail_photo_url"),
  // Sync metadata
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  syncSource: text("sync_source").default("google_admin_api").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWorkspaceUserSchema = createInsertSchema(workspaceUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkspaceUser = z.infer<typeof insertWorkspaceUserSchema>;
export type WorkspaceUser = typeof workspaceUsers.$inferSelect;

// Users with HubSpot integration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const users: PgTableWithColumns<any> = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(), // @seedfinancial.io email
  password: text("password"), // Optional for OAuth users
  firstName: text("first_name"),
  lastName: text("last_name"),
  hubspotUserId: text("hubspot_user_id"), // HubSpot user ID for ownership
  // OAuth fields
  firebaseUid: text("firebase_uid").unique(), // Firebase user ID (legacy)
  googleId: text("google_id").unique(), // Google user ID for OIDC
  authProvider: text("auth_provider").default("local"), // 'local' or 'google'
  role: text("role").default("employee"), // 'admin', 'employee'
  defaultDashboard: text("default_dashboard").default("sales"), // 'admin', 'sales', 'service'
  roleAssignedBy: integer("role_assigned_by").references(function () {
    return users.id;
  }),
  roleAssignedAt: timestamp("role_assigned_at"),
  // Supabase Auth integration fields
  authUserId: text("auth_user_id").unique(), // Supabase Auth user UUID (nullable initially for migration)
  lastLoginAt: timestamp("last_login_at"), // Track last login for security
  // Profile information
  profilePhoto: text("profile_photo"), // HubSpot profile photo URL or Google photo
  phoneNumber: text("phone_number"), // Synced from HubSpot
  address: text("address"), // User-editable for weather
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("US"),
  // Weather preferences
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  lastWeatherUpdate: timestamp("last_weather_update"),
  // HubSpot sync status
  lastHubspotSync: timestamp("last_hubspot_sync"),
  hubspotSyncEnabled: boolean("hubspot_sync_enabled").default(true),
  // Impersonation tracking
  isImpersonating: boolean("is_impersonating").default(false),
  originalAdminId: integer("original_admin_id"),
  // Email signature
  emailSignature: text("email_signature"), // JSON config for editing
  emailSignatureHtml: text("email_signature_html"), // Pre-rendered HTML for sending
  emailSignatureEnabled: boolean("email_signature_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Profile update schema (includes HubSpot sync fields)
export const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  profilePhoto: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  lastHubspotSync: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// Per-user preferences (cross-device defaults)
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(function () {
      return users.id;
    }),
  scope: text("scope").notNull(), // e.g., 'leads-inbox'
  prefs: jsonb("prefs").notNull(), // arbitrary JSON for that scope
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserPreferenceSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;
export type UserPreference = typeof userPreferences.$inferSelect;

// Password change schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"],
  });

export type ChangePassword = z.infer<typeof changePasswordSchema>;

// =============================
// AI Conversations & Messages
// =============================
export const aiConversations = pgTable("ai_conversations", {
  id: text("id").primaryKey(), // uuid string
  userId: integer("user_id")
    .notNull()
    .references(function () {
      return users.id;
    }),
  mode: text("mode").notNull(), // 'sell' | 'support'
  title: text("title"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const aiMessages = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(function () {
      return aiConversations.id;
    }),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AIConversation = typeof aiConversations.$inferSelect;
export type AIMessage = typeof aiMessages.$inferSelect;

// =============================
// AI Retrieval (documents & chunks)
// =============================
export const aiDocuments = pgTable("ai_documents", {
  id: serial("id").primaryKey(),
  fileId: text("file_id").notNull().unique(), // Box file ID
  name: text("name").notNull(),
  sha1: text("sha1"),
  etag: text("etag"),
  size: integer("size"),
  modifiedAt: timestamp("modified_at"),
  version: text("version"), // derived from sha1/etag/size+modified
  clientId: text("client_id"), // optional future filter
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiChunks = pgTable("ai_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id")
    .notNull()
    .references(function () {
      return aiDocuments.id;
    }),
  chunkIndex: integer("chunk_index").notNull(),
  text: text("text").notNull(),
  embedding: vector("embedding").notNull(), // vector(1536)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sales Representatives (extends users)
export const salesReps = pgTable("sales_reps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  totalClientsClosedMonthly: integer("total_clients_closed_monthly").default(0).notNull(),
  totalClientsClosedAllTime: integer("total_clients_closed_all_time").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Deals (imported from HubSpot)
export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  hubspotDealId: text("hubspot_deal_id").notNull().unique(),
  dealName: text("deal_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  setupFee: decimal("setup_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull(),
  stage: text("stage").notNull(), // HubSpot deal stage
  status: text("status").notNull().default("open"), // open, closed_won, closed_lost
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id), // Sales rep
  hubspotOwnerId: text("hubspot_owner_id"),
  closedDate: timestamp("closed_date"),
  serviceType: text("service_type").notNull(), // bookkeeping, taas, combined
  companyName: text("company_name"),
  contactEmail: text("contact_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
});

// Commission Entries
// HubSpot invoice tracking for commission calculations
export const hubspotInvoices = pgTable("hubspot_invoices", {
  id: serial("id").primaryKey(),
  hubspotInvoiceId: text("hubspot_invoice_id").notNull().unique(),
  hubspotDealId: text("hubspot_deal_id"), // Link to original deal
  hubspotContactId: text("hubspot_contact_id"),
  salesRepId: integer("sales_rep_id").references(() => salesReps.id),
  invoiceNumber: text("invoice_number"),
  status: text("status").notNull(), // draft, sent, paid, overdue, cancelled
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  companyName: text("company_name"),
  isProcessedForCommission: boolean("is_processed_for_commission").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// HubSpot invoice line items for detailed commission calculations
export const hubspotInvoiceLineItems = pgTable("hubspot_invoice_line_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => hubspotInvoices.id),
  hubspotLineItemId: text("hubspot_line_item_id").unique(),
  name: text("name").notNull(),
  description: text("description"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  serviceType: text("service_type"), // setup, cleanup, prior_years, recurring
  isRecurring: boolean("is_recurring").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// HubSpot subscription tracking for ongoing commission calculations
export const hubspotSubscriptions = pgTable("hubspot_subscriptions", {
  id: serial("id").primaryKey(),
  hubspotSubscriptionId: text("hubspot_subscription_id").notNull().unique(),
  hubspotContactId: text("hubspot_contact_id"),
  hubspotDealId: text("hubspot_deal_id"), // Original deal that created subscription
  salesRepId: integer("sales_rep_id").references(() => salesReps.id),
  status: text("status").notNull(), // active, paused, cancelled, past_due
  monthlyAmount: decimal("monthly_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  lastInvoiceDate: timestamp("last_invoice_date"),
  nextInvoiceDate: timestamp("next_invoice_date"),
  companyName: text("company_name"),
  serviceDescription: text("service_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  // Link to either deal, invoice, or subscription depending on commission source
  dealId: integer("deal_id").references(() => deals.id),
  hubspotInvoiceId: integer("hubspot_invoice_id").references(() => hubspotInvoices.id),
  hubspotSubscriptionId: integer("hubspot_subscription_id").references(
    () => hubspotSubscriptions.id
  ),
  monthlyBonusId: integer("monthly_bonus_id").references(() => monthlyBonuses.id),
  milestoneBonusId: integer("milestone_bonus_id").references(() => milestoneBonuses.id),
  salesRepId: integer("sales_rep_id")
    .notNull()
    .references(() => salesReps.id),
  type: text("type").notNull(), // setup, cleanup, prior_years, month_1, residual, monthly_bonus, milestone_bonus
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, paid
  monthNumber: integer("month_number").notNull(), // 1, 2, 3, etc.
  serviceType: text("service_type"), // bookkeeping, tax, payroll, etc.
  dateEarned: timestamp("date_earned").notNull(),
  datePaid: timestamp("date_paid"),
  paymentMethod: text("payment_method"), // direct_deposit, check, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Monthly Bonuses
export const monthlyBonuses = pgTable("monthly_bonuses", {
  id: serial("id").primaryKey(),
  salesRepId: integer("sales_rep_id")
    .notNull()
    .references(() => salesReps.id),
  month: text("month").notNull(), // YYYY-MM format
  clientsClosedCount: integer("clients_closed_count").notNull(),
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }).notNull(),
  bonusType: text("bonus_type").notNull(), // cash, airpods, apple_watch, macbook_air
  status: text("status").notNull().default("pending"), // pending, processing, paid
  dateEarned: timestamp("date_earned").notNull(),
  datePaid: timestamp("date_paid"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Milestone Bonuses
export const milestoneBonuses = pgTable("milestone_bonuses", {
  id: serial("id").primaryKey(),
  salesRepId: integer("sales_rep_id")
    .notNull()
    .references(() => salesReps.id),
  milestone: integer("milestone").notNull(), // 25, 40, 60, 100
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }).notNull(),
  includesEquity: boolean("includes_equity").default(false).notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, paid
  dateEarned: timestamp("date_earned").notNull(),
  datePaid: timestamp("date_paid"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schema exports for commission tracking
export const insertSalesRepSchema = createInsertSchema(salesReps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncedAt: true,
});

export const insertHubspotInvoiceSchema = createInsertSchema(hubspotInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHubspotInvoiceLineItemSchema = createInsertSchema(hubspotInvoiceLineItems).omit({
  id: true,
  createdAt: true,
});

export const insertHubspotSubscriptionSchema = createInsertSchema(hubspotSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Commission Adjustments - for tracking changes to commission amounts
export const commissionAdjustments = pgTable("commission_adjustments", {
  id: serial("id").primaryKey(),
  commissionId: integer("commission_id")
    .notNull()
    .references(() => commissions.id),
  requestedBy: integer("requested_by")
    .notNull()
    .references(() => users.id), // User who created the adjustment
  approvedBy: integer("approved_by").references(() => users.id), // Admin who approved/rejected
  originalAmount: decimal("original_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  requestedAmount: decimal("requested_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }), // Amount after approval/modification
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  type: text("type").notNull().default("request"), // request (by sales rep) or direct (by admin)
  notes: text("notes"), // Admin notes for approval/rejection
  requestedDate: timestamp("requested_date").defaultNow().notNull(),
  reviewedDate: timestamp("reviewed_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommissionAdjustmentSchema = createInsertSchema(commissionAdjustments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMonthlyBonusSchema = createInsertSchema(monthlyBonuses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMilestoneBonusSchema = createInsertSchema(milestoneBonuses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalesRep = z.infer<typeof insertSalesRepSchema>;
export type SalesRep = typeof salesReps.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertHubspotInvoice = z.infer<typeof insertHubspotInvoiceSchema>;
export type HubspotInvoice = typeof hubspotInvoices.$inferSelect;
export type InsertHubspotInvoiceLineItem = z.infer<typeof insertHubspotInvoiceLineItemSchema>;
export type HubspotInvoiceLineItem = typeof hubspotInvoiceLineItems.$inferSelect;
export type InsertHubspotSubscription = z.infer<typeof insertHubspotSubscriptionSchema>;
export type HubspotSubscription = typeof hubspotSubscriptions.$inferSelect;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissions.$inferSelect;
export type InsertCommissionAdjustment = z.infer<typeof insertCommissionAdjustmentSchema>;
export type CommissionAdjustment = typeof commissionAdjustments.$inferSelect;

// Pricing Configuration Tables
// Base pricing settings for each service
export const pricingBase = pgTable("pricing_base", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(), // 'bookkeeping', 'taas', 'payroll', 'ap', 'ar', 'agent_of_service'
  baseFee: decimal("base_fee", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Industry multipliers for different business types
export const pricingIndustryMultipliers = pgTable("pricing_industry_multipliers", {
  id: serial("id").primaryKey(),
  industry: text("industry").notNull().unique(),
  monthlyMultiplier: decimal("monthly_multiplier", {
    precision: 5,
    scale: 3,
  }).notNull(),
  cleanupMultiplier: decimal("cleanup_multiplier", {
    precision: 5,
    scale: 3,
  }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Revenue range multipliers
export const pricingRevenueMultipliers = pgTable("pricing_revenue_multipliers", {
  id: serial("id").primaryKey(),
  revenueRange: text("revenue_range").notNull().unique(), // '<$10K', '10K-25K', etc.
  multiplier: decimal("multiplier", { precision: 5, scale: 3 }).notNull(),
  minRevenue: integer("min_revenue"), // For display purposes
  maxRevenue: integer("max_revenue"), // For display purposes
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Transaction volume surcharges
export const pricingTransactionSurcharges = pgTable("pricing_transaction_surcharges", {
  id: serial("id").primaryKey(),
  transactionRange: text("transaction_range").notNull().unique(), // '<100', '100-300', etc.
  surcharge: decimal("surcharge", { precision: 10, scale: 2 }).notNull(),
  minTransactions: integer("min_transactions"), // For display purposes
  maxTransactions: integer("max_transactions"), // For display purposes
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Service-specific pricing settings
export const pricingServiceSettings = pgTable("pricing_service_settings", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(), // 'bookkeeping', 'taas', 'payroll', 'ap', 'ar'
  settingKey: text("setting_key").notNull(), // 'qbo_subscription_fee', 'entity_upcharge_per_unit', etc.
  settingValue: decimal("setting_value", { precision: 10, scale: 2 }).notNull(),
  settingType: text("setting_type").notNull(), // 'fee', 'multiplier', 'threshold'
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tier-based pricing (for AP/AR Lite vs Advanced)
export const pricingTiers = pgTable("pricing_tiers", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(), // 'ap', 'ar'
  tier: text("tier").notNull(), // 'lite', 'advanced'
  volumeBand: text("volume_band").notNull(), // '0-25', '26-100', etc.
  baseFee: decimal("base_fee", { precision: 10, scale: 2 }).notNull(),
  tierMultiplier: decimal("tier_multiplier", { precision: 5, scale: 3 }).default("1.0").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pricing configuration change history for audit trail
export const pricingHistory = pgTable("pricing_history", {
  id: serial("id").primaryKey(),
  tableAffected: text("table_affected").notNull(), // Which pricing table was changed
  recordId: integer("record_id").notNull(), // ID of the changed record
  fieldChanged: text("field_changed").notNull(), // Which field was modified
  oldValue: text("old_value"), // Previous value (stored as text for flexibility)
  newValue: text("new_value").notNull(), // New value
  changedBy: integer("changed_by")
    .notNull()
    .references(() => users.id),
  changeReason: text("change_reason"), // Optional reason for the change
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for pricing tables
export const insertPricingBaseSchema = createInsertSchema(pricingBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPricingIndustryMultiplierSchema = createInsertSchema(
  pricingIndustryMultipliers
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPricingRevenueMultiplierSchema = createInsertSchema(
  pricingRevenueMultipliers
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPricingTransactionSurchargeSchema = createInsertSchema(
  pricingTransactionSurcharges
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPricingServiceSettingSchema = createInsertSchema(pricingServiceSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPricingTierSchema = createInsertSchema(pricingTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPricingHistorySchema = createInsertSchema(pricingHistory).omit({
  id: true,
  createdAt: true,
});

// Type exports for pricing tables
export type PricingBase = typeof pricingBase.$inferSelect;
export type InsertPricingBase = z.infer<typeof insertPricingBaseSchema>;
export type PricingIndustryMultiplier = typeof pricingIndustryMultipliers.$inferSelect;
export type InsertPricingIndustryMultiplier = z.infer<typeof insertPricingIndustryMultiplierSchema>;
export type PricingRevenueMultiplier = typeof pricingRevenueMultipliers.$inferSelect;
export type InsertPricingRevenueMultiplier = z.infer<typeof insertPricingRevenueMultiplierSchema>;
export type PricingTransactionSurcharge = typeof pricingTransactionSurcharges.$inferSelect;
export type InsertPricingTransactionSurcharge = z.infer<
  typeof insertPricingTransactionSurchargeSchema
>;
export type PricingServiceSetting = typeof pricingServiceSettings.$inferSelect;
export type InsertPricingServiceSetting = z.infer<typeof insertPricingServiceSettingSchema>;
export type PricingTier = typeof pricingTiers.$inferSelect;
export type InsertPricingTier = z.infer<typeof insertPricingTierSchema>;
export type PricingHistory = typeof pricingHistory.$inferSelect;
export type InsertPricingHistory = z.infer<typeof insertPricingHistorySchema>;
export type InsertMonthlyBonus = z.infer<typeof insertMonthlyBonusSchema>;
export type MonthlyBonus = typeof monthlyBonuses.$inferSelect;
export type InsertMilestoneBonus = z.infer<typeof insertMilestoneBonusSchema>;
export type MilestoneBonus = typeof milestoneBonuses.$inferSelect;

// =============================
// RBAC (Role-Based Access Control) Tables
// =============================

// Roles table - defines available roles in the system
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // admin, sales_manager, sales_rep, etc.
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Permissions table - defines available permissions in the system
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // commissions.sync, quotes.update, etc.
  description: text("description"),
  category: text("category"), // commissions, quotes, hubspot, diagnostics, etc.
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Role-Permission mapping - many-to-many relationship
export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: serial("id").primaryKey(),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id),
    permissionId: integer("permission_id")
      .notNull()
      .references(() => permissions.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueRolePermission: {
      columns: [table.roleId, table.permissionId],
      name: "unique_role_permission",
    },
  })
);

// User-Role mapping - many-to-many relationship
export const userRoles = pgTable(
  "user_roles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id),
    assignedBy: integer("assigned_by").references(() => users.id),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"), // Optional role expiration
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserRole: {
      columns: [table.userId, table.roleId],
      name: "unique_user_role",
    },
  })
);

// Optional: Departments table for organizational modeling (Phase 3)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const departments: PgTableWithColumns<any> = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  parentId: integer("parent_id").references(function () {
    return departments.id;
  }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Optional: User-Department mapping
export const userDepartments = pgTable(
  "user_departments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserDepartment: {
      columns: [table.userId, table.departmentId],
      name: "unique_user_department",
    },
  })
);

// Optional: Manager-Member relationships
export const managerEdges = pgTable(
  "manager_edges",
  {
    id: serial("id").primaryKey(),
    managerUserId: integer("manager_user_id")
      .notNull()
      .references(() => users.id),
    memberUserId: integer("member_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueManagerMember: {
      columns: [table.managerUserId, table.memberUserId],
      name: "unique_manager_member",
    },
  })
);

// Insert schemas for RBAC tables
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  createdAt: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserDepartmentSchema = createInsertSchema(userDepartments).omit({
  id: true,
  createdAt: true,
});

export const insertManagerEdgeSchema = createInsertSchema(managerEdges).omit({
  id: true,
  createdAt: true,
});

// Type exports for RBAC tables
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type UserDepartment = typeof userDepartments.$inferSelect;
export type InsertUserDepartment = z.infer<typeof insertUserDepartmentSchema>;
export type ManagerEdge = typeof managerEdges.$inferSelect;
export type InsertManagerEdge = z.infer<typeof insertManagerEdgeSchema>;

// Calculator Manager: per-service SOW templates and agreement links
export const calculatorServiceContent = pgTable("calculator_service_content", {
  id: serial("id").primaryKey(),
  service: text("service").notNull().unique(), // 'bookkeeping', 'taas', 'payroll', 'ap', 'ar', 'agent_of_service', 'cfo_advisory'
  sowTitle: text("sow_title"), // Optional display title
  sowTemplate: text("sow_template"), // Markdown template with tokens
  agreementLink: text("agreement_link"), // URL to service agreement or schedule
  includedFieldsJson: text("included_fields_json"), // JSON string of flags/fields to include
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCalculatorServiceContentSchema = createInsertSchema(
  calculatorServiceContent
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCalculatorServiceContent = z.infer<typeof insertCalculatorServiceContentSchema>;
export type CalculatorServiceContent = typeof calculatorServiceContent.$inferSelect;

// Approval codes for cleanup overrides
export const approvalCodes = pgTable("approval_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  contactEmail: text("contact_email").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertApprovalCodeSchema = createInsertSchema(approvalCodes).omit({
  id: true,
  createdAt: true,
});

export type InsertApprovalCode = z.infer<typeof insertApprovalCodeSchema>;
export type ApprovalCode = typeof approvalCodes.$inferSelect;

// Client Intelligence data for AI snapshots
export const clientIntelProfiles = pgTable("client_intel_profiles", {
  id: serial("id").primaryKey(),
  contactEmail: text("contact_email").notNull().unique(),
  companyName: text("company_name").notNull(),
  industry: text("industry"),
  revenue: text("revenue"),
  employees: integer("employees"),
  hubspotContactId: text("hubspot_contact_id"),
  qboCompanyId: text("qbo_company_id"),
  painPoints: text("pain_points").array(), // JSON array of pain points
  services: text("services").array(), // Current services array
  riskScore: integer("risk_score").default(0), // 0-100 risk assessment
  upsellOpportunities: text("upsell_opportunities").array(), // AI-generated opportunities
  lastAnalyzed: timestamp("last_analyzed"),
  lastActivity: timestamp("last_activity"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Client documents and uploaded files
export const clientDocuments = pgTable("client_documents", {
  id: serial("id").primaryKey(),
  clientProfileId: integer("client_profile_id")
    .notNull()
    .references(() => clientIntelProfiles.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // pdf, xlsx, docx, etc.
  fileSize: integer("file_size").notNull(), // bytes
  uploadedBy: integer("uploaded_by")
    .notNull()
    .references(() => users.id),
  fileUrl: text("file_url"), // Storage URL
  extractedText: text("extracted_text"), // OCR/extracted content for AI analysis
  summary: text("summary"), // AI-generated summary
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Client activity log
export const clientActivities = pgTable("client_activities", {
  id: serial("id").primaryKey(),
  clientProfileId: integer("client_profile_id")
    .notNull()
    .references(() => clientIntelProfiles.id),
  activityType: text("activity_type").notNull(), // email, call, meeting, quote, document_upload
  description: text("description").notNull(),
  userId: integer("user_id").references(() => users.id), // Who performed the activity
  hubspotActivityId: text("hubspot_activity_id"), // If synced from HubSpot
  activityDate: timestamp("activity_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientIntelProfileSchema = createInsertSchema(clientIntelProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientDocumentSchema = createInsertSchema(clientDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertClientActivitySchema = createInsertSchema(clientActivities).omit({
  id: true,
  createdAt: true,
});

export type InsertClientIntelProfile = z.infer<typeof insertClientIntelProfileSchema>;
export type ClientIntelProfile = typeof clientIntelProfiles.$inferSelect;
export type InsertClientDocument = z.infer<typeof insertClientDocumentSchema>;
export type ClientDocument = typeof clientDocuments.$inferSelect;
export type InsertClientActivity = z.infer<typeof insertClientActivitySchema>;
export type ClientActivity = typeof clientActivities.$inferSelect;

// Knowledge Base Schema
export const kbCategories = pgTable("kb_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon").default("folder"), // Lucide icon name
  color: text("color").default("blue"), // Category color theme
  parentId: integer("parent_id"), // For subcategories - will add reference after table definition
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kbArticles = pgTable("kb_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"), // Brief summary
  content: text("content").notNull(), // Rich text/markdown content
  categoryId: integer("category_id")
    .notNull()
    .references(() => kbCategories.id),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("draft"), // draft, published, archived
  featured: boolean("featured").default(false), // Featured articles
  tags: text("tags").array(), // Array of tags for filtering
  viewCount: integer("view_count").default(0),
  searchVector: text("search_vector"), // For full-text search
  aiSummary: text("ai_summary"), // AI-generated summary
  lastReviewedAt: timestamp("last_reviewed_at"),
  lastReviewedBy: integer("last_reviewed_by").references(() => users.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kbArticleVersions = pgTable("kb_article_versions", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => kbArticles.id),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  changeNote: text("change_note"), // What changed in this version
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kbBookmarks = pgTable("kb_bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  articleId: integer("article_id")
    .notNull()
    .references(() => kbArticles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kbSearchHistory = pgTable("kb_search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  query: text("query").notNull(),
  resultsCount: integer("results_count").default(0),
  clickedArticleId: integer("clicked_article_id").references(() => kbArticles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Knowledge Base Schemas
export const insertKbCategorySchema = createInsertSchema(kbCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKbArticleSchema = createInsertSchema(kbArticles).omit({
  id: true,
  viewCount: true,
  searchVector: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKbArticleVersionSchema = createInsertSchema(kbArticleVersions).omit({
  id: true,
  createdAt: true,
});

export const insertKbBookmarkSchema = createInsertSchema(kbBookmarks).omit({
  id: true,
  createdAt: true,
});

export const insertKbSearchHistorySchema = createInsertSchema(kbSearchHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertKbCategory = z.infer<typeof insertKbCategorySchema>;
export type KbCategory = typeof kbCategories.$inferSelect;
export type InsertKbArticle = z.infer<typeof insertKbArticleSchema>;
export type KbArticle = typeof kbArticles.$inferSelect;
export type InsertKbArticleVersion = z.infer<typeof insertKbArticleVersionSchema>;
export type KbArticleVersion = typeof kbArticleVersions.$inferSelect;
export type InsertKbBookmark = z.infer<typeof insertKbBookmarkSchema>;
export type KbBookmark = typeof kbBookmarks.$inferSelect;
export type InsertKbSearchHistory = z.infer<typeof insertKbSearchHistorySchema>;
export type KbSearchHistory = typeof kbSearchHistory.$inferSelect;

// ============================================================================
// CRM Tables (Client Profiles v2)
// ============================================================================

// CRM Contacts - internal system of record
export const crmContacts = pgTable("crm_contacts", {
  id: text("id").primaryKey(), // UUID or HubSpot contact ID during transition
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  companyName: text("company_name"),
  industry: text("industry"),
  revenue: text("revenue"), // string to avoid rounding
  employees: integer("employees"),
  lifecycleStage: text("lifecycle_stage"), // 'lead' | 'customer' | etc
  ownerId: text("owner_id"), // references users or workspace_users
  ownerEmail: text("owner_email"),
  meta: jsonb("meta"), // flexible for additional properties
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// CRM Lead Config - admin-managed allowed values
export const crmLeadSources = pgTable("crm_lead_sources", {
  key: text("key").primaryKey(), // canonical key, e.g. 'facebook'
  label: text("label").notNull(), // display label
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const crmLeadStatuses = pgTable("crm_lead_statuses", {
  key: text("key").primaryKey(), // 'new', 'validated', etc.
  label: text("label").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const crmLeadStages = pgTable("crm_lead_stages", {
  key: text("key").primaryKey(), // 'unassigned', 'assigned', 'quoted', etc.
  label: text("label").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// CRM Leads - intake/assignment workflow
export const crmLeads = pgTable("crm_leads", {
  id: text("id").primaryKey(), // UUID
  contactId: text("contact_id"), // references crm_contacts.id after dedup
  source: text("source").notNull(), // 'facebook' | 'leadexec' | 'zapier' | 'manual' | 'other'
  status: text("status").notNull().default("new"), // 'new' | 'validated' | 'assigned' | 'disqualified'
  stage: text("stage").notNull().default("unassigned"), // 'unassigned' | 'assigned' | 'discovery_booked' | 'quoted' | 'closed_won' | 'closed_lost'
  assignedTo: text("assigned_to"), // user id
  payload: jsonb("payload"), // raw intake data
  // Phase 1: Lifecycle tracking
  archived: boolean("archived").default(false).notNull(),
  convertedAt: timestamp("converted_at"),
  convertedContactId: text("converted_contact_id"), // references crm_contacts.id
  lastContactedAt: timestamp("last_contacted_at"),
  nextActionAt: timestamp("next_action_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// CRM Deals - internal deal tracking
export const crmDeals = pgTable("crm_deals", {
  id: text("id").primaryKey(), // UUID or HubSpot deal ID during transition
  contactId: text("contact_id").notNull(), // references crm_contacts.id
  name: text("name").notNull(),
  stage: text("stage"),
  pipeline: text("pipeline"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  closeDate: timestamp("close_date"),
  ownerId: text("owner_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// CRM Notes - contact notes
export const crmNotes = pgTable("crm_notes", {
  id: text("id").primaryKey(), // UUID
  contactId: text("contact_id").notNull(), // references crm_contacts.id
  authorId: text("author_id").notNull(), // references users.id
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CRM Tasks - contact tasks
export const crmTasks = pgTable("crm_tasks", {
  id: text("id").primaryKey(), // UUID
  contactId: text("contact_id").notNull(), // references crm_contacts.id
  assigneeId: text("assignee_id"),
  title: text("title").notNull(),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("open"), // 'open' | 'done' | 'skipped'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// CRM Messages - SMS/Email communications
export const crmMessages = pgTable("crm_messages", {
  id: text("id").primaryKey(), // UUID
  contactId: text("contact_id").notNull(), // references crm_contacts.id
  channel: text("channel").notNull(), // 'email' | 'sms' | 'voice' | 'chat' (renamed from 'type')
  direction: text("direction").notNull(), // 'inbound' | 'outbound'
  status: text("status"), // 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'received'
  body: text("body").notNull(),
  // Phase 1: Enhanced tracking
  provider: text("provider"), // 'mailgun' | 'twilio' | 'sendgrid'
  providerMessageId: text("provider_message_id"), // External message ID
  threadKey: text("thread_key"), // Groups related messages
  error: text("error"), // Error details if failed
  raw: jsonb("raw"), // Full provider payload
  // Legacy fields
  providerId: text("provider_id"), // Twilio SID, SendGrid ID, etc (legacy)
  meta: jsonb("meta"), // provider-specific metadata (legacy)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Intake Webhooks - audit log for webhook deliveries
export const intakeWebhooks = pgTable("intake_webhooks", {
  id: text("id").primaryKey(), // UUID
  idempotencyKey: text("idempotency_key").notNull().unique(),
  source: text("source").notNull(), // 'facebook' | 'leadexec' | 'zapier'
  payload: jsonb("payload").notNull(),
  processedStatus: text("processed_status").notNull().default("pending"), // 'pending' | 'success' | 'failed'
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// ============================================================================
// Phase 1: Scheduling System
// ============================================================================

// CRM Event Types - calendar event templates
export const crmEventTypes = pgTable("crm_event_types", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull(), // references users.id
  name: text("name").notNull(), // e.g., "Discovery Call"
  durationMin: integer("duration_min").notNull().default(30),
  bufferBeforeMin: integer("buffer_before_min").notNull().default(15), // gap before event
  bufferAfterMin: integer("buffer_after_min").notNull().default(15), // gap after event
  meetingLinkTemplate: text("meeting_link_template"), // optional Zoom, etc.
  description: text("description"),
  meetingMode: meetingModeEnum("meeting_mode"), // 'in_person' | 'phone' | 'video'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// CRM Availability - recurring weekly availability
export const crmAvailability = pgTable("crm_availability", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull(), // references users.id
  weekday: integer("weekday").notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  startMinutes: integer("start_minutes").notNull(), // minutes since midnight
  endMinutes: integer("end_minutes").notNull(), // minutes since midnight
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// CRM Availability Overrides - one-time availability changes
export const crmAvailabilityOverrides = pgTable("crm_availability_overrides", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull(), // references users.id
  date: timestamp("date", { mode: "date" }).notNull(), // specific date
  startMinutes: integer("start_minutes"), // NULL if unavailable all day
  endMinutes: integer("end_minutes"), // NULL if unavailable all day
  isAvailable: boolean("is_available").notNull(), // true = working, false = off
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CRM Events - scheduled meetings
export const crmEvents = pgTable("crm_events", {
  id: text("id").primaryKey(), // UUID
  typeId: text("type_id"), // references crm_event_types.id
  ownerUserId: text("owner_user_id").notNull(), // references users.id
  contactId: text("contact_id"), // references crm_contacts.id
  leadId: text("lead_id"), // references crm_leads.id
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  location: text("location"), // physical location or "Zoom", etc.
  status: eventStatusEnum("status").notNull().default("scheduled"), // 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  meetingLink: text("meeting_link"), // actual meeting URL
  meetingMode: meetingModeEnum("meeting_mode"), // 'in_person' | 'phone' | 'video'
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// CRM Event Attendees - participants in events
export const crmEventAttendees = pgTable("crm_event_attendees", {
  id: text("id").primaryKey(), // UUID
  eventId: text("event_id").notNull(), // references crm_events.id
  email: text("email").notNull(),
  phone: text("phone"),
  name: text("name"),
  role: attendeeRoleEnum("role").notNull().default("attendee"), // 'organizer' | 'attendee' | 'optional'
  status: attendeeStatusEnum("status").notNull().default("pending"), // 'pending' | 'accepted' | 'declined' | 'tentative'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CRM Scheduling Links - shareable booking links
export const crmSchedulingLinks = pgTable("crm_scheduling_links", {
  id: text("id").primaryKey(), // UUID
  ownerUserId: text("owner_user_id").notNull(), // references users.id
  eventTypeId: text("event_type_id"), // references crm_event_types.id (nullable for ad-hoc)
  slug: text("slug").notNull().unique(),
  tokenHash: text("token_hash"), // optional signed token hash
  expiresAt: timestamp("expires_at"),
  maxUses: integer("max_uses"),
  uses: integer("uses").notNull().default(0),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  meetingMode: meetingModeEnum("meeting_mode"), // preferred meeting mode for link
  minLeadMinutes: integer("min_lead_minutes"), // optional override
  maxHorizonDays: integer("max_horizon_days"), // optional override
  customAvailability: jsonb("custom_availability"), // array of {weekday,startMinutes,endMinutes}
  brandTheme: jsonb("brand_theme"), // optional branding tokens
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for CRM tables
export const insertCrmContactSchema = createInsertSchema(crmContacts).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCrmLeadSchema = createInsertSchema(crmLeads).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCrmDealSchema = createInsertSchema(crmDeals).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCrmNoteSchema = createInsertSchema(crmNotes).omit({
  id: true,
  createdAt: true,
});

export const insertCrmTaskSchema = createInsertSchema(crmTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrmMessageSchema = createInsertSchema(crmMessages).omit({
  id: true,
  createdAt: true,
});

export const insertIntakeWebhookSchema = createInsertSchema(intakeWebhooks).omit({
  id: true,
  createdAt: true,
});

// ============================================================================
// Sales Cadence (MVP)
// ============================================================================

export const crmCadences = pgTable("crm_cadences", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  ownerUserId: text("owner_user_id"), // references users.id
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  trigger: jsonb("trigger"), // { type: 'lead_assigned', config: { assignedTo?: userId } }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const crmCadenceDays = pgTable("crm_cadence_days", {
  id: text("id").primaryKey(), // UUID
  cadenceId: text("cadence_id").notNull(), // references crm_cadences.id
  dayNumber: integer("day_number").notNull(), // 1..N
  sortOrder: integer("sort_order"), // optional explicit ordering
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const crmCadenceActions = pgTable("crm_cadence_actions", {
  id: text("id").primaryKey(), // UUID
  cadenceId: text("cadence_id").notNull(), // denormalized for easy joins
  dayId: text("day_id").notNull(), // references crm_cadence_days.id
  actionType: text("action_type").notNull(), // 'sms' | 'email' | 'call_task'
  scheduleRule: jsonb("schedule_rule").notNull(), // { kind, timeOfDay?, minutesAfterPrev? }
  config: jsonb("config"), // channel-specific config
  sortOrder: integer("sort_order"), // 0..N inside the day
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const crmCadenceRuns = pgTable("crm_cadence_runs", {
  id: text("id").primaryKey(), // UUID
  cadenceId: text("cadence_id").notNull(),
  leadId: text("lead_id").notNull(), // references crm_leads.id
  status: text("status").notNull().default("active"), // 'active' | 'paused' | 'stopped'
  startedAt: timestamp("started_at").defaultNow().notNull(),
  stoppedAt: timestamp("stopped_at"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const crmCadenceScheduledActions = pgTable("crm_cadence_scheduled_actions", {
  id: text("id").primaryKey(), // UUID
  runId: text("run_id").notNull(), // references crm_cadence_runs.id
  actionId: text("action_id").notNull(), // references crm_cadence_actions.id
  dueAt: timestamp("due_at").notNull(),
  status: text("status").notNull().default("scheduled"), // 'scheduled' | 'sent' | 'skipped' | 'failed'
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const crmCadenceEvents = pgTable("crm_cadence_events", {
  id: text("id").primaryKey(), // UUID
  type: text("type").notNull(), // 'lead_assigned' | 'sms_inbound' | 'email_inbound' | 'lead_stage_changed' | 'meeting_booked'
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for Cadence tables
export const insertCrmCadenceSchema = createInsertSchema(crmCadences).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCrmCadenceDaySchema = createInsertSchema(crmCadenceDays).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCrmCadenceActionSchema = createInsertSchema(crmCadenceActions).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCrmCadenceRunSchema = createInsertSchema(crmCadenceRuns).omit({
  createdAt: true,
  updatedAt: true,
  startedAt: true,
});

export const insertCrmCadenceScheduledActionSchema = createInsertSchema(
  crmCadenceScheduledActions
).omit({
  createdAt: true,
  updatedAt: true,
});

// Types for CRM tables
export type CrmContact = typeof crmContacts.$inferSelect;
export type InsertCrmContact = z.infer<typeof insertCrmContactSchema>;
export type CrmLead = typeof crmLeads.$inferSelect;
export type InsertCrmLead = z.infer<typeof insertCrmLeadSchema>;
export type CrmDeal = typeof crmDeals.$inferSelect;
export type InsertCrmDeal = z.infer<typeof insertCrmDealSchema>;
export type CrmNote = typeof crmNotes.$inferSelect;
export type InsertCrmNote = z.infer<typeof insertCrmNoteSchema>;
export type CrmTask = typeof crmTasks.$inferSelect;
export type InsertCrmTask = z.infer<typeof insertCrmTaskSchema>;
export type CrmMessage = typeof crmMessages.$inferSelect;
export type InsertCrmMessage = z.infer<typeof insertCrmMessageSchema>;
export type IntakeWebhook = typeof intakeWebhooks.$inferSelect;
export type InsertIntakeWebhook = z.infer<typeof insertIntakeWebhookSchema>;

// Re-export email schema for SeedMail
export * from "./email-schema";

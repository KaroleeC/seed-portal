import { z } from "zod";

// ============================================================================
// CRM Contacts
// ============================================================================

export const ContactSummarySchema = z.object({
  id: z.string(), // HubSpot contact ID or internal UUID
  email: z.string().email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  revenue: z.string().nullable().optional(), // string to avoid rounding
  employees: z.number().nullable().optional(),
  lifecycleStage: z.string().nullable().optional(), // "lead" | "customer" | etc
  lastActivity: z.string().nullable().optional(), // ISO date
  ownerId: z.string().nullable().optional(),
  ownerEmail: z.string().nullable().optional(),
  servicesCount: z.number().optional().default(0),
});
export type ContactSummary = z.infer<typeof ContactSummarySchema>;

export const ContactDetailsSchema = ContactSummarySchema.extend({
  phone: z.string().nullable().optional(),
  services: z.array(z.string()).default([]),
  deals: z.array(z.any()).default([]), // will be typed below
  quotes: z.array(z.any()).default([]), // will be typed below
  notes: z.array(z.any()).optional().default([]),
  tasks: z.array(z.any()).optional().default([]),
  messages: z.array(z.any()).optional().default([]),
  meta: z.record(z.any()).optional(), // flexible for HubSpot raw props or internal metadata
});
export type ContactDetails = z.infer<typeof ContactDetailsSchema>;

// ============================================================================
// CRM Deals
// ============================================================================

export const CRMDealSchema = z.object({
  id: z.string(),
  contactId: z.string().nullable().optional(),
  name: z.string(),
  stage: z.string().nullable().optional(),
  pipeline: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  closeDate: z.string().nullable().optional(), // ISO date
  ownerId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type CRMDeal = z.infer<typeof CRMDealSchema>;

// ============================================================================
// CRM Quotes (extends existing quotes schema with signing/payment fields)
// ============================================================================

export const CRMQuoteSchema = z.object({
  id: z.number(),
  contactEmail: z.string().email(),
  companyName: z.string().nullable().optional(),
  quoteType: z.string(),
  monthlyFee: z.string(), // decimal as string
  setupFee: z.string(), // decimal as string
  serviceTier: z.string().nullable().optional(),
  hubspotQuoteId: z.string().nullable().optional(),
  hubspotQuoteExists: z.boolean().optional(), // computed flag
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  // Signing fields
  signedAt: z.string().nullable().optional(),
  signedByName: z.string().nullable().optional(),
  signedIp: z.string().nullable().optional(),
  // Payment fields
  stripeCheckoutSessionId: z.string().nullable().optional(),
  stripePaymentIntentId: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).nullable().optional(),
});
export type CRMQuote = z.infer<typeof CRMQuoteSchema>;

// ============================================================================
// CRM Leads (for intake/assignment)
// ============================================================================

export const CRMLeadSchema = z.object({
  id: z.string(),
  contactId: z.string().nullable().optional(), // linked after dedup
  source: z.enum(["facebook", "leadexec", "zapier", "manual", "other"]),
  status: z.enum(["new", "validated", "assigned", "disqualified"]),
  stage: z.enum([
    "unassigned",
    "assigned",
    "contact_made",
    "discovery_booked",
    "quoted",
    "closed_won",
    "closed_lost",
  ]),
  assignedTo: z.string().nullable().optional(), // user id
  payload: z.record(z.any()).optional(), // raw intake data
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  // Contact fields (from join for list view)
  contactFirstName: z.string().nullable().optional(),
  contactLastName: z.string().nullable().optional(),
  contactCompanyName: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  // Lifecycle preview fields for list view
  lastContactedAt: z.string().nullable().optional(),
  nextActionAt: z.string().nullable().optional(),
});
export type CRMLead = z.infer<typeof CRMLeadSchema>;

// ============================================================================
// CRM Notes
// ============================================================================

export const CRMNoteSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  authorId: z.string(),
  authorName: z.string().optional(),
  body: z.string(),
  createdAt: z.string(),
});
export type CRMNote = z.infer<typeof CRMNoteSchema>;

export const CreateNoteSchema = z.object({
  body: z.string().min(1, "Note body is required"),
});
export type CreateNote = z.infer<typeof CreateNoteSchema>;

// ============================================================================
// CRM Tasks
// ============================================================================

export const CRMTaskSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  assigneeId: z.string().nullable().optional(),
  assigneeName: z.string().nullable().optional(),
  title: z.string(),
  dueDate: z.string().nullable().optional(), // ISO date
  status: z.enum(["open", "done", "skipped"]).default("open"),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type CRMTask = z.infer<typeof CRMTaskSchema>;

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
});
export type CreateTask = z.infer<typeof CreateTaskSchema>;

// ============================================================================
// CRM Messages (SMS/Email)
// ============================================================================

export const CRMMessageSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  type: z.enum(["sms", "email"]),
  direction: z.enum(["in", "out"]),
  providerId: z.string().nullable().optional(), // Twilio SID, SendGrid ID, etc
  status: z.enum(["queued", "sent", "delivered", "failed", "received"]).nullable().optional(),
  body: z.string(),
  meta: z.record(z.any()).optional(), // provider-specific metadata
  createdAt: z.string(),
});
export type CRMMessage = z.infer<typeof CRMMessageSchema>;

export const SendMessageSchema = z.object({
  type: z.enum(["sms", "email"]),
  body: z.string().min(1, "Message body is required"),
  subject: z.string().optional(), // for email
});
export type SendMessage = z.infer<typeof SendMessageSchema>;

// ============================================================================
// Intake Webhooks (audit log)
// ============================================================================

export const IntakeWebhookSchema = z.object({
  id: z.string(),
  idempotencyKey: z.string(),
  source: z.string(),
  payload: z.record(z.any()),
  processedStatus: z.enum(["pending", "success", "failed"]),
  error: z.string().nullable().optional(),
  createdAt: z.string(),
  processedAt: z.string().nullable().optional(),
});
export type IntakeWebhook = z.infer<typeof IntakeWebhookSchema>;

// ============================================================================
// Search & List Response Envelopes
// ============================================================================

export const ContactSearchResultSchema = z.object({
  contacts: z.array(ContactSummarySchema),
  total: z.number(),
});
export type ContactSearchResult = z.infer<typeof ContactSearchResultSchema>;

export const LeadsListResultSchema = z.object({
  leads: z.array(CRMLeadSchema),
  total: z.number(),
});
export type LeadsListResult = z.infer<typeof LeadsListResultSchema>;

// ============================================================================
// Phase 1b: Scheduling System Contracts
// ============================================================================

// Event Type schemas
export const EventTypeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  durationMin: z.number(),
  bufferBeforeMin: z.number(),
  bufferAfterMin: z.number(),
  meetingLinkTemplate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EventType = z.infer<typeof EventTypeSchema>;

export const CreateEventTypeSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  durationMin: z.number().min(5).max(480).default(30),
  bufferBeforeMin: z.number().min(0).max(60).default(0),
  bufferAfterMin: z.number().min(0).max(60).default(0),
  meetingLinkTemplate: z.string().url().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type CreateEventType = z.infer<typeof CreateEventTypeSchema>;

// Availability schemas
export const AvailabilitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  weekday: z.number().min(0).max(6),
  startMinutes: z.number().min(0).max(1440),
  endMinutes: z.number().min(0).max(1440),
  timezone: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Availability = z.infer<typeof AvailabilitySchema>;

export const SetAvailabilitySchema = z.object({
  weekday: z.number().min(0).max(6),
  startMinutes: z.number().min(0).max(1440),
  endMinutes: z.number().min(0).max(1440),
  timezone: z.string().default("America/Los_Angeles"),
});
export type SetAvailability = z.infer<typeof SetAvailabilitySchema>;

export const AvailabilityRequestSchema = z.object({
  userId: z.string(),
  startDate: z.string(), // ISO date
  endDate: z.string(), // ISO date
  eventTypeId: z.string().optional(),
});
export type AvailabilityRequest = z.infer<typeof AvailabilityRequestSchema>;

export const AvailabilitySlotSchema = z.object({
  start: z.string(), // ISO datetime
  end: z.string(), // ISO datetime
  available: z.boolean(),
});
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;

export const AvailabilityResponseSchema = z.object({
  slots: z.array(AvailabilitySlotSchema),
  timezone: z.string(),
});
export type AvailabilityResponse = z.infer<typeof AvailabilityResponseSchema>;

// Event schemas
export const EventSchema = z.object({
  id: z.string(),
  typeId: z.string().nullable().optional(),
  ownerUserId: z.string(),
  contactId: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  startAt: z.string(), // ISO datetime
  endAt: z.string(), // ISO datetime
  location: z.string().nullable().optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]),
  meetingLink: z.string().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  attendees: z
    .array(
      z.object({
        id: z.string(),
        email: z.string().email(),
        phone: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        role: z.enum(["organizer", "attendee", "optional"]),
        status: z.enum(["pending", "accepted", "declined", "tentative"]),
      })
    )
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Event = z.infer<typeof EventSchema>;

export const BookEventRequestSchema = z.object({
  eventTypeId: z.string(),
  startAt: z.string(), // ISO datetime
  attendee: z.object({
    email: z.string().email(),
    name: z.string().min(1, "Name is required"),
    phone: z.string().nullable().optional(),
  }),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  notes: z.string().optional(),
});
export type BookEventRequest = z.infer<typeof BookEventRequestSchema>;

export const BookEventResponseSchema = z.object({
  event: EventSchema,
  confirmationCode: z.string(),
});
export type BookEventResponse = z.infer<typeof BookEventResponseSchema>;

// ============================================================================
// Phase 1b: Enhanced Message Contracts
// ============================================================================

export const EnhancedMessageSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  channel: z.enum(["email", "sms", "voice", "chat"]),
  direction: z.enum(["inbound", "outbound"]),
  status: z
    .enum(["queued", "sent", "delivered", "failed", "bounced", "received"])
    .nullable()
    .optional(),
  body: z.string(),
  // Phase 1 fields
  provider: z.enum(["mailgun", "twilio", "sendgrid"]).nullable().optional(),
  providerMessageId: z.string().nullable().optional(),
  threadKey: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  raw: z.record(z.any()).nullable().optional(),
  // Legacy fields
  providerId: z.string().nullable().optional(),
  meta: z.record(z.any()).nullable().optional(),
  createdAt: z.string(),
});
export type EnhancedMessage = z.infer<typeof EnhancedMessageSchema>;

export const SendMessageRequestSchema = z.object({
  contactId: z.string(),
  channel: z.enum(["email", "sms"]),
  body: z.string().min(1, "Message body is required"),
  subject: z.string().optional(), // For email
  threadKey: z.string().optional(), // To associate with existing thread
});
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const SendMessageResponseSchema = z.object({
  messageId: z.string(),
  status: z.enum(["queued", "sent", "delivered", "failed"]),
  providerMessageId: z.string().optional(),
});
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;

// ============================================================================
// Phase 1b: Quote Signing Contracts
// ============================================================================

export const SignatureCertificateSchema = z.object({
  ipAddress: z.string(),
  timestamp: z.string(), // ISO datetime
  signerEmail: z.string().email(),
  userAgent: z.string().optional(),
  geolocation: z
    .object({
      country: z.string().optional(),
      region: z.string().optional(),
      city: z.string().optional(),
    })
    .optional(),
});
export type SignatureCertificate = z.infer<typeof SignatureCertificateSchema>;

export const SignQuoteRequestSchema = z.object({
  quoteId: z.number(),
  signatureDataUrl: z.string().min(1, "Signature is required"), // Base64 PNG from canvas
  signerEmail: z.string().email(),
  signerName: z.string().min(1, "Name is required"),
});
export type SignQuoteRequest = z.infer<typeof SignQuoteRequestSchema>;

export const SignQuoteResponseSchema = z.object({
  quoteId: z.number(),
  signedAt: z.string(),
  signedByEmail: z.string(),
  signaturePath: z.string(),
  certificate: SignatureCertificateSchema,
});
export type SignQuoteResponse = z.infer<typeof SignQuoteResponseSchema>;

// Enhanced quote schema with Phase 1 fields
export const EnhancedQuoteSchema = CRMQuoteSchema.extend({
  quoteStage: z.enum(["draft", "sent", "negotiation", "closed_won", "closed_lost"]),
  proposalVersion: z.number(),
  signaturePngPath: z.string().nullable().optional(),
  signatureCertificateJson: SignatureCertificateSchema.nullable().optional(),
  signedByEmail: z.string().nullable().optional(),
});
export type EnhancedQuote = z.infer<typeof EnhancedQuoteSchema>;

// ============================================================================
// Phase 1b: Lead Lifecycle Contracts
// ============================================================================

export const EnhancedLeadSchema = CRMLeadSchema.extend({
  archived: z.boolean().default(false),
  convertedAt: z.string().nullable().optional(),
  convertedContactId: z.string().nullable().optional(),
});
export type EnhancedLead = z.infer<typeof EnhancedLeadSchema>;

export const UpdateLeadStatusRequestSchema = z.object({
  leadId: z.string(),
  status: z.enum(["new", "validated", "assigned", "disqualified"]).optional(),
  stage: z
    .enum(["unassigned", "assigned", "discovery_booked", "quoted", "closed_won", "closed_lost"])
    .optional(),
  assignedTo: z.string().nullable().optional(),
  nextActionAt: z.string().nullable().optional(),
});
export type UpdateLeadStatusRequest = z.infer<typeof UpdateLeadStatusRequestSchema>;

export const ConvertLeadRequestSchema = z.object({
  leadId: z.string(),
  contactId: z.string(), // Existing or newly created contact
  notes: z.string().optional(),
});
export type ConvertLeadRequest = z.infer<typeof ConvertLeadRequestSchema>;

export const ConvertLeadResponseSchema = z.object({
  leadId: z.string(),
  contactId: z.string(),
  convertedAt: z.string(),
});
export type ConvertLeadResponse = z.infer<typeof ConvertLeadResponseSchema>;

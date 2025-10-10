import { z } from "zod";
import {
  AvailabilityRequestSchema as CRMAvailabilityRequestSchema,
  AvailabilityResponseSchema as CRMAvailabilityResponseSchema,
  SetAvailabilitySchema as CRMSetAvailabilitySchema,
  BookEventRequestSchema as CRMBookEventRequestSchema,
  BookEventResponseSchema as CRMBookEventResponseSchema,
  EventSchema as CRMEventSchema,
} from "./crm";

// Re-exports for convenience
export const AvailabilityRequestSchema = CRMAvailabilityRequestSchema;
export const AvailabilityResponseSchema = CRMAvailabilityResponseSchema;
export const SetAvailabilitySchema = CRMSetAvailabilitySchema;
export const BookEventRequestSchema = CRMBookEventRequestSchema;
export const BookEventResponseSchema = CRMBookEventResponseSchema;
export const EventSchema = CRMEventSchema;

export type AvailabilityRequest = z.infer<typeof AvailabilityRequestSchema>;
export type AvailabilityResponse = z.infer<typeof AvailabilityResponseSchema>;
export type SetAvailability = z.infer<typeof SetAvailabilitySchema>;
export type BookEventRequest = z.infer<typeof BookEventRequestSchema>;
export type BookEventResponse = z.infer<typeof BookEventResponseSchema>;
export type Event = z.infer<typeof EventSchema>;

// Meeting mode: in-person, phone, or video conferencing
export const MeetingModeSchema = z.enum(["in_person", "phone", "video"]);
export type MeetingMode = z.infer<typeof MeetingModeSchema>;

// Overrides (one-off availability adjustments)
export const CreateOverrideSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  isAvailable: z.boolean(),
  startMinutes: z.number().min(0).max(1440).nullable().optional(),
  endMinutes: z.number().min(0).max(1440).nullable().optional(),
  timezone: z.string().default("America/Los_Angeles"),
});
export type CreateOverride = z.infer<typeof CreateOverrideSchema>;

export const DeleteOverrideSchema = z.object({ id: z.string().min(1) });
export type DeleteOverride = z.infer<typeof DeleteOverrideSchema>;

// Events: cancel / reschedule
export const CancelEventRequestSchema = z.object({
  eventId: z.string().min(1),
  reason: z.string().optional(),
});
export type CancelEventRequest = z.infer<typeof CancelEventRequestSchema>;

export const RescheduleEventRequestSchema = z.object({
  eventId: z.string().min(1),
  startAt: z.string(), // ISO datetime
  // optional: allow changing duration or endAt in future
});
export type RescheduleEventRequest = z.infer<typeof RescheduleEventRequestSchema>;

// Shareable links (client-facing booking)
export const CreateShareLinkRequestSchema = z.object({
  eventTypeId: z.string().optional(), // if omitted, ad-hoc booking with custom availability
  slug: z.string().min(6).optional(), // server may generate if omitted
  expiresAt: z.string().optional(), // ISO datetime
  maxUses: z.number().int().positive().optional(),
  timezone: z.string().default("America/Los_Angeles"),
  meetingMode: MeetingModeSchema.optional(),
  minLeadMinutes: z.number().int().positive().optional(),
  maxHorizonDays: z.number().int().positive().optional(),
  customAvailability: z
    .array(
      z.object({
        weekday: z.number().min(0).max(6),
        startMinutes: z.number().min(0).max(1440),
        endMinutes: z.number().min(0).max(1440),
      })
    )
    .optional(),
  brandTheme: z.record(z.any()).optional(),
});
export type CreateShareLinkRequest = z.infer<typeof CreateShareLinkRequestSchema>;

export const CreateShareLinkResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
});
export type CreateShareLinkResponse = z.infer<typeof CreateShareLinkResponseSchema>;

export const ResolveShareLinkResponseSchema = z.object({
  ownerUserId: z.string(),
  eventTypeId: z.string().nullable().optional(),
  slug: z.string(),
  timezone: z.string(),
  meetingMode: MeetingModeSchema.optional(),
  minLeadMinutes: z.number().int().positive().optional(),
  maxHorizonDays: z.number().int().positive().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});
export type ResolveShareLinkResponse = z.infer<typeof ResolveShareLinkResponseSchema>;

export const BookFromLinkRequestSchema = z.object({
  slug: z.string().min(1),
  startAt: z.string(),
  meetingMode: MeetingModeSchema.optional(),
  attendee: z.object({
    email: z.string().email(),
    name: z.string().min(1),
    phone: z.string().nullable().optional(),
  }),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  notes: z.string().optional(),
});
export type BookFromLinkRequest = z.infer<typeof BookFromLinkRequestSchema>;

export const BookFromLinkResponseSchema = z.object({
  event: EventSchema,
  confirmationCode: z.string(),
});
export type BookFromLinkResponse = z.infer<typeof BookFromLinkResponseSchema>;

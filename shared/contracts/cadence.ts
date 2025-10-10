import { z } from "zod";

export const ScheduleRuleSchema = z.object({
  kind: z.enum(["immediately", "timeOfDay", "afterPrevious"]),
  timeOfDay: z.string().optional(), // "HH:mm"
  minutesAfterPrev: z.number().int().nonnegative().optional(),
});

export const SmsConfigSchema = z.object({
  templateId: z.string().optional(),
  body: z.string().optional(),
});

export const EmailConfigSchema = z.object({
  subject: z.string().optional(),
  bodyHtml: z.string().optional(),
  fromName: z.string().optional(),
  signature: z.string().optional(),
  templateId: z.string().optional(),
});

export const CallTaskConfigSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  reminderMinutesBefore: z
    .union([z.literal(0), z.literal(15), z.literal(30), z.literal(60)])
    .optional(),
  watcherUserId: z.string().uuid().optional(),
});

export const CadenceActionSchema = z.object({
  id: z.string(),
  type: z.enum(["sms", "email", "call_task"]),
  scheduleRule: ScheduleRuleSchema,
  config: z.object({
    sms: SmsConfigSchema.optional(),
    email: EmailConfigSchema.optional(),
    call_task: CallTaskConfigSchema.optional(),
  }),
});

export const CadenceDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  actions: z.array(CadenceActionSchema),
});

export const CadenceTriggerSchema = z.object({
  type: z.literal("lead_assigned"),
  config: z.object({ assignedTo: z.string().uuid().optional() }).partial().optional(),
});

export const CadenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  ownerUserId: z.string().optional(),
  timezone: z.string().default("America/Los_Angeles"),
  trigger: CadenceTriggerSchema,
  days: z.array(CadenceDaySchema),
});

export const CadenceSummarySchema = CadenceSchema.pick({
  id: true,
  name: true,
  isActive: true,
  timezone: true,
  ownerUserId: true,
});

export const UpsertCadenceRequestSchema = CadenceSchema.extend({})
  .partial({ isActive: true, ownerUserId: true })
  .refine((v) => !!v.id, {
    message: "id is required",
  });

export type ScheduleRule = z.infer<typeof ScheduleRuleSchema>;
export type CadenceAction = z.infer<typeof CadenceActionSchema>;
export type CadenceDay = z.infer<typeof CadenceDaySchema>;
export type CadenceTrigger = z.infer<typeof CadenceTriggerSchema>;
export type Cadence = z.infer<typeof CadenceSchema>;
export type CadenceSummary = z.infer<typeof CadenceSummarySchema>;
export type UpsertCadenceRequest = z.infer<typeof UpsertCadenceRequestSchema>;

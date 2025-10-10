// Frontend-only types for Phase A.1 (in-memory builder)

export type CadenceTriggerType = "lead_assigned";

export interface CadenceTriggerConfig {
  assignedTo?: string[] | null; // userId filter array; null/empty = any assignee
}

export interface CadenceTrigger {
  type: CadenceTriggerType;
  config: CadenceTriggerConfig;
}

export interface BusinessHours {
  enabled: boolean;
  timezone?: string; // Use cadence timezone by default
  startTime: string; // "HH:mm" format
  endTime: string; // "HH:mm" format
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

export type StopCondition =
  | "lead_replied_email"
  | "lead_replied_sms"
  | "incoming_call_logged"
  | "outgoing_call_logged"
  | "meeting_booked"
  | "lead_stage_change"
  | "lead_unsubscribed";

export interface StopConditionConfig {
  enabled: boolean;
  conditions: StopCondition[];
  stageChangeTargets?: string[]; // Lead stage IDs to stop on (if lead_stage_change is selected)
}

export type ScheduleRuleKind = "immediately" | "timeOfDay" | "afterPrevious";

export interface ScheduleRule {
  kind: ScheduleRuleKind;
  timeOfDay?: string; // "HH:mm" (24h)
  minutesAfterPrev?: number; // only when kind=afterPrevious
}

export type ActionType = "sms" | "email" | "call_task";

export interface SmsConfig {
  templateId?: string;
  body?: string;
}

export interface EmailConfig {
  subject?: string;
  bodyHtml?: string;
  fromName?: string;
  signature?: string;
  templateId?: string;
}

export interface CallTaskConfig {
  title: string;
  description?: string;
  reminderMinutesBefore?: 0 | 15 | 30 | 60;
  watcherUserId?: string;
}

export interface CadenceAction {
  id: string; // stable per-cadence
  type: ActionType;
  scheduleRule: ScheduleRule;
  config: {
    sms?: SmsConfig;
    email?: EmailConfig;
    call_task?: CallTaskConfig;
  };
}

export interface CadenceDay {
  dayNumber: number; // 1..N
  actions: CadenceAction[];
}

export interface CadenceModel {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  isActive: boolean;
  ownerUserId?: string;
  timezone: string; // e.g. "America/Los_Angeles"
  trigger: CadenceTrigger;
  days: CadenceDay[];
  maxConcurrentRuns?: number; // null/undefined = unlimited
  businessHours?: BusinessHours;
  stopConditions?: StopConditionConfig;
}

// Map browser timezone to US timezone or fallback to Pacific
function getDefaultTimezone(): string {
  try {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Map of common US timezones
    const usTimezones = [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Phoenix",
      "America/Los_Angeles",
      "America/Anchorage",
      "Pacific/Honolulu",
    ];

    // If browser timezone is a US timezone, use it
    if (usTimezones.includes(browserTz)) {
      return browserTz;
    }

    // Fallback to Pacific Time
    return "America/Los_Angeles";
  } catch {
    // If timezone detection fails, use Pacific Time
    return "America/Los_Angeles";
  }
}

export function createEmptyCadence(
  id: string,
  ownerUserId?: string,
  timezone?: string
): CadenceModel {
  return {
    id,
    name: "New Cadence",
    description: "",
    tags: [],
    isActive: false,
    ownerUserId,
    timezone: timezone || getDefaultTimezone(),
    trigger: { type: "lead_assigned", config: { assignedTo: null } },
    days: [
      {
        dayNumber: 1,
        actions: [],
      },
    ],
    maxConcurrentRuns: 1, // Prevent duplicate runs by default
    businessHours: {
      enabled: false,
      startTime: "09:00",
      endTime: "17:00",
      days: [1, 2, 3, 4, 5], // Mon-Fri
    },
    stopConditions: {
      enabled: true,
      conditions: ["lead_replied_email", "meeting_booked"],
      stageChangeTargets: [],
    },
  };
}

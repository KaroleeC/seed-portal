/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/supabase-auth";
import { searchRateLimit, apiRateLimit } from "../middleware/rate-limiter";
import { db } from "../db";
import { eq, and, gte, lte } from "drizzle-orm";
import { randomUUID, createHmac, timingSafeEqual } from "crypto";
import {
  AvailabilityRequestSchema,
  AvailabilityResponseSchema,
  SetAvailabilitySchema,
  BookEventRequestSchema,
  BookEventResponseSchema,
  CancelEventRequestSchema,
  RescheduleEventRequestSchema,
  CreateOverrideSchema,
  CreateShareLinkRequestSchema,
  CreateShareLinkResponseSchema,
  ResolveShareLinkResponseSchema,
  BookFromLinkRequestSchema,
  BookFromLinkResponseSchema,
} from "@shared/contracts";
import {
  crmSchedulingLinks,
  crmAvailability,
  crmEventTypes,
  crmAvailabilityOverrides,
  crmEvents,
  crmEventAttendees,
} from "@shared/schema";
import ical, { ICalCalendarMethod } from "ical-generator";
import { sendEmail } from "../services/email-provider";

const router = Router();

// RSVP token helpers and config
const RSVP_SECRET = process.env.SCHEDULER_TOKEN_SECRET || process.env.APP_SECRET || "dev-secret";
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:5001";
const makeRsvpToken = (attendeeId: string, eventId: string): string =>
  createHmac("sha256", RSVP_SECRET).update(`${attendeeId}:${eventId}`).digest("hex");
const verifyRsvpToken = (attendeeId: string, eventId: string, token: string): boolean => {
  try {
    const expected = makeRsvpToken(attendeeId, eventId);
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token || ""));
  } catch {
    return false;
  }
};

// GET attendees for an owner's event
router.get(
  "/api/scheduler/events/:id/attendees",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const eventId = String(req.params.id || "");
    if (!eventId) return res.status(400).json({ message: "id is required" });

    try {
      const rows = await db
        .select({ id: crmEvents.id })
        .from(crmEvents)
        .where(and(eq(crmEvents.id, eventId as any), eq(crmEvents.ownerUserId, userId)))
        .limit(1);
      if (!rows[0]) return res.status(404).json({ message: "Event not found" });

      const attendees = await db
        .select({
          id: crmEventAttendees.id,
          email: crmEventAttendees.email,
          name: crmEventAttendees.name,
          role: crmEventAttendees.role,
          status: crmEventAttendees.status,
        })
        .from(crmEventAttendees)
        .where(eq(crmEventAttendees.eventId, eventId as any));
      return res.json(attendees);
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to load attendees" });
    }
  }
);

// POST add (invite) attendee
router.post(
  "/api/scheduler/events/:id/attendees",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const eventId = String(req.params.id || "");
    if (!eventId) return res.status(400).json({ message: "id is required" });

    const Body = z.object({
      email: z.string().email(),
      name: z.string().optional(),
      role: z.enum(["organizer", "attendee", "optional"]).optional(),
    });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid body", errors: parsed.error.errors });

    try {
      const rows = await db
        .select({
          id: crmEvents.id,
          title: crmEvents.title,
          startAt: crmEvents.startAt,
          endAt: crmEvents.endAt,
        })
        .from(crmEvents)
        .where(and(eq(crmEvents.id, eventId as any), eq(crmEvents.ownerUserId, userId)))
        .limit(1);
      const ev = rows[0];
      if (!ev) return res.status(404).json({ message: "Event not found" });

      const attendeeId = randomUUID();
      await db.insert(crmEventAttendees).values({
        id: attendeeId,
        eventId: eventId as any,
        email: parsed.data.email,
        name: parsed.data.name || null,
        role: parsed.data.role || ("attendee" as any),
        status: "pending" as any,
      } as any);

      // Send ICS invitation (best-effort) with RSVP links
      try {
        const cal = ical({ name: "Seed Financial Meeting", method: ICalCalendarMethod.REQUEST });
        cal.createEvent({
          start: new Date(ev.startAt as any),
          end: new Date(ev.endAt as any),
          summary: ev.title || "Meeting",
        });
        const ics = cal.toString();
        const token = makeRsvpToken(attendeeId, eventId);
        const accept = `${API_BASE_URL}/api/scheduler/events/${eventId}/attendees/${attendeeId}/rsvp?status=accepted&token=${token}`;
        const tentative = `${API_BASE_URL}/api/scheduler/events/${eventId}/attendees/${attendeeId}/rsvp?status=tentative&token=${token}`;
        const decline = `${API_BASE_URL}/api/scheduler/events/${eventId}/attendees/${attendeeId}/rsvp?status=declined&token=${token}`;
        const text = `You're invited to a meeting.\n\nRSVP:\n- Accept: ${accept}\n- Tentative: ${tentative}\n- Decline: ${decline}\n`;
        await sendEmail({
          to: parsed.data.email,
          subject: "Meeting Invitation",
          text,
          attachments: [{ filename: "invite.ics", content: ics, contentType: "text/calendar" }],
        });
      } catch (e: unknown) {
        console.warn("[scheduler] ICS invite send failed", e);
      }

      return res.json({ status: "ok", id: attendeeId });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to add attendee" });
    }
  }
);

// DELETE attendee by email
router.delete(
  "/api/scheduler/events/:id/attendees",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const eventId = String(req.params.id || "");
    const email = String(req.query.email || "");
    if (!eventId || !email) return res.status(400).json({ message: "id and email are required" });

    try {
      const rows = await db
        .select({ id: crmEvents.id })
        .from(crmEvents)
        .where(and(eq(crmEvents.id, eventId as any), eq(crmEvents.ownerUserId, userId)))
        .limit(1);
      if (!rows[0]) return res.status(404).json({ message: "Event not found" });

      await db
        .delete(crmEventAttendees)
        .where(
          and(eq(crmEventAttendees.eventId, eventId as any), eq(crmEventAttendees.email, email))
        );
      return res.json({ status: "ok", deleted: true });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to remove attendee" });
    }
  }
);

// Public RSVP endpoint (signed token via email links)
router.get(
  "/api/scheduler/events/:eventId/attendees/:attendeeId/rsvp",
  async (req: Request, res: Response) => {
    const eventId = String(req.params.eventId || "");
    const attendeeId = String(req.params.attendeeId || "");
    const status = String(req.query.status || "");
    const token = String(req.query.token || "");
    if (!eventId || !attendeeId || !status || !token)
      return res.status(400).send("Invalid RSVP link");
    if (!verifyRsvpToken(attendeeId, eventId, token))
      return res.status(401).send("Invalid or expired RSVP token");

    const normalized =
      status === "accepted" || status === "declined" || status === "tentative" ? status : null;
    if (!normalized) return res.status(400).send("Invalid RSVP status");

    try {
      await db
        .update(crmEventAttendees)
        .set({ status: normalized as any })
        .where(
          and(
            eq(crmEventAttendees.id, attendeeId as any),
            eq(crmEventAttendees.eventId, eventId as any)
          )
        );
      return res
        .status(200)
        .send(
          `<!doctype html><meta charset="utf-8" /><title>RSVP ${normalized}</title><div style="font:14px system-ui, -apple-system, Segoe UI, Roboto">Thanks! Your RSVP is recorded as <b>${normalized}</b>.</div>`
        );
    } catch (error: any) {
      return res.status(500).send("Failed to record RSVP");
    }
  }
);

// Owner-triggered manual reminders to all attendees
router.post(
  "/api/scheduler/events/:id/reminders",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const eventId = String(req.params.id || "");
    if (!eventId) return res.status(400).json({ message: "id is required" });

    try {
      const rows = await db
        .select({
          id: crmEvents.id,
          title: crmEvents.title,
          startAt: crmEvents.startAt,
          endAt: crmEvents.endAt,
        })
        .from(crmEvents)
        .where(and(eq(crmEvents.id, eventId as any), eq(crmEvents.ownerUserId, userId)))
        .limit(1);
      const ev = rows[0];
      if (!ev) return res.status(404).json({ message: "Event not found" });

      const list = await db
        .select({ id: crmEventAttendees.id, email: crmEventAttendees.email })
        .from(crmEventAttendees)
        .where(eq(crmEventAttendees.eventId, eventId as any));

      const cal = ical({ name: "Seed Financial Meeting", method: ICalCalendarMethod.REQUEST });
      cal.createEvent({
        start: new Date(ev.startAt as any),
        end: new Date(ev.endAt as any),
        summary: ev.title || "Meeting",
      });
      const ics = cal.toString();
      await Promise.all(
        (list || []).map((a: { id: string; email: string }) => {
          const token = makeRsvpToken(a.id, eventId);
          const accept = `${API_BASE_URL}/api/scheduler/events/${eventId}/attendees/${a.id}/rsvp?status=accepted&token=${token}`;
          const tentative = `${API_BASE_URL}/api/scheduler/events/${eventId}/attendees/${a.id}/rsvp?status=tentative&token=${token}`;
          const decline = `${API_BASE_URL}/api/scheduler/events/${eventId}/attendees/${a.id}/rsvp?status=declined&token=${token}`;
          const text = `Reminder for your upcoming meeting.\n\nRSVP:\n- Accept: ${accept}\n- Tentative: ${tentative}\n- Decline: ${decline}\n`;
          return sendEmail({
            to: a.email,
            subject: `Reminder: ${ev.title || "Meeting"}`,
            text,
            attachments: [{ filename: "invite.ics", content: ics, contentType: "text/calendar" }],
          });
        })
      );
      return res.json({ status: "ok", sent: list.length });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to send reminders" });
    }
  }
);

// GET /api/scheduler/availability
router.get("/api/scheduler/availability", searchRateLimit, async (req: Request, res: Response) => {
  const parsed = AvailabilityRequestSchema.safeParse({
    userId: String(req.query.userId || ""),
    startDate: String(req.query.startDate || ""),
    endDate: String(req.query.endDate || ""),
    eventTypeId: req.query.eventTypeId ? String(req.query.eventTypeId) : undefined,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.errors });
  }

  const { userId, startDate, endDate, eventTypeId } = parsed.data;

  // Scheduling defaults
  let durationMin = 30;
  let bufferBeforeMin = 15;
  let bufferAfterMin = 15;
  let minLeadMin = 120; // 2h
  let maxHorizonDays = 14; // 14d

  try {
    // If an event type is specified, use its duration/buffers
    if (eventTypeId) {
      const et = await db
        .select({
          durationMin: crmEventTypes.durationMin,
          bufferBeforeMin: crmEventTypes.bufferBeforeMin,
          bufferAfterMin: crmEventTypes.bufferAfterMin,
        })
        .from(crmEventTypes)
        .where(eq(crmEventTypes.id, eventTypeId))
        .limit(1);
      if (et[0]) {
        durationMin = et[0].durationMin ?? durationMin;
        bufferBeforeMin = et[0].bufferBeforeMin ?? bufferBeforeMin;
        bufferAfterMin = et[0].bufferAfterMin ?? bufferAfterMin;
      }
    }

    // Load weekly availability for user
    const weekly = await db
      .select({
        weekday: crmAvailability.weekday,
        startMinutes: crmAvailability.startMinutes,
        endMinutes: crmAvailability.endMinutes,
        timezone: crmAvailability.timezone,
      })
      .from(crmAvailability)
      .where(eq(crmAvailability.userId, userId));
    let tz = weekly[0]?.timezone || "America/Los_Angeles";

    // Optional: override from share link slug
    const slug = req.query.slug ? String(req.query.slug) : undefined;
    if (slug) {
      try {
        const rows = await db
          .select()
          .from(crmSchedulingLinks)
          .where(eq(crmSchedulingLinks.slug, slug))
          .limit(1);
        const link = rows[0];
        if (link) {
          if (typeof link.minLeadMinutes === "number") minLeadMin = link.minLeadMinutes as number;
          if (typeof link.maxHorizonDays === "number")
            maxHorizonDays = link.maxHorizonDays as number;
          if (link.timezone) tz = link.timezone as string;
        }
      } catch {}
    }

    // Optional: explicit timezone query override
    const tzOverride = req.query.timezone ? String(req.query.timezone) : undefined;
    if (tzOverride) {
      try {
        // Validate
        new Intl.DateTimeFormat("en-US", { timeZone: tzOverride });
        tz = tzOverride;
      } catch {}
    }
    // Timezone-aware formatter to compute local Y/M/D and time-of-day
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const partsToObj = (parts: Intl.DateTimeFormatPart[]) => {
      const o: Record<string, string> = {};
      for (const p of parts) o[p.type] = p.value;
      return o;
    };
    const part = (o: Record<string, string>, k: string, fallback: string) => o[k] ?? fallback;
    const toInt = (s: string) => parseInt(s, 10);
    const ymdFromParts = (o: Record<string, string>) =>
      `${part(o, "year", "1970")}-${part(o, "month", "01")}-${part(o, "day", "01")}`;
    // Compute the UTC epoch of local midnight (00:00) for a given dateKey in tz
    const tzMidnightUTC = (dateKey: string): number => {
      const [sy, sm, sd] = dateKey.split("-");
      const yy = parseInt(sy ?? "1970", 10);
      const mm = parseInt(sm ?? "01", 10);
      const dd = parseInt(sd ?? "01", 10);
      const guessNoonUTC = Date.UTC(yy, mm - 1, dd, 12, 0, 0);
      // Find a UTC instant whose local date equals dateKey
      let noonUTC = guessNoonUTC;
      const deltas = [0, -86400000, 86400000, -2 * 86400000, 2 * 86400000];
      for (const dlt of deltas) {
        const testUTC = guessNoonUTC + dlt;
        const parts = partsToObj(dtf.formatToParts(new Date(testUTC)));
        if (ymdFromParts(parts) === dateKey) {
          noonUTC = testUTC;
          break;
        }
      }
      const parts = partsToObj(dtf.formatToParts(new Date(noonUTC)));
      const y = toInt(part(parts, "year", String(yy)));
      const m = toInt(part(parts, "month", String(mm)).padStart(2, "0"));
      const d = toInt(part(parts, "day", String(dd)).padStart(2, "0"));
      const hh = toInt(part(parts, "hour", "12"));
      const mi = toInt(part(parts, "minute", "0"));
      const ss = toInt(part(parts, "second", "0"));
      // Offset at local noon for that local date
      const utcAtLocalNoon = Date.UTC(y, m - 1, d, hh, mi, ss);
      const offsetMs = noonUTC - utcAtLocalNoon;
      // Local midnight UTC epoch = local date at 00:00 plus offset
      return Date.UTC(y, m - 1, d, 0, 0, 0) + offsetMs;
    };

    // Parse date range and enforce horizon
    const rangeStart = new Date(`${startDate}T00:00:00.000Z`);
    const rangeEnd = new Date(`${endDate}T23:59:59.999Z`);
    const now = new Date();
    const maxEnd = new Date(now.getTime() + maxHorizonDays * 24 * 60 * 60000);
    if (rangeEnd.getTime() > maxEnd.getTime()) {
      rangeEnd.setTime(maxEnd.getTime());
    }

    // Load overrides within range
    const overrides = await db
      .select({
        date: crmAvailabilityOverrides.date,
        isAvailable: crmAvailabilityOverrides.isAvailable,
        startMinutes: crmAvailabilityOverrides.startMinutes,
        endMinutes: crmAvailabilityOverrides.endMinutes,
      })
      .from(crmAvailabilityOverrides)
      .where(eq(crmAvailabilityOverrides.userId, userId));

    // Load events within extended range for conflict checks
    const events = await db
      .select({ startAt: crmEvents.startAt, endAt: crmEvents.endAt })
      .from(crmEvents)
      .where(eq(crmEvents.ownerUserId, userId));

    // Build blocked intervals from events (apply default 15/15 buffers)
    const blocked: Array<{ start: number; end: number }> = events.map(
      (e: { startAt: unknown; endAt: unknown }) => ({
        start: new Date(e.startAt as unknown as string).getTime() - bufferBeforeMin * 60000,
        end: new Date(e.endAt as unknown as string).getTime() + bufferAfterMin * 60000,
      })
    );

    // Helper: check if time range intersects any blocked interval
    const isBlocked = (startMs: number, endMs: number): boolean => {
      for (const b of blocked) {
        if (startMs < b.end && endMs > b.start) return true;
      }
      return false;
    };

    // Organize weekly availability by weekday
    const weeklyByDay: Record<number, Array<{ start: number; end: number }>> = {};
    for (const w of weekly) {
      (weeklyByDay[w.weekday] ||= []).push({ start: w.startMinutes, end: w.endMinutes });
    }

    // Organize overrides by local date in tz (YYYY-MM-DD)
    const overridesByDate = new Map<
      string,
      Array<{ isAvailable: boolean; start?: number | null; end?: number | null }>
    >();
    for (const o of overrides) {
      const obj = partsToObj(dtf.formatToParts(new Date(o.date as unknown as string)));
      const y = `${obj.year}-${obj.month}-${obj.day}`;
      const arr = overridesByDate.get(y) || [];
      arr.push({
        isAvailable: o.isAvailable as unknown as boolean,
        start: (o.startMinutes as number | null) ?? null,
        end: (o.endMinutes as number | null) ?? null,
      });
      overridesByDate.set(y, arr);
    }

    // Iterate days
    const slots: Array<{ start: string; end: string; available: boolean }> = [];
    const stepMin = 15; // stepping grid
    for (let d = new Date(rangeStart); d <= rangeEnd; d = new Date(d.getTime() + 24 * 60 * 60000)) {
      const dateKey = d.toISOString().slice(0, 10);
      // Compute weekday using tz-local midnight for correctness
      const dayStartMsForWeekday = tzMidnightUTC(dateKey);
      const weekday = new Date(dayStartMsForWeekday).getUTCDay();

      // Determine daily windows
      const windows: Array<{ startMin: number; endMin: number }> = [];
      const ov = overridesByDate.get(dateKey);
      if (ov && ov.length > 0) {
        // If any override exists, only use overrides and ignore weekly for that date
        for (const o of ov) {
          if (!o.isAvailable) continue; // unavailable day
          if (o.start == null || o.end == null) {
            windows.push({ startMin: 0, endMin: 24 * 60 });
          } else {
            windows.push({ startMin: o.start, endMin: o.end });
          }
        }
      } else {
        const dayWeekly = weeklyByDay[weekday] || [];
        for (const w of dayWeekly) windows.push({ startMin: w.start, endMin: w.end });
      }

      if (windows.length === 0) continue;

      // Build day start in UTC corresponding to tz-local midnight
      const dayStartMs = tzMidnightUTC(dateKey);
      const earliestLeadMs = now.getTime() + minLeadMin * 60000;

      for (const win of windows) {
        const winStartMs = dayStartMs + win.startMin * 60000;
        const winEndMs = dayStartMs + win.endMin * 60000;
        // Respect buffers at edges for start/end so the entire event+buffers fits in the window
        const earliestStart = Math.max(winStartMs + bufferBeforeMin * 60000, earliestLeadMs);
        const latestStart = winEndMs - (durationMin + bufferAfterMin) * 60000;
        for (let t = earliestStart; t <= latestStart; t += stepMin * 60000) {
          const slotStart = t;
          const slotEnd = t + durationMin * 60000;
          // Blocked if conflicts (including buffers)
          const blockStart = slotStart - bufferBeforeMin * 60000;
          const blockEnd = slotEnd + bufferAfterMin * 60000;
          if (isBlocked(blockStart, blockEnd)) continue;
          slots.push({
            start: new Date(slotStart).toISOString(),
            end: new Date(slotEnd).toISOString(),
            available: true,
          });
          if (slots.length >= 500) break; // cap response size
        }
        if (slots.length >= 500) break;
      }
      if (slots.length >= 500) break;
    }

    const payload = { slots, timezone: tz };
    const safe = AvailabilityResponseSchema.safeParse(payload);
    return res.json(safe.success ? safe.data : payload);
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Failed to compute availability" });
  }
});

// POST /api/scheduler/events (owner creates an event)
router.post(
  "/api/scheduler/events",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const Body = z.object({
      startAt: z.string().datetime(),
      endAt: z.string().datetime().optional(),
      durationMin: z.number().int().min(5).max(480).optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
      meetingMode: z.enum(["in_person", "phone", "video"]).optional(),
      typeId: z.string().optional(),
    });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid body", errors: parsed.error.errors });

    const id = randomUUID();
    const startAt = new Date(parsed.data.startAt);
    if (isNaN(startAt.getTime())) return res.status(400).json({ message: "Invalid startAt" });
    let endAt: Date;
    if (parsed.data.endAt) {
      endAt = new Date(parsed.data.endAt);
    } else {
      const dur = parsed.data.durationMin ?? 30;
      endAt = new Date(startAt.getTime() + dur * 60000);
    }
    if (isNaN(endAt.getTime())) return res.status(400).json({ message: "Invalid endAt" });

    try {
      await db.insert(crmEvents).values({
        id,
        typeId: parsed.data.typeId || null,
        ownerUserId: userId,
        contactId: null,
        leadId: null,
        startAt: startAt as any,
        endAt: endAt as any,
        location: parsed.data.location || null,
        status: "scheduled" as any,
        meetingLink: null,
        meetingMode: parsed.data.meetingMode || null,
        title: parsed.data.title || "Meeting",
        description: parsed.data.description || null,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      } as any);
      return res.json({ id, startAt: startAt.toISOString(), endAt: endAt.toISOString() });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to create event" });
    }
  }
);

// DELETE /api/scheduler/events/:id (owner-only)
router.delete(
  "/api/scheduler/events/:id",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const eventId = String(req.params.id || "");
    if (!eventId) return res.status(400).json({ message: "id is required" });

    try {
      // Ensure ownership
      const rows = await db
        .select({ id: crmEvents.id })
        .from(crmEvents)
        .where(and(eq(crmEvents.id, eventId as any), eq(crmEvents.ownerUserId, userId)))
        .limit(1);
      if (!rows[0]) return res.status(404).json({ message: "Event not found" });

      await db.delete(crmEventAttendees).where(eq(crmEventAttendees.eventId, eventId as any));
      await db.delete(crmEvents).where(eq(crmEvents.id, eventId as any));
      return res.json({ status: "ok", deleted: true });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to delete event" });
    }
  }
);

// PATCH /api/scheduler/events/:id (edit fields)
router.patch(
  "/api/scheduler/events/:id",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const Body = z.object({
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      meetingMode: z.enum(["in_person", "phone", "video"]).nullable().optional(),
    });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid body", errors: parsed.error.errors });

    const eventId = String(req.params.id || "");
    if (!eventId) return res.status(400).json({ message: "id is required" });

    const update: Record<string, unknown> = { updatedAt: new Date() as any };
    if (Object.prototype.hasOwnProperty.call(parsed.data, "title"))
      update.title = parsed.data.title ?? null;
    if (Object.prototype.hasOwnProperty.call(parsed.data, "description"))
      update.description = parsed.data.description ?? null;
    if (Object.prototype.hasOwnProperty.call(parsed.data, "location"))
      update.location = parsed.data.location ?? null;
    if (Object.prototype.hasOwnProperty.call(parsed.data, "meetingMode"))
      update.meetingMode = parsed.data.meetingMode ?? null;

    if (Object.keys(update).length <= 1)
      return res.status(400).json({ message: "No fields to update" });

    try {
      // Update only if the current user owns the event
      await db
        .update(crmEvents)
        .set(update as any)
        .where(and(eq(crmEvents.id, eventId as any), eq(crmEvents.ownerUserId, userId)));
      return res.json({
        status: "ok",
        updated: Object.keys(update).filter((k) => k !== "updatedAt"),
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to update event" });
    }
  }
);

// GET /api/scheduler/events - list events for calendar views
router.get(
  "/api/scheduler/events",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const currentUserId = String(req.user?.id || "");
    if (!currentUserId) return res.status(401).json({ message: "Unauthorized" });

    const start = req.query.start ? new Date(String(req.query.start)) : undefined;
    const end = req.query.end ? new Date(String(req.query.end)) : undefined;
    const userId = req.query.userId ? String(req.query.userId) : currentUserId;

    try {
      const where = [] as any[];
      where.push(eq(crmEvents.ownerUserId, userId));
      if (start) where.push(gte(crmEvents.startAt, start as any));
      if (end) where.push(lte(crmEvents.startAt, end as any));

      const rows = await db
        .select({
          id: crmEvents.id,
          typeId: crmEvents.typeId,
          ownerUserId: crmEvents.ownerUserId,
          startAt: crmEvents.startAt,
          endAt: crmEvents.endAt,
          title: crmEvents.title,
          description: crmEvents.description,
          status: crmEvents.status,
          meetingLink: crmEvents.meetingLink,
          meetingMode: crmEvents.meetingMode,
          location: crmEvents.location,
        })
        .from(crmEvents)
        .where(where.length > 1 ? and(...where) : where[0]);

      return res.json(rows);
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to load events" });
    }
  }
);

// POST /api/scheduler/availability (create/update weekly rows)
router.post(
  "/api/scheduler/availability",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const Body = z.array(SetAvailabilitySchema);
    const parsed = Body.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid body", errors: parsed.error.errors });

    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      // Replace existing rows for this user (simple approach for Phase 4A)
      await db.delete(crmAvailability).where(eq(crmAvailability.userId, userId));
      if (parsed.data.length > 0) {
        await db.insert(crmAvailability).values(
          parsed.data.map((r) => ({
            id: randomUUID(),
            userId,
            weekday: r.weekday,
            startMinutes: r.startMinutes,
            endMinutes: r.endMinutes,
            timezone: r.timezone,
            isActive: true,
          })) as any
        );
      }
      return res.json({ status: "ok", saved: parsed.data.length });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to save availability" });
    }
  }
);

// POST /api/scheduler/availability/overrides
router.post(
  "/api/scheduler/availability/overrides",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    // Create one or more overrides for the current user
    // Body can be a single object or an array matching CreateOverrideSchema
    const Body = z.union([CreateOverrideSchema, z.array(CreateOverrideSchema)]);
    const parsed = Body.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid body", errors: parsed.error.errors });

    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const input = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
    try {
      const values = input.map((o) => ({
        id: randomUUID(),
        userId,
        date: new Date(`${o.date}T00:00:00.000Z`) as any,
        startMinutes: o.startMinutes ?? null,
        endMinutes: o.endMinutes ?? null,
        isAvailable: o.isAvailable,
        timezone: o.timezone || "America/Los_Angeles",
      }));
      if (values.length > 0) {
        await db.insert(crmAvailabilityOverrides).values(values as any);
      }
      return res.json({ status: "ok", created: values.map((v) => v.id) });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to save overrides" });
    }
  }
);

// GET /api/scheduler/availability/overrides
router.get(
  "/api/scheduler/availability/overrides",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const startDate = req.query.startDate ? String(req.query.startDate) : undefined; // YYYY-MM-DD
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined; // YYYY-MM-DD

    try {
      const where = [] as any[];
      where.push(eq(crmAvailabilityOverrides.userId, userId));
      if (startDate) {
        where.push(
          gte(crmAvailabilityOverrides.date, new Date(`${startDate}T00:00:00.000Z`) as any)
        );
      }
      if (endDate) {
        where.push(lte(crmAvailabilityOverrides.date, new Date(`${endDate}T23:59:59.999Z`) as any));
      }

      const rows = await db
        .select({
          id: crmAvailabilityOverrides.id,
          date: crmAvailabilityOverrides.date,
          isAvailable: crmAvailabilityOverrides.isAvailable,
          startMinutes: crmAvailabilityOverrides.startMinutes,
          endMinutes: crmAvailabilityOverrides.endMinutes,
          timezone: crmAvailabilityOverrides.timezone,
        })
        .from(crmAvailabilityOverrides)
        .where(where.length > 1 ? and(...where) : where[0]);

      return res.json(rows);
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to load overrides" });
    }
  }
);

// DELETE /api/scheduler/availability/overrides/:id
router.delete(
  "/api/scheduler/availability/overrides/:id",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ message: "id is required" });

    try {
      // Ensure only owner can delete their override
      // Drizzle does not return affected rows count directly here; best-effort delete
      await db
        .delete(crmAvailabilityOverrides)
        .where(
          and(eq(crmAvailabilityOverrides.id, id), eq(crmAvailabilityOverrides.userId, userId))
        );
      return res.json({ status: "ok", deleted: true });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to delete override" });
    }
  }
);

// GET /api/scheduler/availability/me (prefill weekly availability for current user)
router.get(
  "/api/scheduler/availability/me",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const rows = await db
        .select({
          id: crmAvailability.id,
          weekday: crmAvailability.weekday,
          startMinutes: crmAvailability.startMinutes,
          endMinutes: crmAvailability.endMinutes,
          timezone: crmAvailability.timezone,
          isActive: crmAvailability.isActive,
        })
        .from(crmAvailability)
        .where(eq(crmAvailability.userId, userId));
      return res.json(rows);
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to load availability" });
    }
  }
);

// GET /api/scheduler/event-types (list current user's event types)
router.get(
  "/api/scheduler/event-types",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const rows = await db
        .select({
          id: crmEventTypes.id,
          name: crmEventTypes.name,
          durationMin: crmEventTypes.durationMin,
          meetingMode: crmEventTypes.meetingMode,
        })
        .from(crmEventTypes)
        .where(eq(crmEventTypes.userId, userId));
      return res.json(rows);
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to load event types" });
    }
  }
);

// POST /api/scheduler/event-types (create)
router.post(
  "/api/scheduler/event-types",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const Body = z.object({
      name: z.string().min(1),
      durationMin: z.number().int().min(5).max(480),
      bufferBeforeMin: z.number().int().min(0).max(120).default(15),
      bufferAfterMin: z.number().int().min(0).max(120).default(15),
      meetingMode: z.enum(["in_person", "phone", "video"]).optional(),
      meetingLinkTemplate: z.string().url().optional(),
      description: z.string().optional(),
    });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid body", errors: parsed.error.errors });

    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = randomUUID();
    try {
      await db.insert(crmEventTypes).values({
        id,
        userId,
        name: parsed.data.name,
        durationMin: parsed.data.durationMin,
        bufferBeforeMin: parsed.data.bufferBeforeMin,
        bufferAfterMin: parsed.data.bufferAfterMin,
        meetingLinkTemplate: parsed.data.meetingLinkTemplate || null,
        description: parsed.data.description || null,
        meetingMode: parsed.data.meetingMode || null,
        isActive: true,
      } as any);
      return res.json({ id });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to create event type" });
    }
  }
);

// POST /api/scheduler/events/book
router.post("/api/scheduler/events/book", apiRateLimit, async (req: Request, res: Response) => {
  const parsed = BookEventRequestSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Invalid body", errors: parsed.error.errors });

  // TODO: Validate slot & conflicts, write event + attendee, send notifications
  const fake = {
    event: {
      id: randomUUID(),
      typeId: parsed.data.eventTypeId,
      ownerUserId: "", // set by link owner or current user
      contactId: parsed.data.contactId ?? null,
      leadId: parsed.data.leadId ?? null,
      startAt: parsed.data.startAt,
      endAt: parsed.data.startAt,
      location: null,
      status: "scheduled",
      meetingLink: null,
      title: "Meeting",
      description: parsed.data.notes ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    confirmationCode: Math.random().toString(36).slice(2, 10),
  };
  const safe = BookEventResponseSchema.safeParse(fake as any);
  return res.json(safe.success ? safe.data : fake);
});

// Enforce safe/common rescheduling: same defaults as booking (2h lead, 14d horizon)
router.patch(
  "/api/scheduler/events/:id/reschedule-safe",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const parsed = RescheduleEventRequestSchema.safeParse({
      eventId: String(req.params.id || ""),
      startAt: req.body?.startAt,
    });
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid body", errors: parsed.error.errors });

    const now = new Date();
    const startAt = new Date(parsed.data.startAt);
    if (isNaN(startAt.getTime())) return res.status(400).json({ message: "Invalid startAt" });
    const minLead = 120; // 2h default
    const horizonDays = 14; // 14d default
    const diffMinutes = Math.floor((startAt.getTime() - now.getTime()) / 60000);
    if (diffMinutes < minLead) {
      return res
        .status(400)
        .json({ message: `Start time must be at least ${minLead} minutes in the future` });
    }
    const maxDate = new Date(now.getTime() + horizonDays * 24 * 60 * 60000);
    if (startAt.getTime() > maxDate.getTime()) {
      return res.status(400).json({ message: `Start time must be within ${horizonDays} days` });
    }

    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      // Load existing event for owner
      const existingRows = await db
        .select({
          id: crmEvents.id,
          ownerUserId: crmEvents.ownerUserId,
          startAt: crmEvents.startAt,
          endAt: crmEvents.endAt,
          title: crmEvents.title,
        })
        .from(crmEvents)
        .where(and(eq(crmEvents.id, parsed.data.eventId), eq(crmEvents.ownerUserId, userId)))
        .limit(1);
      const existing = existingRows[0];
      if (!existing) return res.status(404).json({ message: "Event not found" });

      const currentDurationMin = Math.max(
        5,
        Math.floor(
          (new Date(existing.endAt as any).getTime() -
            new Date(existing.startAt as any).getTime()) /
            60000
        )
      );
      const newStart = new Date(parsed.data.startAt);
      const newEnd = new Date(newStart.getTime() + currentDurationMin * 60000);

      // Conflict check (with default 15/15 buffers)
      const others = await db
        .select({ id: crmEvents.id, startAt: crmEvents.startAt, endAt: crmEvents.endAt })
        .from(crmEvents)
        .where(eq(crmEvents.ownerUserId, userId));
      const hasConflict = others.some((e: any) => {
        if (e.id === existing.id) return false;
        const s = new Date(e.startAt as any).getTime() - 15 * 60000;
        const eMs = new Date(e.endAt as any).getTime() + 15 * 60000;
        const blockStart = newStart.getTime() - 15 * 60000;
        const blockEnd = newEnd.getTime() + 15 * 60000;
        return blockStart < eMs && blockEnd > s;
      });
      if (hasConflict)
        return res.status(409).json({ message: "Selected time conflicts with another event" });

      // Update event
      await db
        .update(crmEvents)
        .set({ startAt: newStart as any, endAt: newEnd as any, updatedAt: new Date() as any })
        .where(eq(crmEvents.id, existing.id as any));

      // Notify attendees via ICS update (best-effort)
      try {
        const attendees = await db
          .select({ email: crmEventAttendees.email })
          .from(crmEventAttendees)
          .where(eq(crmEventAttendees.eventId, existing.id));
        if (attendees.length > 0) {
          const cal = ical({ name: "Seed Financial Meeting", method: ICalCalendarMethod.REQUEST });
          cal.createEvent({ start: newStart, end: newEnd, summary: existing.title || "Meeting" });
          const ics = cal.toString();
          await Promise.all(
            attendees.map((a: { email: string }) =>
              sendEmail({
                to: a.email,
                subject: "Meeting Updated",
                text: `Updated time: ${newStart.toISOString()} - ${newEnd.toISOString()}`,
                attachments: [
                  { filename: "update.ics", content: ics, contentType: "text/calendar" },
                ],
              })
            )
          );
        }
      } catch (e: unknown) {
        console.warn("[scheduler] ICS update send failed", e);
      }

      return res.json({
        status: "ok",
        rescheduled: true,
        startAt: newStart.toISOString(),
        endAt: newEnd.toISOString(),
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to reschedule" });
    }
  }
);

// POST /api/scheduler/events/:id/cancel
router.post(
  "/api/scheduler/events/:id/cancel",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const parsed = CancelEventRequestSchema.safeParse({
      eventId: String(req.params.id || ""),
      reason: req.body?.reason,
    });
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid body", errors: parsed.error.errors });

    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const rows = await db
        .select({
          id: crmEvents.id,
          ownerUserId: crmEvents.ownerUserId,
          startAt: crmEvents.startAt,
          endAt: crmEvents.endAt,
          title: crmEvents.title,
        })
        .from(crmEvents)
        .where(and(eq(crmEvents.id, parsed.data.eventId), eq(crmEvents.ownerUserId, userId)))
        .limit(1);
      const event = rows[0];
      if (!event) return res.status(404).json({ message: "Event not found" });

      await db
        .update(crmEvents)
        .set({ status: "cancelled" as any, updatedAt: new Date() as any })
        .where(eq(crmEvents.id, event.id as any));

      // Best-effort ICS cancellation
      try {
        const attendees = await db
          .select({ email: crmEventAttendees.email })
          .from(crmEventAttendees)
          .where(eq(crmEventAttendees.eventId, event.id));
        if (attendees.length > 0) {
          const cal = ical({ name: "Seed Financial Meeting", method: ICalCalendarMethod.CANCEL });
          cal.createEvent({
            start: new Date(event.startAt as any),
            end: new Date(event.endAt as any),
            summary: event.title || "Meeting",
          });
          const ics = cal.toString();
          await Promise.all(
            attendees.map((a: { email: string }) =>
              sendEmail({
                to: a.email,
                subject: "Meeting Cancelled",
                text: "This meeting has been cancelled.",
                attachments: [
                  { filename: "cancel.ics", content: ics, contentType: "text/calendar" },
                ],
              })
            )
          );
        }
      } catch (e: unknown) {
        console.warn("[scheduler] ICS cancel send failed", e);
      }

      return res.json({ status: "ok", cancelled: true });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to cancel" });
    }
  }
);

// PATCH /api/scheduler/events/:id/reschedule
router.patch(
  "/api/scheduler/events/:id/reschedule",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const parsed = RescheduleEventRequestSchema.safeParse({
      eventId: String(req.params.id || ""),
      startAt: req.body?.startAt,
    });
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid body", errors: parsed.error.errors });

    const userId = String(req.user?.id || "");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const existingRows = await db
        .select({
          id: crmEvents.id,
          ownerUserId: crmEvents.ownerUserId,
          startAt: crmEvents.startAt,
          endAt: crmEvents.endAt,
          title: crmEvents.title,
        })
        .from(crmEvents)
        .where(and(eq(crmEvents.id, parsed.data.eventId), eq(crmEvents.ownerUserId, userId)))
        .limit(1);
      const existing = existingRows[0];
      if (!existing) return res.status(404).json({ message: "Event not found" });

      const durationMin = Math.max(
        5,
        Math.floor(
          (new Date(existing.endAt as any).getTime() -
            new Date(existing.startAt as any).getTime()) /
            60000
        )
      );
      const newStart = new Date(parsed.data.startAt);
      if (isNaN(newStart.getTime())) return res.status(400).json({ message: "Invalid startAt" });
      const newEnd = new Date(newStart.getTime() + durationMin * 60000);

      const others = await db
        .select({ id: crmEvents.id, startAt: crmEvents.startAt, endAt: crmEvents.endAt })
        .from(crmEvents)
        .where(eq(crmEvents.ownerUserId, userId));
      const hasConflict = others.some((e: any) => {
        if (e.id === existing.id) return false;
        const s = new Date(e.startAt as any).getTime() - 15 * 60000;
        const eMs = new Date(e.endAt as any).getTime() + 15 * 60000;
        const blockStart = newStart.getTime() - 15 * 60000;
        const blockEnd = newEnd.getTime() + 15 * 60000;
        return blockStart < eMs && blockEnd > s;
      });
      if (hasConflict)
        return res.status(409).json({ message: "Selected time conflicts with another event" });

      await db
        .update(crmEvents)
        .set({ startAt: newStart as any, endAt: newEnd as any, updatedAt: new Date() as any })
        .where(eq(crmEvents.id, existing.id as any));

      // Best-effort ICS update
      try {
        const attendees = await db
          .select({ email: crmEventAttendees.email })
          .from(crmEventAttendees)
          .where(eq(crmEventAttendees.eventId, existing.id));
        if (attendees.length > 0) {
          const cal = ical({ name: "Seed Financial Meeting", method: ICalCalendarMethod.REQUEST });
          cal.createEvent({ start: newStart, end: newEnd, summary: existing.title || "Meeting" });
          const ics = cal.toString();
          await Promise.all(
            attendees.map((a: { email: string }) =>
              sendEmail({
                to: a.email,
                subject: "Meeting Updated",
                text: `Updated time: ${newStart.toISOString()} - ${newEnd.toISOString()}`,
                attachments: [
                  { filename: "update.ics", content: ics, contentType: "text/calendar" },
                ],
              })
            )
          );
        }
      } catch (e: unknown) {
        console.warn("[scheduler] ICS update send failed", e);
      }

      return res.json({
        status: "ok",
        rescheduled: true,
        startAt: newStart.toISOString(),
        endAt: newEnd.toISOString(),
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to reschedule" });
    }
  }
);

// POST /api/scheduler/links (create shareable link)
router.post(
  "/api/scheduler/links",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const parsed = CreateShareLinkRequestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid body", errors: parsed.error.errors });

    const slug = parsed.data.slug || Math.random().toString(36).slice(2, 10);
    const id = randomUUID();

    try {
      await db.insert(crmSchedulingLinks).values({
        id,
        ownerUserId: String(req.user?.id || ""),
        eventTypeId: parsed.data.eventTypeId || null,
        slug,
        tokenHash: null,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        maxUses: parsed.data.maxUses || null,
        timezone: parsed.data.timezone,
        meetingMode: parsed.data.meetingMode || null,
        minLeadMinutes:
          typeof parsed.data.minLeadMinutes === "number" ? parsed.data.minLeadMinutes : null,
        maxHorizonDays:
          typeof parsed.data.maxHorizonDays === "number" ? parsed.data.maxHorizonDays : null,
        customAvailability: parsed.data.customAvailability
          ? (parsed.data.customAvailability as any)
          : null,
        brandTheme: parsed.data.brandTheme ? (parsed.data.brandTheme as any) : null,
      } as any);
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || "Failed to create link" });
    }

    const safe = CreateShareLinkResponseSchema.safeParse({ id, slug });
    return res.json(safe.success ? safe.data : { id, slug });
  }
);

// GET /api/scheduler/links/:slug (public resolver)
router.get("/api/scheduler/links/:slug", async (req: Request, res: Response) => {
  const slug = String(req.params.slug || "").trim();
  if (!slug) return res.status(400).json({ message: "slug is required" });

  try {
    const rows = await db
      .select()
      .from(crmSchedulingLinks)
      .where(eq(crmSchedulingLinks.slug, slug))
      .limit(1);
    const row = rows[0];
    if (!row) return res.status(404).json({ message: "Link not found" });

    // TODO: redact PII and attach event type info/title in the future
    const payload = {
      ownerUserId: row.ownerUserId,
      eventTypeId: row.eventTypeId,
      slug: row.slug,
      timezone: row.timezone,
      meetingMode: row.meetingMode || undefined,
      minLeadMinutes: typeof row.minLeadMinutes === "number" ? row.minLeadMinutes : undefined,
      maxHorizonDays: typeof row.maxHorizonDays === "number" ? row.maxHorizonDays : undefined,
    };
    const safe = ResolveShareLinkResponseSchema.safeParse(payload as any);
    return res.json(safe.success ? safe.data : payload);
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Failed to load link" });
  }
});

// POST /api/scheduler/book/from-link (public booking)
router.post("/api/scheduler/book/from-link", apiRateLimit, async (req: Request, res: Response) => {
  const parsed = BookFromLinkRequestSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Invalid body", errors: parsed.error.errors });

  // Resolve link and enforce scheduling defaults
  const rows = await db
    .select()
    .from(crmSchedulingLinks)
    .where(eq(crmSchedulingLinks.slug, parsed.data.slug))
    .limit(1);
  const link = rows[0];
  if (!link) return res.status(404).json({ message: "Link not found" });

  const now = new Date();
  const startAt = new Date(parsed.data.startAt);
  if (isNaN(startAt.getTime())) return res.status(400).json({ message: "Invalid startAt" });
  const minLead = typeof link.minLeadMinutes === "number" ? link.minLeadMinutes : 120; // 2h default
  const horizonDays = typeof link.maxHorizonDays === "number" ? link.maxHorizonDays : 14; // 14d default
  const diffMinutes = Math.floor((startAt.getTime() - now.getTime()) / 60000);
  if (diffMinutes < minLead) {
    return res
      .status(400)
      .json({ message: `Start time must be at least ${minLead} minutes in the future` });
  }
  const maxDate = new Date(now.getTime() + horizonDays * 24 * 60 * 60000);
  if (startAt.getTime() > maxDate.getTime()) {
    return res.status(400).json({ message: `Start time must be within ${horizonDays} days` });
  }

  // Compute endAt using event type duration when available (fallback 30m)
  let durationMin = 30;
  if (link.eventTypeId) {
    try {
      const et = await db
        .select({ durationMin: crmEventTypes.durationMin })
        .from(crmEventTypes)
        .where(eq(crmEventTypes.id, link.eventTypeId))
        .limit(1);
      if (et[0]?.durationMin && Number.isFinite(et[0].durationMin)) durationMin = et[0].durationMin;
    } catch {}
  }
  const endAt = new Date(startAt.getTime() + durationMin * 60000);
  const meetingMode = parsed.data.meetingMode || (link.meetingMode as string | null) || null;

  // Reject if link expired or max uses exceeded
  if (link.expiresAt && new Date(link.expiresAt).getTime() < now.getTime()) {
    return res.status(400).json({ message: "This link has expired" });
  }
  if (typeof link.maxUses === "number" && link.maxUses >= 0) {
    const currentUses = (link.uses as number) || 0;
    if (currentUses >= link.maxUses)
      return res.status(400).json({ message: "This link has no remaining uses" });
  }

  // Conflict check against existing events (including default 15/15 buffers)
  const conflict = await db
    .select({ id: crmEvents.id, startAt: crmEvents.startAt, endAt: crmEvents.endAt })
    .from(crmEvents)
    .where(eq(crmEvents.ownerUserId, link.ownerUserId));
  const hasConflict = conflict.some((e: any) => {
    const s = new Date((e as any).startAt).getTime() - 15 * 60000;
    const eMs = new Date((e as any).endAt).getTime() + 15 * 60000;
    const blockStart = startAt.getTime() - 15 * 60000;
    const blockEnd = endAt.getTime() + 15 * 60000;
    return blockStart < eMs && blockEnd > s;
  });
  if (hasConflict)
    return res.status(409).json({ message: "Selected time conflicts with another event" });

  // Persist event + attendee and increment uses
  const eventId = randomUUID();
  try {
    await db.insert(crmEvents).values({
      id: eventId,
      typeId: link.eventTypeId || null,
      ownerUserId: link.ownerUserId,
      contactId: parsed.data.contactId ?? null,
      leadId: parsed.data.leadId ?? null,
      startAt: startAt as any,
      endAt: endAt as any,
      location: null,
      status: "scheduled",
      meetingLink: null,
      meetingMode: meetingMode || null,
      title: "Meeting",
      description: parsed.data.notes ?? null,
    } as any);

    const attendeeId = randomUUID();
    await db.insert(crmEventAttendees).values({
      id: attendeeId,
      eventId,
      email: parsed.data.attendee.email,
      name: parsed.data.attendee.name,
      phone: parsed.data.attendee.phone || null,
      role: "attendee",
      status: "accepted",
    } as any);

    // Increment link uses (best-effort)
    const newUses = ((link.uses as number) || 0) + 1;
    await db
      .update(crmSchedulingLinks)
      .set({ uses: newUses as any })
      .where(eq(crmSchedulingLinks.id, link.id as any));
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Failed to save booking" });
  }

  // Best-effort ICS email to attendee
  try {
    const cal = ical({ name: "Seed Financial Meeting" });
    cal.createEvent({
      start: startAt,
      end: endAt,
      summary: "Meeting",
      description: parsed.data.notes || "",
    });
    const ics = cal.toString();
    await sendEmail({
      to: parsed.data.attendee.email,
      subject: "Meeting Confirmed",
      text: `Your meeting is confirmed for ${startAt.toISOString()}`,
      attachments: [{ filename: "invite.ics", content: ics, contentType: "text/calendar" }],
    });
  } catch (e: unknown) {
    // Do not fail the booking if email fails
    console.warn("[scheduler] ICS/email send failed", e);
  }

  const payload = {
    event: {
      id: eventId,
      typeId: link.eventTypeId || null,
      ownerUserId: link.ownerUserId,
      contactId: parsed.data.contactId ?? null,
      leadId: parsed.data.leadId ?? null,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      location: null,
      status: "scheduled",
      meetingLink: null,
      title: "Meeting",
      description: parsed.data.notes ?? null,
      meetingMode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    confirmationCode: Math.random().toString(36).slice(2, 10),
  };
  const safe = BookFromLinkResponseSchema.safeParse(payload as any);
  return res.json(safe.success ? safe.data : payload);
});

export default router;

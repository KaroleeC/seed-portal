/**
 * ICS Calendar Event Generator
 * Creates .ics files for calendar invitations
 * Uses ical-generator library
 */

export interface CalendarEvent {
  summary: string; // Event title
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  url?: string;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name?: string;
    email: string;
    rsvp?: boolean;
  }>;
  method?: "PUBLISH" | "REQUEST" | "REPLY" | "CANCEL";
}

/**
 * Generate an ICS file string from event data
 * Phase 0: Basic implementation
 * Phase 2+: Full ical-generator integration
 */
export function generateICS(event: CalendarEvent): string {
  // Phase 0: Simple manual ICS generation
  const now = new Date();
  const formatDate = (date: Date): string => {
    return date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  };

  const escape = (str: string): string => {
    return str.replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  };

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Seed Financial//Portal//EN",
    `METHOD:${event.method || "REQUEST"}`,
    "BEGIN:VEVENT",
    `UID:${Date.now()}@seedfinancial.io`,
    `DTSTAMP:${formatDate(now)}`,
    `DTSTART:${formatDate(event.start)}`,
    `DTEND:${formatDate(event.end)}`,
    `SUMMARY:${escape(event.summary)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escape(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escape(event.location)}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  if (event.organizer) {
    lines.push(`ORGANIZER;CN=${event.organizer.name}:mailto:${event.organizer.email}`);
  }

  if (event.attendees && event.attendees.length > 0) {
    event.attendees.forEach((attendee) => {
      const rsvp = attendee.rsvp !== false ? "TRUE" : "FALSE";
      const cn = attendee.name ? `;CN=${attendee.name}` : "";
      lines.push(
        `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=${rsvp}${cn}:mailto:${attendee.email}`
      );
    });
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");

  // Phase 2: Use ical-generator for robust ICS generation
  // const ical = (await import("ical-generator")).default;
  // const calendar = ical({ name: "Seed Financial" });
  //
  // calendar.createEvent({
  //   start: event.start,
  //   end: event.end,
  //   summary: event.summary,
  //   description: event.description,
  //   location: event.location,
  //   url: event.url,
  //   organizer: event.organizer,
  //   attendees: event.attendees,
  // });
  //
  // return calendar.toString();
}

/**
 * Generate ICS file and return as Buffer for email attachment
 */
export function generateICSBuffer(event: CalendarEvent): Buffer {
  const icsString = generateICS(event);
  return Buffer.from(icsString, "utf-8");
}

/**
 * Generate ICS file and return as downloadable response
 * Use with Express: res.setHeader() + res.send()
 */
export function generateICSHeaders(filename?: string): Record<string, string> {
  return {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename || "event.ics"}"`,
  };
}

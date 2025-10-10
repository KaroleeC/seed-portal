import React, { useMemo } from "react";

export type CalendarEvent = {
  id: string;
  startAt: string; // ISO
  endAt: string; // ISO
  title?: string | null;
  description?: string | null;
  location?: string | null;
  status?: string | null;
  meetingMode?: string | null;
};

interface WeekViewProps {
  events: CalendarEvent[];
  startDate?: Date; // defaults to today (local)
  days?: number; // defaults to 7
  hours?: [number, number]; // [startHour, endHour], defaults to [8,18]
  stepMinutes?: number; // grid step, default 30
  onEventClick?: (ev: CalendarEvent) => void;
}

// Normalize to local midnight
function startOfDayLocal(d: Date) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function minutesSinceStartOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

export function WeekView({
  events,
  startDate,
  days = 7,
  hours = [8, 18],
  stepMinutes = 30,
  onEventClick,
}: WeekViewProps) {
  const start = useMemo(() => startOfDayLocal(startDate ?? new Date()), [startDate]);
  const dayLabels = useMemo(() => {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start.getTime() + i * 24 * 60 * 60000);
      const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
      const md = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return { key: d.toISOString().slice(0, 10), label: `${weekday} ${md}`, date: d };
    });
  }, [start, days]);

  const perHourPx = 48; // 1 hour = 48px
  const perMinutePx = perHourPx / 60; // 0.8px per minute
  const totalHours = Math.max(1, hours[1] - hours[0]);
  const canvasHeight = totalHours * perHourPx;

  // Bucket events by day key (local)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const sd = new Date(ev.startAt);
      const key = sd.toISOString().slice(0, 10); // local rendering OK for MVP
      const list = map.get(key) || [];
      list.push(ev);
      map.set(key, list);
    }
    // Sort each day's events by start time
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      map.set(k, list);
    }
    return map;
  }, [events]);

  return (
    <div className="border rounded-md">
      {/* Header */}
      <div className="grid" style={{ gridTemplateColumns: `64px repeat(${days}, minmax(0, 1fr))` }}>
        <div className="border-b bg-muted/50 text-xs text-muted-foreground px-2 py-2">Time</div>
        {dayLabels.map((d) => (
          <div key={d.key} className="border-b bg-muted/50 text-xs font-medium px-2 py-2">
            {d.label}
          </div>
        ))}
      </div>

      {/* Body */}
      <div
        className="grid relative"
        style={{ gridTemplateColumns: `64px repeat(${days}, minmax(0, 1fr))` }}
      >
        {/* Time gutter */}
        <div className="border-r relative" style={{ height: canvasHeight }}>
          {Array.from({ length: totalHours + 1 }, (_, i) => hours[0] + i).map((h) => (
            <div
              key={h}
              className="absolute left-0 w-full text-[10px] text-muted-foreground"
              style={{ top: (h - hours[0]) * perHourPx - 6 }}
            >
              <div className="px-2">{`${h.toString().padStart(2, "0")}:00`}</div>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {dayLabels.map((d) => {
          const dayKey = d.key;
          const dayEvents = eventsByDay.get(dayKey) || [];
          return (
            <div
              key={dayKey}
              className="border-r last:border-r-0 relative"
              style={{ height: canvasHeight }}
            >
              {/* horizontal grid lines */}
              {Array.from({ length: totalHours * (60 / stepMinutes) }, (_, i) => i).map((i) => (
                <div
                  key={i}
                  className={`absolute left-0 right-0 ${i % (60 / stepMinutes) === 0 ? "border-t border-dashed" : "border-t border-muted/20"}`}
                  style={{ top: i * (perHourPx * (stepMinutes / 60)) }}
                />
              ))}

              {/* events */}
              {dayEvents.map((ev) => {
                const s = new Date(ev.startAt);
                const e = new Date(ev.endAt);
                const startMin = minutesSinceStartOfDay(s);
                const endMin = minutesSinceStartOfDay(e);
                const visibleStart = Math.max(startMin, hours[0] * 60);
                const visibleEnd = Math.min(endMin, hours[1] * 60);
                if (visibleEnd <= visibleStart) return null;

                const top = (visibleStart - hours[0] * 60) * perMinutePx;
                const height = (visibleEnd - visibleStart) * perMinutePx;
                return (
                  <div
                    key={ev.id}
                    className="absolute left-[4%] w-[92%] rounded-md bg-primary/10 border border-primary/30 px-2 py-1 overflow-hidden"
                    style={{ top, height }}
                    title={`${new Date(ev.startAt).toLocaleTimeString()} - ${new Date(ev.endAt).toLocaleTimeString()}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onEventClick?.(ev)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onEventClick?.(ev);
                      }
                    }}
                  >
                    <div className="text-[11px] font-medium truncate">{ev.title || "Meeting"}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {ev.meetingMode ? `${ev.meetingMode}` : ""}{" "}
                      {ev.status ? ` • ${ev.status}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function timeToMinutes(t: string): number | null {
  const m = /^([0-1]?\d|2[0-3]):([0-5]\d)$/.exec(t.trim());
  if (!m) return null;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  return hh * 60 + mm;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function CalendarSettingsPanel() {
  const [timezone, setTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles"
  );
  const [rows, setRows] = useState(() =>
    WEEKDAYS.map((_, i) => ({ weekday: i, start: "09:00", end: "17:00", active: i >= 1 && i <= 5 }))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await apiFetch<
          Array<{
            weekday: number;
            startMinutes: number;
            endMinutes: number;
            timezone: string;
            isActive: boolean;
          }>
        >("GET", "/api/scheduler/availability/me");
        if (!mounted) return;
        if (data && data.length > 0) {
          const tz = data[0].timezone || timezone;
          setTimezone(tz);
          const byDay: Record<number, { start: string; end: string; active: boolean }> = {};
          data.forEach((r) => {
            byDay[r.weekday] = {
              start: minutesToTime(r.startMinutes),
              end: minutesToTime(r.endMinutes),
              active: r.isActive !== false,
            };
          });
          setRows(
            WEEKDAYS.map((_, i) => ({
              weekday: i,
              start: byDay[i]?.start || "09:00",
              end: byDay[i]?.end || "17:00",
              active: byDay[i]?.active ?? (i >= 1 && i <= 5),
            }))
          );
        }
      } catch (e) {
        // ignore; user may not have any availability yet
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [timezone]);

  const payload = useMemo(() => {
    return rows
      .filter((r) => r.active && timeToMinutes(r.start) !== null && timeToMinutes(r.end) !== null)
      .map((r) => ({
        weekday: r.weekday,
        startMinutes: timeToMinutes(r.start) as number,
        endMinutes: timeToMinutes(r.end) as number,
        timezone,
      }));
  }, [rows, timezone]);

  async function onSave() {
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch("POST", "/api/scheduler/availability", payload);
      setMessage("Saved");
    } catch (e: any) {
      setMessage(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="col-span-1">
              <Label>Timezone</Label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            {rows.map((r, idx) => (
              <div key={r.weekday} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-3 text-sm">{WEEKDAYS[r.weekday]}</div>
                <div className="col-span-2">
                  <Label className="sr-only">Start</Label>
                  <Input
                    value={r.start}
                    onChange={(e) => {
                      const copy = [...rows];
                      copy[idx] = { ...copy[idx], start: e.target.value };
                      setRows(copy);
                    }}
                    placeholder="09:00"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="sr-only">End</Label>
                  <Input
                    value={r.end}
                    onChange={(e) => {
                      const copy = [...rows];
                      copy[idx] = { ...copy[idx], end: e.target.value };
                      setRows(copy);
                    }}
                    placeholder="17:00"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    id={`active-${r.weekday}`}
                    type="checkbox"
                    checked={r.active}
                    onChange={(e) => {
                      const copy = [...rows];
                      copy[idx] = { ...copy[idx], active: e.target.checked };
                      setRows(copy);
                    }}
                  />
                  <Label htmlFor={`active-${r.weekday}`}>Active</Label>
                </div>
                <div className="col-span-3 text-xs text-muted-foreground">
                  {r.active ? `${r.start} - ${r.end}` : "Off"}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save Availability"}
            </Button>
            {message && <span className="text-sm text-muted-foreground">{message}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

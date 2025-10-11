import React, { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ResolveShareLinkResponse, AvailabilityResponse } from "@shared/contracts";
import { apiFetch } from "@/lib/api";

function toDateKey(d: Date): string {
  // yyyy-MM-dd
  return d.toISOString().slice(0, 10);
}

function formatLocalTime(iso: string): string {
  try {
    const date = new Date(iso);
    // Example: Jan 2, 3:04 PM
    return format(date, "MMM d, h:mm a");
  } catch {
    return iso;
  }
}

// Minimal public scheduler page for /schedule/:slug
// Fetches link details and renders a basic booking form (Phase 4A skeleton)
export default function PublicSchedulerPage() {
  const [, params] = useRoute("/schedule/:slug");
  const slug = params?.slug || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<ResolveShareLinkResponse | null>(null);

  // Form state (simple for skeleton)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [startAt, setStartAt] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [meetingMode, setMeetingMode] = useState<string>("video");
  const [slots, setSlots] = useState<AvailabilityResponse | null>(null);
  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => toDateKey(today), [today]);
  const endDate = useMemo(() => toDateKey(addDays(today, 14)), [today]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<ResolveShareLinkResponse>(
          "GET",
          `/api/scheduler/links/${slug}`
        );
        if (mounted) {
          setLink(data);
          if (data?.meetingMode && typeof data.meetingMode === "string") {
            setMeetingMode(data.meetingMode);
          }
          // Load slots immediately after link resolves
          try {
            const qs = new URLSearchParams({
              userId: data.ownerUserId,
              startDate,
              endDate,
            });
            if (data?.eventTypeId) qs.set("eventTypeId", data.eventTypeId);
            const sdata = await apiFetch<AvailabilityResponse>(
              "GET",
              `/api/scheduler/availability?${qs.toString()}`
            );
            if (mounted) setSlots(sdata);
          } catch {}
        }
      } catch (e: unknown) {
        const msg = (e as { message?: string })?.message || "Failed to load link";
        if (mounted) setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (slug) load();
    return () => {
      mounted = false;
    };
  }, [slug, startDate, endDate]);

  async function onBook() {
    setStatus(null);
    try {
      const data = await apiFetch<{ confirmationCode: string }>(
        "POST",
        "/api/scheduler/book/from-link",
        {
          slug,
          startAt,
          meetingMode,
          attendee: { name, email },
        }
      );
      setStatus(`Booked! Confirmation: ${data.confirmationCode}`);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "Booking failed";
      setStatus(msg);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Schedule a meeting</CardTitle>
            <CardDescription>{link ? `Timezone: ${link.timezone}` : ""}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <div>Loading…</div>}
            {error && <div className="text-destructive">{error}</div>}
            {!loading && !error && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="scheduler-name">Your Name</Label>
                  <Input
                    id="scheduler-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="scheduler-email">Your Email</Label>
                  <Input
                    id="scheduler-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="scheduler-meeting-type">Meeting Type</Label>
                  <select
                    id="scheduler-meeting-type"
                    className="border rounded-md h-9 px-3"
                    value={meetingMode}
                    onChange={(e) => setMeetingMode(e.target.value)}
                  >
                    <option value="in_person">In-person</option>
                    <option value="phone">Phone</option>
                    <option value="video">Video conferencing</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="scheduler-start">Start (ISO datetime)</Label>
                  <Input
                    id="scheduler-start"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    placeholder="Click a slot below or paste ISO time"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Available Slots (next 14 days)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1">
                    {slots?.slots?.length ? (
                      slots.slots.slice(0, 64).map((s) => (
                        <button
                          key={s.start}
                          className={`text-xs border rounded px-2 py-1 hover:bg-muted ${startAt === s.start ? "bg-primary text-primary-foreground" : ""}`}
                          onClick={() => setStartAt(s.start)}
                        >
                          {formatLocalTime(s.start)}
                        </button>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">No open times in range.</div>
                    )}
                  </div>
                </div>
                <div className="pt-2 flex items-center gap-3">
                  <Button onClick={onBook} disabled={!name || !email || !startAt}>
                    Book
                  </Button>
                  {status && <span className="text-sm text-muted-foreground">{status}</span>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

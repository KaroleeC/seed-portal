import React, { useCallback, useEffect, useMemo, useState } from "react";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { WeekView, type CalendarEvent } from "@/components/calendar/WeekView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function SchedulerAppPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [types, setTypes] = useState<
    Array<{ id: string; name: string; durationMin: number; meetingMode?: string | null }>
  >([]);
  const [etName, setEtName] = useState("");
  const [etDuration, setEtDuration] = useState(30);
  const [etMode, setEtMode] = useState<string>("video");

  // Availability overrides state
  const [overrides, setOverrides] = useState<
    Array<{
      id: string;
      date: string;
      isAvailable: boolean;
      startMinutes: number | null;
      endMinutes: number | null;
      timezone: string;
    }>
  >([]);
  const [ovDate, setOvDate] = useState<string>(""); // YYYY-MM-DD
  const [ovIsAvailable, setOvIsAvailable] = useState<boolean>(true);
  const [ovStartMin, setOvStartMin] = useState<number | "">("");
  const [ovEndMin, setOvEndMin] = useState<number | "">("");

  // Internal calendar events (simple list)
  const [events, setEvents] = useState<
    Array<{
      id: string;
      startAt: string;
      endAt: string;
      title?: string | null;
      description?: string | null;
      location?: string | null;
      status?: string | null;
      meetingMode?: string | null;
    }>
  >([]);
  // Week navigation state
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const startRangeIso = useMemo(() => weekStart.toISOString(), [weekStart]);
  const endRangeIso = useMemo(
    () => new Date(weekStart.getTime() + 7 * 24 * 60 * 60000).toISOString(),
    [weekStart]
  );

  // Event detail dialog state
  const [dlgOpen, setDlgOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string;
    startAt: string;
    endAt: string;
    title?: string | null;
    description?: string | null;
    location?: string | null;
    meetingMode?: string | null;
  } | null>(null);
  const [rescheduleIso, setRescheduleIso] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editLocation, setEditLocation] = useState<string>("");
  type MeetingMode = "in_person" | "phone" | "video";
  const [editMode, setEditMode] = useState<MeetingMode>("video");
  // Attendees state (for selected event)
  const [attendees, setAttendees] = useState<
    Array<{
      id: string;
      email: string;
      name?: string | null;
      role?: string | null;
      status?: string | null;
    }>
  >([]);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState<string>("");
  const [newAttendeeName, setNewAttendeeName] = useState<string>("");

  // Create event dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState<string>("Meeting");
  const [createDescription, setCreateDescription] = useState<string>("");
  const [createLocation, setCreateLocation] = useState<string>("");
  const [createMode, setCreateMode] = useState<MeetingMode>("video");
  const [createStartIso, setCreateStartIso] = useState<string>(() => new Date().toISOString());
  const [createDuration, setCreateDuration] = useState<number>(30);

  const loadTypes = useCallback(async () => {
    try {
      const data = await apiFetch<
        Array<{ id: string; name: string; durationMin: number; meetingMode?: string | null }>
      >("GET", "/api/scheduler/event-types");
      setTypes(data || []);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "Failed to load event types";
      setStatus(msg);
    }
  }, []);

  const loadOverrides = useCallback(async () => {
    try {
      // optionally filter by range later; for now fetch all for user
      const data = await apiFetch<
        Array<{
          id: string;
          date: string;
          isAvailable: boolean;
          startMinutes: number | null;
          endMinutes: number | null;
          timezone: string;
        }>
      >("GET", `/api/scheduler/availability/overrides`);
      setOverrides(data || []);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "Failed to load overrides";
      setStatus(msg);
    }
  }, []);

  async function createOverride(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      if (!ovDate) throw new Error("Date is required");
      const body: {
        date: string;
        isAvailable: boolean;
        timezone: string;
        startMinutes?: number | null;
        endMinutes?: number | null;
      } = {
        date: ovDate,
        isAvailable: ovIsAvailable,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      if (ovIsAvailable) {
        // optional window for available day
        body.startMinutes = typeof ovStartMin === "number" ? ovStartMin : null;
        body.endMinutes = typeof ovEndMin === "number" ? ovEndMin : null;
      } else {
        // unavailable day: ensure null window
        body.startMinutes = null;
        body.endMinutes = null;
      }
      await apiFetch("POST", "/api/scheduler/availability/overrides", body);
      setOvDate("");
      setOvIsAvailable(true);
      setOvStartMin("");
      setOvEndMin("");
      await loadOverrides();
      setStatus("Override saved");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to save override";
      setStatus(msg);
    }
  }

  async function deleteOverride(id: string) {
    setStatus(null);
    try {
      await apiFetch("DELETE", `/api/scheduler/availability/overrides/${id}`);
      await loadOverrides();
      setStatus("Override deleted");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to delete override";
      setStatus(msg);
    }
  }

  const loadEvents = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ start: startRangeIso, end: endRangeIso });
      const data = await apiFetch<
        Array<{
          id: string;
          startAt: string;
          endAt: string;
          title?: string | null;
          description?: string | null;
          location?: string | null;
          status?: string | null;
          meetingMode?: string | null;
        }>
      >("GET", `/api/scheduler/events?${qs.toString()}`);
      setEvents(data || []);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to load events";
      setStatus(msg);
    }
  }, [startRangeIso, endRangeIso]);

  useEffect(() => {
    void loadTypes();
    void loadOverrides();
  }, [loadTypes, loadOverrides]);

  // Load events when the visible week changes
  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  async function createDevLink() {
    setStatus(null);
    try {
      // Ensure at least one event type exists
      let typeId = types[0]?.id;
      if (!typeId) {
        const created = await apiFetch<{ id: string }>("POST", "/api/scheduler/event-types", {
          name: "Intro Meeting",
          durationMin: 30,
          bufferBeforeMin: 15,
          bufferAfterMin: 15,
          meetingMode: "video",
        });
        typeId = created.id;
        await loadTypes();
      }
      await apiFetch("POST", "/api/scheduler/links", {
        slug: "example",
        eventTypeId: typeId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        meetingMode: "video",
      });
      setStatus("Dev link 'example' is ready.");
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "Failed to create link";
      setStatus(msg);
    }
  }

  async function onCreateEventType(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      const res = await apiFetch<{ id: string }>("POST", "/api/scheduler/event-types", {
        name: etName || "New Event",
        durationMin: etDuration,
        bufferBeforeMin: 15,
        bufferAfterMin: 15,
        meetingMode: etMode,
      });
      setEtName("");
      setEtDuration(30);
      setEtMode("video");
      await loadTypes();
      setStatus(`Event type created: ${res.id}`);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "Failed to create event type";
      setStatus(msg);
    }
  }
  return (
    <div className="min-h-screen">
      <UniversalNavbar showBackButton />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-semibold">Meeting Scheduler</h1>
        <p className="text-sm text-muted-foreground">
          Phase 4A skeleton. Manage event types, links, and bookings. UI will iterate.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Shareable Links</CardTitle>
            <CardDescription>Create client-facing booking links</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button asChild>
                <a href="/settings#calendar">Open Calendar Settings</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/schedule/example">Preview Public Scheduler</a>
              </Button>
              <Button variant="secondary" onClick={createDevLink}>
                Create Dev Link
              </Button>
            </div>
            {status && <div className="text-sm text-muted-foreground">{status}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Types</CardTitle>
            <CardDescription>Create and manage meeting types (like Calendly).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={onCreateEventType}
              className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
            >
              <div className="sm:col-span-3">
                <Label>Name</Label>
                <Input
                  value={etName}
                  onChange={(e) => setEtName(e.target.value)}
                  placeholder="Intro Meeting"
                />
              </div>
              <div className="sm:col-span-1">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  min={5}
                  max={480}
                  value={etDuration}
                  onChange={(e) => setEtDuration(parseInt(e.target.value || "0", 10))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Meeting Type</Label>
                <select
                  className="border rounded-md h-9 px-3 w-full"
                  value={etMode}
                  onChange={(e) => setEtMode(e.target.value)}
                >
                  <option value="in_person">In-person</option>
                  <option value="phone">Phone</option>
                  <option value="video">Video conferencing</option>
                </select>
              </div>
              <div className="sm:col-span-6">
                <Button type="submit">Create Event Type</Button>
              </div>
            </form>

            <div className="space-y-2">
              {types.length === 0 && (
                <div className="text-sm text-muted-foreground">No event types yet.</div>
              )}
              {types.map((t) => (
                <div key={t.id} className="text-sm text-muted-foreground">
                  {t.name} — {t.durationMin} min {t.meetingMode ? `(${t.meetingMode})` : ""}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar (Week)</CardTitle>
            <CardDescription>Internal calendar view for the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const d = new Date();
                  d.setHours(0, 0, 0, 0);
                  setWeekStart(d);
                }}
              >
                Today
              </Button>
              <Button
                variant="outline"
                onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 24 * 60 * 60000))}
              >
                ← Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 24 * 60 * 60000))}
              >
                Next →
              </Button>
              <Button
                className="ml-auto"
                onClick={() => {
                  // prefill start to weekStart 09:00 local
                  const d = new Date(weekStart);
                  d.setHours(9, 0, 0, 0);
                  setCreateStartIso(d.toISOString());
                  setCreateTitle("Meeting");
                  setCreateDescription("");
                  setCreateLocation("");
                  setCreateMode("video");
                  setCreateDuration(30);
                  setCreateOpen(true);
                }}
              >
                New Event
              </Button>
            </div>
            <WeekView
              events={events as CalendarEvent[]}
              startDate={weekStart}
              onEventClick={(ev) => {
                const full = (events.find((e) => e.id === ev.id) || ev) as CalendarEvent;
                setSelectedEvent(full);
                setRescheduleIso(full.startAt);
                setEditTitle(full.title || "");
                setEditDescription(full.description || "");
                setEditLocation(full.location || "");
                setEditMode(
                  full.meetingMode === "in_person" ||
                    full.meetingMode === "phone" ||
                    full.meetingMode === "video"
                    ? (full.meetingMode as MeetingMode)
                    : "video"
                );
                // Load attendees for this event
                (async () => {
                  try {
                    const list = await apiFetch<
                      Array<{
                        id: string;
                        email: string;
                        name?: string | null;
                        role?: string | null;
                        status?: string | null;
                      }>
                    >("GET", `/api/scheduler/events/${full.id}/attendees`);
                    setAttendees(list || []);
                  } catch (e: unknown) {
                    // ignore; show empty list and surface via status if needed
                  }
                })();
                setDlgOpen(true);
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Availability Overrides</CardTitle>
            <CardDescription>Set one-off availability for specific dates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={createOverride}
              className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
            >
              <div className="sm:col-span-2">
                <Label>Date</Label>
                <Input type="date" value={ovDate} onChange={(e) => setOvDate(e.target.value)} />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  id="ovAvail"
                  type="checkbox"
                  checked={ovIsAvailable}
                  onChange={(e) => setOvIsAvailable(e.target.checked)}
                />
                <Label htmlFor="ovAvail">Available that day</Label>
              </div>
              <div className="sm:col-span-1">
                <Label>Start (min)</Label>
                <Input
                  type="number"
                  min={0}
                  max={1440}
                  disabled={!ovIsAvailable}
                  value={ovStartMin}
                  onChange={(e) =>
                    setOvStartMin(e.target.value ? parseInt(e.target.value, 10) : "")
                  }
                />
              </div>
              <div className="sm:col-span-1">
                <Label>End (min)</Label>
                <Input
                  type="number"
                  min={0}
                  max={1440}
                  disabled={!ovIsAvailable}
                  value={ovEndMin}
                  onChange={(e) => setOvEndMin(e.target.value ? parseInt(e.target.value, 10) : "")}
                />
              </div>
              <div className="sm:col-span-6">
                <Button type="submit">Save Override</Button>
              </div>
            </form>

            <div className="space-y-2">
              {overrides.length === 0 && (
                <div className="text-sm text-muted-foreground">No overrides found.</div>
              )}
              {overrides.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between text-sm text-muted-foreground"
                >
                  <div>
                    <span className="font-medium">
                      {new Date(o.date).toISOString().slice(0, 10)}
                    </span>{" "}
                    — {o.isAvailable ? "Available" : "Unavailable"}
                    {o.isAvailable && (o.startMinutes != null || o.endMinutes != null)
                      ? ` (${o.startMinutes ?? 0} - ${o.endMinutes ?? 1440} min)`
                      : ""}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => void deleteOverride(o.id)}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Upcoming Events</CardTitle>
            <CardDescription>Next 14 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.length === 0 && (
              <div className="text-sm text-muted-foreground">No events in range.</div>
            )}
            {events.map((ev) => (
              <div key={ev.id} className="text-sm text-muted-foreground">
                <span className="font-medium">{new Date(ev.startAt).toLocaleString()}</span>
                {" → "}
                <span>{new Date(ev.endAt).toLocaleString()}</span>
                {" — "}
                <span>{ev.title || "Meeting"}</span>
                {ev.meetingMode ? ` (${ev.meetingMode})` : ""}
                {ev.status ? ` [${ev.status}]` : ""}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">ID: {selectedEvent.id}</div>
              <div>
                <Label>Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Meeting title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Notes / agenda"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Physical location or link"
                />
              </div>
              <div>
                <Label>Meeting Type</Label>
                <select
                  className="border rounded-md h-9 px-3 w-full"
                  value={editMode}
                  onChange={(e) => setEditMode((e.target.value as MeetingMode) || "video")}
                >
                  <option value="in_person">In-person</option>
                  <option value="phone">Phone</option>
                  <option value="video">Video conferencing</option>
                </select>
              </div>
              <div>
                <Label>Reschedule to (ISO)</Label>
                <Input
                  value={rescheduleIso}
                  onChange={(e) => setRescheduleIso(e.target.value)}
                  placeholder="YYYY-MM-DDTHH:mm:ss.sssZ"
                />
              </div>
              {/* Attendees */}
              <div className="pt-2 space-y-2">
                <div className="font-medium">Attendees</div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newAttendeeEmail}
                      onChange={(e) => setNewAttendeeEmail(e.target.value)}
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Name (optional)</Label>
                    <Input
                      value={newAttendeeName}
                      onChange={(e) => setNewAttendeeName(e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (!selectedEvent || !newAttendeeEmail) return;
                      try {
                        await apiFetch(
                          "POST",
                          `/api/scheduler/events/${selectedEvent.id}/attendees`,
                          {
                            email: newAttendeeEmail,
                            name: newAttendeeName || undefined,
                          }
                        );
                        const list = await apiFetch<
                          Array<{
                            id: string;
                            email: string;
                            name?: string | null;
                            role?: string | null;
                            status?: string | null;
                          }>
                        >("GET", `/api/scheduler/events/${selectedEvent.id}/attendees`);
                        setAttendees(list || []);
                        setNewAttendeeEmail("");
                        setNewAttendeeName("");
                      } catch (e: unknown) {
                        const msg =
                          (e as { message?: string })?.message || "Failed to add attendee";
                        setStatus(msg);
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {attendees.length === 0 && (
                    <div className="text-sm text-muted-foreground">No attendees yet.</div>
                  )}
                  {attendees.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between text-sm text-muted-foreground"
                    >
                      <div>
                        <span className="font-medium">{a.name || a.email}</span>
                        {a.name ? ` <${a.email}>` : ""}
                        {a.status ? ` [${a.status}]` : ""}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!selectedEvent) return;
                          try {
                            const qs = new URLSearchParams({ email: a.email });
                            await apiFetch(
                              "DELETE",
                              `/api/scheduler/events/${selectedEvent.id}/attendees?${qs.toString()}`
                            );
                            setAttendees((prev) => prev.filter((x) => x.id !== a.id));
                          } catch (e: unknown) {
                            const msg =
                              (e as { message?: string })?.message || "Failed to remove attendee";
                            setStatus(msg);
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (!selectedEvent) return;
                try {
                  await apiFetch("POST", `/api/scheduler/events/${selectedEvent.id}/reminders`, {});
                  setStatus("Reminders sent");
                } catch (e: unknown) {
                  const msg = (e as { message?: string })?.message || "Failed to send reminders";
                  setStatus(msg);
                }
              }}
            >
              Send Reminders
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!selectedEvent) return;
                try {
                  await apiFetch("DELETE", `/api/scheduler/events/${selectedEvent.id}`);
                  await loadEvents();
                  setDlgOpen(false);
                } catch (e: unknown) {
                  const msg = (e as { message?: string })?.message || "Failed to delete";
                  setStatus(msg);
                }
              }}
            >
              Delete
            </Button>
            <Button
              onClick={async () => {
                if (!selectedEvent) return;
                try {
                  const body: Record<string, unknown> = {};
                  body.title = editTitle;
                  body.description = editDescription;
                  body.location = editLocation;
                  body.meetingMode = editMode;
                  await apiFetch("PATCH", `/api/scheduler/events/${selectedEvent.id}`, body);
                  await loadEvents();
                  setDlgOpen(false);
                } catch (e: unknown) {
                  const msg = (e as { message?: string })?.message || "Failed to save";
                  setStatus(msg);
                }
              }}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (!selectedEvent || !rescheduleIso) return;
                try {
                  await apiFetch(
                    "PATCH",
                    `/api/scheduler/events/${selectedEvent.id}/reschedule-safe`,
                    { startAt: rescheduleIso }
                  );
                  await loadEvents();
                  setDlgOpen(false);
                } catch (e: unknown) {
                  const msg = (e as { message?: string })?.message || "Failed to reschedule";
                  setStatus(msg);
                }
              }}
            >
              Reschedule (Safe)
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!selectedEvent) return;
                try {
                  await apiFetch("POST", `/api/scheduler/events/${selectedEvent.id}/cancel`, {});
                  await loadEvents();
                  setDlgOpen(false);
                } catch (e: unknown) {
                  const msg = (e as { message?: string })?.message || "Failed to cancel";
                  setStatus(msg);
                }
              }}
            >
              Cancel Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Meeting title"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Notes / agenda"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={createLocation}
                onChange={(e) => setCreateLocation(e.target.value)}
                placeholder="Physical location or link"
              />
            </div>
            <div>
              <Label>Meeting Type</Label>
              <select
                className="border rounded-md h-9 px-3 w-full"
                value={createMode}
                onChange={(e) => setCreateMode((e.target.value as MeetingMode) || "video")}
              >
                <option value="in_person">In-person</option>
                <option value="phone">Phone</option>
                <option value="video">Video conferencing</option>
              </select>
            </div>
            <div>
              <Label>Start (ISO)</Label>
              <Input
                value={createStartIso}
                onChange={(e) => setCreateStartIso(e.target.value)}
                placeholder="YYYY-MM-DDTHH:mm:ss.sssZ"
              />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={480}
                value={createDuration}
                onChange={(e) => setCreateDuration(parseInt(e.target.value || "0", 10) || 30)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              onClick={async () => {
                try {
                  await apiFetch("POST", "/api/scheduler/events", {
                    startAt: createStartIso,
                    durationMin: createDuration,
                    title: createTitle,
                    description: createDescription,
                    location: createLocation,
                    meetingMode: createMode,
                  });
                  await loadEvents();
                  setCreateOpen(false);
                } catch (e: unknown) {
                  const msg = (e as { message?: string })?.message || "Failed to create";
                  setStatus(msg);
                }
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

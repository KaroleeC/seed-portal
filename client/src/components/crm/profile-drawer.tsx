import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { CRMDeal, CRMLead, CRMQuote, ContactDetails } from "@shared/contracts";
import { apiFetch } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Send, Mail, MessageSquare, Calculator, Archive } from "lucide-react";

// Minimal shape of a lead payload we display as a fallback when no contact exists
type LeadPayload = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  [key: string]: unknown;
};

// Minimal shape for rendering message previews without using `any`
type ContactMessage = {
  id: string | number;
  channel?: string;
  direction?: string;
  createdAt?: string | number | Date;
  body?: string;
};

export interface ProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactIdOrEmail?: string | null;
  lead?: CRMLead | null;
  title?: string;
  isModal?: boolean; // If true, renders content without Sheet wrapper
}

export default function ProfileDrawer({
  open,
  onOpenChange,
  contactIdOrEmail,
  lead,
  title,
  isModal = false,
}: ProfileDrawerProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Messaging state - auto-populate from contact
  const [messageChannel, setMessageChannel] = useState<"email" | "sms">("email");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [smsTo, setSmsTo] = useState("");
  const [smsBody, setSmsBody] = useState("");

  const enabled = Boolean(contactIdOrEmail);
  const { data: contact, isLoading } = useQuery({
    queryKey: ["crm:contact:details", contactIdOrEmail],
    enabled,
    queryFn: async () =>
      await apiFetch<ContactDetails>("GET", `/api/crm/contacts/${contactIdOrEmail}`),
  });

  // Auto-populate email/SMS from contact or lead payload (do not depend on input state to avoid stale deps)
  useEffect(() => {
    const p: LeadPayload = (lead?.payload ?? {}) as LeadPayload;
    const email = contact?.email ?? p.email ?? undefined;
    const phone = contact?.phone ?? p.phone ?? undefined;
    if (email) setEmailTo(email);
    if (phone) setSmsTo(phone);
    // Only re-run when contact changes or the selected lead changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact, lead?.id]);

  const headerTitle = useMemo(() => {
    if (title) return title;
    const n =
      contact?.firstName || contact?.lastName
        ? `${contact?.firstName ?? ""} ${contact?.lastName ?? ""}`.trim()
        : contact?.email;
    return n ? `Profile: ${n}` : "Profile";
  }, [title, contact]);

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, stage }: { status?: string; stage?: string }) => {
      if (!lead?.id) throw new Error("No lead ID");
      return await apiFetch("PATCH", `/api/crm/leads/${lead.id}`, { status, stage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm:leads:details", lead?.id] });
      queryClient.invalidateQueries({ queryKey: ["crm:leads:list"] });
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  // Convert mutation
  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!lead?.id) throw new Error("No lead ID");
      return await apiFetch<{ leadId: string; contactId: string }>(
        "POST",
        `/api/crm/leads/${lead.id}/convert`
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm:leads:list"] });
      toast({ title: "Lead converted successfully" });
      onOpenChange(false);
      setLocation(`/client-profiles?contact=${data.contactId}`);
    },
    onError: () => {
      toast({ title: "Failed to convert lead", variant: "destructive" });
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!lead?.id) throw new Error("No lead ID");
      return await apiFetch("POST", `/api/crm/leads/${lead.id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm:leads:list"] });
      toast({ title: "Lead archived" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to archive lead", variant: "destructive" });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: {
      channel: "email" | "sms";
      to: string;
      subject?: string;
      body: string;
    }) => {
      if (!lead?.id) throw new Error("No lead ID");
      return await apiFetch("POST", `/api/crm/leads/${lead.id}/messages`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm:contact:details", contactIdOrEmail] });
      toast({ title: "Message sent" });
      // Clear form
      if (messageChannel === "email") {
        setEmailSubject("");
        setEmailBody("");
      } else {
        setSmsBody("");
      }
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const handleSendMessage = () => {
    if (messageChannel === "email") {
      if (!emailTo || !emailSubject || !emailBody) return;
      sendMessageMutation.mutate({
        channel: "email",
        to: emailTo,
        subject: emailSubject,
        body: emailBody,
      });
    } else {
      if (!smsTo || !smsBody) return;
      sendMessageMutation.mutate({
        channel: "sms",
        to: smsTo,
        body: smsBody,
      });
    }
  };

  // Render Overview/Messages using contact when available, falling back to lead payload
  const payloadForDisplay: any = (lead?.payload as any) || {};
  const displayFirst = contact?.firstName ?? payloadForDisplay.firstName;
  const displayLast = contact?.lastName ?? payloadForDisplay.lastName;
  const displayEmail = contact?.email ?? payloadForDisplay.email;
  const displayPhone = contact?.phone ?? payloadForDisplay.phone;
  const displayCompany = contact?.companyName ?? payloadForDisplay.companyName;

  // Render tabs always; conditionally render contact-driven sections
  const contactContent: JSX.Element = (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="messages">Messages</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-4">
        <div>
          <div className="font-medium">
            {displayFirst || displayLast
              ? `${displayFirst ?? ""} ${displayLast ?? ""}`.trim()
              : displayCompany || displayEmail || "-"}
          </div>
          {displayEmail && <div className="text-sm text-muted-foreground">{displayEmail}</div>}
          {displayPhone && <div className="text-sm text-muted-foreground">{displayPhone}</div>}
          {displayCompany && <div className="text-sm text-muted-foreground">{displayCompany}</div>}
          {!enabled && (
            <div className="text-xs text-muted-foreground mt-2">
              No contact linked to this lead yet.
            </div>
          )}
          {enabled && isLoading && (
            <div className="text-xs text-muted-foreground mt-2">Loading contact…</div>
          )}
        </div>

        {contact && Array.isArray(contact.deals) && contact.deals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {contact.deals.map((d: CRMDeal) => (
                <div key={String(d.id)} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.name ?? `Deal ${d.id}`}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.pipeline ?? "-"} • {d.stage ?? "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs">
                      {typeof d.amount === "number" ? `$${d.amount.toLocaleString()}` : "-"}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {contact && Array.isArray(contact.quotes) && contact.quotes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quotes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {contact.quotes.map((q: CRMQuote) => (
                <div key={String(q.id)} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{q.quoteType}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {q.serviceTier ?? "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs">${q.monthlyFee}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="messages" className="space-y-4 mt-4">
        {/* Message Compose */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Send Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={messageChannel === "email" ? "default" : "outline"}
                onClick={() => setMessageChannel("email")}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
              <Button
                size="sm"
                variant={messageChannel === "sms" ? "default" : "outline"}
                onClick={() => setMessageChannel("sms")}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                SMS
              </Button>
            </div>

            {messageChannel === "email" ? (
              <>
                <Input
                  placeholder="To (email)"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
                <Input
                  placeholder="Subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
                <Textarea
                  placeholder="Message body..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={4}
                />
              </>
            ) : (
              <>
                <Input
                  placeholder="To (phone number)"
                  value={smsTo}
                  onChange={(e) => setSmsTo(e.target.value)}
                />
                <Textarea
                  placeholder="Message body..."
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  rows={4}
                />
              </>
            )}

            <Button
              onClick={handleSendMessage}
              disabled={sendMessageMutation.isPending}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              Send {messageChannel === "email" ? "Email" : "SMS"}
            </Button>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Message History</CardTitle>
          </CardHeader>
          <CardContent>
            {contact && Array.isArray(contact.messages) && contact.messages.length > 0 ? (
              <div className="space-y-3">
                {(contact.messages as ContactMessage[]).slice(0, 10).map((msg) => (
                  <div key={String(msg.id)} className="text-sm border-l-2 pl-3 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {msg.channel}
                      </Badge>
                      <Badge
                        variant={msg.direction === "outbound" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {msg.direction}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                      </span>
                    </div>
                    <div className="text-sm">
                      {(msg.body ?? "").substring(0, 150)}
                      {msg.body && msg.body.length > 150 ? "..." : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No messages yet.</div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  // Main content that can be rendered in Sheet or Dialog
  const mainContent = (
    <>
      {/* Lead Status & Quick Actions */}
      {lead && (
        <div className="mt-4 space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Lead Status
                <Badge variant="secondary" className="capitalize">
                  {lead.status}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {lead.stage.replace(/_/g, " ")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <div className="text-muted-foreground">Source</div>
                  <div className="capitalize">{lead.source}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-muted-foreground">Assigned</div>
                  <div>{lead.assignedTo ?? "-"}</div>
                </div>
              </div>

              {/* Pipeline Progression */}
              <div className="pt-2 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Pipeline Progression
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ status: "new" })}
                    disabled={updateStatusMutation.isPending}
                  >
                    New
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateStatusMutation.mutate({ status: "assigned", stage: "assigned" })
                    }
                    disabled={updateStatusMutation.isPending}
                  >
                    Assigned
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ status: "validated" })}
                    disabled={updateStatusMutation.isPending}
                  >
                    Contact Made
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ stage: "discovery_booked" })}
                    disabled={updateStatusMutation.isPending}
                  >
                    Discovery Booked
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ status: "disqualified" })}
                    disabled={updateStatusMutation.isPending}
                  >
                    Not Interested
                  </Button>
                </div>
              </div>

              {/* Convert & Archive Actions */}
              <div className="pt-2 border-t flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => convertMutation.mutate()}
                  disabled={convertMutation.isPending}
                  className="flex-1"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Send to Calculator
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => archiveMutation.mutate()}
                  disabled={archiveMutation.isPending}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator className="my-4" />

      {/* Contact Details & Messages */}
      {contactContent}
    </>
  );

  // Render in modal (Dialog) or Sheet depending on prop
  if (isModal) {
    return mainContent;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[580px] sm:w-[640px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{headerTitle}</SheetTitle>
        </SheetHeader>
        {mainContent}
      </SheetContent>
    </Sheet>
  );
}

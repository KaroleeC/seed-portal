/**
 * LeadAssociationModal Component
 *
 * Modal for searching and associating email threads with leads
 * Features:
 * - Real-time lead search
 * - Show current associations
 * - Add/remove lead links
 * - Link multiple leads to one thread
 */

import { useState } from "react";
import { Search, X, Check, Loader2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLeadSearch } from "../hooks/useLeadSearch";
import { useThreadLeads } from "../hooks/useThreadLeads";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface LeadAssociationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  threadSubject?: string;
}

export function LeadAssociationModal({
  open,
  onOpenChange,
  threadId,
  threadSubject,
}: LeadAssociationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { leads, isLoading, searchQuery, setSearchQuery } = useLeadSearch();
  const { leadIds, hasLeads } = useThreadLeads(threadId);

  // Link thread to lead
  const linkMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch("/api/email/lead-linking/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, leadId }),
        credentials: "include", // Send auth cookies
      });

      if (!response.ok) {
        throw new Error("Failed to link thread to lead");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/email/lead-linking/thread/:threadId/leads", threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads"] });

      toast({
        title: "Lead associated",
        description: "Thread successfully linked to lead",
      });
    },
    onError: () => {
      toast({
        title: "Failed to associate",
        description: "Could not link thread to lead",
        variant: "destructive",
      });
    },
  });

  // Unlink thread from lead
  const unlinkMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch("/api/email/lead-linking/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, leadId }),
        credentials: "include", // Send auth cookies
      });

      if (!response.ok) {
        throw new Error("Failed to unlink thread from lead");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/email/lead-linking/thread/:threadId/leads", threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads"] });

      toast({
        title: "Lead unlinked",
        description: "Thread successfully unlinked from lead",
      });
    },
    onError: () => {
      toast({
        title: "Failed to unlink",
        description: "Could not unlink thread from lead",
        variant: "destructive",
      });
    },
  });

  const isLinked = (leadId: string) => leadIds.includes(leadId);

  const handleToggleLink = (leadId: string) => {
    if (isLinked(leadId)) {
      unlinkMutation.mutate(leadId);
    } else {
      linkMutation.mutate(leadId);
    }
  };

  const getLeadDisplayName = (lead: any) => {
    const name = [lead.contactFirstName, lead.contactLastName].filter(Boolean).join(" ");
    return name || lead.contactEmail || "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Associate with Lead</DialogTitle>
          <DialogDescription>
            {threadSubject && (
              <span className="block mt-1 text-sm">
                Thread: <span className="font-medium">{threadSubject}</span>
              </span>
            )}
            {hasLeads && (
              <span className="block mt-2 text-xs text-muted-foreground">
                {leadIds.length} lead{leadIds.length !== 1 ? "s" : ""} currently associated
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Search Results */}
        <ScrollArea className="h-[400px] pr-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && searchQuery.length >= 2 && leads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No leads found matching "{searchQuery}"
            </div>
          )}

          {!isLoading && searchQuery.length < 2 && (
            <div className="text-center py-8 text-muted-foreground">
              Type at least 2 characters to search for leads
            </div>
          )}

          {!isLoading && leads.length > 0 && (
            <div className="space-y-2">
              {leads.map((lead) => {
                const linked = isLinked(lead.id);
                const isPending = linkMutation.isPending || unlinkMutation.isPending;

                return (
                  <div
                    key={lead.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors ${
                      linked ? "bg-accent/20 border-primary/30" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{getLeadDisplayName(lead)}</p>
                        {linked && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {lead.contactCompanyName && (
                          <span className="text-sm text-muted-foreground truncate">
                            {lead.contactCompanyName}
                          </span>
                        )}
                        {lead.contactEmail && (
                          <span className="text-xs text-muted-foreground truncate">
                            {lead.contactEmail}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {lead.stage}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {lead.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant={linked ? "secondary" : "default"}
                        size="sm"
                        onClick={() => handleToggleLink(lead.id)}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : linked ? (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Unlink
                          </>
                        ) : (
                          "Link"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

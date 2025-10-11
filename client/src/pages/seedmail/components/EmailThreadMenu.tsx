/**
 * EmailThreadMenu Component
 *
 * 3-dot menu for email threads with lead-related actions:
 * 1. Open in LEADIQ - Opens lead in LEADIQ app (enabled if lead exists)
 * 2. Create Lead - Opens lead creation modal (enabled if NO lead exists)
 * 3. Associate with Existing Lead - Opens association modal (always enabled)
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { MoreVertical, ExternalLink, UserPlus, Link as LinkIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useThreadLeads } from "../hooks/useThreadLeads";

interface EmailThreadMenuProps {
  threadId: string;
  onCreateLead?: () => void;
  onAssociateLead?: () => void;
}

export function EmailThreadMenu({ threadId, onCreateLead, onAssociateLead }: EmailThreadMenuProps) {
  const [, setLocation] = useLocation();
  const { hasLeads, primaryLeadId, leadIds, isLoading } = useThreadLeads(threadId);
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenInLeadiq = () => {
    if (primaryLeadId) {
      setLocation(`/apps/leads-inbox?lead=${primaryLeadId}`);
    }
    setIsOpen(false);
  };

  const handleCreateLead = () => {
    onCreateLead?.();
    setIsOpen(false);
  };

  const handleAssociateLead = () => {
    onAssociateLead?.();
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation(); // Prevent thread selection
          }}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Thread actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Lead Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Open in LEADIQ */}
        <DropdownMenuItem
          disabled={!hasLeads || isLoading}
          onClick={handleOpenInLeadiq}
          className="cursor-pointer"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>Open in LEADIQ</span>
          {leadIds.length > 1 && (
            <span className="ml-auto text-xs text-muted-foreground">+{leadIds.length - 1}</span>
          )}
        </DropdownMenuItem>

        {/* Create Lead */}
        <DropdownMenuItem
          disabled={hasLeads || isLoading}
          onClick={handleCreateLead}
          className="cursor-pointer"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          <span>Create Lead</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Associate with Existing Lead */}
        <DropdownMenuItem onClick={handleAssociateLead} className="cursor-pointer">
          <LinkIcon className="mr-2 h-4 w-4" />
          <span>Associate with Existing Lead</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

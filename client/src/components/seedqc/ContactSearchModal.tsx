import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, ChevronRight } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerEmail: string;
  contactSearchTerm: string;
  setContactSearchTerm: (val: string) => void;
  searchHubSpotContacts: (term: string) => void;
  isContactSearching: boolean;
  hubspotContacts: any[];
  onContactSelect: (contact: any) => void;
  onCreateNewQuote: () => void;
};

export function ContactSearchModal({
  open,
  onOpenChange,
  triggerEmail,
  contactSearchTerm,
  setContactSearchTerm,
  searchHubSpotContacts,
  isContactSearching,
  hubspotContacts,
  onContactSelect,
  onCreateNewQuote,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="qa-contact-search-modal">
        <DialogHeader>
          <DialogTitle>Search HubSpot Contacts</DialogTitle>
          <DialogDescription>
            Find an existing contact or create a new quote for "{triggerEmail}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={contactSearchTerm}
              onChange={(e) => {
                setContactSearchTerm(e.target.value);
                searchHubSpotContacts(e.target.value);
              }}
              className="pl-10"
              data-testid="qa-contact-search-input"
            />
          </div>

          {isContactSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-muted-foreground">Searching contacts...</span>
            </div>
          )}

          {!isContactSearching && hubspotContacts.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {hubspotContacts.map((contact) => (
                <Card
                  key={contact.id}
                  className="cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => onContactSelect(contact)}
                  data-testid="qa-contact-result"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {contact.properties.firstname} {contact.properties.lastname}
                        </p>
                        <p className="text-sm text-blue-600">{contact.properties.email}</p>
                        {contact.properties.company && (
                          <p className="text-sm text-muted-foreground">
                            {contact.properties.company}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isContactSearching && contactSearchTerm && hubspotContacts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No contacts found matching "{contactSearchTerm}"
              </p>
              <Button onClick={onCreateNewQuote} variant="outline" data-testid="qa-create-new-quote">
                Create New Quote for "{triggerEmail}"
              </Button>
            </div>
          )}

          {/* Show existing quotes for selected contact is handled separately */}
        </div>
      </DialogContent>
    </Dialog>
  );
}

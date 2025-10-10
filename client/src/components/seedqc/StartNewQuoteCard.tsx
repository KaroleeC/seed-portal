import React from "react";
import { SurfaceCard } from "@/components/ds/SurfaceCard";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, User } from "lucide-react";

type Props = {
  triggerEmail: string;
  setTriggerEmail: (email: string) => void;
  showLiveResults: boolean;
  setShowLiveResults: (v: boolean) => void;
  liveSearchResults: any[];
  isLiveSearching: boolean;
  onContactClick: (contact: any) => void;
  onEmailTrigger: (email: string) => void;
  liveSearchContacts: (term: string) => void;
};

export function StartNewQuoteCard({
  triggerEmail,
  setTriggerEmail,
  showLiveResults,
  setShowLiveResults,
  liveSearchResults,
  isLiveSearching,
  onContactClick,
  onEmailTrigger,
  liveSearchContacts,
}: Props) {
  return (
    <SurfaceCard overflowVisible className="max-w-lg mx-auto mb-8">
      <CardContent className="p-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-full mx-auto mb-6">
          <User className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Start New Quote</h2>
        <p className="text-muted-foreground mb-6">
          Enter a client email to begin the quoting process
        </p>

        <div className="space-y-4">
          <div className="relative">
            <Input
              type="email"
              placeholder="client@company.com"
              value={triggerEmail}
              onChange={(e) => {
                const email = e.target.value;
                setTriggerEmail(email);
                if (email.length >= 3) {
                  liveSearchContacts(email);
                } else {
                  setShowLiveResults(false);
                }
              }}
              className="border text-center text-lg py-3"
              onKeyPress={(e) => {
                if (e.key === "Enter" && triggerEmail.includes("@")) {
                  if (liveSearchResults.length > 0) {
                    onContactClick(liveSearchResults[0]);
                  } else {
                    onEmailTrigger(triggerEmail);
                  }
                }
              }}
              onFocus={() => {
                if (triggerEmail.length >= 3) {
                  setShowLiveResults(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowLiveResults(false), 300);
              }}
            />

            {showLiveResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                {isLiveSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                  </div>
                ) : liveSearchResults.length > 0 ? (
                  <div className="py-1">
                    {liveSearchResults.slice(0, 5).map((contact) => (
                      <div
                        key={contact.id}
                        className="px-4 py-2 hover:bg-muted cursor-pointer text-left"
                        onClick={() => onContactClick(contact)}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <div className="font-medium text-foreground">
                          {contact.properties.firstname} {contact.properties.lastname}
                        </div>
                        <div className="text-sm text-blue-600">{contact.properties.email}</div>
                        {contact.properties.company && (
                          <div className="text-sm text-muted-foreground">
                            {contact.properties.company}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : triggerEmail.length >= 3 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                    No matching contacts found
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </SurfaceCard>
  );
}

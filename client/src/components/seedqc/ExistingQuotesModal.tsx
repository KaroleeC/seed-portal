import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Quote } from "@shared/schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContact: any;
  existingQuotesForEmail: Quote[];
  onQuoteClick: (quote: Quote) => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  infoMessage?: string;
};

export function ExistingQuotesModal({
  open,
  onOpenChange,
  selectedContact,
  existingQuotesForEmail,
  onQuoteClick,
  onPrimaryAction,
  primaryActionLabel,
  infoMessage,
}: Props) {
  const hasExisting = (existingQuotesForEmail?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {hasExisting ? "Existing Quotes Found" : "Create New Quote"}
          </DialogTitle>
          <DialogDescription>
            {selectedContact && hasExisting
              ? `Found ${existingQuotesForEmail.length} existing quotes for ${selectedContact.properties.firstname} ${selectedContact.properties.lastname} (${selectedContact.properties.email})`
              : selectedContact
                ? `Create a new quote for ${selectedContact.properties.firstname} ${selectedContact.properties.lastname} (${selectedContact.properties.email})`
                : "Create a new quote for this contact"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {infoMessage && (
            <div className="text-sm text-muted-foreground bg-muted/40 border rounded-md p-2">
              {infoMessage}
            </div>
          )}
          {hasExisting && (
            <div>
              <h4 className="font-medium text-foreground mb-3">
                Existing Quotes for {selectedContact?.properties?.email}
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {existingQuotesForEmail.map((quote) => (
                  <Card
                    key={quote.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            ${Number(quote.monthlyFee ?? 0).toLocaleString()}/mo
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Services:{" "}
                            {[
                              quote.includesBookkeeping && "Bookkeeping",
                              quote.includesTaas && "TaaS",
                              (quote as any).servicePayroll && "Payroll",
                              (quote as any).serviceApArLite && "AP/AR Lite",
                              (quote as any).serviceFpaLite && "FP&A Lite",
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Updated:{" "}
                            {new Date(
                              (quote as any).updatedAt ||
                                (quote as any).createdAt,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            onQuoteClick(quote);
                            onOpenChange(false);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          <div className="border-t pt-4">
            <Button
              onClick={onPrimaryAction}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              {primaryActionLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Upload, AlertCircle } from "lucide-react";

type Props = {
  onSave: () => void;
  onReset: () => void;
  isSaveDisabled: boolean;
  saveLabel: string;
  showHubspotButton: boolean;
  onPushToHubSpot: () => void;
  isPushDisabled: boolean;
  pushLabel: string;
  showNotFoundAlert: boolean;
  editingQuoteId?: number | null;
  hasUnsavedChanges: boolean;
};

export function QuoteActionsBar({
  onSave,
  onReset,
  isSaveDisabled,
  saveLabel,
  showHubspotButton,
  onPushToHubSpot,
  isPushDisabled,
  pushLabel,
  showNotFoundAlert,
  editingQuoteId,
  hasUnsavedChanges,
}: Props) {
  return (
    <div className="pt-6 space-y-3">
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaveDisabled}
          className="flex-1 bg-[#253e31] text-white font-semibold py-4 px-6 rounded-lg hover:bg-[#253e31]/90 active:bg-[#253e31]/80 focus:ring-2 focus:ring-[#e24c00] focus:ring-offset-2 button-shimmer transition-all duration-300"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveLabel}
        </Button>

        <Button
          type="button"
          onClick={onReset}
          variant="outline"
          className="px-4 py-4 border text-muted-foreground hover:bg-muted"
        >
          Reset
        </Button>
      </div>

      {showHubspotButton && (
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={onPushToHubSpot}
            disabled={isPushDisabled}
            className="flex-1 bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-orange-700 active:bg-orange-800 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 button-shimmer transition-all duration-300"
          >
            <Upload className="w-4 h-4 mr-2" />
            {pushLabel}
          </Button>
        </div>
      )}

      {showNotFoundAlert && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Contact not found in HubSpot. Please verify the email address or add
            the contact to HubSpot before pushing.
          </AlertDescription>
        </Alert>
      )}

      {editingQuoteId && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Editing existing quote (ID: {editingQuoteId}). Changes will update
            the original quote.
          </AlertDescription>
        </Alert>
      )}

      {hasUnsavedChanges && !editingQuoteId && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Remember to save your quote before
            leaving.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

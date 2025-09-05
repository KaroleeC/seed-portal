import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuoteSubmissionFlowProps {
  isCalculated: boolean;
  isSubmitting: boolean;
  onSaveQuote: () => Promise<void>;
}

export function QuoteSubmissionFlow({ 
  isCalculated, 
  isSubmitting,
  onSaveQuote
}: QuoteSubmissionFlowProps) {
  if (!isCalculated) return null;

  return (
    <div className="flex justify-end gap-4 mt-6">
      <Button 
        type="submit" 
        disabled={isSubmitting}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Quote
          </>
        )}
      </Button>
    </div>
  );
}
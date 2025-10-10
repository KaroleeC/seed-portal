import { Save, Check } from "lucide-react";

interface DraftStatusIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  show: boolean;
}

export function DraftStatusIndicator({ isSaving, lastSaved, show }: DraftStatusIndicatorProps) {
  if (!show || (!isSaving && !lastSaved)) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {isSaving && (
        <>
          <Save className="h-3 w-3 animate-pulse" />
          <span>Saving draft...</span>
        </>
      )}
      {!isSaving && lastSaved && (
        <>
          <Check className="h-3 w-3 text-green-500" />
          <span>Draft saved</span>
        </>
      )}
    </div>
  );
}

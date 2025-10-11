import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface FailedSendAlertProps {
  statusId: string;
  errorMessage?: string | null;
  bounceType?: string | null;
  bounceReason?: string | null;
  retryCount: number;
  maxRetries: number;
  onDismiss?: () => void;
}

export function FailedSendAlert({
  statusId,
  errorMessage,
  bounceType,
  bounceReason,
  retryCount,
  maxRetries,
  onDismiss,
}: FailedSendAlertProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canRetry = retryCount < maxRetries;

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const response = await apiRequest(`/api/email/retry-send/${statusId}`, {
        method: "POST",
      });

      if (response.success) {
        toast({
          title: "Email sent!",
          description: "Your email was successfully sent on retry.",
        });
        
        // Invalidate queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ["/api/email/threads"] });
        queryClient.invalidateQueries({ queryKey: ["/api/email/send-status"] });
        
        if (onDismiss) onDismiss();
      } else {
        throw new Error(response.message || "Retry failed");
      }
    } catch (error: any) {
      toast({
        title: "Retry failed",
        description: error?.message || "Failed to resend email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const getBounceTypeLabel = (type: string) => {
    switch (type) {
      case "hard":
        return "Permanent failure";
      case "soft":
        return "Temporary failure";
      case "complaint":
        return "Spam complaint";
      default:
        return "Failure";
    }
  };

  return (
    <Alert variant="destructive" className="border-destructive/50">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>
          {bounceType ? getBounceTypeLabel(bounceType) : "Send Failed"}
        </span>
        {canRetry && (
          <span className="text-xs font-normal text-muted-foreground">
            Attempt {retryCount + 1}/{maxRetries}
          </span>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm">
          {bounceReason || errorMessage || "Failed to send email"}
        </p>
        
        {bounceType === "hard" && (
          <p className="text-xs text-muted-foreground">
            This email address appears to be invalid or doesn't exist. Please verify the recipient address.
          </p>
        )}
        
        {bounceType === "soft" && (
          <p className="text-xs text-muted-foreground">
            This is a temporary issue. The retry will happen automatically, or you can retry manually.
          </p>
        )}
        
        {bounceType === "complaint" && (
          <p className="text-xs text-muted-foreground">
            Your email was marked as spam. Please review your content and recipient list.
          </p>
        )}

        <div className="flex items-center gap-2 pt-2">
          {canRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              disabled={isRetrying}
              className="gap-2"
            >
              <RotateCcw className={`h-3 w-3 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Retrying..." : "Retry Send"}
            </Button>
          )}
          
          {!canRetry && (
            <p className="text-xs text-muted-foreground">
              Maximum retry attempts reached. Please compose a new email.
            </p>
          )}
          
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

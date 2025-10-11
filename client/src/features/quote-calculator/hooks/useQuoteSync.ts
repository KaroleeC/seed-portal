/**
 * useQuoteSync - Provider-Agnostic Quote Sync Hook
 *
 * Refactored from useHubSpotSync to be CRM-agnostic.
 * Works with any IQuoteProvider (HubSpot, SeedPay, etc.)
 *
 * Migration Strategy:
 * - Swap provider via getQuoteProvider() factory
 * - Zero changes to this hook or Calculator UI
 * - Business logic separated from integration logic
 */

import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useJobPolling } from "@/hooks/useJobPolling";
import type { Quote } from "@shared/schema";
import type { UseFormReturn } from "react-hook-form";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import type { FeeCalculation } from "@/components/seedqc/types";
import { getQuoteProvider } from "../providers";
import { validateQuoteForSync, formatValidationErrors } from "../validators/quote-validator";

export type QuoteSyncVerificationStatus = "idle" | "verifying" | "verified" | "not-found";

export interface UseQuoteSyncOptions {
  form: UseFormReturn<QuoteFormFields>;
  feeCalculation: FeeCalculation;
  editingQuoteId: number | null;
  hasUnsavedChanges: boolean;
  allQuotes: Quote[];
  isCalculated: boolean;
  verificationStatus: QuoteSyncVerificationStatus;
  creating?: boolean;
  refetchQuotes: () => any;
  saveQuote: (data: QuoteFormFields) => Promise<Quote>;
  clearUnsavedChanges: () => void;
}

export type QuoteSyncActionDecision =
  | "save_then_sync"
  | "update_quote_then_sync"
  | "update_then_sync"
  | "error_save_first";

/**
 * Decide what action to take based on quote state
 *
 * DRY: Extracted pure function for testing
 */
export function decideSyncAction(params: {
  hasExternalIds: boolean;
  hasUnsavedChanges: boolean;
  editingQuoteId: number | null;
}): QuoteSyncActionDecision {
  const { hasExternalIds, hasUnsavedChanges, editingQuoteId } = params;

  if (!hasExternalIds && hasUnsavedChanges) return "save_then_sync";
  if (hasExternalIds && hasUnsavedChanges) return "update_quote_then_sync";
  if (!hasExternalIds && editingQuoteId) return "update_then_sync";

  return "error_save_first";
}

/**
 * Build enhanced form data with calculated fees
 *
 * DRY: Extracted pure function for testing
 */
export function buildEnhancedFormData(formValues: QuoteFormFields, f: FeeCalculation) {
  return {
    ...formValues,
    monthlyFee: f.combined.monthlyFee.toString(),
    setupFee: f.combined.setupFee.toString(),
    bookkeepingMonthlyFee: f.bookkeeping.monthlyFee.toString(),
    taasMonthlyFee: f.taas.monthlyFee.toString(),
    taasPriorYearsFee: f.taas.setupFee.toString(),
    serviceTierFee: Number(f.serviceTierFee || 0).toString(),
    cleanupProjectFee: Number(f.cleanupProjectFee || 0).toString(),
    priorYearFilingsFee: Number(f.priorYearFilingsFee || 0).toString(),
    payrollFee: Number(f.payrollFee || 0).toString(),
    apFee: Number(f.apFee || 0).toString(),
    arFee: Number(f.arFee || 0).toString(),
    agentOfServiceFee: Number(f.agentOfServiceFee || 0).toString(),
    cfoAdvisoryFee: Number(f.cfoAdvisoryFee || 0).toString(),
  } as any;
}

/**
 * Provider-agnostic quote sync hook
 *
 * Works with HubSpot today, SeedPay tomorrow
 */
export function useQuoteSync(options: UseQuoteSyncOptions) {
  const opts = options;
  const { toast } = useToast();
  const provider = getQuoteProvider();

  // Job polling for async operations
  const jobPolling = useJobPolling({
    endpoint: "/api/hubspot/sync-jobs", // TODO: Make provider-agnostic
    interval: 1000,
    timeout: 30000,
    onSuccess: (result: any) => {
      toast({
        title: "✅ Quote Synced",
        description: `Quote has been successfully synced to ${provider.name}!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      opts.refetchQuotes();
    },
    onError: (error: string) => {
      toast({
        title: "Sync Failed",
        description: error || `Failed to sync quote. Please try again.`,
        variant: "destructive",
      });
    },
    onTimeout: () => {
      toast({
        title: "Sync Timeout",
        description:
          "Quote sync is taking longer than expected. Check the quote status in a moment.",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async ({
      quoteId,
      action,
    }: {
      quoteId: number;
      action: "auto" | "create" | "update";
    }) => {
      const result = await provider.syncQuote(quoteId, { action });
      return { ...result, quoteId };
    },
    onSuccess: (data) => {
      if (data.queued && data.jobId) {
        toast({
          title: "🔄 Syncing Quote...",
          description: "Quote sync started. This will complete in a few seconds.",
        });
        jobPolling.startPolling(data.jobId);
      } else {
        toast({
          title: "✅ Quote Synced",
          description: `Quote has been successfully synced!`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
        opts.refetchQuotes();
      }
    },
    onError: (error) => {
      toast({
        title: "Sync Error",
        description: error?.message || "Failed to sync quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const result = await provider.syncQuote(quoteId, { action: "update" });
      return { ...result, quoteId };
    },
    onSuccess: (data) => {
      if (data.queued && data.jobId) {
        toast({
          title: "🔄 Updating Quote...",
          description: "Quote update started. This will complete in a few seconds.",
        });
        jobPolling.startPolling(data.jobId);
        opts.clearUnsavedChanges?.();
      } else {
        toast({
          title: "Quote Updated",
          description: "Quote successfully updated.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
        opts.refetchQuotes();
        opts.clearUnsavedChanges?.();
      }
    },
    onError: (error) => {
      toast({
        title: "Update Error",
        description: error?.message || "Failed to update quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSyncQuote = async () => {
    const { editingQuoteId, hasUnsavedChanges, allQuotes } = opts;
    const currentQuote = editingQuoteId
      ? allQuotes?.find((q: Quote) => q.id === editingQuoteId)
      : null;

    // Check for external IDs (provider-agnostic)
    const hasExternalIds = !!(currentQuote?.hubspotQuoteId && currentQuote?.hubspotDealId);

    // Validate before sync
    const formValues = opts.form.getValues();
    const validation = validateQuoteForSync(formValues, opts.feeCalculation);

    if (!validation.isValid) {
      toast({
        title: "Required Fields Missing",
        description: formatValidationErrors(validation),
        variant: "destructive",
      });
      return;
    }

    const decision = decideSyncAction({
      hasExternalIds,
      hasUnsavedChanges,
      editingQuoteId,
    });

    if (decision === "save_then_sync") {
      const formData = opts.form.getValues();
      try {
        const savedQuote = await opts.saveQuote(formData);
        toast({
          title: "✅ Quote Saved Successfully",
          description: `Quote #${savedQuote.id} has been saved. Syncing in background...`,
        });
        setTimeout(() => {
          syncMutation.mutate({ quoteId: savedQuote.id, action: "auto" });
        }, 100);
      } catch (error) {
        console.error("Failed to save quote:", error);
        toast({
          title: "Error",
          description: "Failed to save quote. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    if (decision === "update_quote_then_sync") {
      const quoteId = editingQuoteId || currentQuote?.id;
      if (!quoteId) return;

      const formData = opts.form.getValues();
      try {
        await apiRequest(`/api/quotes/${quoteId}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
        toast({
          title: "✅ Quote Updated Successfully",
          description: `Quote #${quoteId} updated. Syncing...`,
        });
        updateMutation.mutate(quoteId);
      } catch (error) {
        console.error("Failed to update quote before sync:", error);
        toast({
          title: "Error",
          description: "Failed to update quote. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    if (decision === "update_then_sync") {
      const formData = opts.form.getValues();
      try {
        await apiRequest(`/api/quotes/${editingQuoteId}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
        toast({
          title: "✅ Quote Updated",
          description: "Quote updated. Now syncing...",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
        opts.refetchQuotes();
        syncMutation.mutate({ quoteId: editingQuoteId as number, action: "auto" });
      } catch (error) {
        console.error("Failed to update quote before sync:", error);
        toast({
          title: "Error",
          description: "Failed to update quote. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    // error_save_first
    toast({
      title: "Error",
      description: "Please save the quote first before syncing.",
      variant: "destructive",
    });
  };

  const formValues = opts.form.getValues();
  const validation = validateQuoteForSync(formValues, opts.feeCalculation);

  const isSyncDisabled =
    !opts.isCalculated ||
    !validation.isValid ||
    opts.verificationStatus !== "verified" ||
    syncMutation.isPending ||
    updateMutation.isPending ||
    jobPolling.isPolling ||
    !!opts.creating;

  const syncLabel =
    syncMutation.isPending ||
    updateMutation.isPending ||
    jobPolling.isPolling ||
    (!!opts.creating && !opts.editingQuoteId)
      ? jobPolling.isPolling
        ? "Syncing..."
        : "Syncing..."
      : (() => {
          const currentQuote = opts.editingQuoteId
            ? opts.allQuotes.find((q) => q.id === opts.editingQuoteId)
            : null;
          const hasExternalIds = !!(currentQuote?.hubspotQuoteId && currentQuote?.hubspotDealId);

          // Provider-aware button text
          return hasExternalIds ? `Update in ${provider.name}` : `Submit Quote`;
        })();

  return {
    onSyncQuote,
    isSyncDisabled,
    syncLabel,
    syncMutation,
    updateMutation,
    provider,
  };
}

// Backward compatibility: Export with old name
export { useQuoteSync as useHubSpotSync };
export { decideSyncAction as decideHubSpotAction };

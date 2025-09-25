import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Quote } from "@shared/schema";
import type { UseFormReturn } from "react-hook-form";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import type { FeeCalculation } from "@/components/seedqc/types";

export type HubSpotVerificationStatus = "idle" | "verifying" | "verified" | "not-found";

export interface UseHubSpotSyncOptions {
  form: UseFormReturn<QuoteFormFields>;
  feeCalculation: FeeCalculation;
  editingQuoteId: number | null;
  hasUnsavedChanges: boolean;
  allQuotes: Quote[];
  isCalculated: boolean;
  hubspotVerificationStatus: HubSpotVerificationStatus;
  creating?: boolean;
  refetchQuotes: () => any;
  saveQuote: (data: QuoteFormFields) => Promise<Quote>;
  clearUnsavedChanges: () => void;
}

export type HubSpotActionDecision =
  | "save_then_create"
  | "update_quote_then_update"
  | "update_then_create"
  | "error_save_first";

export function decideHubSpotAction(params: {
  hasHubSpotIds: boolean;
  hasUnsavedChanges: boolean;
  editingQuoteId: number | null;
}): HubSpotActionDecision {
  const { hasHubSpotIds, hasUnsavedChanges, editingQuoteId } = params;
  if (!hasHubSpotIds && hasUnsavedChanges) return "save_then_create";
  if (hasHubSpotIds && hasUnsavedChanges) return "update_quote_then_update";
  if (!hasHubSpotIds && editingQuoteId) return "update_then_create";
  return "error_save_first";
}

// Pure helper for tests and payload shape validation
export function buildEnhancedFormData(
  formValues: QuoteFormFields,
  f: FeeCalculation,
) {
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

export function useHubSpotSync(options: UseHubSpotSyncOptions) {
  const opts = options;
  const { toast } = useToast();

  // Validate required fields for selected services. Keep it minimal for TaaS first.
  function getMissingFields(values: QuoteFormFields, f: FeeCalculation): string[] {
    const missing: string[] = [];
    const includesTaas = Boolean(f?.includesTaas) || Boolean((values as any).includesTaas);
    if (includesTaas) {
      if (!values.monthlyRevenueRange) missing.push("monthlyRevenueRange");
      if (!values.industry) missing.push("industry");
      if (!values.numEntities || Number(values.numEntities) <= 0)
        missing.push("numEntities");
      if (!values.statesFiled || Number(values.statesFiled) <= 0)
        missing.push("statesFiled");
      if (values.internationalFiling === undefined || values.internationalFiling === null)
        missing.push("internationalFiling");
      if (!values.numBusinessOwners || Number(values.numBusinessOwners) <= 0)
        missing.push("numBusinessOwners");
      if (values.include1040s === undefined || values.include1040s === null)
        missing.push("include1040s");
    }
    return missing;
  }

  const pushToHubSpotMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const result = await apiRequest("/api/hubspot/queue-sync", {
        method: "POST",
        body: JSON.stringify({ quoteId, action: "create" }),
      });
      return { ...result, quoteId } as any;
    },
    onSuccess: (data: any) => {
      toast({
        title: "✅ Pushed to HubSpot",
        description:
          data.method === "queued"
            ? "Quote sync has been queued for HubSpot. You'll be notified when complete."
            : "Quote has been successfully synchronized to HubSpot!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      opts.refetchQuotes();
    },
    onError: (error: any) => {
      toast({
        title: "HubSpot Error",
        description: error?.message || "Failed to push quote to HubSpot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateHubSpotMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const currentFormData = opts.form.getValues();
      const enhancedFormData = buildEnhancedFormData(
        currentFormData,
        opts.feeCalculation,
      );
      const result = await apiRequest("/api/hubspot/update-quote", {
        method: "POST",
        body: JSON.stringify({ quoteId, currentFormData: enhancedFormData }),
      });
      return result as any;
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "HubSpot Updated",
          description: "Quote successfully updated in HubSpot and saved.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
        opts.refetchQuotes();
        opts.clearUnsavedChanges?.();
      } else if (data.needsNewQuote) {
        toast({
          title: "Quote Expired",
          description:
            "The HubSpot quote is no longer active. Use 'Push to HubSpot' to create a new quote.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "HubSpot Error",
        description:
          error?.message || "Failed to update quote in HubSpot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onPushToHubSpot = async () => {
    const { editingQuoteId, hasUnsavedChanges, allQuotes } = opts;
    const currentQuote = editingQuoteId
      ? allQuotes?.find((q: Quote) => q.id === editingQuoteId)
      : null;
    const hasHubSpotIds = !!(
      currentQuote?.hubspotQuoteId && currentQuote?.hubspotDealId
    );

    const decision = decideHubSpotAction({
      hasHubSpotIds,
      hasUnsavedChanges,
      editingQuoteId,
    });

    // Ensure required fields completeness for selected services
    const formValues = opts.form.getValues();
    const missing = getMissingFields(formValues, opts.feeCalculation);
    if (missing.length > 0) {
      toast({
        title: "Required Fields Missing",
        description:
          "Please complete the following before pushing to HubSpot: " +
          missing.join(", "),
        variant: "destructive",
      });
      return;
    }

    if (decision === "save_then_create") {
      const formData = opts.form.getValues();
      try {
        const savedQuote = await opts.saveQuote(formData);
        toast({
          title: "✅ Quote Saved Successfully",
          description: `Quote #${savedQuote.id} has been saved. Syncing to HubSpot in background...`,
        });
        setTimeout(async () => {
          try {
            const response = await apiRequest("/api/hubspot/queue-sync", {
              method: "POST",
              body: JSON.stringify({ quoteId: savedQuote.id, action: "create" }),
            });
            if (response.method === "queued") {
              toast({
                title: "🔄 HubSpot Sync Queued",
                description:
                  "Quote sync has been queued. You'll be notified when complete.",
              });
            } else {
              toast({
                title: "✅ HubSpot Sync Complete",
                description:
                  "Quote has been successfully synchronized to HubSpot!",
              });
            }
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
              opts.refetchQuotes();
            }, 2000);
          } catch (error) {
            console.error("Failed to queue HubSpot sync:", error);
            pushToHubSpotMutation.mutate(savedQuote.id);
          }
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

    if (decision === "update_quote_then_update") {
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
          description: `Quote #${quoteId} updated. Syncing to HubSpot...`,
        });
        updateHubSpotMutation.mutate(quoteId);
      } catch (error) {
        console.error("Failed to update quote before HubSpot sync:", error);
        toast({
          title: "Error",
          description: "Failed to update quote. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    if (decision === "update_then_create") {
      const formData = opts.form.getValues();
      try {
        await apiRequest(`/api/quotes/${editingQuoteId}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
        toast({
          title: "✅ Quote Updated",
          description: "Quote updated. Now pushing to HubSpot...",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
        opts.refetchQuotes();
        pushToHubSpotMutation.mutate(editingQuoteId as number);
      } catch (error) {
        console.error("Failed to update quote before push:", error);
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
      description:
        "Please save the quote first before pushing to HubSpot.",
      variant: "destructive",
    });
  };

  const isPushDisabled =
    !opts.isCalculated ||
    getMissingFields(opts.form.getValues(), opts.feeCalculation).length > 0 ||
    opts.hubspotVerificationStatus !== "verified" ||
    pushToHubSpotMutation.isPending ||
    updateHubSpotMutation.isPending ||
    !!opts.creating;

  const pushLabel =
    pushToHubSpotMutation.isPending ||
    updateHubSpotMutation.isPending ||
    (!!opts.creating && !opts.editingQuoteId)
      ? "Pushing to HubSpot..."
      : (() => {
          const currentQuote = opts.editingQuoteId
            ? opts.allQuotes.find((q) => q.id === opts.editingQuoteId)
            : null;
          const hasHubSpotIds = !!(
            currentQuote?.hubspotQuoteId && currentQuote?.hubspotDealId
          );
          return hasHubSpotIds ? "Update in HubSpot" : "Push to HubSpot";
        })();

  return {
    onPushToHubSpot,
    isPushDisabled,
    pushLabel,
    pushToHubSpotMutation,
    updateHubSpotMutation,
  };
}

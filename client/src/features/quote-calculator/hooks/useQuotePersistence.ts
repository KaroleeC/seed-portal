import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { calculateCombinedFees, calculateQuotePricing } from "@shared/pricing";
import type { PricingConfig as SimplePricingConfig } from "@shared/pricing";
import { mapFormToQuotePayload } from "@/features/quote-calculator/logic/mapping";
import { createQuote as createQuoteApi, updateQuote as updateQuoteApi } from "@/services/quotes";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";

interface UseQuotePersistenceParams {
  form: UseFormReturn<QuoteFormFields>;
  mappedPricingConfig?: SimplePricingConfig;
  editingQuoteId: number | null;
  setEditingQuoteId: (id: number | null) => void;
  refetchQuotes: () => void;
}

export function useQuotePersistence({
  form,
  mappedPricingConfig,
  editingQuoteId,
  setEditingQuoteId,
  refetchQuotes,
}: UseQuotePersistenceParams) {
  const { toast } = useToast();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track unsaved changes by watching the form
  useEffect(() => {
    const subscription = form.watch(() => setHasUnsavedChanges(true));
    return () => subscription.unsubscribe();
  }, [form]);

  const mutation = useMutation({
    mutationFn: async (data: QuoteFormFields) => {
      const rawCalc: any = mappedPricingConfig
        ? calculateQuotePricing(data as any, mappedPricingConfig)
        : calculateCombinedFees(data as any);
      const quoteData = mapFormToQuotePayload(data, rawCalc);
      const result = editingQuoteId
        ? await updateQuoteApi(editingQuoteId, quoteData)
        : await createQuoteApi(quoteData);
      return result;
    },
    onSuccess: (data: any) => {
      toast({
        title: editingQuoteId ? "Quote Updated" : "Quote Saved",
        description: editingQuoteId
          ? "Your quote has been updated successfully."
          : "Your quote has been saved successfully.",
      });
      if (!editingQuoteId && data?.id) setEditingQuoteId(data.id);
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      refetchQuotes();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveQuote = async (data: QuoteFormFields) => {
    return await mutation.mutateAsync(data);
  };

  const clearUnsavedChanges = () => setHasUnsavedChanges(false);

  return {
    hasUnsavedChanges,
    clearUnsavedChanges,
    saveQuote,
    creating: mutation.isPending,
    setHasUnsavedChanges, // exposed if caller needs to force state
  } as const;
}

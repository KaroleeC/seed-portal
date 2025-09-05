import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Quote } from '@shared/schema';
import { FormData } from '@/components/quote-form/QuoteFormSchema';
import { calculateCombinedFees } from '@shared/pricing';

export function useQuoteManagement() {
  const { toast } = useToast();
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch quotes
  const {
    data: quotes = [],
    refetch: refetchQuotes,
    isLoading: quotesLoading
  } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    queryFn: async () => {
      return await apiRequest("/api/quotes");
    }
  });

  // Create/update quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Clean up null values that might cause issues with pricing calculation
      const cleanData = {
        ...data,
        entityType: data.entityType || undefined,
        cleanupComplexity: data.cleanupComplexity || undefined,
        bookkeepingQuality: data.bookkeepingQuality || undefined,
        overrideReason: data.overrideReason || undefined,
        customOverrideReason: data.customOverrideReason || undefined,
      };
      
      const feeCalculation = calculateCombinedFees(cleanData);
      
      const quoteData = {
        ...data,
        monthlyFee: feeCalculation.combined.monthlyFee.toString(),
        setupFee: feeCalculation.combined.setupFee.toString(),
        taasMonthlyFee: feeCalculation.taas.monthlyFee.toString(),
        taasPriorYearsFee: feeCalculation.taas.setupFee.toString(),
        approvalRequired: data.cleanupOverride,
        // Include approval code if this is an approved duplicate quote creation
        approvalCode: data.approvalCode,
      };
      
      if (editingQuoteId) {
        return await apiRequest(`/api/quotes/${editingQuoteId}`, {
          method: "PUT",
          body: JSON.stringify(quoteData)
        });
      } else {
        return await apiRequest("/api/quotes", {
          method: "POST",
          body: JSON.stringify(quoteData)
        });
      }
    },
    onSuccess: (data) => {
      toast({
        title: editingQuoteId ? "Quote Updated" : "Quote Saved",
        description: editingQuoteId ? "Your quote has been updated successfully." : "Your quote has been saved successfully.",
      });
      setEditingQuoteId(null);
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      refetchQuotes();
    },
    onError: (error: any) => {
      console.error('Quote save error:', error);
      
      // Handle approval-based validation errors
      if (error.requiresApproval) {
        toast({
          title: "Approval Required",
          description: error.message || "Approval is required to create additional quotes for this contact.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save quote. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Archive quote mutation
  const archiveQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      return await apiRequest(`/api/quotes/${quoteId}/archive`, {
        method: "PATCH",
        body: JSON.stringify({})
      });
    },
    onSuccess: () => {
      toast({
        title: "Quote Archived",
        description: "Quote has been archived successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      refetchQuotes();
    },
    onError: (error) => {
      console.error('Archive error:', error);
      toast({
        title: "Error",
        description: "Failed to archive quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    quotes,
    quotesLoading,
    refetchQuotes,
    editingQuoteId,
    setEditingQuoteId,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    createQuoteMutation,
    archiveQuoteMutation
  };
}
/**
 * useFormActions Hook
 * 
 * Manages form actions (reset, clear, new quote, load quote).
 * Extracted from QuoteCalculator.tsx for DRY and testability.
 * 
 * Features:
 * - Form reset with confirmation
 * - Clear all fields
 * - Start new quote
 * - Load existing quote into form
 */

import { useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { Quote } from "@shared/schema";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import {
  mapQuoteToFormFields,
  getCriticalNumericFields,
  determineFormView,
} from "@/features/quote-calculator/services/quote-loader";

export interface UseFormActionsOptions {
  form: UseFormReturn<QuoteFormFields>;
  setEditingQuoteId: (id: number | null) => void;
  setCurrentFormView?: (view: "bookkeeping" | "taas" | "placeholder") => void;
  clearUnsavedChanges?: () => void;
  onQuoteLoaded?: (quote: Quote) => void;
  onFormReset?: () => void;
  onNewQuote?: () => void;
}

/**
 * Hook for managing form actions
 * 
 * DRY: Single hook for all form manipulation
 */
export function useFormActions(options: UseFormActionsOptions) {
  const {
    form,
    setEditingQuoteId,
    setCurrentFormView,
    clearUnsavedChanges,
    onQuoteLoaded,
    onFormReset,
    onNewQuote,
  } = options;

  /**
   * Reset form to default values
   * 
   * DRY: Single reset function
   */
  const resetForm = useCallback(() => {
    form.reset();
    setEditingQuoteId(null);
    clearUnsavedChanges?.();
    onFormReset?.();
  }, [form, setEditingQuoteId, clearUnsavedChanges, onFormReset]);

  /**
   * Clear all form fields (same as reset)
   * 
   * DRY: Alias for consistency with UI terminology
   */
  const clearForm = useCallback(() => {
    resetForm();
  }, [resetForm]);

  /**
   * Start a new quote
   * 
   * DRY: Reset + navigate to placeholder view
   */
  const startNewQuote = useCallback(() => {
    resetForm();
    setCurrentFormView?.("placeholder");
    onNewQuote?.();
  }, [resetForm, setCurrentFormView, onNewQuote]);

  /**
   * Load an existing quote into the form
   * 
   * DRY: Single quote loading function with proper React Hook Form handling
   * 
   * Why two-step field setting:
   * React Hook Form has quirks with numeric fields. Setting them twice
   * (once in reset, once in setTimeout) ensures proper type coercion.
   */
  const loadQuote = useCallback(
    (quote: Quote) => {
      // Step 1: Map quote to form fields
      const formData = mapQuoteToFormFields(quote);

      // Step 2: Reset form with mapped data
      form.reset(formData);

      // Step 3: Set critical numeric fields explicitly (React Hook Form quirk fix)
      setTimeout(() => {
        const criticalFields = getCriticalNumericFields(quote);
        Object.entries(criticalFields).forEach(([key, value]) => {
          if (value !== undefined) {
            form.setValue(key as keyof QuoteFormFields, value);
          }
        });
        void form.trigger(); // Re-run validation
      }, 100);

      // Step 4: Determine which form view to show
      if (setCurrentFormView) {
        setTimeout(() => {
          const view = determineFormView(quote);
          setCurrentFormView(view);
        }, 150);
      }

      // Step 5: Update state
      setEditingQuoteId(quote.id);
      clearUnsavedChanges?.();
      onQuoteLoaded?.(quote);
    },
    [form, setEditingQuoteId, setCurrentFormView, clearUnsavedChanges, onQuoteLoaded]
  );

  /**
   * Duplicate a quote (load quote but clear ID)
   * 
   * DRY: Load quote + clear editing state
   */
  const duplicateQuote = useCallback(
    (quote: Quote) => {
      // Load the quote data
      const formData = mapQuoteToFormFields(quote);

      // Reset form with data (but no ID = new quote)
      form.reset(formData);

      // Set critical numeric fields
      setTimeout(() => {
        const criticalFields = getCriticalNumericFields(quote);
        Object.entries(criticalFields).forEach(([key, value]) => {
          if (value !== undefined) {
            form.setValue(key as keyof QuoteFormFields, value);
          }
        });
        void form.trigger();
      }, 100);

      // Determine form view
      if (setCurrentFormView) {
        setTimeout(() => {
          const view = determineFormView(quote);
          setCurrentFormView(view);
        }, 150);
      }

      // Clear editing state (this is a new quote)
      setEditingQuoteId(null);
      clearUnsavedChanges?.();
    },
    [form, setEditingQuoteId, setCurrentFormView, clearUnsavedChanges]
  );

  /**
   * Check if form has any data (to show reset confirmation)
   * 
   * DRY: Single check function
   */
  const hasFormData = useCallback((): boolean => {
    const values = form.getValues();

    // Check if any field has a value
    const hasData =
      !!values.contactEmail ||
      !!values.companyName ||
      !!values.monthlyRevenueRange ||
      !!values.monthlyTransactions ||
      !!values.industry ||
      !!values.entityType;

    return hasData;
  }, [form]);

  return {
    // Actions
    resetForm,
    clearForm,
    startNewQuote,
    loadQuote,
    duplicateQuote,

    // Helpers
    hasFormData,
  };
}

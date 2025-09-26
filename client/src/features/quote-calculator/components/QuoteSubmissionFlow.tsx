/**
 * 🚀 QUOTE SUBMISSION FLOW
 * Maximum 100 lines - submission UI only!
 * Handles final quote submission with proper state management
 */

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, CheckCircle } from "lucide-react";

import {
  QuoteFormData,
  PricingCalculationResult,
  HubSpotContact,
} from "../types/QuoteTypes";

interface QuoteSubmissionFlowProps {
  form: UseFormReturn<QuoteFormData>;
  calculation: PricingCalculationResult;
  selectedContact: HubSpotContact | null;
  isSubmitting: boolean;
  onSubmit: (data: QuoteFormData) => Promise<void>;
}

export const QuoteSubmissionFlow: React.FC<QuoteSubmissionFlowProps> = ({
  form,
  calculation,
  selectedContact,
  isSubmitting,
  onSubmit,
}) => {
  const formData = form.watch();

  // Check if form is ready for submission
  const isReadyForSubmission =
    formData.contactEmail &&
    formData.contactFirstName &&
    formData.contactLastName &&
    formData.clientStreetAddress &&
    formData.clientCity &&
    formData.clientState &&
    formData.clientZipCode &&
    (calculation.totalMonthlyFee > 0 || calculation.totalSetupFee > 0);

  const handleSubmitClick = () => {
    form.handleSubmit(onSubmit)();
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Ready to Submit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Submission Summary */}
        <div className="p-4 bg-white rounded-lg border">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Contact:</span>
              <span className="font-medium">
                {formData.contactFirstName} {formData.contactLastName}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Email:</span>
              <span className="font-medium">{formData.contactEmail}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Company:</span>
              <span className="font-medium">
                {formData.companyName || "Not specified"}
              </span>
            </div>
          </div>
        </div>

        {/* Final Pricing */}
        <div className="p-4 bg-white rounded-lg border">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Monthly Total:</span>
              <span className="font-bold text-green-700">
                ${(calculation.totalMonthlyFee || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Setup Total:</span>
              <span className="font-bold text-blue-700">
                ${(calculation.totalSetupFee || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmitClick}
          disabled={!isReadyForSubmission || isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Quote...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Create Quote
            </>
          )}
        </Button>

        {!isReadyForSubmission && (
          <p className="text-sm text-gray-600 text-center">
            Please complete all required fields and select at least one service
            to continue.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * 🏗️ QUOTE CALCULATOR CONTAINER
 * Maximum 200 lines - orchestration only, no business logic!
 * This replaces the 4,356-line monster with proper separation of concerns
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { calculateCombinedFees } from "@shared/pricing";

// Import our new strongly-typed interfaces
import { 
  QuoteFormData, 
  PricingCalculationResult,
  HubSpotContact
} from "../types/QuoteTypes";
import { VALIDATION } from "../constants/PricingConstants";
import { insertQuoteSchema } from "@shared/schema";

// Import the new split components (will create these next)
import { QuoteFormCore } from "./forms/QuoteFormCore";
import { ServiceSelectionCards } from "./cards/ServiceSelectionCards";
import { PricingDisplayPanel } from "./displays/PricingDisplayPanel";
import { QuoteSubmissionFlow } from "./QuoteSubmissionFlow";
import { ApprovalWorkflow } from "./ApprovalWorkflow";

// Import existing components that are already well-structured
import { UniversalNavbar } from "@/components/UniversalNavbar";

interface QuoteCalculatorContainerProps {
  className?: string;
}

export const QuoteCalculatorContainer: React.FC<QuoteCalculatorContainerProps> = ({ 
  className 
}) => {
  const { toast } = useToast();

  // Form management with proper TypeScript typing
  const form = useForm<QuoteFormData>({
    resolver: zodResolver(insertQuoteSchema.omit({
      monthlyFee: true,
      setupFee: true,
      taasMonthlyFee: true,
      taasPriorYearsFee: true,
      hubspotContactId: true,
      hubspotDealId: true,
      hubspotQuoteId: true,
      hubspotContactVerified: true,
    })),
    defaultValues: {
      // Contact Information
      contactEmail: "",
      contactFirstName: "",
      contactLastName: "",
      contactPhone: "",
      companyName: "",
      
      // Company Address
      clientStreetAddress: "",
      clientCity: "",
      clientState: "",
      clientZipCode: "",
      
      // Business Details
      industry: "",
      monthlyRevenueRange: "",
      entityType: "",
      
      // Service selections
      serviceMonthlyBookkeeping: false,
      serviceTaasMonthly: false,
      serviceCleanupProjects: false,
      servicePriorYearFilings: false,
      serviceCfoAdvisory: false,
      servicePayrollService: false,
      serviceApArService: false,
      serviceArService: false,
      serviceAgentOfService: false,
      
      // Service tier
      serviceTier: 'Automated',
      
      // Additional defaults
      cleanupMonths: 0,
      qboSubscription: false,
    }
  });

  // Component state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedContact, setSelectedContact] = useState<HubSpotContact | null>(null);
  const [showApprovalWorkflow, setShowApprovalWorkflow] = useState(false);

  // Watch form values for reactive calculations
  const formData = form.watch();

  // Calculate pricing with proper error handling
  const pricingCalculation: PricingCalculationResult = React.useMemo(() => {
    try {
      return calculateCombinedFees(formData);
    } catch (error) {
      console.error('Pricing calculation error:', error);
      // Return safe fallback values
      return {
        bookkeeping: { monthlyFee: 0, setupFee: 0 },
        taas: { monthlyFee: 0, setupFee: 0 },
        combined: { monthlyFee: 0, setupFee: 0 },
        includesBookkeeping: false,
        includesTaas: false,
        includesAP: false,
        includesAR: false,
        includesAgentOfService: false,
        serviceTierFee: 0,
        cleanupProjectFee: 0,
        priorYearFilingsFee: 0,
        cfoAdvisoryFee: 0,
        cfoAdvisoryHubspotProductId: null,
        payrollFee: 0,
        apFee: 0,
        arFee: 0,
        agentOfServiceFee: 0,
        totalMonthlyFee: 0,
        totalSetupFee: 0
      };
    }
  }, [formData]);

  // Quote submission mutation
  const submitQuoteMutation = useMutation({
    mutationFn: async (data: QuoteFormData) => {
      return await apiRequest("/api/quotes", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          // Include calculated fees
          monthlyFee: pricingCalculation.totalMonthlyFee.toString(),
          setupFee: pricingCalculation.totalSetupFee.toString(),
          taasMonthlyFee: pricingCalculation.taas.monthlyFee.toString(),
          taasPriorYearsFee: pricingCalculation.priorYearFilingsFee.toString(),
        })
      });
    },
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Quote Created",
        description: `Quote for ${formData.contactEmail} has been created successfully.`,
      });
      form.reset();
      setSelectedContact(null);
    },
    onError: (error: any) => {
      if (error?.requiresApproval) {
        setShowApprovalWorkflow(true);
      } else {
        toast({
          title: "Quote Creation Failed",
          description: error?.message || "An error occurred while creating the quote.",
          variant: "destructive",
        });
      }
    },
  });

  // Handle form submission
  const handleSubmit = async (data: QuoteFormData) => {
    setIsSubmitting(true);
    try {
      await submitQuoteMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle successful approval
  const handleApprovalSuccess = (approvalCode: string) => {
    const dataWithApproval = { ...formData, approvalCode };
    handleSubmit(dataWithApproval);
    setShowApprovalWorkflow(false);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 ${className}`}>
      <UniversalNavbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Form and Service Selection */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Quote Calculator
              </h1>
              
              <QuoteFormCore
                form={form}
                selectedContact={selectedContact}
                onContactSelected={setSelectedContact}
              />
            </div>

            <ServiceSelectionCards
              form={form}
              calculation={pricingCalculation}
            />
          </div>

          {/* Right Column: Pricing Display */}
          <div className="space-y-6">
            <PricingDisplayPanel
              calculation={pricingCalculation}
              formData={formData}
            />

            <QuoteSubmissionFlow
              form={form}
              calculation={pricingCalculation}
              selectedContact={selectedContact}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>

      {/* Approval Workflow Modal */}
      {showApprovalWorkflow && (
        <ApprovalWorkflow
          formData={formData}
          onApprovalSuccess={handleApprovalSuccess}
          onCancel={() => setShowApprovalWorkflow(false)}
        />
      )}
    </div>
  );
};

export default QuoteCalculatorContainer;
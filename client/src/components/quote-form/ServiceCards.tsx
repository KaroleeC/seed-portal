import React from "react";
import { CardContent } from "@/components/ui/card";
import { ServiceSelectionModal } from "./ServiceSelectionModal";
import { SurfaceCard } from "@/components/ds/SurfaceCard";

interface ServiceCardsProps {
  selectedServices: {
    serviceMonthlyBookkeeping: boolean;
    serviceCleanupProjects: boolean;
    serviceTaasMonthly: boolean;
    servicePriorYearFilings: boolean;
    serviceCfoAdvisory: boolean;
    servicePayrollService: boolean;
    serviceApArService: boolean; // Current AP/AR service flag
    serviceArService: boolean; // AR service flag
    serviceApLite: boolean;
    serviceArLite: boolean;
    serviceApAdvanced: boolean;
    serviceArAdvanced: boolean;
    serviceFpaBuild: boolean;
    serviceFpaSupport: boolean;
    serviceAgentOfService: boolean;
    serviceNexusStudy: boolean;
    serviceEntityOptimization: boolean;
    serviceCostSegregation: boolean;
    serviceRdCredit: boolean;
    serviceRealEstateAdvisory: boolean;
  };
  onServiceChange: (services: Partial<ServiceCardsProps["selectedServices"]>) => void;
  // Backwards compatibility props for existing legacy logic
  feeCalculation?: {
    includesBookkeeping: boolean;
    includesTaas: boolean;
  };
  onLegacyServiceChange?: (bookkeeping: boolean, taas: boolean) => void;
}

export function ServiceCards({
  selectedServices,
  onServiceChange,
  feeCalculation,
  onLegacyServiceChange,
}: ServiceCardsProps) {
  const getSelectedCount = () => {
    return Object.values(selectedServices).filter(Boolean).length;
  };

  const getSelectedServiceNames = () => {
    const serviceNames: string[] = [];
    if (selectedServices.serviceMonthlyBookkeeping) serviceNames.push("Monthly Bookkeeping");
    if (selectedServices.serviceCleanupProjects) serviceNames.push("Cleanup Projects");
    if (selectedServices.serviceTaasMonthly) serviceNames.push("Tax Advisory");
    if (selectedServices.servicePriorYearFilings) serviceNames.push("Prior Year Filings");
    if (selectedServices.serviceCfoAdvisory) serviceNames.push("CFO Advisory");
    if (selectedServices.servicePayrollService) serviceNames.push("Payroll");
    if (selectedServices.serviceApArService) serviceNames.push("Accounts Payable"); // Current AP tracking
    if (selectedServices.serviceArService) serviceNames.push("Accounts Receivable"); // AR service
    if (selectedServices.serviceApLite) serviceNames.push("AP Lite");
    if (selectedServices.serviceArLite) serviceNames.push("AR Lite");
    if (selectedServices.serviceApAdvanced) serviceNames.push("AP Advanced");
    if (selectedServices.serviceArAdvanced) serviceNames.push("AR Advanced");
    if (selectedServices.serviceFpaBuild) serviceNames.push("FP&A Build");
    if (selectedServices.serviceFpaSupport) serviceNames.push("FP&A Support");
    if (selectedServices.serviceAgentOfService) serviceNames.push("Agent of Service");
    if (selectedServices.serviceNexusStudy) serviceNames.push("Nexus Study");
    if (selectedServices.serviceEntityOptimization) serviceNames.push("Entity Optimization");
    if (selectedServices.serviceCostSegregation) serviceNames.push("Cost Segregation");
    if (selectedServices.serviceRdCredit) serviceNames.push("R&D Credit");
    if (selectedServices.serviceRealEstateAdvisory) serviceNames.push("Real Estate Advisory");
    return serviceNames;
  };

  const selectedCount = getSelectedCount();
  const selectedNames = getSelectedServiceNames();

  return (
    <SurfaceCard className="mb-8 border-2 border-dashed border-muted hover:border-[#e24c00] transition-all duration-200">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-[#e24c00] rounded-lg flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold text-white">{selectedCount}</span>
          </div>

          <div>
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {selectedCount === 0
                ? "Select Services"
                : `${selectedCount} Service${selectedCount !== 1 ? "s" : ""} Selected`}
            </h3>

            {selectedCount > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {selectedNames.slice(0, 2).join(", ")}
                  {selectedNames.length > 2 && ` +${selectedNames.length - 2} more`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose from bookkeeping, tax services, payroll, and more
              </p>
            )}
          </div>

          <ServiceSelectionModal
            selectedServices={selectedServices}
            onServiceChange={onServiceChange}
            triggerText={selectedCount === 0 ? "Choose Services" : "Modify Selection"}
          />
        </div>
      </CardContent>
    </SurfaceCard>
  );
}

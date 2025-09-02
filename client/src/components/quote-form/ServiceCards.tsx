import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceSelectionModal } from "./ServiceSelectionModal";

interface ServiceCardsProps {
  selectedServices: {
    serviceMonthlyBookkeeping: boolean;
    serviceCleanupProjects: boolean;
    serviceTaasMonthly: boolean;
    servicePriorYearFilings: boolean;
    servicePayroll: boolean;
    serviceApArLite: boolean;
    serviceFpaLite: boolean;
  };
  onServiceChange: (services: Partial<ServiceCardsProps['selectedServices']>) => void;
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
  onLegacyServiceChange 
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
    if (selectedServices.servicePayroll) serviceNames.push("Payroll");
    if (selectedServices.serviceApArLite) serviceNames.push("AP/AR Lite");
    if (selectedServices.serviceFpaLite) serviceNames.push("FP&A Lite");
    return serviceNames;
  };

  const selectedCount = getSelectedCount();
  const selectedNames = getSelectedServiceNames();

  return (
    <div className="mb-8">
      <Card className="border-2 border-dashed border-gray-300 hover:border-[#e24c00] transition-all duration-200">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-[#e24c00] rounded-lg flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-white">{selectedCount}</span>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg text-gray-800 mb-2">
                {selectedCount === 0 ? "Select Services" : `${selectedCount} Service${selectedCount !== 1 ? 's' : ''} Selected`}
              </h3>
              
              {selectedCount > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {selectedNames.slice(0, 2).join(", ")}
                    {selectedNames.length > 2 && ` +${selectedNames.length - 2} more`}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
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
      </Card>
    </div>
  );
}
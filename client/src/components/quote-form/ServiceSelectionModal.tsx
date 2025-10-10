import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Calculator,
  FileText,
  Users,
  CreditCard,
  TrendingUp,
  Settings,
  Shield,
  Building2,
} from "lucide-react";

interface ServiceSelectionModalProps {
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
  onServiceChange: (services: Partial<ServiceSelectionModalProps["selectedServices"]>) => void;
  triggerText?: string;
}

export function ServiceSelectionModal({
  selectedServices,
  onServiceChange,
  triggerText = "Select Services",
}: ServiceSelectionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempServices, setTempServices] = useState(selectedServices);
  const { toast } = useToast();

  // Helper function to check if core services are selected
  const hasCoreServices = () => {
    return (
      tempServices.serviceTaasMonthly ||
      tempServices.serviceMonthlyBookkeeping ||
      tempServices.servicePriorYearFilings ||
      tempServices.serviceCleanupProjects ||
      tempServices.serviceCfoAdvisory ||
      tempServices.servicePayrollService
    );
  };

  // Services that require a core service (Agent of Service is excluded as it can be standalone)
  const servicesRequiringCore = [
    "servicePayrollService",
    "serviceApArService",
    "serviceArService",
    "serviceFpaBuild",
    "serviceFpaSupport",
    "serviceNexusStudy",
    "serviceEntityOptimization",
    "serviceCostSegregation",
    "serviceRdCredit",
    "serviceRealEstateAdvisory",
  ];

  const handleServiceToggle = (serviceKey: keyof typeof selectedServices) => {
    // Check if trying to enable an add-on service without core services
    if (
      servicesRequiringCore.includes(serviceKey) &&
      !tempServices[serviceKey] &&
      !hasCoreServices()
    ) {
      const serviceNames = {
        servicePayrollService: "Payroll service",
        serviceApArService: "AP services",
        serviceArService: "AR services",
        serviceFpaBuild: "FP&A Build",
        serviceFpaSupport: "FP&A Support",
        serviceNexusStudy: "Nexus Study",
        serviceEntityOptimization: "Entity Optimization",
        serviceCostSegregation: "Cost Segregation Study",
        serviceRdCredit: "R&D Credit Analysis",
        serviceRealEstateAdvisory: "Real Estate Advisory",
      };

      toast({
        title: "Core Service Required",
        description: `${serviceNames[serviceKey as keyof typeof serviceNames]} requires at least one core service (TaaS, Monthly Bookkeeping, Prior Year Filings, Cleanup Projects, CFO Advisory, or Payroll).`,
        variant: "destructive",
      });
      return;
    }

    // Check if trying to disable a core service when Payroll, AP, or AR services are selected
    const coreServiceKeys = [
      "serviceTaasMonthly",
      "serviceMonthlyBookkeeping",
      "servicePriorYearFilings",
      "serviceCleanupProjects",
      "serviceCfoAdvisory",
    ];
    if (coreServiceKeys.includes(serviceKey) && tempServices[serviceKey]) {
      const hasPayrollOrApOrAr =
        tempServices.servicePayrollService ||
        tempServices.serviceApArService ||
        (tempServices as any).serviceArService;
      if (hasPayrollOrApOrAr) {
        const otherCoreServicesSelected = coreServiceKeys.filter(
          (key) => key !== serviceKey && tempServices[key as keyof typeof tempServices]
        ).length;

        if (otherCoreServicesSelected === 0) {
          toast({
            title: "Cannot Remove Core Service",
            description:
              "Cannot remove this core service while Payroll, AP, or AR services are selected. Please remove those services first or select another core service.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    setTempServices((prev) => ({
      ...prev,
      [serviceKey]: !prev[serviceKey],
    }));
  };

  const handleApply = () => {
    onServiceChange(tempServices);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempServices(selectedServices);
    setIsOpen(false);
  };

  const getSelectedCount = () => {
    // Only count user-facing services, not internal flags
    const userFacingServices = [
      "serviceMonthlyBookkeeping",
      "serviceCleanupProjects",
      "serviceTaasMonthly",
      "servicePriorYearFilings",
      "serviceCfoAdvisory",
      "servicePayrollService",
      "serviceApArService", // This represents the main AP selection
      "serviceArService", // This represents the separate AR selection
      "serviceFpaBuild",
      "serviceFpaSupport",
      "serviceAgentOfService",
      "serviceNexusStudy",
      "serviceEntityOptimization",
      "serviceCostSegregation",
      "serviceRdCredit",
      "serviceRealEstateAdvisory",
    ];

    return userFacingServices.filter(
      (service) => tempServices[service as keyof typeof tempServices]
    ).length;
  };

  const serviceCategories = [
    {
      title: "Core Services",
      icon: Calculator,
      color: "bg-blue-600",
      services: [
        {
          key: "serviceTaasMonthly" as const,
          name: "TaaS",
          description: "Tax as a Service - comprehensive tax advisory and preparation",
        },
        {
          key: "serviceMonthlyBookkeeping" as const,
          name: "Monthly Bookkeeping",
          description: "Ongoing monthly bookkeeping and financial statements",
        },
        {
          key: "servicePriorYearFilings" as const,
          name: "Prior Years Tax Filings",
          description: "Catch-up tax filings for previous years",
        },
        {
          key: "serviceCleanupProjects" as const,
          name: "Bookkeeping Cleanup Project",
          description: "One-time bookkeeping cleanup and catch-up work",
        },
        {
          key: "serviceCfoAdvisory" as const,
          name: "CFO Advisory Services",
          description: "Strategic financial planning and CFO-level advisory",
        },
      ],
    },
    {
      title: "Operational Services",
      subtitle: "Add-on services - requires a core service",
      icon: Users,
      color: "bg-green-600",
      services: [
        {
          key: "servicePayrollService" as const,
          name: "Payroll",
          description: "Complete payroll processing and compliance",
        },
        {
          key: "serviceApArService" as const,
          name: "Accounts Payable (AP)",
          description: "Automated vendor bill processing and payment management",
        },
        {
          key: "serviceArService" as const,
          name: "Accounts Receivable (AR)",
          description: "Customer invoice processing and collection management",
        },
      ],
    },
    {
      title: "Financial Planning & Analysis",
      subtitle: "Add-on services - requires a core service",
      icon: TrendingUp,
      color: "bg-purple-600",
      services: [
        {
          key: "serviceFpaBuild" as const,
          name: "FP&A Build",
          description: "Custom financial planning and analysis build-out",
        },
        {
          key: "serviceFpaSupport" as const,
          name: "FP&A Support",
          description: "Ongoing financial planning and analysis support",
        },
      ],
    },
    {
      title: "Compliance & Advisory Services",
      subtitle: "Add-on services - requires a core service",
      icon: Shield,
      color: "bg-orange-600",
      services: [
        {
          key: "serviceAgentOfService" as const,
          name: "Agent of Service",
          description: "Legal agent representation services",
        },
        {
          key: "serviceNexusStudy" as const,
          name: "Nexus Study",
          description: "Multi-state tax nexus analysis and compliance",
        },
        {
          key: "serviceEntityOptimization" as const,
          name: "Entity Optimization",
          description: "Business entity structure optimization advisory",
        },
      ],
    },
    {
      title: "Specialized Services",
      subtitle: "Add-on services - requires a core service",
      icon: Building2,
      color: "bg-indigo-600",
      services: [
        {
          key: "serviceCostSegregation" as const,
          name: "Cost Segregation Study",
          description: "Tax depreciation acceleration analysis",
        },
        {
          key: "serviceRdCredit" as const,
          name: "R&D Credit Analysis",
          description: "Research and development tax credit optimization",
        },
        {
          key: "serviceRealEstateAdvisory" as const,
          name: "Real Estate Advisory",
          description: "Specialized real estate tax and financial advisory",
        },
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          data-testid="button-select-services"
        >
          {triggerText} {getSelectedCount() > 0 && `(${getSelectedCount()} selected)`}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-4xl max-h-[80vh] overflow-y-auto border-0 shadow-2xl"
        data-testid="modal-service-selection"
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
            [data-testid="modal-service-selection"] button:has(svg[stroke="currentColor"]),
            [data-testid="modal-service-selection"] .absolute.right-4.top-4 {
              display: none !important;
            }
          `,
          }}
        />
        <DialogHeader className="pb-6 border-b border">
          <DialogTitle className="text-2xl font-bold text-foreground text-center">
            Select Services
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Choose the services you'd like to include in your quote
          </p>
        </DialogHeader>

        <div className="space-y-8 py-6">
          {serviceCategories.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.title} className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${category.color} shadow-md`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{category.title}</h3>
                    {category.subtitle && (
                      <p className="text-xs text-muted-foreground italic">{category.subtitle}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.services.map((service) => {
                    const isSelected = (tempServices as any)[service.key];
                    return (
                      <Card
                        key={service.key}
                        className={`cursor-pointer transition-all duration-300 border-2 shadow-sm ${
                          isSelected ? "kb-select kb-select-active" : "kb-select kb-select-hover"
                        }`}
                        onClick={() => handleServiceToggle(service.key as any)}
                        data-testid={`card-${service.key}`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                isSelected ? "bg-primary border-primary" : "border-border"
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground mb-2">{service.name}</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {service.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-100">
          <div className="text-sm font-medium text-gray-700">
            <span className="bg-gray-100 px-3 py-1 rounded-full">
              {getSelectedCount()} service{getSelectedCount() !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="px-6 py-2 border-border text-foreground hover:bg-muted/50"
              data-testid="button-cancel-services"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              className="px-6 py-2 bg-gradient-to-r from-[#e24c00] to-[#ff6b35] hover:from-[#d63f00] hover:to-[#e55a2b] text-white font-semibold shadow-lg"
              data-testid="button-apply-services"
            >
              Apply Selection ({getSelectedCount()})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

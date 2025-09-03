import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator, FileText, Users, CreditCard, TrendingUp, Settings } from "lucide-react";

interface ServiceSelectionModalProps {
  selectedServices: {
    serviceMonthlyBookkeeping: boolean;
    serviceCleanupProjects: boolean;
    serviceTaasMonthly: boolean;
    servicePriorYearFilings: boolean;
    servicePayroll: boolean;
    serviceApArLite: boolean;
    serviceFpaLite: boolean;
    serviceCfoAdvisory: boolean;
  };
  onServiceChange: (services: Partial<ServiceSelectionModalProps['selectedServices']>) => void;
  triggerText?: string;
}

export function ServiceSelectionModal({ 
  selectedServices, 
  onServiceChange, 
  triggerText = "Select Services" 
}: ServiceSelectionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempServices, setTempServices] = useState(selectedServices);

  const handleServiceToggle = (serviceKey: keyof typeof selectedServices) => {
    setTempServices(prev => ({
      ...prev,
      [serviceKey]: !prev[serviceKey]
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
    return Object.values(tempServices).filter(Boolean).length;
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
          description: "Tax as a Service - comprehensive tax advisory and preparation"
        },
        {
          key: "serviceMonthlyBookkeeping" as const,
          name: "Monthly Bookkeeping",
          description: "Ongoing monthly bookkeeping and financial statements"
        },
        {
          key: "servicePriorYearFilings" as const,
          name: "Prior Years Tax Filings",
          description: "Catch-up tax filings for previous years"
        },
        {
          key: "serviceCleanupProjects" as const,
          name: "Bookkeeping Cleanup Project",
          description: "One-time bookkeeping cleanup and catch-up work"
        }
      ]
    },
    {
      title: "Operational Services",
      icon: Users,
      color: "bg-green-600", 
      services: [
        {
          key: "servicePayroll" as const,
          name: "Payroll",
          description: "Complete payroll processing and compliance"
        },
        {
          key: "serviceApArLite" as const,
          name: "AP/AR Lite",
          description: "Basic accounts payable and receivable management"
        }
      ]
    },
    {
      title: "Financial Planning & Analysis",
      icon: TrendingUp,
      color: "bg-purple-600",
      services: [
        {
          key: "serviceFpaLite" as const,
          name: "FP&A Lite", 
          description: "Essential financial planning and analysis services"
        },
        {
          key: "serviceCfoAdvisory" as const,
          name: "CFO Advisory Services",
          description: "Strategic financial planning and CFO-level advisory"
        }
      ]
    }
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto border-0 shadow-2xl" data-testid="modal-service-selection">
        <style dangerouslySetInnerHTML={{
          __html: `
            [data-testid="modal-service-selection"] button:has(svg[stroke="currentColor"]),
            [data-testid="modal-service-selection"] .absolute.right-4.top-4 {
              display: none !important;
            }
          `
        }} />
        <DialogHeader className="pb-6 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold text-gray-800 text-center">Select Services</DialogTitle>
          <p className="text-sm text-gray-600 text-center mt-2">Choose the services you'd like to include in your quote</p>
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
                    <h3 className="text-xl font-bold text-gray-800">{category.title}</h3>
                    {category.subtitle && (
                      <p className="text-xs text-gray-500 italic">{category.subtitle}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.services.map((service) => {
                    const isSelected = tempServices[service.key];
                    return (
                      <Card 
                        key={service.key}
                        className={`cursor-pointer transition-all duration-300 border-2 shadow-sm hover:shadow-md ${
                          isSelected 
                            ? 'border-[#e24c00] bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg transform scale-[1.02]' 
                            : 'border-gray-200 hover:border-[#e24c00] hover:bg-gray-50 hover:shadow-md'
                        }`}
                        onClick={() => handleServiceToggle(service.key)}
                        data-testid={`card-${service.key}`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-[#e24c00] border-[#e24c00]' 
                                : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800 mb-2">{service.name}</h4>
                              <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>
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
              {getSelectedCount()} service{getSelectedCount() !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleCancel}
              className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
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
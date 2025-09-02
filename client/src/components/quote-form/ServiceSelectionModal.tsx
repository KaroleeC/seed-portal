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
      title: "Bookkeeping Services",
      icon: Calculator,
      color: "bg-blue-500",
      services: [
        {
          key: "serviceMonthlyBookkeeping" as const,
          name: "Monthly Bookkeeping",
          description: "Ongoing monthly bookkeeping and financial statements"
        },
        {
          key: "serviceCleanupProjects" as const,
          name: "Cleanup Projects",
          description: "One-time bookkeeping cleanup and catch-up work"
        }
      ]
    },
    {
      title: "Tax & Advisory Services",
      icon: FileText,
      color: "bg-green-500",
      services: [
        {
          key: "serviceTaasMonthly" as const,
          name: "Monthly Tax Advisory",
          description: "Ongoing monthly tax planning and advisory services"
        },
        {
          key: "servicePriorYearFilings" as const,
          name: "Prior Year Filings",
          description: "Catch-up tax filings for previous years"
        }
      ]
    },
    {
      title: "Additional Services",
      icon: Settings,
      color: "bg-purple-500",
      services: [
        {
          key: "servicePayroll" as const,
          name: "Payroll",
          description: "Complete payroll processing and compliance"
        },
        {
          key: "serviceApArLite" as const,
          name: "AP/AR Lite",
          description: "Accounts payable and receivable management"
        },
        {
          key: "serviceFpaLite" as const,
          name: "FP&A Lite",
          description: "Financial planning and analysis services"
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="modal-service-selection">
        <DialogHeader>
          <DialogTitle>Select Services</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {serviceCategories.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.title} className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{category.title}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.services.map((service) => {
                    const isSelected = tempServices[service.key];
                    return (
                      <Card 
                        key={service.key}
                        className={`cursor-pointer transition-all duration-200 border-2 ${
                          isSelected 
                            ? 'border-[#e24c00] bg-orange-50' 
                            : 'border-gray-200 hover:border-[#e24c00] hover:bg-gray-50'
                        }`}
                        onClick={() => handleServiceToggle(service.key)}
                        data-testid={`card-${service.key}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox 
                              checked={isSelected}
                              onChange={() => handleServiceToggle(service.key)}
                              className="mt-1"
                              data-testid={`checkbox-${service.key}`}
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-800 mb-1">{service.name}</h4>
                              <p className="text-sm text-gray-600">{service.description}</p>
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
        
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {getSelectedCount()} service{getSelectedCount() !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleCancel}
              data-testid="button-cancel-services"
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleApply}
              className="bg-[#e24c00] hover:bg-[#d63f00]"
              data-testid="button-apply-services"
            >
              Apply Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
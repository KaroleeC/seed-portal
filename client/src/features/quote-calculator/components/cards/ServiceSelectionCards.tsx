/**
 * 🃏 SERVICE SELECTION CARDS
 * Maximum 150 lines - UI display only, no business logic!
 * Reusable service cards with proper TypeScript interfaces
 */

import React from "react";
import type { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calculator,
  FileText,
  RefreshCw,
  Calendar,
  Briefcase,
  Users,
  CreditCard,
  DollarSign,
  Building2,
  Scale,
} from "lucide-react";

import type {
  QuoteFormData,
  PricingCalculationResult,
  ServiceCardProps,
} from "../../types/QuoteTypes";

interface ServiceSelectionCardsProps {
  form: UseFormReturn<QuoteFormData>;
  calculation: PricingCalculationResult;
}

// Reusable service card component
const ServiceCard: React.FC<
  ServiceCardProps & {
    isSelected: boolean;
    onToggle: (checked: boolean) => void;
    children?: React.ReactNode;
  }
> = ({
  title,
  description,
  fee,
  isMonthly,
  icon,
  gradient = "from-blue-50 to-cyan-50",
  borderColor = "border-blue-200",
  isSelected,
  onToggle,
  children,
}) => {
  const IconComponent = getIconComponent(icon);

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md ${
        isSelected
          ? `bg-gradient-to-r ${gradient} ${borderColor} border-2`
          : "border border-gray-200"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggle}
              className="mt-1"
            />
            <div className="flex items-center gap-2">
              {IconComponent && (
                <IconComponent className="w-5 h-5 text-blue-600" />
              )}
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg text-blue-700">
              {fee > 0 ? `$${fee.toLocaleString()}` : "Included"}
            </div>
            <div className="text-xs text-gray-500">
              {isMonthly ? "per month" : "one-time"}
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 ml-6">{description}</p>
      </CardHeader>

      {children && isSelected && (
        <CardContent className="pt-0">
          <div className="ml-6 p-4 bg-white/50 rounded-lg border border-gray-100">
            {children}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Helper function to get icon component
const getIconComponent = (iconName?: string) => {
  const icons = {
    Calculator,
    FileText,
    RefreshCw,
    Calendar,
    Briefcase,
    Users,
    CreditCard,
    DollarSign,
    Building2,
    Scale,
  };
  return iconName ? icons[iconName as keyof typeof icons] : null;
};

export const ServiceSelectionCards: React.FC<ServiceSelectionCardsProps> = ({
  form,
  calculation,
}) => {
  const watchedValues = form.watch();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Service Selection
      </h2>

      <div className="space-y-4">
        {/* Monthly Bookkeeping */}
        <ServiceCard
          title="Monthly Bookkeeping"
          description="Ongoing monthly financial management and reporting"
          fee={calculation.bookkeeping.monthlyFee}
          isMonthly={true}
          icon="Calculator"
          gradient="from-green-50 to-emerald-50"
          borderColor="border-green-200"
          isSelected={!!watchedValues.serviceMonthlyBookkeeping}
          onToggle={(checked) =>
            form.setValue("serviceMonthlyBookkeeping", checked)
          }
        />

        {/* TaaS Monthly */}
        <ServiceCard
          title="Tax as a Service (TaaS)"
          description="Comprehensive monthly tax advisory and preparation"
          fee={calculation.taas.monthlyFee}
          isMonthly={true}
          icon="FileText"
          gradient="from-blue-50 to-cyan-50"
          borderColor="border-blue-200"
          isSelected={!!watchedValues.serviceTaasMonthly}
          onToggle={(checked) => form.setValue("serviceTaasMonthly", checked)}
        />

        {/* Bookkeeping Cleanup Project */}
        <ServiceCard
          title="Bookkeeping Cleanup Project"
          description="One-time cleanup and catch-up work"
          fee={calculation.cleanupProjectFee}
          isMonthly={false}
          icon="RefreshCw"
          gradient="from-purple-50 to-violet-50"
          borderColor="border-purple-200"
          isSelected={!!watchedValues.serviceCleanupProjects}
          onToggle={(checked) =>
            form.setValue("serviceCleanupProjects", checked)
          }
        />

        {/* Prior Year Filings */}
        <ServiceCard
          title="Prior Year Tax Filings"
          description="Catch-up tax filings for previous years"
          fee={calculation.priorYearFilingsFee}
          isMonthly={false}
          icon="Calendar"
          gradient="from-amber-50 to-orange-50"
          borderColor="border-amber-200"
          isSelected={!!watchedValues.servicePriorYearFilings}
          onToggle={(checked) =>
            form.setValue("servicePriorYearFilings", checked)
          }
        />

        {/* CFO Advisory */}
        <ServiceCard
          title="CFO Advisory"
          description="Strategic financial advisory services"
          fee={calculation.cfoAdvisoryFee}
          isMonthly={false}
          icon="Briefcase"
          gradient="from-indigo-50 to-blue-50"
          borderColor="border-indigo-200"
          isSelected={!!watchedValues.serviceCfoAdvisory}
          onToggle={(checked) => form.setValue("serviceCfoAdvisory", checked)}
        />

        {/* Payroll Service */}
        <ServiceCard
          title="Payroll Service"
          description="Employee payroll management"
          fee={calculation.payrollFee}
          isMonthly={true}
          icon="Users"
          gradient="from-blue-50 to-green-50"
          borderColor="border-blue-200"
          isSelected={!!watchedValues.servicePayrollService}
          onToggle={(checked) =>
            form.setValue("servicePayrollService", checked)
          }
        />

        {/* AP Service */}
        <ServiceCard
          title="Accounts Payable Service"
          description="Vendor payment management"
          fee={calculation.apFee}
          isMonthly={true}
          icon="CreditCard"
          gradient="from-purple-50 to-violet-50"
          borderColor="border-purple-200"
          isSelected={!!watchedValues.serviceApArService}
          onToggle={(checked) => form.setValue("serviceApArService", checked)}
        />

        {/* AR Service */}
        <ServiceCard
          title="Accounts Receivable Service"
          description="Customer invoice and payment management"
          fee={calculation.arFee || 0}
          isMonthly={true}
          icon="DollarSign"
          gradient="from-blue-50 to-indigo-50"
          borderColor="border-blue-200"
          isSelected={!!watchedValues.serviceArService}
          onToggle={(checked) => form.setValue("serviceArService", checked)}
        />

        {/* Agent of Service */}
        <ServiceCard
          title="Agent of Service"
          description="Registered agent and compliance services"
          fee={calculation.agentOfServiceFee}
          isMonthly={true}
          icon="Scale"
          gradient="from-gray-50 to-slate-50"
          borderColor="border-gray-200"
          isSelected={!!watchedValues.serviceAgentOfService}
          onToggle={(checked) =>
            form.setValue("serviceAgentOfService", checked)
          }
        />
      </div>
    </div>
  );
};

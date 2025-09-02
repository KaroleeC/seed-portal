import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, FileText, Sparkles } from "lucide-react";

interface ServiceCardsProps {
  feeCalculation: {
    includesBookkeeping: boolean;
    includesTaas: boolean;
  };
  onServiceChange: (bookkeeping: boolean, taas: boolean) => void;
}

export function ServiceCards({ feeCalculation, onServiceChange }: ServiceCardsProps) {
  const handleServiceClick = (service: 'bookkeeping' | 'taas' | 'other') => {
    if (service === 'bookkeeping') {
      onServiceChange(true, false);
    } else if (service === 'taas') {
      onServiceChange(false, true);
    }
    // Note: 'other' services would be handled separately
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Bookkeeping Service */}
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
          feeCalculation.includesBookkeeping && !feeCalculation.includesTaas
            ? 'border-[#e24c00] bg-orange-50' 
            : 'border-gray-200 hover:border-[#e24c00]'
        }`}
        onClick={() => handleServiceClick('bookkeeping')}
      >
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 bg-[#e24c00] rounded-lg flex items-center justify-center mx-auto mb-4">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-lg text-gray-800 mb-2">Bookkeeping</h3>
          <p className="text-sm text-gray-600">Monthly bookkeeping, cleanup, and financial statements</p>
        </CardContent>
      </Card>

      {/* Tax Service */}
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
          feeCalculation.includesTaas && !feeCalculation.includesBookkeeping
            ? 'border-[#e24c00] bg-orange-50' 
            : 'border-gray-200 hover:border-[#e24c00]'
        }`}
        onClick={() => handleServiceClick('taas')}
      >
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 bg-[#e24c00] rounded-lg flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-lg text-gray-800 mb-2">Tax Service</h3>
          <p className="text-sm text-gray-600">Tax preparation, filing and planning services</p>
        </CardContent>
      </Card>

      {/* Other Services */}
      <Card className="cursor-pointer transition-all duration-200 hover:shadow-lg border-2 border-gray-200 hover:border-[#e24c00]">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-lg text-gray-800 mb-2">Other Services</h3>
          <p className="text-sm text-gray-600">Payroll, FP&A Lite, AP/AR Lite, and more</p>
        </CardContent>
      </Card>
    </div>
  );
}
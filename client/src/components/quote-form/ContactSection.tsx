import React, { useState } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Control } from "react-hook-form";
import { FormData } from "./QuoteFormSchema";

interface ContactSectionProps {
  control: Control<FormData>;
  hubspotVerificationStatus: 'idle' | 'verifying' | 'verified' | 'not-found';
  hubspotContact: any;
  onEmailChange: (email: string) => void;
}

export function ContactSection({
  control,
  hubspotVerificationStatus,
  hubspotContact,
  onEmailChange
}: ContactSectionProps) {
  // State for collapsible section
  const [isExpanded, setIsExpanded] = useState(true);
  
  const getVerificationIcon = () => {
    switch (hubspotVerificationStatus) {
      case 'verifying':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'not-found':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getVerificationMessage = () => {
    switch (hubspotVerificationStatus) {
      case 'verifying':
        return <span className="text-sm text-blue-600">Verifying contact...</span>;
      case 'verified':
        return <span className="text-sm text-green-600">Contact verified in HubSpot</span>;
      case 'not-found':
        return <span className="text-sm text-red-600">Contact not found in HubSpot</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div 
        className="cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between group hover:bg-gray-50 p-3 -m-3 rounded-lg transition-colors">
          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-gray-900">Contact Information</h3>
          <div className="flex items-center gap-2 text-gray-500 group-hover:text-gray-700">
            <span className="text-sm font-medium">{isExpanded ? 'Collapse' : 'Expand'}</span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 transition-transform" />
            ) : (
              <ChevronDown className="h-5 w-5 transition-transform" />
            )}
          </div>
        </div>
        <hr className="border-gray-200 mt-3" />
      </div>
      
      {/* Collapsible Content */}
      {isExpanded && (
        <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
          {/* Contact Email */}
          <FormField
        control={control}
        name="contactEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contact Email</FormLabel>
            <div className="relative">
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="name@company.com"
                  className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent pr-10"
                  onChange={(e) => {
                    field.onChange(e);
                    onEmailChange(e.target.value);
                  }}
                />
              </FormControl>
              {hubspotVerificationStatus !== 'idle' && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {getVerificationIcon()}
                </div>
              )}
            </div>
            <FormMessage />
            {getVerificationMessage()}
          </FormItem>
        )}
      />

      {/* Company Name */}
      <FormField
        control={control}
        name="companyName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Company Name</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={hubspotContact?.companyName || "Enter company name"}
                className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                value={field.value || hubspotContact?.companyName || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
        </div>
      )}
    </div>
  );
}
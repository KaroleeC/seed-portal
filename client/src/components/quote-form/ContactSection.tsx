import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
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
      <h3 className="text-lg font-semibold text-gray-800">Contact Information</h3>
      
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
  );
}
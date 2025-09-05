/**
 * 📝 QUOTE FORM CORE
 * Maximum 150 lines - form inputs only, no business logic!
 * Handles all form inputs with proper validation
 */

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { QuoteFormData, HubSpotContact } from "../../types/QuoteTypes";

interface QuoteFormCoreProps {
  form: UseFormReturn<QuoteFormData>;
  selectedContact: HubSpotContact | null;
  onContactSelected: (contact: HubSpotContact | null) => void;
}

export const QuoteFormCore: React.FC<QuoteFormCoreProps> = ({
  form,
  selectedContact,
  onContactSelected
}) => {
  return (
    <div className="space-y-6">
      
      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactFirstName">First Name</Label>
            <Input
              id="contactFirstName"
              {...form.register("contactFirstName")}
              placeholder="John"
            />
          </div>
          
          <div>
            <Label htmlFor="contactLastName">Last Name</Label>
            <Input
              id="contactLastName"
              {...form.register("contactLastName")}
              placeholder="Smith"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="contactEmail">Email Address</Label>
          <Input
            id="contactEmail"
            type="email"
            {...form.register("contactEmail")}
            placeholder="john@company.com"
          />
        </div>

        <div>
          <Label htmlFor="contactPhone">Phone Number (Optional)</Label>
          <Input
            id="contactPhone"
            type="tel"
            {...form.register("contactPhone")}
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            {...form.register("companyName")}
            placeholder="Acme Corporation"
          />
        </div>
      </div>

      {/* Company Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Company Address</h3>
        
        <div>
          <Label htmlFor="clientStreetAddress">Street Address</Label>
          <Input
            id="clientStreetAddress"
            {...form.register("clientStreetAddress")}
            placeholder="123 Business St"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="clientCity">City</Label>
            <Input
              id="clientCity"
              {...form.register("clientCity")}
              placeholder="San Francisco"
            />
          </div>
          
          <div>
            <Label htmlFor="clientState">State</Label>
            <Input
              id="clientState"
              {...form.register("clientState")}
              placeholder="CA"
            />
          </div>
          
          <div>
            <Label htmlFor="clientZipCode">ZIP Code</Label>
            <Input
              id="clientZipCode"
              {...form.register("clientZipCode")}
              placeholder="94105"
            />
          </div>
        </div>
      </div>

      {/* Business Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Business Details</h3>
        
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Select onValueChange={(value) => form.setValue("industry", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="manufacturing">Manufacturing</SelectItem>
              <SelectItem value="professional-services">Professional Services</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="monthlyRevenueRange">Monthly Revenue Range</Label>
          <Select onValueChange={(value) => form.setValue("monthlyRevenueRange", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select revenue range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0-10k">$0 - $10,000</SelectItem>
              <SelectItem value="10k-50k">$10,000 - $50,000</SelectItem>
              <SelectItem value="50k-100k">$50,000 - $100,000</SelectItem>
              <SelectItem value="100k-500k">$100,000 - $500,000</SelectItem>
              <SelectItem value="500k+">$500,000+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="entityType">Entity Type</Label>
          <Select onValueChange={(value) => form.setValue("entityType", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LLC">LLC</SelectItem>
              <SelectItem value="Corporation">Corporation</SelectItem>
              <SelectItem value="S-Corp">S-Corporation</SelectItem>
              <SelectItem value="Partnership">Partnership</SelectItem>
              <SelectItem value="Sole-Proprietorship">Sole Proprietorship</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

    </div>
  );
};
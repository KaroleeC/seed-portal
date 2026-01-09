import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Lock,
  Unlock,
} from "lucide-react";
import { useFormContext, type Control } from "react-hook-form";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KbCard } from "@/components/seedkb/KbCard";

interface ContactSectionProps {
  control: Control<QuoteFormFields>;
  hubspotVerificationStatus: "idle" | "verifying" | "verified" | "not-found";
  hubspotContact: any;
  onEmailChange: (email: string) => void;
}

export function ContactSection({
  control,
  hubspotVerificationStatus,
  hubspotContact,
  onEmailChange,
}: ContactSectionProps) {
  const { watch, setValue } = useFormContext<QuoteFormFields>();
  const isCompanyNameLocked = watch("companyNameLocked");
  const isFirstNameLocked = watch("contactFirstNameLocked");
  const isLastNameLocked = watch("contactLastNameLocked");
  const isIndustryLocked = watch("industryLocked");
  const isAddressLocked = watch("companyAddressLocked");

  const getVerificationIcon = () => {
    switch (hubspotVerificationStatus) {
      case "verifying":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "verified":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "not-found":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getVerificationMessage = () => {
    switch (hubspotVerificationStatus) {
      case "verifying":
        return (
          <span className="text-sm text-blue-300">Verifying contact...</span>
        );
      case "verified":
        return (
          <span className="text-sm text-green-300">
            Contact verified in HubSpot
          </span>
        );
      case "not-found":
        return (
          <span className="text-sm text-red-300">
            Contact not found in HubSpot
          </span>
        );
    }
  };

  return (
    <KbCard className="p-6 overflow-visible mb-8">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">
              Client Details
            </h3>
          </div>
          <div className="w-full md:w-[420px]">
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
                        className="pr-10"
                        onChange={(e) => {
                          field.onChange(e);
                          onEmailChange(e.target.value);
                        }}
                      />
                    </FormControl>
                    {hubspotVerificationStatus !== "idle" && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {getVerificationIcon()}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                  <div className="mt-1">{getVerificationMessage()}</div>
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="space-y-6">
          {/* Company Name */}
          <FormField
            control={control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={
                        hubspotContact?.properties?.company ||
                        "Enter company name"
                      }
                      disabled={!!isCompanyNameLocked}
                      title={
                        isCompanyNameLocked ? "Locked from HubSpot" : undefined
                      }
                    />
                  </FormControl>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted/50"
                    onClick={() =>
                      setValue("companyNameLocked", !isCompanyNameLocked)
                    }
                    title={
                      isCompanyNameLocked
                        ? "Unlock company name"
                        : "Lock company name"
                    }
                  >
                    {isCompanyNameLocked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Unlock className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <FormMessage />
                {hubspotVerificationStatus === "verified" &&
                  hubspotContact?.properties?.company && (
                    <div className="mt-1 text-xs text-emerald-400">
                      Found in HubSpot: {hubspotContact.properties.company}
                    </div>
                  )}
              </FormItem>
            )}
          />
          {/* First / Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="contactFirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={
                          hubspotContact?.properties?.firstname || "First name"
                        }
                        disabled={!!isFirstNameLocked}
                        title={
                          isFirstNameLocked ? "Locked from HubSpot" : undefined
                        }
                      />
                    </FormControl>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted/50"
                      onClick={() =>
                        setValue("contactFirstNameLocked", !isFirstNameLocked)
                      }
                      title={
                        isFirstNameLocked
                          ? "Unlock first name"
                          : "Lock first name"
                      }
                    >
                      {isFirstNameLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="contactLastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={
                          hubspotContact?.properties?.lastname || "Last name"
                        }
                        disabled={!!isLastNameLocked}
                        title={
                          isLastNameLocked ? "Locked from HubSpot" : undefined
                        }
                      />
                    </FormControl>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted/50"
                      onClick={() =>
                        setValue("contactLastNameLocked", !isLastNameLocked)
                      }
                      title={
                        isLastNameLocked ? "Unlock last name" : "Lock last name"
                      }
                    >
                      {isLastNameLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Business details (moved above Address to match original layout) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={
                          hubspotContact?.properties?.industry || "Industry"
                        }
                        disabled={!!isIndustryLocked}
                        title={
                          isIndustryLocked ? "Locked from HubSpot" : undefined
                        }
                      />
                    </FormControl>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted/50"
                      onClick={() =>
                        setValue("industryLocked", !isIndustryLocked)
                      }
                      title={
                        isIndustryLocked ? "Unlock industry" : "Lock industry"
                      }
                    >
                      {isIndustryLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="monthlyRevenueRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MONTHLY Revenue Range</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select revenue range" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="<$10K">$0 - $10k</SelectItem>
                      <SelectItem value="10K-25K">$10k - $25k</SelectItem>
                      <SelectItem value="25K-75K">$25k - $75k</SelectItem>
                      <SelectItem value="75K-250K">$75k - $250k</SelectItem>
                      <SelectItem value="250K-1M">$250k - $1M</SelectItem>
                      <SelectItem value="1M+">$1M+</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="entityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Type (Tax Classification)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LLC">LLC</SelectItem>
                      <SelectItem value="S-Corp">S-Corporation</SelectItem>
                      <SelectItem value="C-Corp">C-Corporation</SelectItem>
                      <SelectItem value="Partnership">Partnership</SelectItem>
                      <SelectItem value="Sole Proprietorship">
                        Sole Proprietorship
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Company Address subheader with lock */}
          <div className="flex items-center justify-between mt-2">
            <div className="text-sm font-semibold text-foreground">
              Company Address
            </div>
            <button
              type="button"
              className="inline-flex items-center rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
              onClick={() => setValue("companyAddressLocked", !isAddressLocked)}
              title={
                isAddressLocked
                  ? "Unlock address fields"
                  : "Lock address fields"
              }
            >
              {isAddressLocked ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Unlock className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Street Address */}
          <FormField
            control={control}
            name="clientStreetAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={
                      hubspotContact?.properties?.address || "123 Business St"
                    }
                    disabled={!!isAddressLocked}
                    title={isAddressLocked ? "Locked from HubSpot" : undefined}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={control}
              name="clientCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={hubspotContact?.properties?.city || "City"}
                      disabled={!!isAddressLocked}
                      title={
                        isAddressLocked ? "Locked from HubSpot" : undefined
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="clientState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={hubspotContact?.properties?.state || "State"}
                      disabled={!!isAddressLocked}
                      title={
                        isAddressLocked ? "Locked from HubSpot" : undefined
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="clientZipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={hubspotContact?.properties?.zip || "ZIP"}
                      disabled={!!isAddressLocked}
                      title={
                        isAddressLocked ? "Locked from HubSpot" : undefined
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </KbCard>
  );
}

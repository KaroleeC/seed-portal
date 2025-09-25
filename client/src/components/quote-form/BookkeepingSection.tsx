import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// Checkbox no longer used after converting to card-based selections
import { KbCard } from "@/components/seedkb/KbCard";
import { ChevronDown, ChevronUp, Banknote, ListChecks, CreditCard } from "lucide-react";
// Select components no longer used after converting to card-based selections
import { Card, CardContent } from "@/components/ui/card";
import {
  BANK_OPTIONS,
  MERCHANT_PROVIDER_OPTIONS,
  BOOKKEEPING_SOFTWARE_OPTIONS,
  MONTHLY_TRANSACTION_BANDS,
  ACCOUNTING_BASIS_OPTIONS,
} from "@/components/quote-form/constants";

interface BookkeepingSectionProps {
  form: UseFormReturn<QuoteFormFields>;
}

export default function BookkeepingSection({ form }: BookkeepingSectionProps) {
  // Only show if Monthly Bookkeeping service is selected
  if (!form.watch("serviceMonthlyBookkeeping")) return null;

  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <KbCard className="p-6 mb-8">
      <div
        className="cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between group p-3 -m-3 rounded-lg transition-colors">
          <h3 className="text-xl font-semibold text-foreground">Bookkeeping Service Details</h3>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm font-medium">{isExpanded ? "Collapse" : "Expand"}</span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 transition-transform" />
            ) : (
              <ChevronDown className="h-5 w-5 transition-transform" />
            )}
          </div>
        </div>
        <hr className="border mt-3 mb-5" />
      </div>

      {isExpanded && (
        <div className="space-y-8">
          {/* Monthly Transactions as selectable cards */}
          <FormField
            control={form.control}
            name="monthlyTransactions"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold text-foreground">
                  Monthly Transactions
                </FormLabel>
                <FormControl>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {MONTHLY_TRANSACTION_BANDS.map((band) => {
                      const selected = field.value === band;
                      return (
                        <Card
                          key={band}
                          className={`cursor-pointer transition-all duration-300 border-2 shadow-sm ${
                            selected
                              ? "kb-select kb-select-active"
                              : "kb-select kb-select-hover"
                          }`}
                          onClick={() => field.onChange(band)}
                        >
                          <CardContent className="p-5 text-center">
                            <span className="text-sm font-medium text-foreground">
                              {band}
                            </span>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Accounting Basis as cards */}
          <FormField
            control={form.control}
            name="accountingBasis"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-blue-600" />
                  Accounting Basis
                </FormLabel>
                <FormControl>
                  <div className="mt-3 grid grid-cols-2 gap-3 max-w-md">
                    {ACCOUNTING_BASIS_OPTIONS.map((opt) => {
                      const selected = (field.value as string | undefined) === opt;
                      return (
                        <Card
                          key={opt}
                          className={`cursor-pointer transition-all duration-300 border-2 shadow-sm ${
                            selected
                              ? "kb-select kb-select-active"
                              : "kb-select kb-select-hover"
                          }`}
                          onClick={() => field.onChange(opt)}
                        >
                          <CardContent className="p-5 text-center">
                            <span className="text-sm font-medium text-foreground">{opt}</span>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </FormControl>
                {field.value === ACCOUNTING_BASIS_OPTIONS[0] && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Recognize revenue and expenses when cash moves
                  </div>
                )}
                {field.value === ACCOUNTING_BASIS_OPTIONS[1] && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Recognize revenue and expenses when incurred
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Business Loans as Yes/No cards */}
          <FormField
            control={form.control}
            name="businessLoans"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold text-foreground">
                  Business Loans or Financing
                </FormLabel>
                <FormControl>
                  <div className="mt-3 grid grid-cols-2 gap-3 max-w-md">
                    {[{ label: "No", value: false }, { label: "Yes", value: true }].map(
                      ({ label, value }) => {
                        const selected = Boolean(field.value) === value;
                        return (
                          <Card
                            key={label}
                            className={`cursor-pointer transition-all duration-300 border-2 shadow-sm ${
                              selected
                                ? "kb-select kb-select-active"
                                : "kb-select kb-select-hover"
                            }`}
                            onClick={() => field.onChange(value)}
                          >
                            <CardContent className="p-5 text-center">
                              <span className="text-sm font-medium text-foreground">{label}</span>
                            </CardContent>
                          </Card>
                        );
                      },
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Current Bookkeeping Software as cards */}
          <FormField
            control={form.control}
            name="currentBookkeepingSoftware"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  Current Bookkeeping Software
                </FormLabel>
                <FormControl>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {BOOKKEEPING_SOFTWARE_OPTIONS.map((opt) => {
                      const selected = (field.value as string | undefined) === opt;
                      return (
                        <Card
                          key={opt}
                          className={`cursor-pointer transition-all duration-300 border-2 shadow-sm ${
                            selected ? "kb-select kb-select-active" : "kb-select kb-select-hover"
                          }`}
                          onClick={() => field.onChange(opt)}
                        >
                          <CardContent className="p-5 text-center">
                            <span className="text-sm font-medium text-foreground">{opt}</span>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </FormControl>
                {field.value ===
                  BOOKKEEPING_SOFTWARE_OPTIONS[
                    BOOKKEEPING_SOFTWARE_OPTIONS.length - 1
                  ] && (
                  <div className="mt-3 max-w-md">
                    <FormField
                      control={form.control}
                      name="otherBookkeepingSoftware"
                      render={({ field: otherField }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Specify other software</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter software name" {...otherField} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </FormItem>
            )}
          />

          {/* Primary Bank as cards */}
          <FormField
            control={form.control}
            name="primaryBank"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-green-600" />
                  Primary Bank
                </FormLabel>
                <FormControl>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {BANK_OPTIONS.map((bank) => {
                      const selected = (field.value as string | undefined) === bank;
                      return (
                        <Card
                          key={bank}
                          className={`cursor-pointer transition-all duration-300 border-2 shadow-sm ${
                            selected
                              ? "kb-select kb-select-active"
                              : "kb-select kb-select-hover"
                          }`}
                          onClick={() => field.onChange(bank)}
                        >
                          <CardContent className="p-5 text-center">
                            <span className="text-sm font-medium text-foreground">{bank}</span>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </FormControl>
                {field.value === BANK_OPTIONS[BANK_OPTIONS.length - 1] && (
                  <div className="mt-3 max-w-md">
                    <FormField
                      control={form.control}
                      name="otherPrimaryBank"
                      render={({ field: otherField }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Specify other bank</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter bank name" {...otherField} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </FormItem>
            )}
          />

          {/* Additional Banks */}
          <FormField
            control={form.control}
            name="additionalBanks"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold text-foreground">Additional Banks</FormLabel>
                <div className="space-y-3">
                  {(field.value || []).map((val: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 max-w-xl">
                      <Input
                        value={val}
                        placeholder="Enter bank name"
                        onChange={(e) => {
                          const next = [...(field.value || [])];
                          next[idx] = e.target.value;
                          field.onChange(next);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const next = [...(field.value || [])];
                          next.splice(idx, 1);
                          field.onChange(next);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => field.onChange([...(field.value || []), ""])}
                  >
                    Add Bank
                  </Button>
                </div>
              </FormItem>
            )}
          />

          {/* Merchant Providers as multi-select cards */}
          <FormField
            control={form.control}
            name="merchantProviders"
            render={({ field }) => {
              const selected: string[] = Array.isArray(field.value)
                ? (field.value as string[])
                : [];
              const toggle = (name: string) => {
                if (selected.includes(name)) {
                  field.onChange(selected.filter((s) => s !== name));
                } else {
                  field.onChange([...selected, name]);
                }
              };
              const otherOption =
                MERCHANT_PROVIDER_OPTIONS[MERCHANT_PROVIDER_OPTIONS.length - 1] ??
                "Other";
              const isOther = selected.includes(otherOption);
              return (
                <FormItem>
                  <FormLabel className="text-lg font-semibold text-foreground">
                    Merchant Providers
                  </FormLabel>
                  <FormControl>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {MERCHANT_PROVIDER_OPTIONS.map((name) => {
                        const isSelected = selected.includes(name);
                        return (
                          <Card
                            key={name}
                            className={`cursor-pointer transition-all duration-300 border-2 shadow-sm ${
                              isSelected
                                ? "kb-select kb-select-active"
                                : "kb-select kb-select-hover"
                            }`}
                            onClick={() => toggle(name)}
                          >
                            <CardContent className="p-5 text-center">
                              <span className="text-sm font-medium text-foreground">{name}</span>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </FormControl>
                  {isOther && (
                    <div className="mt-3 max-w-md">
                      <FormField
                        control={form.control}
                        name="otherMerchantProvider"
                        render={({ field: otherField }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Specify other provider</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter provider name" {...otherField} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="qboSubscription"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-medium text-foreground">
                    Include QuickBooks Online Subscription
                  </FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Adds QBO subscription fee to monthly total
                  </div>
                </div>
                <FormControl>
                  <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      )}
    </KbCard>
  );
}

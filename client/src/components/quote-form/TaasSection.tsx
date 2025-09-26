import React, { useState, useEffect } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Control, UseFormReturn, useWatch } from "react-hook-form";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import { ChevronDown, ChevronUp } from "lucide-react";
import { KbCard } from "@/components/seedkb/KbCard";

interface TaasSectionProps {
  control: Control<QuoteFormFields>;
  currentFormView: "bookkeeping" | "taas";
  form: UseFormReturn<QuoteFormFields>; // Access to the full form for setValue
}

export function TaasSection({
  control,
  currentFormView,
  form,
}: TaasSectionProps) {
  // Show when Tax Advisory service is selected (no tab/toggle gating)
  const isTaasSelected = form.watch("serviceTaasMonthly");
  if (!isTaasSelected) return null;

  // Auto-default bookkeeping quality to 'clean' when only Prior Year Filings is selected
  useEffect(() => {
    const isPriorYearFilingsOnly =
      form.watch("servicePriorYearFilings") &&
      !form.watch("serviceTaasMonthly");
    if (isPriorYearFilingsOnly && !form.watch("bookkeepingQuality")) {
      form.setValue("bookkeepingQuality", "Clean / New");
    }
  }, [form.watch("servicePriorYearFilings"), form.watch("serviceTaasMonthly")]);

  // Watch values for conditional logic
  const numEntities = useWatch({ control, name: "numEntities" });
  const statesFiled = useWatch({ control, name: "statesFiled" });
  const numBusinessOwners = useWatch({ control, name: "numBusinessOwners" });
  const includesBookkeeping = useWatch({
    control,
    name: "serviceMonthlyBookkeeping",
  });
  const serviceTaasMonthly = useWatch({ control, name: "serviceTaasMonthly" });
  const servicePriorYearFilings = useWatch({
    control,
    name: "servicePriorYearFilings",
  });

  // State for custom inputs
  const [showCustomEntities, setShowCustomEntities] = useState(false);
  const [showCustomStates, setShowCustomStates] = useState(false);
  const [showCustomOwners, setShowCustomOwners] = useState(false);

  // State for collapsible section
  const [isExpanded, setIsExpanded] = useState(true);

  // Handle tile selections with custom inputs
  const handleEntitiesSelect = (value: number) => {
    if (value === 5) {
      setShowCustomEntities(true);
      form.setValue("numEntities", 5); // Start with 5 as minimum
    } else {
      setShowCustomEntities(false);
      form.setValue("numEntities", value);
    }
  };

  const handleStatesSelect = (value: number) => {
    if (value === 5) {
      setShowCustomStates(true);
      form.setValue("statesFiled", 5); // Start with 5 as minimum
    } else {
      setShowCustomStates(false);
      form.setValue("statesFiled", value);
    }
  };

  const handleOwnersSelect = (value: number) => {
    if (value === 5) {
      setShowCustomOwners(true);
      form.setValue("numBusinessOwners", 5); // Start with 5 as minimum
    } else {
      setShowCustomOwners(false);
      form.setValue("numBusinessOwners", value);
    }
  };

  return (
    <KbCard className="p-6 mb-8">
      <div
        className="cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between group p-3 -m-3 rounded-lg transition-colors">
          <h3 className="text-xl font-semibold text-foreground">
            Tax Service Details
          </h3>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm font-medium">
              {isExpanded ? "Collapse" : "Expand"}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 transition-transform" />
            ) : (
              <ChevronDown className="h-5 w-5 transition-transform" />
            )}
          </div>
        </div>
        <hr className="border mt-3 mb-5" />
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="space-y-8 animate-in slide-in-from-top-2 duration-300">
          {/* Number of Entities - Tile Selection */}
          <div className="space-y-4">
            <FormLabel className="text-base font-medium text-foreground">
              Number of Entities <span className="text-red-500">*</span>
            </FormLabel>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleEntitiesSelect(num)}
                  className={`p-4 rounded-lg border-2 text-center transition-all duration-200 ${
                    numEntities === num || (num === 5 && showCustomEntities)
                      ? "kb-select kb-select-active text-foreground"
                      : "kb-select kb-select-hover text-muted-foreground"
                  }`}
                  data-testid={`tile-entities-${num === 5 ? "custom" : num}`}
                >
                  <div className="font-semibold text-lg">
                    {num === 5 ? "5+" : num}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {num === 1 ? "Entity" : "Entities"}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Entities Input */}
            {showCustomEntities && (
              <FormField
                control={control}
                name="numEntities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exact Number of Entities</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="5"
                        placeholder="Enter exact number (5 or more)"
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 5)
                        }
                        className="max-w-xs"
                        data-testid="input-custom-entities"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* States Filed - Tile Selection */}
          <div className="space-y-4">
            <FormLabel className="text-base font-medium text-foreground">
              States Filed <span className="text-red-500">*</span>
            </FormLabel>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleStatesSelect(num)}
                  className={`p-4 rounded-lg border-2 text-center transition-all duration-200 ${
                    statesFiled === num || (num === 5 && showCustomStates)
                      ? "kb-select kb-select-active text-foreground"
                      : "kb-select kb-select-hover text-muted-foreground"
                  }`}
                  data-testid={`tile-states-${num === 5 ? "custom" : num}`}
                >
                  <div className="font-semibold text-lg">
                    {num === 5 ? "5+" : num}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {num === 1 ? "State" : "States"}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom States Input */}
            {showCustomStates && (
              <FormField
                control={control}
                name="statesFiled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exact Number of States</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="5"
                        placeholder="Enter exact number (5 or more)"
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 5)
                        }
                        className="max-w-xs"
                        data-testid="input-custom-states"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Number of Business Owners - Tile Selection */}
          <div className="space-y-4">
            <FormLabel className="text-base font-medium text-foreground">
              Number of Business Owners <span className="text-red-500">*</span>
            </FormLabel>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleOwnersSelect(num)}
                  className={`p-4 rounded-lg border-2 text-center transition-all duration-200 ${
                    numBusinessOwners === num || (num === 5 && showCustomOwners)
                      ? "kb-select kb-select-active text-foreground"
                      : "kb-select kb-select-hover text-muted-foreground"
                  }`}
                  data-testid={`tile-owners-${num === 5 ? "custom" : num}`}
                >
                  <div className="font-semibold text-lg">
                    {num === 5 ? "5+" : num}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {num === 1 ? "Owner" : "Owners"}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Owners Input */}
            {showCustomOwners && (
              <FormField
                control={control}
                name="numBusinessOwners"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exact Number of Business Owners</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="5"
                        placeholder="Enter exact number (5 or more)"
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 5)
                        }
                        className="max-w-xs"
                        data-testid="input-custom-owners"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* International Filing - Toggle Switch */}
          <FormField
            control={control}
            name="internationalFiling"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-medium text-foreground">
                    International Filing Required
                  </FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Additional complexity for international tax requirements
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-international-filing"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Include Personal 1040s - Toggle Switch */}
          <FormField
            control={control}
            name="include1040s"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-medium text-foreground">
                    Include Personal 1040 Tax Returns
                  </FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Add personal tax return preparation to the service
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-include-1040s"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Current Bookkeeping Quality - Only show for TaaS Monthly (not Prior Year Filings only) */}
          {!includesBookkeeping && serviceTaasMonthly && (
            <FormField
              control={control}
              name="bookkeepingQuality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium text-foreground">
                    Current Bookkeeping Quality{" "}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <div className="text-sm text-muted-foreground mb-3">
                    This affects the complexity of tax preparation work required
                  </div>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="bg-background border focus:ring-blue-500 focus:border-blue-500"
                        data-testid="select-bookkeeping-quality"
                      >
                        <SelectValue placeholder="Select bookkeeping quality" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent
                      position="popper"
                      className="z-50 bg-popover"
                    >
                      <SelectItem value="Clean / New">Clean / New</SelectItem>
                      <SelectItem value="Not Done / Behind">
                        Not Done / Behind
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      )}
    </KbCard>
  );
}

import { Control, UseFormReturn } from "react-hook-form";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, DollarSign, TrendingUp } from "lucide-react";
import { KbCard } from "@/components/seedkb/KbCard";

interface CfoAdvisorySectionProps {
  control: Control<QuoteFormFields>;
  form: UseFormReturn<QuoteFormFields>;
}

export function CfoAdvisorySection({ control, form }: CfoAdvisorySectionProps) {
  // Only show this section if CFO Advisory service is selected
  if (!form.watch("serviceCfoAdvisory")) {
    return null;
  }

  const currentType = form.watch("cfoAdvisoryType") || "pay_as_you_go";
  const currentBundleHours = form.watch("cfoAdvisoryBundleHours");

  const bundleOptions = [
    {
      hours: 8,
      rate: 295,
      total: 2360,
      savings: "vs $300/hr",
      hubspotId: "28928008785",
    },
    {
      hours: 16,
      rate: 290,
      total: 4640,
      savings: "vs $300/hr",
      hubspotId: "28945017959",
    },
    {
      hours: 32,
      rate: 285,
      total: 9120,
      savings: "vs $300/hr",
      hubspotId: "28960863883",
    },
    {
      hours: 40,
      rate: 280,
      total: 11200,
      savings: "vs $300/hr",
      hubspotId: "28960863884",
    },
  ];

  const handleTypeChange = (type: string) => {
    form.setValue("cfoAdvisoryType", type);
    // Store HubSpot product ID for the selected option
    if (type === "pay_as_you_go") {
      form.setValue("cfoAdvisoryHubspotProductId", "28945017957");
      form.setValue("cfoAdvisoryBundleHours", undefined);
    } else if (type === "bundled" && !currentBundleHours) {
      // Default to 8-hour bundle if switching to bundled
      form.setValue("cfoAdvisoryBundleHours", 8);
      form.setValue("cfoAdvisoryHubspotProductId", "28928008785");
    }
    form.trigger();
  };

  const handleBundleChange = (hours: number) => {
    const bundle = bundleOptions.find((b) => b.hours === hours);
    if (bundle) {
      form.setValue("cfoAdvisoryBundleHours", hours);
      form.setValue("cfoAdvisoryHubspotProductId", bundle.hubspotId);
      form.trigger();
    }
  };

  return (
    <KbCard className="p-6 mb-8 space-y-6">
      <h3 className="text-xl font-semibold text-foreground">
        CFO Advisory Service Details
      </h3>

      <FormField
        control={control}
        name="cfoAdvisoryType"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-medium text-gray-700">
              Billing Structure <span className="text-red-500">*</span>
            </FormLabel>
            <FormControl>
              <RadioGroup
                value={currentType}
                onValueChange={handleTypeChange}
                className="space-y-4"
              >
                {/* Pay-as-you-Go Option */}
                <Card
                  className={`cursor-pointer transition-all ${currentType === "pay_as_you_go" ? "ring-2 ring-blue-500 bg-blue-50" : "hover:shadow-md"}`}
                >
                  <CardContent
                    className="p-4"
                    onClick={() => handleTypeChange("pay_as_you_go")}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value="pay_as_you_go"
                        id="pay_as_you_go"
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor="pay_as_you_go"
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-gray-800">
                              Pay-as-you-Go
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            $300/hour billed bi-weekly for actual hours worked
                          </p>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <DollarSign className="h-4 w-4 text-yellow-600" />
                              <span className="font-medium text-yellow-800">
                                8-Hour Deposit Required
                              </span>
                            </div>
                            <p className="text-sm text-yellow-700">
                              $2,400 upfront deposit to start service
                            </p>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bundled Hours Option */}
                <Card
                  className={`cursor-pointer transition-all ${currentType === "bundled" ? "ring-2 ring-purple-500 bg-purple-50" : "hover:shadow-md"}`}
                >
                  <CardContent
                    className="p-4"
                    onClick={() => handleTypeChange("bundled")}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value="bundled"
                        id="bundled"
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="bundled" className="cursor-pointer">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-purple-600" />
                            <span className="font-semibold text-gray-800">
                              Prepaid Hour Bundles
                            </span>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                              Save up to $20/hr
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            Prepaid hours at discounted rates • Valid for 6
                            months
                          </p>

                          {/* Bundle Selection */}
                          {currentType === "bundled" && (
                            <div className="space-y-3">
                              {bundleOptions.map((bundle) => (
                                <div
                                  key={bundle.hours}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBundleChange(bundle.hours);
                                  }}
                                  className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                                    currentBundleHours === bundle.hours
                                      ? "border-purple-500 bg-purple-50"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <RadioGroupItem
                                        value={bundle.hours.toString()}
                                        checked={
                                          currentBundleHours === bundle.hours
                                        }
                                        className="pointer-events-none"
                                      />
                                      <div>
                                        <div className="font-medium text-gray-800">
                                          {bundle.hours} Hours
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          ${bundle.rate}/hour • Save $
                                          {300 - bundle.rate}/hour
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-lg text-gray-800">
                                        ${bundle.total.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-green-600 font-medium">
                                        Save $
                                        {(
                                          (300 - bundle.rate) *
                                          bundle.hours
                                        ).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </RadioGroup>
            </FormControl>
          </FormItem>
        )}
      />
    </KbCard>
  );
}

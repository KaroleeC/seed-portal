import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import { Users, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { KbCard } from "@/components/seedkb/KbCard";

interface PayrollSectionProps {
  form: UseFormReturn<QuoteFormFields>;
}

export default function PayrollSection({ form }: PayrollSectionProps) {
  // Only show if Payroll service is selected
  if (!form.watch("servicePayrollService")) return null;

  const employeeCount = form.watch("payrollEmployeeCount") || 1;
  const stateCount = form.watch("payrollStateCount") || 1;

  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <KbCard className="p-6 mb-8">
      <div
        className="cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between group p-3 -m-3 rounded-lg transition-colors">
          <h3 className="text-xl font-semibold text-foreground">Payroll Service Details</h3>
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
        <div className="space-y-8 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Configure your payroll requirements and pricing
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
        {/* Employee Count Slider */}
        <FormField
          control={form.control}
          name="payrollEmployeeCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users className="w-4 h-4 text-blue-600" />
                Number of W2 Employees
              </FormLabel>
              <div className="space-y-3">
                <div className="px-3 py-2 bg-muted rounded-lg border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">
                      Employee Count
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {employeeCount}{" "}
                      {employeeCount === 1 ? "employee" : "employees"}
                    </span>
                  </div>
                  <FormControl>
                    {employeeCount >= 50 ? (
                      <div className="space-y-2">
                        <Input
                          type="number"
                          min="1"
                          max="999"
                          value={field.value || 1}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 1)
                          }
                          className="text-center text-lg font-bold"
                          data-testid="input-employee-count"
                        />
                        <p className="text-xs text-blue-600 text-center">
                          Enter exact number of employees
                        </p>
                      </div>
                    ) : (
                      <>
                        <Slider
                          value={[field.value || 1]}
                          onValueChange={(values) => field.onChange(values[0])}
                          max={50}
                          min={1}
                          step={1}
                          className="w-full"
                          data-testid="slider-employee-count"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1</span>
                          <span>50+</span>
                        </div>
                      </>
                    )}
                  </FormControl>
                </div>
                <p className="text-xs text-muted-foreground">
                  Base rate covers up to 3 employees. Additional employees are
                  $12/month each.
                </p>
              </div>
            </FormItem>
          )}
        />

        {/* State Count Slider */}
        <FormField
          control={form.control}
          name="payrollStateCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="w-4 h-4 text-green-600" />
                Number of States
              </FormLabel>
              <div className="space-y-3">
                <div className="px-3 py-2 bg-muted rounded-lg border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">
                      States with Employees
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {stateCount} {stateCount === 1 ? "state" : "states"}
                    </span>
                  </div>
                  <FormControl>
                    {stateCount >= 15 ? (
                      <div className="space-y-2">
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={field.value || 1}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 1)
                          }
                          className="text-center text-lg font-bold"
                          data-testid="input-state-count"
                        />
                        <p className="text-xs text-green-600 text-center">
                          Enter exact number of states
                        </p>
                      </div>
                    ) : (
                      <>
                        <Slider
                          value={[field.value || 1]}
                          onValueChange={(values) => field.onChange(values[0])}
                          max={15}
                          min={1}
                          step={1}
                          className="w-full"
                          data-testid="slider-state-count"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1</span>
                          <span>15+</span>
                        </div>
                      </>
                    )}
                  </FormControl>
                </div>
                <p className="text-xs text-muted-foreground">
                  Base rate covers 1 state. Additional states are $25/month
                  each.
                </p>
              </div>
            </FormItem>
          )}
        />
          </div>
        </div>
      )}
    </KbCard>
  );
}

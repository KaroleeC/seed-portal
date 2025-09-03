import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { UseFormReturn } from "react-hook-form";
import { Users, MapPin } from "lucide-react";

interface PayrollSectionProps {
  form: UseFormReturn<any>;
}

export default function PayrollSection({ form }: PayrollSectionProps) {
  const employeeCount = form.watch('payrollEmployeeCount') || 1;
  const stateCount = form.watch('payrollStateCount') || 1;

  // Calculate pricing breakdown
  const baseFee = 100; // $100/mo for up to 3 employees in 1 state
  const additionalEmployeeFee = employeeCount > 3 ? (employeeCount - 3) * 12 : 0;
  const additionalStateFee = stateCount > 1 ? (stateCount - 1) * 25 : 0;
  const totalMonthlyFee = baseFee + additionalEmployeeFee + additionalStateFee;

  return (
    <div className="space-y-6">
      {/* Employee Count Slider */}
      <FormField
        control={form.control}
        name="payrollEmployeeCount"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2 text-base font-semibold">
              <Users className="w-5 h-5 text-blue-600" />
              Number of W2 Employees
            </FormLabel>
            <div className="space-y-4">
              <div className="px-4 py-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Employee Count</span>
                  <span className="text-2xl font-bold text-blue-700">
                    {employeeCount} {employeeCount === 1 ? 'employee' : 'employees'}
                  </span>
                </div>
                <FormControl>
                  <Slider
                    value={[field.value || 1]}
                    onValueChange={(values) => field.onChange(values[0])}
                    max={50}
                    min={1}
                    step={1}
                    className="w-full"
                    data-testid="slider-employee-count"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>25</span>
                  <span>50+</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Base rate covers up to 3 employees. Additional employees are $12/month each.
              </div>
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
            <FormLabel className="flex items-center gap-2 text-base font-semibold">
              <MapPin className="w-5 h-5 text-green-600" />
              Number of States
            </FormLabel>
            <div className="space-y-4">
              <div className="px-4 py-3 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">States with Employees</span>
                  <span className="text-2xl font-bold text-green-700">
                    {stateCount} {stateCount === 1 ? 'state' : 'states'}
                  </span>
                </div>
                <FormControl>
                  <Slider
                    value={[field.value || 1]}
                    onValueChange={(values) => field.onChange(values[0])}
                    max={15}
                    min={1}
                    step={1}
                    className="w-full"
                    data-testid="slider-state-count"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>8</span>
                  <span>15+</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Base rate covers 1 state. Additional states are $25/month each.
              </div>
            </div>
          </FormItem>
        )}
      />

      {/* Pricing Preview */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <h4 className="font-semibold text-gray-800 mb-3">Payroll Pricing Breakdown</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Base fee (up to 3 employees, 1 state):</span>
            <span className="font-medium">$100/month</span>
          </div>
          {additionalEmployeeFee > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Additional employees ({employeeCount - 3} × $12):</span>
              <span className="font-medium">${additionalEmployeeFee}/month</span>
            </div>
          )}
          {additionalStateFee > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Additional states ({stateCount - 1} × $25):</span>
              <span className="font-medium">${additionalStateFee}/month</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2 mt-3">
            <div className="flex justify-between font-semibold text-base">
              <span className="text-gray-800">Total Monthly Fee:</span>
              <span className="text-blue-700">${totalMonthlyFee}/month</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
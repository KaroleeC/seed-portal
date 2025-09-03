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

  return (
    <div className="bg-gradient-to-br from-blue-50 to-green-50 border border-blue-200 rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-blue-800 text-lg">Payroll Service Details</h3>
          <p className="text-sm text-blue-600">Configure your payroll requirements and pricing</p>
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
                <div className="px-3 py-2 bg-white rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500">Employee Count</span>
                    <span className="text-lg font-bold text-blue-700">
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
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1</span>
                    <span>50+</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Base rate covers up to 3 employees. Additional employees are $12/month each.
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
                <div className="px-3 py-2 bg-white rounded-lg border border-green-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500">States with Employees</span>
                    <span className="text-lg font-bold text-green-700">
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
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1</span>
                    <span>15+</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Base rate covers 1 state. Additional states are $25/month each.
                </p>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
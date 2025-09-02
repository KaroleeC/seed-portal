import { Control, UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";

interface PriorYearFilingsSectionProps {
  control: Control<any>;
  form: UseFormReturn<any>;
}

export function PriorYearFilingsSection({ control, form }: PriorYearFilingsSectionProps) {
  const currentYear = new Date().getFullYear();
  const priorYears = Array.from({ length: 7 }, (_, i) => currentYear - (i + 1));
  
  const selectedYears = form.watch('priorYearFilings') || [];
  
  const toggleYear = (year: number) => {
    const currentSelected = form.getValues('priorYearFilings') || [];
    if (currentSelected.includes(year)) {
      form.setValue('priorYearFilings', currentSelected.filter((y: number) => y !== year));
    } else {
      form.setValue('priorYearFilings', [...currentSelected, year].sort((a, b) => b - a));
    }
    form.trigger('priorYearFilings');
  };

  // Only show this section if Prior Year Filings service is selected
  if (!form.watch('servicePriorYearFilings')) {
    return null;
  }

  return (
    <div className="space-y-8 border-t pt-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-800">Prior Year Filings Details</h3>
        <hr className="border-gray-200 mt-3" />
      </div>
      
      {/* Prior Years Selection - Tile Selection */}
      <div className="space-y-4">
        <FormField
          control={control}
          name="priorYearFilings"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium text-gray-700">
                Select Prior Years to File <span className="text-red-500">*</span>
              </FormLabel>
              <p className="text-sm text-gray-600 mb-4">
                Each year costs $1,500. Select all years that need tax filings.
              </p>
              <FormControl>
                <div className="grid grid-cols-4 gap-3 mt-3">
                  {priorYears.map((year) => {
                    const isSelected = selectedYears.includes(year);
                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => toggleYear(year)}
                        className={`p-4 border-2 rounded-lg text-center font-medium transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <div className="text-lg font-bold">{year}</div>
                        <div className="text-xs text-gray-500 mt-1">Tax Year</div>
                      </button>
                    );
                  })}
                </div>
              </FormControl>
              
              {/* Summary */}
              {selectedYears.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-800">
                    Selected: {selectedYears.length} year{selectedYears.length !== 1 ? 's' : ''} 
                    ({selectedYears.sort((a, b) => b - a).join(', ')})
                  </div>
                  <div className="text-sm text-blue-600 mt-1">
                    Total cost: ${(selectedYears.length * 1500).toLocaleString()}
                  </div>
                </div>
              )}
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
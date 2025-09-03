import { Control, UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PriorYearFilingsSectionProps {
  control: Control<any>;
  form: UseFormReturn<any>;
}

export function PriorYearFilingsSection({ control, form }: PriorYearFilingsSectionProps) {
  const currentYear = new Date().getFullYear();
  const priorYears = Array.from({ length: 7 }, (_, i) => currentYear - (i + 1));
  
  const selectedYears = form.watch('priorYearFilings') || [];
  
  // State for collapsible section
  const [isExpanded, setIsExpanded] = useState(true);
  
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
    <div className="space-y-8">
      <div 
        className="cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between group hover:bg-gray-50 p-3 -m-3 rounded-lg transition-colors">
          <h3 className="text-xl font-semibold text-gray-800 group-hover:text-gray-900">Prior Year Filings Details</h3>
          <div className="flex items-center gap-2 text-gray-500 group-hover:text-gray-700">
            <span className="text-sm font-medium">{isExpanded ? 'Collapse' : 'Expand'}</span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 transition-transform" />
            ) : (
              <ChevronDown className="h-5 w-5 transition-transform" />
            )}
          </div>
        </div>
        <hr className="border-gray-200 mt-3" />
      </div>
      
      {/* Collapsible Content */}
      {isExpanded && (
        <div className="space-y-8 animate-in slide-in-from-top-2 duration-300">
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
            </FormItem>
          )}
        />
          </div>
        </div>
      )}
    </div>
  );
}
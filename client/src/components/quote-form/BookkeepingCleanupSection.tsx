import type { Control, UseFormReturn } from "react-hook-form";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { KbCard } from "@/components/seedkb/KbCard";

interface BookkeepingCleanupSectionProps {
  control: Control<QuoteFormFields>;
  form: UseFormReturn<QuoteFormFields>;
}

export function BookkeepingCleanupSection({
  control,
  form,
}: BookkeepingCleanupSectionProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11

  // Hide current year (2025) if both monthly bookkeeping and cleanup projects are selected
  // because current year cleanup is covered in the setup fee for monthly bookkeeping
  const isMonthlyBookkeepingSelected = form.watch("serviceMonthlyBookkeeping");
  const startYear = isMonthlyBookkeepingSelected
    ? currentYear - 1
    : currentYear;
  const years = Array.from({ length: 5 }, (_, i) => startYear - i); // Conditional year range

  const months = [
    { value: 0, name: "January", short: "Jan" },
    { value: 1, name: "February", short: "Feb" },
    { value: 2, name: "March", short: "Mar" },
    { value: 3, name: "April", short: "Apr" },
    { value: 4, name: "May", short: "May" },
    { value: 5, name: "June", short: "Jun" },
    { value: 6, name: "July", short: "Jul" },
    { value: 7, name: "August", short: "Aug" },
    { value: 8, name: "September", short: "Sep" },
    { value: 9, name: "October", short: "Oct" },
    { value: 10, name: "November", short: "Nov" },
    { value: 11, name: "December", short: "Dec" },
  ];

  const selectedPeriods = form.watch("cleanupPeriods") || [];

  // State for collapsible section
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedYears, setExpandedYears] = useState<{
    [key: string]: boolean;
  }>(() => {
    // Only the first (most recent) year should be expanded by default
    const mostRecentYear = String(years[0]);
    return { [mostRecentYear]: true };
  });

  const toggleYearExpansion = (year: number) => {
    setExpandedYears((prev) => ({
      ...prev,
      [String(year)]: !prev[String(year)],
    }));
  };

  const togglePeriod = (year: number, month: number) => {
    const periodString = `${year}-${String(month + 1).padStart(2, "0")}`; // Format as "2024-01"
    const currentSelected = form.getValues("cleanupPeriods") || [];

    if (currentSelected.includes(periodString)) {
      form.setValue(
        "cleanupPeriods",
        currentSelected.filter((p: string) => p !== periodString),
      );
    } else {
      form.setValue(
        "cleanupPeriods",
        [...currentSelected, periodString].sort(),
      );
    }

    // Update cleanupMonths count for pricing calculations
    const newSelected = form.getValues("cleanupPeriods") || [];
    form.setValue("cleanupMonths", newSelected.length);
    form.trigger("cleanupPeriods");
  };

  const selectAllMonthsForYear = (year: number) => {
    const currentSelected = form.getValues("cleanupPeriods") || [];
    const yearPeriods = months
      .filter((month) => {
        // For current year, only allow months up to current month
        if (year === currentYear) {
          return month.value <= currentMonth;
        }
        return true;
      })
      .map((month) => `${year}-${String(month.value + 1).padStart(2, "0")}`);

    // Remove existing periods for this year and add all new ones
    const otherYearPeriods = currentSelected.filter(
      (p: string) => !p.startsWith(`${year}-`),
    );
    const newSelected = [...otherYearPeriods, ...yearPeriods].sort();

    form.setValue("cleanupPeriods", newSelected);
    form.setValue("cleanupMonths", newSelected.length);
    form.trigger("cleanupPeriods");
  };

  const deselectAllMonthsForYear = (year: number) => {
    const currentSelected = form.getValues("cleanupPeriods") || [];
    const newSelected = currentSelected.filter(
      (p: string) => !p.startsWith(`${year}-`),
    );

    form.setValue("cleanupPeriods", newSelected);
    form.setValue("cleanupMonths", newSelected.length);
    form.trigger("cleanupPeriods");
  };

  const isPeriodSelected = (year: number, month: number) => {
    const periodString = `${year}-${String(month + 1).padStart(2, "0")}`;
    return selectedPeriods.includes(periodString);
  };

  const getSelectedMonthsForYear = (year: number) => {
    return selectedPeriods.filter((p: string) => p.startsWith(`${year}-`))
      .length;
  };

  const isMonthSelectable = (year: number, month: number) => {
    // For current year, only allow months up to current month
    if (year === currentYear) {
      return month <= currentMonth;
    }
    return true;
  };

  // Only show this section if Bookkeeping Cleanup Projects service is selected
  if (!form.watch("serviceCleanupProjects")) {
    return null;
  }

  return (
    <KbCard className="p-6 mb-8">
      <div
        className="cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between group p-3 -m-3 rounded-lg transition-colors">
          <h3 className="text-xl font-semibold text-foreground">
            Bookkeeping Cleanup Project Details
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
          {/* Cleanup Periods Selection */}
          <div className="space-y-6">
            <FormField
              control={control}
              name="cleanupPeriods"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium text-gray-700">
                    Select Cleanup Periods{" "}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  {isMonthlyBookkeepingSelected && (
                    <p className="text-sm text-blue-600 font-medium mb-6">
                      Note: {currentYear} cleanup is included in your monthly
                      bookkeeping setup fee.
                    </p>
                  )}

                  <FormControl>
                    <div className="space-y-6">
                      {years.map((year) => {
                        const isYearExpanded = expandedYears[String(year)] === true; // Only expanded if explicitly set to true
                        const selectedMonthsCount =
                          getSelectedMonthsForYear(year);
                        const availableMonths = months.filter((month) =>
                          isMonthSelectable(year, month.value),
                        );
                        const allMonthsSelected =
                          selectedMonthsCount === availableMonths.length;

                        return (
                          <div
                            key={year}
                            className="border rounded-lg overflow-hidden"
                          >
                            {/* Year Header */}
                            <div className="bg-muted p-4 border-b border">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleYearExpansion(year)}
                                    className="flex items-center gap-2 font-semibold text-lg text-foreground hover:text-foreground"
                                  >
                                    {year}
                                    {isYearExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                  {selectedMonthsCount > 0 && (
                                    <span className="bg-muted text-foreground px-2 py-1 rounded-full text-xs font-medium">
                                      {selectedMonthsCount} month
                                      {selectedMonthsCount !== 1 ? "s" : ""} 
                                      selected
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {!allMonthsSelected &&
                                    selectedMonthsCount <
                                      availableMonths.length && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          selectAllMonthsForYear(year)
                                        }
                                        className="text-sm text-primary hover:opacity-90 font-medium"
                                      >
                                        Select All
                                      </button>
                                    )}
                                  {selectedMonthsCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        deselectAllMonthsForYear(year)
                                      }
                                      className="text-sm text-muted-foreground hover:text-foreground font-medium"
                                    >
                                      Clear All
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Month Selection Grid */}
                            {isYearExpanded && (
                              <div className="p-4">
                                <div className="grid grid-cols-6 gap-2">
                                  {months.map((month) => {
                                    const isSelected = isPeriodSelected(
                                      year,
                                      month.value,
                                    );
                                    const isSelectable = isMonthSelectable(
                                      year,
                                      month.value,
                                    );

                                    return (
                                      <button
                                        key={month.value}
                                        type="button"
                                        onClick={() =>
                                          isSelectable &&
                                          togglePeriod(year, month.value)
                                        }
                                        disabled={!isSelectable}
                                        className={`p-3 border-2 rounded-lg text-center font-medium transition-all text-sm ${
                                          !isSelectable
                                            ? "border-muted bg-muted/40 text-muted-foreground cursor-not-allowed"
                                            : isSelected
                                              ? "kb-select kb-select-active text-foreground"
                                              : "kb-select kb-select-hover text-muted-foreground"
                                        }`}
                                      >
                                        <div className="font-bold">
                                          {month.short}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {String(month.value + 1).padStart(
                                            2,
                                            "0",
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>

                                {year === currentYear && (
                                  <p className="text-xs text-gray-500 mt-3">
                                    * Future months in {currentYear} are not
                                    available for selection
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Summary */}
                      {selectedPeriods.length > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-800">
                              Total cleanup periods selected:{" "}
                              {selectedPeriods.length}
                            </span>
                            <span className="text-sm text-blue-600">
                              This will determine your project scope and pricing
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      )}
    </KbCard>
  );
}

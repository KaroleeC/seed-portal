import React, { useState, useEffect } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Control, useWatch } from "react-hook-form";
import { FormData } from "./QuoteFormSchema";

interface TaasSectionProps {
  control: Control<FormData>;
  currentFormView: 'bookkeeping' | 'taas';
  form: any; // Access to the full form for setValue
}

export function TaasSection({ control, currentFormView, form }: TaasSectionProps) {
  if (currentFormView !== 'taas') return null;

  // Watch values for conditional logic
  const numEntities = useWatch({ control, name: 'numEntities' });
  const statesFiled = useWatch({ control, name: 'statesFiled' });
  const includesBookkeeping = useWatch({ control, name: 'serviceMonthlyBookkeeping' });
  
  // State for custom inputs
  const [showCustomEntities, setShowCustomEntities] = useState(false);
  const [showCustomStates, setShowCustomStates] = useState(false);

  // Handle tile selections with custom inputs
  const handleEntitiesSelect = (value: number) => {
    if (value === 5) {
      setShowCustomEntities(true);
      form.setValue('numEntities', 5); // Start with 5 as minimum
    } else {
      setShowCustomEntities(false);
      form.setValue('numEntities', value);
    }
  };

  const handleStatesSelect = (value: number) => {
    if (value === 5) {
      setShowCustomStates(true);
      form.setValue('statesFiled', 5); // Start with 5 as minimum
    } else {
      setShowCustomStates(false);
      form.setValue('statesFiled', value);
    }
  };

  return (
    <div className="space-y-8 border-t pt-6">
      <h3 className="text-xl font-semibold text-gray-800">Tax Service Details</h3>
      
      {/* Number of Entities - Tile Selection */}
      <div className="space-y-4">
        <FormLabel className="text-base font-medium text-gray-700">Number of Entities <span className="text-red-500">*</span></FormLabel>
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleEntitiesSelect(num)}
              className={`p-4 rounded-lg border-2 text-center transition-all duration-200 ${
                (numEntities === num || (num === 5 && showCustomEntities))
                  ? 'border-[#e24c00] bg-orange-50 text-[#e24c00]'
                  : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
              }`}
              data-testid={`tile-entities-${num === 5 ? 'custom' : num}`}
            >
              <div className="font-semibold text-lg">{num === 5 ? '5+' : num}</div>
              <div className="text-xs text-gray-500 mt-1">
                {num === 1 ? 'Entity' : 'Entities'}
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
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
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
        <FormLabel className="text-base font-medium text-gray-700">States Filed <span className="text-red-500">*</span></FormLabel>
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleStatesSelect(num)}
              className={`p-4 rounded-lg border-2 text-center transition-all duration-200 ${
                (statesFiled === num || (num === 5 && showCustomStates))
                  ? 'border-[#e24c00] bg-orange-50 text-[#e24c00]'
                  : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
              }`}
              data-testid={`tile-states-${num === 5 ? 'custom' : num}`}
            >
              <div className="font-semibold text-lg">{num === 5 ? '5+' : num}</div>
              <div className="text-xs text-gray-500 mt-1">
                {num === 1 ? 'State' : 'States'}
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
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
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
        <FormLabel className="text-base font-medium text-gray-700">Number of Business Owners <span className="text-red-500">*</span></FormLabel>
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((num) => (
            <FormField
              key={num}
              control={control}
              name="numBusinessOwners"
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(num)}
                  className={`p-4 rounded-lg border-2 text-center transition-all duration-200 ${
                    field.value === num
                      ? 'border-[#e24c00] bg-orange-50 text-[#e24c00]'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                  data-testid={`tile-owners-${num === 5 ? 'custom' : num}`}
                >
                  <div className="font-semibold text-lg">{num === 5 ? '5+' : num}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {num === 1 ? 'Owner' : 'Owners'}
                  </div>
                </button>
              )}
            />
          ))}
        </div>
      </div>

      {/* International Filing - Toggle Switch */}
      <FormField
        control={control}
        name="internationalFiling"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4 bg-white">
            <div className="space-y-0.5">
              <FormLabel className="text-base font-medium text-gray-700">
                International Filing Required
              </FormLabel>
              <div className="text-sm text-gray-500">
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
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4 bg-white">
            <div className="space-y-0.5">
              <FormLabel className="text-base font-medium text-gray-700">
                Include Personal 1040 Tax Returns
              </FormLabel>
              <div className="text-sm text-gray-500">
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

      {/* Current Bookkeeping Quality - Conditional on NOT having bookkeeping service */}
      {!includesBookkeeping && (
        <FormField
          control={control}
          name="bookkeepingQuality"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium text-gray-700">Current Bookkeeping Quality <span className="text-red-500">*</span></FormLabel>
              <div className="text-sm text-gray-500 mb-3">
                This affects the complexity of tax preparation work required
              </div>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent" data-testid="select-bookkeeping-quality">
                    <SelectValue placeholder="Select bookkeeping quality" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Clean / New">Clean / New</SelectItem>
                  <SelectItem value="Not Done / Behind">Not Done / Behind</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
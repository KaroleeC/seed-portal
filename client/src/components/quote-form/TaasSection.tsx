import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Control } from "react-hook-form";
import { FormData } from "./QuoteFormSchema";

interface TaasSectionProps {
  control: Control<FormData>;
  currentFormView: 'bookkeeping' | 'taas';
}

export function TaasSection({ control, currentFormView }: TaasSectionProps) {
  if (currentFormView !== 'taas') return null;

  return (
    <div className="space-y-6 border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-800">Tax Service Details</h3>
      
      {/* Entity Type */}
      <FormField
        control={control}
        name="entityType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Entity Type (Tax Classification)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <FormControl>
                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="C-Corp">C-Corp</SelectItem>
                <SelectItem value="S-Corp">S-Corp</SelectItem>
                <SelectItem value="Partnership">Partnership</SelectItem>
                <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Number of Entities */}
      <FormField
        control={control}
        name="numEntities"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Number of Entities</FormLabel>
            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
              <FormControl>
                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                  <SelectValue placeholder="Select number of entities" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5+</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* States Filed */}
      <FormField
        control={control}
        name="statesFiled"
        render={({ field }) => (
          <FormItem>
            <FormLabel>States Filed</FormLabel>
            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
              <FormControl>
                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                  <SelectValue placeholder="Select number of states" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5+</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* International Filing */}
      <FormField
        control={control}
        name="internationalFiling"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>International Filing Required</FormLabel>
            </div>
          </FormItem>
        )}
      />

      {/* Number of Business Owners */}
      <FormField
        control={control}
        name="numBusinessOwners"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Number of Business Owners</FormLabel>
            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
              <FormControl>
                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                  <SelectValue placeholder="Select number of owners" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5+</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Bookkeeping Quality */}
      <FormField
        control={control}
        name="bookkeepingQuality"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Current Bookkeeping Quality</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <FormControl>
                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
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

      {/* Include 1040s */}
      <FormField
        control={control}
        name="include1040s"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Include Personal 1040 Tax Returns</FormLabel>
            </div>
          </FormItem>
        )}
      />

      {/* Prior Years Unfiled */}
      <FormField
        control={control}
        name="priorYearsUnfiled"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Prior Years Unfiled</FormLabel>
            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
              <FormControl>
                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                  <SelectValue placeholder="Select number of years" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="0">0</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Already on Seed Bookkeeping */}
      <FormField
        control={control}
        name="alreadyOnSeedBookkeeping"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Already on Seed Bookkeeping (50% discount)</FormLabel>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
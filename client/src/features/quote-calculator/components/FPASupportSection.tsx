import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart } from "lucide-react";

interface FPASupportSectionProps {
  form: UseFormReturn<any>;
}

export function FPASupportSection({ form }: FPASupportSectionProps) {
  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-green-700">
          <LineChart className="h-5 w-5" />
          FP&A Support Service Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fpaSupportHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Support Hours</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hours" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="5">5 hours/month</SelectItem>
                    <SelectItem value="10">10 hours/month</SelectItem>
                    <SelectItem value="20">20 hours/month</SelectItem>
                    <SelectItem value="custom">Custom hours</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fpaSupportType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Support Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select support type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="maintenance">Model Maintenance</SelectItem>
                    <SelectItem value="analysis">Analysis & Reporting</SelectItem>
                    <SelectItem value="consulting">Strategic Consulting</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
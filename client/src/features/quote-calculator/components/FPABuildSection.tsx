import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart } from "lucide-react";

interface FPABuildSectionProps {
  form: UseFormReturn<any>;
}

export default function FPABuildSection({ form }: FPABuildSectionProps) {
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-purple-700">
          <PieChart className="h-5 w-5" />
          FP&A Build Service Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fpaBuildComplexity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model Complexity</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select complexity level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="basic">Basic - Standard templates</SelectItem>
                    <SelectItem value="intermediate">Intermediate - Custom modifications</SelectItem>
                    <SelectItem value="advanced">Advanced - Complex modeling</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fpaBuildTimeline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Timeline</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeline" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="standard">Standard (4-6 weeks)</SelectItem>
                    <SelectItem value="expedited">Expedited (2-3 weeks)</SelectItem>
                    <SelectItem value="rush">Rush (1-2 weeks)</SelectItem>
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
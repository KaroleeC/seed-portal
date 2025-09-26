import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import { KbCard } from "@/components/seedkb/KbCard";

interface AgentOfServiceSectionProps {
  form: UseFormReturn<QuoteFormFields>;
}

export default function AgentOfServiceSection({
  form,
}: AgentOfServiceSectionProps) {
  // Only show if Agent of Service is selected
  if (!form.watch("serviceAgentOfService")) return null;

  const additionalStatesValue =
    form.watch("agentOfServiceAdditionalStates") || 0;
  const complexCaseValue = form.watch("agentOfServiceComplexCase") || false;
  // Calculate total fee
  const baseFee = 150;
  const additionalStatesFee = additionalStatesValue * 150;
  const complexCaseFee = complexCaseValue ? 300 : 0;
  const totalFee = baseFee + additionalStatesFee + complexCaseFee;
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <KbCard className="p-6 mb-8">
      <div
        className="cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between group p-3 -m-3 rounded-lg transition-colors">
          <h3 className="text-xl font-semibold text-foreground">Agent of Service Details</h3>
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
      {/* Base Service Overview */}
      <div className="rounded-lg p-6 border bg-muted">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-foreground">
            Agent of Service - Base Package
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">${baseFee}</div>
            <div className="text-sm text-muted-foreground">Base Fee</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-foreground">Includes:</div>
            <div className="text-xs text-muted-foreground">
              Entity & Filing Admin, Tax & Compliance Admin, Banking & Account
              Setup, Misc.
            </div>
          </div>
        </div>
      </div>

      {/* Additional States/Entities */}
      <div>
        <FormField
          control={form.control}
          name="agentOfServiceAdditionalStates"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Additional States/Entities
                <span className="text-sm font-normal text-muted-foreground">
                  ($150 per additional state/entity)
                </span>
              </FormLabel>
              <div className="mt-4">
                <Card className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Number of additional states/entities (0 = none)"
                          min="0"
                          max="50"
                          className="max-w-sm"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => {
                            const value = e.target.value
                              ? parseInt(e.target.value)
                              : 0;
                            field.onChange(Math.max(0, value));
                          }}
                        />
                      </FormControl>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-green-600">
                        +${additionalStatesFee}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {additionalStatesValue} × $150
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    <p>
                      Each additional state or entity where there is an Agent of
                      Service designation need beyond the primary registration.
                    </p>
                  </div>
                </Card>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Complex Case Upgrade */}
      <div>
        <FormField
          control={form.control}
          name="agentOfServiceComplexCase"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                Complex Case Upgrade
                <span className="text-sm font-normal text-muted-foreground">
                  (+$300 for complex services)
                </span>
              </FormLabel>
              <div className="mt-4">
                <Card
                  className={`cursor-pointer transition-all duration-200 border-2 shadow-sm ${
                    field.value ? "kb-select kb-select-active" : "kb-select kb-select-hover"
                  }`}
                  onClick={() => field.onChange(!field.value)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={field.value || false}
                        onChange={() => field.onChange(!field.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-foreground mb-2">
                          Complex Case Services (+$300)
                        </div>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>Foreign qualification services</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>Corporate reinstatement proceedings</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>Multi-jurisdiction compliance</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>Expedited filing requirements</span>
                          </li>
                        </ul>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-purple-600">
                          +${complexCaseValue ? 300 : 0}
                        </div>
                      </div>
                    </div>
                    {field.value && (
                      <Badge variant="default" className="mt-4">
                        Selected
                      </Badge>
                    )}
                  </CardContent>
                </Card>
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

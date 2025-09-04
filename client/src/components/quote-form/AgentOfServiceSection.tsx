import { useFormContext, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, FileText, DollarSign, CheckCircle, Clock } from 'lucide-react';

interface AgentOfServiceSectionProps {
  form: any;
}

export default function AgentOfServiceSection({ form }: AgentOfServiceSectionProps) {
  const additionalStatesValue = form.watch('agentOfServiceAdditionalStates') || 0;
  const complexCaseValue = form.watch('agentOfServiceComplexCase') || false;

  // Calculate total fee
  const baseFee = 150;
  const additionalStatesFee = additionalStatesValue * 150;
  const complexCaseFee = complexCaseValue ? 300 : 0;
  const totalFee = baseFee + additionalStatesFee + complexCaseFee;

  return (
    <div className="space-y-8">
      {/* Base Service Overview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Agent of Service - Base Package</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">${baseFee}</div>
            <div className="text-sm text-gray-600">Base Fee</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700">Includes:</div>
            <div className="text-xs text-gray-600">Primary state/entity registration</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700">Service:</div>
            <div className="text-xs text-gray-600">Agent of Service designation</div>
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
              <FormLabel className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Additional States/Entities
                <span className="text-sm font-normal text-gray-600">($150 per additional state/entity)</span>
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
                            const value = e.target.value ? parseInt(e.target.value) : 0;
                            field.onChange(Math.max(0, value));
                          }}
                        />
                      </FormControl>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-green-600">
                        +${additionalStatesFee}
                      </div>
                      <div className="text-sm text-gray-600">
                        {additionalStatesValue} × $150
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    <p>Each additional state or entity where you need Agent of Service designation beyond the primary registration.</p>
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
              <FormLabel className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                Complex Case Upgrade
                <span className="text-sm font-normal text-gray-600">(+$300 for complex services)</span>
              </FormLabel>
              <div className="mt-4">
                <Card 
                  className={`cursor-pointer transition-all duration-200 ${
                    field.value 
                      ? 'ring-2 ring-purple-500 border-purple-300 bg-purple-50' 
                      : 'hover:border-gray-300 hover:shadow-md'
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
                        <div className="font-semibold text-gray-800 mb-2">
                          Complex Case Services (+$300)
                        </div>
                        <ul className="space-y-1 text-sm text-gray-600">
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
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Total Fee Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Agent of Service - Total</h3>
            <div className="text-sm text-gray-600 mt-1">
              {baseFee === totalFee ? 'Base service only' : 
               `Base ($${baseFee}) + Additional fees ($${totalFee - baseFee})`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">${totalFee}</div>
            <div className="text-sm text-gray-600">per month</div>
          </div>
        </div>

        {/* Fee Breakdown */}
        {(additionalStatesValue > 0 || complexCaseValue) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Base Agent of Service</span>
                <span>${baseFee}</span>
              </div>
              {additionalStatesValue > 0 && (
                <div className="flex justify-between">
                  <span>Additional States/Entities ({additionalStatesValue})</span>
                  <span>${additionalStatesFee}</span>
                </div>
              )}
              {complexCaseValue && (
                <div className="flex justify-between">
                  <span>Complex Case Upgrade</span>
                  <span>${complexCaseFee}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-1 border-t border-gray-300">
                <span>Total Monthly Fee</span>
                <span>${totalFee}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
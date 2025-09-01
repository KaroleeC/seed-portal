import { Card, CardContent } from "@/components/ui/card";
import { Crown, Star, Users } from "lucide-react";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";

interface ServiceTierCardsProps {
  form: UseFormReturn<any>;
}

export function ServiceTierCards({ form }: ServiceTierCardsProps) {
  const selectedTier = form.watch('serviceTier') || 'Standard';

  const handleTierSelect = (tier: string) => {
    form.setValue('serviceTier', tier);
  };

  return (
    <div className="mb-8">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Choose Your Service Tier</h3>
        <p className="text-gray-600">Select the level of support and guidance that's right for your business</p>
      </div>

      <FormField
        control={form.control}
        name="serviceTier"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Standard Tier */}
                <Card 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                    selectedTier === 'Standard'
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                  onClick={() => handleTierSelect('Standard')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg text-gray-800 mb-2">Standard</h4>
                    <p className="text-2xl font-bold text-blue-600 mb-3">Included</p>
                    <p className="text-sm text-gray-600 mb-4">Base level of service with standard support</p>
                    <ul className="text-xs text-gray-500 text-left space-y-1">
                      <li>• Standard response times</li>
                      <li>• Email support</li>
                      <li>• Standard reporting</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Guided Tier */}
                <Card 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                    selectedTier === 'Guided'
                      ? 'border-orange-500 bg-orange-50 shadow-md' 
                      : 'border-gray-300 hover:border-orange-400'
                  }`}
                  onClick={() => handleTierSelect('Guided')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg text-gray-800 mb-2">Guided</h4>
                    <p className="text-2xl font-bold text-orange-600 mb-3">+$79<span className="text-sm">/mo</span></p>
                    <p className="text-sm text-gray-600 mb-4">Enhanced support and guidance</p>
                    <ul className="text-xs text-gray-500 text-left space-y-1">
                      <li>• Priority support</li>
                      <li>• Phone & email support</li>
                      <li>• Enhanced reporting</li>
                      <li>• Business guidance</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Concierge Tier */}
                <Card 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                    selectedTier === 'Concierge'
                      ? 'border-purple-500 bg-purple-50 shadow-md' 
                      : 'border-gray-300 hover:border-purple-400'
                  }`}
                  onClick={() => handleTierSelect('Concierge')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg text-gray-800 mb-2">Concierge</h4>
                    <p className="text-2xl font-bold text-purple-600 mb-3">+$249<span className="text-sm">/mo</span></p>
                    <p className="text-sm text-gray-600 mb-4">Premium white-glove service</p>
                    <ul className="text-xs text-gray-500 text-left space-y-1">
                      <li>• 24/7 priority support</li>
                      <li>• Dedicated account manager</li>
                      <li>• Custom reporting</li>
                      <li>• Strategic planning</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
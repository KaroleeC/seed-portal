import { useFormContext, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Receipt, Building2, CreditCard, CheckCircle, Clock, Users } from 'lucide-react';

interface APSectionProps {
  form: any;
}

export default function APSection({ form }: APSectionProps) {
  const [showCustomVendorCount, setShowCustomVendorCount] = useState(false);

  const vendorBillsBands = [
    { value: '0-25', label: '0-25 bills', description: 'Small volume' },
    { value: '26-100', label: '26-100 bills', description: 'Medium volume' },
    { value: '101-250', label: '101-250 bills', description: 'High volume' },
    { value: '251+', label: '251+ bills', description: 'Enterprise volume' }
  ];

  const vendorCounts = [
    { value: 5, label: '5 or less', description: '5 payees or less' },
    { value: 6, label: '6', description: '6 payees' },
    { value: 7, label: '7', description: '7 payees' },
    { value: 8, label: '8', description: '8 payees' },
    { value: 9, label: '9', description: '9 payees' },
    { value: 10, label: '10+', description: '10 or more payees' }
  ];

  const serviceTiers = [
    {
      value: 'lite',
      title: 'AP Lite (Reports Only)',
      price: '$150-$1,000/month',
      features: [
        'Automated categorization + reconciliation of vendor bills',
        'Aging reports delivered monthly (who you owe, when, how much)',
        'Cash flow visibility → but no one is paying vendors for you',
        'Great for: DIYers who want clarity but will handle payments themselves'
      ],
      icon: Receipt,
      color: 'bg-blue-50 border-blue-200 hover:border-blue-300'
    },
    {
      value: 'advanced',
      title: 'AP Advanced (Full Service)',
      price: 'Premium service tier',
      features: [
        'Everything in Lite plus:',
        'We actually process and schedule vendor payments (through Bill.com, Melio, or QBO Bill Pay)',
        'Vendor onboarding and W-9 collection',
        'Approval workflows (if client wants controls)',
        'Great for: busy operators who want zero touch beyond approving'
      ],
      icon: CheckCircle,
      color: 'bg-green-50 border-green-200 hover:border-green-300'
    }
  ];

  const handleVendorCountChange = (value: number) => {
    if (value === 10) {
      setShowCustomVendorCount(true);
      form.setValue('apVendorCount', 10);
    } else {
      setShowCustomVendorCount(false);
      form.setValue('apVendorCount', value);
      form.setValue('customApVendorCount', null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Vendor Bills Per Month */}
      <div>
        <FormField
          control={form.control}
          name="apVendorBillsBand"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                Number of Vendor Bills Per Month
              </FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {vendorBillsBands.map((band) => (
                  <Card
                    key={band.value}
                    className={`cursor-pointer transition-all duration-200 ${
                      field.value === band.value
                        ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50'
                        : 'hover:border-gray-300 hover:shadow-md'
                    }`}
                    onClick={() => field.onChange(band.value)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-xl font-semibold text-gray-800 mb-1">
                        {band.label}
                      </div>
                      <div className="text-sm text-gray-600">
                        {band.description}
                      </div>
                      {field.value === band.value && (
                        <Badge variant="default" className="mt-2">
                          Selected
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Number of Vendors/Payees */}
      <div>
        <FormField
          control={form.control}
          name="apVendorCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                Number of Vendors / Payees
                <span className="text-sm font-normal text-gray-600">(unique vendors, not bills)</span>
              </FormLabel>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4">
                {vendorCounts.map((count) => (
                  <Card
                    key={count.value}
                    className={`cursor-pointer transition-all duration-200 ${
                      field.value === count.value
                        ? 'ring-2 ring-purple-500 border-purple-300 bg-purple-50'
                        : 'hover:border-gray-300 hover:shadow-md'
                    }`}
                    onClick={() => handleVendorCountChange(count.value)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-gray-800 mb-1">
                        {count.label}
                      </div>
                      <div className="text-xs text-gray-600">
                        {count.description}
                      </div>
                      {field.value === count.value && (
                        <Badge variant="default" className="mt-2">
                          Selected
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Custom Vendor Count Input */}
        {showCustomVendorCount && (
          <FormField
            control={form.control}
            name="customApVendorCount"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel className="text-sm font-medium text-gray-700">
                  Exact Number of Vendors/Payees
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter exact number of vendors"
                    min="10"
                    className="max-w-xs"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Service Tier Selection */}
      <div>
        <FormField
          control={form.control}
          name="apServiceTier"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Select AP Service Level
              </FormLabel>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                {serviceTiers.map((tier) => {
                  const IconComponent = tier.icon;
                  return (
                    <Card
                      key={tier.value}
                      className={`cursor-pointer transition-all duration-200 ${tier.color} ${
                        field.value === tier.value
                          ? 'ring-2 ring-indigo-500 border-indigo-300'
                          : 'hover:shadow-lg'
                      }`}
                      onClick={() => field.onChange(tier.value)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-6 h-6" />
                            <span className="text-lg">{tier.title}</span>
                          </div>
                          <Badge variant="outline" className="text-lg font-semibold">
                            {tier.price}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="space-y-2">
                          {tier.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className={feature.startsWith('Everything in Lite') ? 'font-semibold' : ''}>
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {field.value === tier.value && (
                          <Badge variant="default" className="mt-4">
                            Selected
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
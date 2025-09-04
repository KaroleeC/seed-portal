import { useFormContext, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { FileText, Users, CreditCard, CheckCircle, Clock } from 'lucide-react';

interface ARSectionProps {
  form: any;
}

export default function ARSection({ form }: ARSectionProps) {
  const [showCustomCustomerCount, setShowCustomCustomerCount] = useState(false);

  const customerInvoicesBands = [
    { value: '0-25', label: '0-25 invoices', description: 'Small volume' },
    { value: '26-100', label: '26-100 invoices', description: 'Medium volume' },
    { value: '101-250', label: '101-250 invoices', description: 'High volume' },
    { value: '251+', label: '251+ invoices', description: 'Enterprise volume' }
  ];

  const customerCounts = [
    { value: 5, label: '5 or less', description: '5 customers or less' },
    { value: 6, label: '6', description: '6 customers' },
    { value: 7, label: '7', description: '7 customers' },
    { value: 8, label: '8', description: '8 customers' },
    { value: 9, label: '9', description: '9 customers' },
    { value: 10, label: '10+', description: '10 or more customers' }
  ];

  const serviceTiers = [
    {
      value: 'lite',
      title: 'AR Lite (Reports Only)',
      price: '$150-$1,000/month',
      features: [
        'Automated categorization + reconciliation of customer invoices',
        'AR aging reports monthly (who owes you, how much, how long overdue)',
        'Great for: businesses who just need visibility'
      ],
      icon: FileText,
      color: 'bg-blue-50 border-blue-200 hover:border-blue-300'
    },
    {
      value: 'advanced',
      title: 'AR Advanced (Human Help)',
      price: 'Premium service tier',
      features: [
        'Everything in Lite plus:',
        'We create/send invoices on client\'s behalf',
        'Payment reminders & light collections outreach',
        'Customer portal setup if available (QBO, etc.)',
        'Great for: businesses tired of chasing checks or dealing with slow-paying clients'
      ],
      icon: CheckCircle,
      color: 'bg-green-50 border-green-200 hover:border-green-300'
    }
  ];

  const handleCustomerCountChange = (value: number) => {
    if (value === 10) {
      setShowCustomCustomerCount(true);
      form.setValue('arCustomerCount', 10);
    } else {
      setShowCustomCustomerCount(false);
      form.setValue('arCustomerCount', value);
      form.setValue('customArCustomerCount', null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Customer Invoices Per Month */}
      <div>
        <FormField
          control={form.control}
          name="arCustomerInvoicesBand"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Number of Customer Invoices Per Month
              </FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {customerInvoicesBands.map((band) => (
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

      {/* Number of Customers/Clients */}
      <div>
        <FormField
          control={form.control}
          name="arCustomerCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Number of Customers / Clients
                <span className="text-sm font-normal text-gray-600">(unique customers, not invoices)</span>
              </FormLabel>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4">
                {customerCounts.map((count) => (
                  <Card
                    key={count.value}
                    className={`cursor-pointer transition-all duration-200 ${
                      field.value === count.value
                        ? 'ring-2 ring-purple-500 border-purple-300 bg-purple-50'
                        : 'hover:border-gray-300 hover:shadow-md'
                    }`}
                    onClick={() => handleCustomerCountChange(count.value)}
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

        {/* Custom Customer Count Input */}
        {showCustomCustomerCount && (
          <FormField
            control={form.control}
            name="customArCustomerCount"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel className="text-sm font-medium text-gray-700">
                  Exact Number of Customers/Clients
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter exact number of customers"
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
          name="arServiceTier"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Select AR Service Level
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
                        <CardTitle className="flex items-center gap-2">
                          <IconComponent className="w-6 h-6" />
                          <span className="text-lg">{tier.title}</span>
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
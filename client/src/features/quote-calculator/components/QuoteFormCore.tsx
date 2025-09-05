import { UseFormReturn } from "react-hook-form";
import { User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServiceTierCards } from "@/components/quote-form/ServiceTierCards";
import { ServiceCards } from "@/components/quote-form/ServiceCards";
import { TaasSection } from "@/components/quote-form/TaasSection";
import { CfoAdvisorySection } from "@/components/quote-form/CfoAdvisorySection";
import PayrollSection from "@/components/quote-form/PayrollSection";
import APSection from "@/components/quote-form/APSection";
import ARSection from "@/components/quote-form/ARSection";
import FPABuildSection from "./FPABuildSection";
import { FPASupportSection } from "./FPASupportSection";
import AgentOfServiceSection from "@/components/quote-form/AgentOfServiceSection";

interface QuoteFormCoreProps {
  form: UseFormReturn<any>;
  showClientDetails: boolean;
  feeCalculation: any;
  onSubmit: (data: any) => void;
}

export function QuoteFormCore({ form, showClientDetails, feeCalculation, onSubmit }: QuoteFormCoreProps) {
  if (!showClientDetails) return null;

  return (
    <Card className="max-w-6xl mx-auto mb-8 bg-white/95 backdrop-blur-sm shadow-xl border-0">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Client Details</h2>
                  <p className="text-sm text-gray-500">Enter client information to start the quote</p>
                </div>
              </div>
            </div>
            
            {/* Basic form fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corporation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contactFirstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contactLastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Second row: Industry, Revenue Range, Entity Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Software/SaaS">Software/SaaS</SelectItem>
                        <SelectItem value="Professional Services">Professional Services</SelectItem>
                        <SelectItem value="Consulting">Consulting</SelectItem>
                        <SelectItem value="Healthcare/Medical">Healthcare/Medical</SelectItem>
                        <SelectItem value="Real Estate">Real Estate</SelectItem>
                        <SelectItem value="E-commerce/Retail">E-commerce/Retail</SelectItem>
                        <SelectItem value="Restaurant/Food Service">Restaurant/Food Service</SelectItem>
                        <SelectItem value="Construction/Trades">Construction/Trades</SelectItem>
                        <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlyRevenueRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Revenue *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select revenue range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="<$10K">&lt;$10K</SelectItem>
                        <SelectItem value="10K-25K">$10K - $25K</SelectItem>
                        <SelectItem value="25K-75K">$25K - $75K</SelectItem>
                        <SelectItem value="75K-250K">$75K - $250K</SelectItem>
                        <SelectItem value="250K-1M">$250K - $1M</SelectItem>
                        <SelectItem value="1M+">$1M+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LLC">LLC</SelectItem>
                        <SelectItem value="S-Corp">S-Corp</SelectItem>
                        <SelectItem value="C-Corp">C-Corp</SelectItem>
                        <SelectItem value="Partnership">Partnership</SelectItem>
                        <SelectItem value="Sole Prop">Sole Proprietorship</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Company Address Section */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Company Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="clientStreetAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main Street" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="clientCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="San Francisco" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <FormControl>
                        <Input placeholder="CA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientZipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="94102" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Service Tier Selection */}
            <div className="mt-6">
              <ServiceTierCards form={form} />
            </div>

            {/* Service Cards */}
            <div className="mt-6">
              <ServiceCards 
                selectedServices={{
                  serviceMonthlyBookkeeping: form.watch('serviceMonthlyBookkeeping') || false,
                  serviceCleanupProjects: form.watch('serviceCleanupProjects') || false,
                  serviceTaasMonthly: form.watch('serviceTaasMonthly') || false,
                  servicePriorYearFilings: form.watch('servicePriorYearFilings') || false,
                  serviceCfoAdvisory: form.watch('serviceCfoAdvisory') || false,
                  servicePayrollService: form.watch('servicePayrollService') || false,
                  serviceApArService: form.watch('serviceApArService') || false,
                  serviceApLite: form.watch('serviceApLite') || false,
                  serviceArLite: form.watch('serviceArLite') || false,
                  serviceApAdvanced: form.watch('serviceApAdvanced') || false,
                  serviceArAdvanced: form.watch('serviceArAdvanced') || false,
                  serviceFpaBuild: form.watch('serviceFpaBuild') || false,
                  serviceFpaSupport: form.watch('serviceFpaSupport') || false,
                  serviceAgentOfService: form.watch('serviceAgentOfService') || false,
                  serviceNexusStudy: form.watch('serviceNexusStudy') || false,
                  serviceEntityOptimization: form.watch('serviceEntityOptimization') || false,
                  serviceCostSegregation: form.watch('serviceCostSegregation') || false,
                  serviceRdCredit: form.watch('serviceRdCredit') || false,
                  serviceRealEstateAdvisory: form.watch('serviceRealEstateAdvisory') || false,
                }}
                onServiceChange={(services) => {
                  Object.entries(services).forEach(([key, value]) => {
                    if (typeof value === 'boolean') {
                      form.setValue(key as any, value);
                    }
                  });
                }}
                feeCalculation={{
                  includesBookkeeping: feeCalculation.includesBookkeeping,
                  includesTaas: feeCalculation.includesTaas
                }}
                onLegacyServiceChange={(bookkeeping, taas) => {
                  form.setValue('serviceMonthlyBookkeeping', bookkeeping);
                  form.setValue('serviceTaasMonthly', taas);
                }}
              />
            </div>

            {/* Bookkeeping Configuration - Inline from Original Container */}
            {(form.watch('serviceMonthlyBookkeeping') || form.watch('serviceCleanupProjects')) && (
              <div className="mt-6 p-6 bg-gray-50 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Bookkeeping Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="monthlyTransactions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Transaction Volume *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transaction volume" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="<100">&lt;100</SelectItem>
                            <SelectItem value="100-300">100-300</SelectItem>
                            <SelectItem value="300-600">300-600</SelectItem>
                            <SelectItem value="600-1000">600-1000</SelectItem>
                            <SelectItem value="1000-2000">1000-2000</SelectItem>
                            <SelectItem value="2000+">2000+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cleanupComplexity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Cleanup Complexity *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select complexity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1.0">1.0 - Clean Books</SelectItem>
                            <SelectItem value="1.5">1.5 - Minor Cleanup</SelectItem>
                            <SelectItem value="2.0">2.0 - Moderate Cleanup</SelectItem>
                            <SelectItem value="2.5">2.5 - Significant Cleanup</SelectItem>
                            <SelectItem value="3.0">3.0 - Major Cleanup</SelectItem>
                            <SelectItem value="3.5">3.5 - Extensive Cleanup</SelectItem>
                            <SelectItem value="4.0">4.0 - Complete Rebuild</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="accountingBasis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accounting Basis *</FormLabel>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {['Cash', 'Accrual'].map((basis) => (
                            <button
                              key={basis}
                              type="button"
                              onClick={() => field.onChange(basis)}
                              className={`p-3 border-2 rounded-lg text-center font-medium transition-all hover:shadow-md ${
                                field.value === basis
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              {basis} Basis
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessLoans"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Loans/Assets *</FormLabel>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {['Yes', 'No'].map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => field.onChange(option === 'Yes')}
                              className={`p-3 border-2 rounded-lg text-center font-medium transition-all hover:shadow-md ${
                                field.value === (option === 'Yes')
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="payrollComplexity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payroll Complexity *</FormLabel>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {['Low', 'Medium', 'High'].map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => field.onChange(level)}
                              className={`p-3 border-2 rounded-lg text-center font-medium transition-all hover:shadow-md ${
                                field.value === level
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Preference *</FormLabel>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {['Tech-Savvy', 'Traditional'].map((pref) => (
                            <button
                              key={pref}
                              type="button"
                              onClick={() => field.onChange(pref)}
                              className={`p-3 border-2 rounded-lg text-center font-medium transition-all hover:shadow-md ${
                                field.value === pref
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              {pref}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {(form.watch('serviceTaasMonthly') || form.watch('servicePriorYearFilings')) && (
              <div className="mt-6">
                <TaasSection form={form} />
              </div>
            )}

            {form.watch('serviceCfoAdvisory') && (
              <div className="mt-6">
                <CfoAdvisorySection form={form} />
              </div>
            )}

            {form.watch('servicePayrollService') && (
              <div className="mt-6">
                <PayrollSection form={form} />
              </div>
            )}

            {(form.watch('serviceApLite') || form.watch('serviceApAdvanced')) && (
              <div className="mt-6">
                <APSection form={form} />
              </div>
            )}

            {(form.watch('serviceArLite') || form.watch('serviceArAdvanced')) && (
              <div className="mt-6">
                <ARSection form={form} />
              </div>
            )}

            {form.watch('serviceFpaBuild') && (
              <div className="mt-6">
                <FPABuildSection form={form} />
              </div>
            )}

            {form.watch('serviceFpaSupport') && (
              <div className="mt-6">
                <FPASupportSection form={form} />
              </div>
            )}

            {form.watch('serviceAgentOfService') && (
              <div className="mt-6">
                <AgentOfServiceSection form={form} />
              </div>
            )}
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
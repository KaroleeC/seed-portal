import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { UniversalNavbar } from '@/components/UniversalNavbar';
import { PermissionGuard } from '@/components/PermissionGuard';
import { PERMISSIONS } from '@shared/permissions';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Building2,
  Target,
  Settings,
  History,
  Save,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface PricingBase {
  id: number;
  service: string;
  baseFee: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IndustryMultiplier {
  id: number;
  industry: string;
  monthlyMultiplier: string;
  cleanupMultiplier: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RevenueMultiplier {
  id: number;
  revenueRange: string;
  multiplier: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TransactionSurcharge {
  id: number;
  transactionRange: string;
  surcharge: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServiceSetting {
  id: number;
  service: string;
  settingKey: string;
  settingValue: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PricingTier {
  id: number;
  service: string;
  tier: string;
  volumeBand: string;
  baseFee: string;
  tierMultiplier: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PricingHistory {
  id: number;
  tableAffected: string;
  recordId: number;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string;
  changedBy: number;
  createdAt: string;
}

export default function AdminPricingPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('base-fees');
  const [editingItem, setEditingItem] = useState<any>(null);

  // Queries for all pricing data
  const { data: baseFees, isLoading: baseFeeLoading } = useQuery<PricingBase[]>({
    queryKey: ['/api/admin/pricing/base']
  });

  const { data: industryMultipliers, isLoading: industryLoading } = useQuery<IndustryMultiplier[]>({
    queryKey: ['/api/admin/pricing/industry-multipliers']
  });

  const { data: revenueMultipliers, isLoading: revenueLoading } = useQuery<RevenueMultiplier[]>({
    queryKey: ['/api/admin/pricing/revenue-multipliers']
  });

  const { data: transactionSurcharges, isLoading: transactionLoading } = useQuery<TransactionSurcharge[]>({
    queryKey: ['/api/admin/pricing/transaction-surcharges']
  });

  const { data: serviceSettings, isLoading: settingsLoading } = useQuery<ServiceSetting[]>({
    queryKey: ['/api/admin/pricing/service-settings']
  });

  const { data: pricingTiers, isLoading: tiersLoading } = useQuery<PricingTier[]>({
    queryKey: ['/api/admin/pricing/tiers']
  });

  const { data: pricingHistory, isLoading: historyLoading } = useQuery<PricingHistory[]>({
    queryKey: ['/api/admin/pricing/history']
  });

  // Mutations for updates
  const updateBaseFee = useMutation({
    mutationFn: (data: { id: number; baseFee: string }) => 
      apiRequest(`/api/admin/pricing/base/${data.id}`, {
        method: 'PUT',
        body: { baseFee: data.baseFee }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing/base'] });
      toast({ title: 'Base fee updated successfully' });
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating base fee', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const updateIndustryMultiplier = useMutation({
    mutationFn: (data: { id: number; monthlyMultiplier: string; cleanupMultiplier: string }) => 
      apiRequest(`/api/admin/pricing/industry-multipliers/${data.id}`, {
        method: 'PUT',
        body: { 
          monthlyMultiplier: data.monthlyMultiplier, 
          cleanupMultiplier: data.cleanupMultiplier 
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing/industry-multipliers'] });
      toast({ title: 'Industry multiplier updated successfully' });
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating industry multiplier', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const updateRevenueMultiplier = useMutation({
    mutationFn: (data: { id: number; multiplier: string }) => 
      apiRequest(`/api/admin/pricing/revenue-multipliers/${data.id}`, {
        method: 'PUT',
        body: { multiplier: data.multiplier }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing/revenue-multipliers'] });
      toast({ title: 'Revenue multiplier updated successfully' });
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating revenue multiplier', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const updateTransactionSurcharge = useMutation({
    mutationFn: (data: { id: number; surcharge: string }) => 
      apiRequest(`/api/admin/pricing/transaction-surcharges/${data.id}`, {
        method: 'PUT',
        body: { surcharge: data.surcharge }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing/transaction-surcharges'] });
      toast({ title: 'Transaction surcharge updated successfully' });
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating transaction surcharge', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const updateServiceSetting = useMutation({
    mutationFn: (data: { id: number; settingValue: string }) => 
      apiRequest(`/api/admin/pricing/service-settings/${data.id}`, {
        method: 'PUT',
        body: { settingValue: data.settingValue }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing/service-settings'] });
      toast({ title: 'Service setting updated successfully' });
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating service setting', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const updatePricingTier = useMutation({
    mutationFn: (data: { id: number; baseFee: string; tierMultiplier: string }) => 
      apiRequest(`/api/admin/pricing/tiers/${data.id}`, {
        method: 'PUT',
        body: { 
          baseFee: data.baseFee, 
          tierMultiplier: data.tierMultiplier 
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing/tiers'] });
      toast({ title: 'Pricing tier updated successfully' });
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating pricing tier', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const clearCache = useMutation({
    mutationFn: () => apiRequest('/api/admin/pricing/clear-cache', { method: 'POST' }),
    onSuccess: () => {
      toast({ title: 'Pricing cache cleared successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error clearing cache', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? '$0' : `$${num.toLocaleString()}`;
  };

  const formatMultiplier = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? '1.0x' : `${num}x`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <PermissionGuard permissions={PERMISSIONS.MANAGE_PRICING} fallback={<div>Access denied</div>}>
      <div className="min-h-screen bg-gray-50">
        <UniversalNavbar />
        
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Calculator className="w-8 h-8 text-blue-600" />
                    Pricing Configuration Management
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Manage all pricing variables for the calculator system without touching code
                  </p>
                </div>
                <Button 
                  onClick={() => clearCache.mutate()}
                  disabled={clearCache.isPending}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${clearCache.isPending ? 'animate-spin' : ''}`} />
                  Clear Cache
                </Button>
              </div>
            </div>

            {/* Warning Alert */}
            <Card className="mb-6 border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-orange-800">Important Notice</h3>
                    <p className="text-sm text-orange-700 mt-1">
                      Changes to pricing configurations will immediately affect all new quotes. 
                      Clear the cache after making changes to ensure they take effect.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="base-fees" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Base Fees
                </TabsTrigger>
                <TabsTrigger value="industry" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Industries
                </TabsTrigger>
                <TabsTrigger value="revenue" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Revenue
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  History
                </TabsTrigger>
              </TabsList>

              {/* Base Fees Tab */}
              <TabsContent value="base-fees">
                <Card>
                  <CardHeader>
                    <CardTitle>Service Base Fees</CardTitle>
                    <CardDescription>
                      Base monthly fees for each service type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {baseFeeLoading ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead>Base Fee</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {baseFees?.map((fee) => (
                            <TableRow key={fee.id}>
                              <TableCell className="font-medium">{fee.service}</TableCell>
                              <TableCell>
                                {editingItem?.id === fee.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={editingItem.baseFee}
                                      onChange={(e) => setEditingItem({...editingItem, baseFee: e.target.value})}
                                      className="w-24"
                                      data-testid={`input-base-fee-${fee.service.toLowerCase()}`}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => updateBaseFee.mutate({
                                        id: fee.id,
                                        baseFee: editingItem.baseFee
                                      })}
                                      disabled={updateBaseFee.isPending}
                                      data-testid={`button-save-base-fee-${fee.service.toLowerCase()}`}
                                    >
                                      <Save className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingItem(null)}
                                      data-testid={`button-cancel-base-fee-${fee.service.toLowerCase()}`}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  formatCurrency(fee.baseFee)
                                )}
                              </TableCell>
                              <TableCell>{fee.description}</TableCell>
                              <TableCell>{formatDate(fee.updatedAt)}</TableCell>
                              <TableCell>
                                {editingItem?.id !== fee.id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingItem({
                                      id: fee.id,
                                      baseFee: fee.baseFee
                                    })}
                                    data-testid={`button-edit-base-fee-${fee.service.toLowerCase()}`}
                                  >
                                    Edit
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Industry Multipliers Tab */}
              <TabsContent value="industry">
                <Card>
                  <CardHeader>
                    <CardTitle>Industry Multipliers</CardTitle>
                    <CardDescription>
                      Pricing multipliers based on industry complexity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {industryLoading ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Industry</TableHead>
                            <TableHead>Monthly Multiplier</TableHead>
                            <TableHead>Cleanup Multiplier</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {industryMultipliers?.map((multiplier) => (
                            <TableRow key={multiplier.id}>
                              <TableCell className="font-medium">{multiplier.industry}</TableCell>
                              <TableCell>
                                {editingItem?.id === multiplier.id ? (
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={editingItem.monthlyMultiplier}
                                    onChange={(e) => setEditingItem({...editingItem, monthlyMultiplier: e.target.value})}
                                    className="w-24"
                                    data-testid={`input-monthly-multiplier-${multiplier.industry.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                  />
                                ) : (
                                  formatMultiplier(multiplier.monthlyMultiplier)
                                )}
                              </TableCell>
                              <TableCell>
                                {editingItem?.id === multiplier.id ? (
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={editingItem.cleanupMultiplier}
                                    onChange={(e) => setEditingItem({...editingItem, cleanupMultiplier: e.target.value})}
                                    className="w-24"
                                    data-testid={`input-cleanup-multiplier-${multiplier.industry.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                  />
                                ) : (
                                  formatMultiplier(multiplier.cleanupMultiplier)
                                )}
                              </TableCell>
                              <TableCell>{formatDate(multiplier.updatedAt)}</TableCell>
                              <TableCell>
                                {editingItem?.id === multiplier.id ? (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => updateIndustryMultiplier.mutate({
                                        id: multiplier.id,
                                        monthlyMultiplier: editingItem.monthlyMultiplier,
                                        cleanupMultiplier: editingItem.cleanupMultiplier
                                      })}
                                      disabled={updateIndustryMultiplier.isPending}
                                      data-testid={`button-save-industry-multiplier-${multiplier.industry.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                    >
                                      <Save className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingItem(null)}
                                      data-testid={`button-cancel-industry-multiplier-${multiplier.industry.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingItem({
                                      id: multiplier.id,
                                      monthlyMultiplier: multiplier.monthlyMultiplier,
                                      cleanupMultiplier: multiplier.cleanupMultiplier
                                    })}
                                    data-testid={`button-edit-industry-multiplier-${multiplier.industry.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                  >
                                    Edit
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Revenue Multipliers Tab */}
              <TabsContent value="revenue">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Multipliers</CardTitle>
                    <CardDescription>
                      Pricing multipliers based on client monthly revenue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {revenueLoading ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Revenue Range</TableHead>
                            <TableHead>Multiplier</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {revenueMultipliers?.map((multiplier) => (
                            <TableRow key={multiplier.id}>
                              <TableCell className="font-medium">{multiplier.revenueRange}</TableCell>
                              <TableCell>
                                {editingItem?.id === multiplier.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={editingItem.multiplier}
                                      onChange={(e) => setEditingItem({...editingItem, multiplier: e.target.value})}
                                      className="w-24"
                                      data-testid={`input-revenue-multiplier-${multiplier.revenueRange.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => updateRevenueMultiplier.mutate({
                                        id: multiplier.id,
                                        multiplier: editingItem.multiplier
                                      })}
                                      disabled={updateRevenueMultiplier.isPending}
                                      data-testid={`button-save-revenue-multiplier-${multiplier.revenueRange.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                    >
                                      <Save className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingItem(null)}
                                      data-testid={`button-cancel-revenue-multiplier-${multiplier.revenueRange.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  formatMultiplier(multiplier.multiplier)
                                )}
                              </TableCell>
                              <TableCell>{formatDate(multiplier.updatedAt)}</TableCell>
                              <TableCell>
                                {editingItem?.id !== multiplier.id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingItem({
                                      id: multiplier.id,
                                      multiplier: multiplier.multiplier
                                    })}
                                    data-testid={`button-edit-revenue-multiplier-${multiplier.revenueRange.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                  >
                                    Edit
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Transaction Surcharges Tab */}
              <TabsContent value="transactions">
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Surcharges</CardTitle>
                    <CardDescription>
                      Additional fees based on monthly transaction volume
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactionLoading ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transaction Range</TableHead>
                            <TableHead>Surcharge</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactionSurcharges?.map((surcharge) => (
                            <TableRow key={surcharge.id}>
                              <TableCell className="font-medium">{surcharge.transactionRange}</TableCell>
                              <TableCell>
                                {editingItem?.id === surcharge.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={editingItem.surcharge}
                                      onChange={(e) => setEditingItem({...editingItem, surcharge: e.target.value})}
                                      className="w-24"
                                      data-testid={`input-transaction-surcharge-${surcharge.transactionRange.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => updateTransactionSurcharge.mutate({
                                        id: surcharge.id,
                                        surcharge: editingItem.surcharge
                                      })}
                                      disabled={updateTransactionSurcharge.isPending}
                                      data-testid={`button-save-transaction-surcharge-${surcharge.transactionRange.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                    >
                                      <Save className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingItem(null)}
                                      data-testid={`button-cancel-transaction-surcharge-${surcharge.transactionRange.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  formatCurrency(surcharge.surcharge)
                                )}
                              </TableCell>
                              <TableCell>{formatDate(surcharge.updatedAt)}</TableCell>
                              <TableCell>
                                {editingItem?.id !== surcharge.id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingItem({
                                      id: surcharge.id,
                                      surcharge: surcharge.surcharge
                                    })}
                                    data-testid={`button-edit-transaction-surcharge-${surcharge.transactionRange.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                  >
                                    Edit
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Service Settings Tab */}
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Service-Specific Settings</CardTitle>
                    <CardDescription>
                      Detailed configuration for each service type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {settingsLoading ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead>Setting</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {serviceSettings?.map((setting) => (
                            <TableRow key={setting.id}>
                              <TableCell>
                                <Badge variant="outline">{setting.service}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">{setting.settingKey}</TableCell>
                              <TableCell>
                                {editingItem?.id === setting.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={editingItem.settingValue}
                                      onChange={(e) => setEditingItem({...editingItem, settingValue: e.target.value})}
                                      className="w-24"
                                      data-testid={`input-service-setting-${setting.service}-${setting.settingKey}`}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => updateServiceSetting.mutate({
                                        id: setting.id,
                                        settingValue: editingItem.settingValue
                                      })}
                                      disabled={updateServiceSetting.isPending}
                                      data-testid={`button-save-service-setting-${setting.service}-${setting.settingKey}`}
                                    >
                                      <Save className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingItem(null)}
                                      data-testid={`button-cancel-service-setting-${setting.service}-${setting.settingKey}`}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  formatCurrency(setting.settingValue)
                                )}
                              </TableCell>
                              <TableCell>{setting.description}</TableCell>
                              <TableCell>{formatDate(setting.updatedAt)}</TableCell>
                              <TableCell>
                                {editingItem?.id !== setting.id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingItem({
                                      id: setting.id,
                                      settingValue: setting.settingValue
                                    })}
                                    data-testid={`button-edit-service-setting-${setting.service}-${setting.settingKey}`}
                                  >
                                    Edit
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing Change History</CardTitle>
                    <CardDescription>
                      Track all changes made to pricing configurations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {historyLoading ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Table</TableHead>
                            <TableHead>Field</TableHead>
                            <TableHead>Old Value</TableHead>
                            <TableHead>New Value</TableHead>
                            <TableHead>Changed By</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pricingHistory?.slice(0, 50).map((history) => (
                            <TableRow key={history.id}>
                              <TableCell>
                                <Badge variant="outline">{history.tableAffected}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">{history.fieldChanged}</TableCell>
                              <TableCell className="text-gray-500">
                                {history.oldValue || 'N/A'}
                              </TableCell>
                              <TableCell className="font-medium">
                                {history.newValue}
                              </TableCell>
                              <TableCell>User #{history.changedBy}</TableCell>
                              <TableCell>{formatDate(history.createdAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </PermissionGuard>
  );
}
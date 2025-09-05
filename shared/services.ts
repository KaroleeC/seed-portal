/**
 * SINGLE SOURCE OF TRUTH for all service definitions
 * 
 * When adding a new service, only update this file and everything else will automatically work:
 * - Database schema
 * - Form validation
 * - UI components
 * - HubSpot integration
 * - Pricing calculations
 * - MSA generation
 */

import { z } from "zod";

// Service categories for organization
export const SERVICE_CATEGORIES = {
  CORE: 'core',
  OPERATIONAL: 'operational', 
  FPA: 'fpa',
  COMPLIANCE: 'compliance',
} as const;

// Complete service registry - ADD NEW SERVICES HERE
export const SERVICE_REGISTRY = {
  // CORE SERVICES (can be standalone)
  serviceMonthlyBookkeeping: {
    key: 'serviceMonthlyBookkeeping',
    name: 'Monthly Bookkeeping',
    description: 'Ongoing monthly bookkeeping and financial statements',
    category: SERVICE_CATEGORIES.CORE,
    hubspotProductId: '25687054003', // Monthly Bookkeeping
    pricingKey: 'bookkeeping',
    msaDescription: 'bookkeeping and financial reporting',
    commissionType: 'monthly',
    icon: 'Calculator',
    standalone: true,
  },
  
  serviceTaasMonthly: {
    key: 'serviceTaasMonthly',
    name: 'TaaS',
    description: 'Tax as a Service - comprehensive tax advisory and preparation',
    category: SERVICE_CATEGORIES.CORE,
    hubspotProductId: '26203849099', // Tax as a Service (Monthly)
    pricingKey: 'taas',
    msaDescription: 'tax preparation and filing services',
    commissionType: 'monthly',
    icon: 'FileText',
    standalone: true,
  },
  
  serviceCleanupProjects: {
    key: 'serviceCleanupProjects',
    name: 'Bookkeeping Cleanup Project',
    description: 'One-time bookkeeping cleanup and catch-up work',
    category: SERVICE_CATEGORIES.CORE,
    hubspotProductId: '25683750263', // Clean-Up / Catch-Up Project
    pricingKey: 'cleanup',
    msaDescription: 'bookkeeping cleanup and catch-up services',
    commissionType: 'setup',
    icon: 'RefreshCw',
    standalone: true,
  },
  
  servicePriorYearFilings: {
    key: 'servicePriorYearFilings',
    name: 'Prior Years Tax Filings',
    description: 'Catch-up tax filings for previous years',
    category: SERVICE_CATEGORIES.CORE,
    hubspotProductId: '26354718811', // Prior Years Tax Filing(s)
    pricingKey: 'priorYears',
    msaDescription: 'prior year tax preparation and filing',
    commissionType: 'setup',
    icon: 'Calendar',
    standalone: true,
  },
  
  serviceCfoAdvisory: {
    key: 'serviceCfoAdvisory',
    name: 'CFO Advisory Services',
    description: 'Strategic financial planning and CFO-level advisory',
    category: SERVICE_CATEGORIES.CORE,
    hubspotProductId: '', // Dynamic based on hours selection
    pricingKey: 'cfoAdvisory',
    msaDescription: 'CFO advisory and strategic financial planning',
    commissionType: 'monthly',
    icon: 'TrendingUp',
    standalone: true,
  },
  
  // OPERATIONAL SERVICES (require a core service)
  servicePayrollService: {
    key: 'servicePayrollService',
    name: 'Payroll',
    description: 'Complete payroll processing and compliance',
    category: SERVICE_CATEGORIES.OPERATIONAL,
    hubspotProductId: '', // No direct payroll product in current HubSpot list
    pricingKey: 'payroll',
    msaDescription: 'payroll administration services',
    commissionType: 'monthly',
    icon: 'Users',
    standalone: false,
    requiresCoreService: true,
  },
  
  serviceApArService: {
    key: 'serviceApArService',
    name: 'Accounts Payable (AP)',
    description: 'Automated vendor bill processing and payment management',
    category: SERVICE_CATEGORIES.OPERATIONAL,
    hubspotProductId: '28960182651', // AP Lite
    pricingKey: 'ap',
    msaDescription: 'accounts payable management',
    commissionType: 'monthly',
    icon: 'CreditCard',
    standalone: false,
    requiresCoreService: true,
  },
  
  serviceArService: {
    key: 'serviceArService',
    name: 'Accounts Receivable (AR)',
    description: 'Customer invoice processing and collection management',
    category: SERVICE_CATEGORIES.OPERATIONAL,
    hubspotProductId: '28960244571', // AR Lite
    pricingKey: 'ar',
    msaDescription: 'accounts receivable management',
    commissionType: 'monthly',
    icon: 'Receipt',
    standalone: false,
    requiresCoreService: true,
  },
  
  // FP&A SERVICES
  serviceFpaBuild: {
    key: 'serviceFpaBuild',
    name: 'FP&A Build',
    description: 'Custom financial planning and analysis build-out',
    category: SERVICE_CATEGORIES.FPA,
    hubspotProductId: '25683750268',
    pricingKey: 'fpaBuild',
    msaDescription: 'financial planning and analysis build-out',
    commissionType: 'setup',
    icon: 'BarChart3',
    standalone: false,
    requiresCoreService: true,
  },
  
  serviceFpaSupport: {
    key: 'serviceFpaSupport',
    name: 'FP&A Support',
    description: 'Ongoing financial planning and analysis support',
    category: SERVICE_CATEGORIES.FPA,
    hubspotProductId: '25683750269',
    pricingKey: 'fpaSupport',
    msaDescription: 'financial planning and analysis support',
    commissionType: 'monthly',
    icon: 'LineChart',
    standalone: false,
    requiresCoreService: true,
  },
  
  // COMPLIANCE & ADVISORY SERVICES
  serviceNexusStudy: {
    key: 'serviceNexusStudy',
    name: 'Nexus Study',
    description: 'Multi-state tax nexus analysis and planning',
    category: SERVICE_CATEGORIES.COMPLIANCE,
    hubspotProductId: '25683750270',
    pricingKey: 'nexusStudy',
    msaDescription: 'tax nexus analysis and planning',
    commissionType: 'setup',
    icon: 'MapPin',
    standalone: false,
    requiresCoreService: true,
  },
  
  serviceEntityOptimization: {
    key: 'serviceEntityOptimization',
    name: 'Entity Optimization',
    description: 'Business entity structure optimization and planning',
    category: SERVICE_CATEGORIES.COMPLIANCE,
    hubspotProductId: '25683750271',
    pricingKey: 'entityOptimization',
    msaDescription: 'entity structure optimization',
    commissionType: 'setup',
    icon: 'Building',
    standalone: false,
    requiresCoreService: true,
  },
  
  serviceCostSegregation: {
    key: 'serviceCostSegregation',
    name: 'Cost Segregation Study',
    description: 'Real estate cost segregation for tax optimization',
    category: SERVICE_CATEGORIES.COMPLIANCE,
    hubspotProductId: '25683750272',
    pricingKey: 'costSegregation',
    msaDescription: 'cost segregation analysis',
    commissionType: 'setup',
    icon: 'Home',
    standalone: false,
    requiresCoreService: true,
  },
  
  serviceRdCredit: {
    key: 'serviceRdCredit',
    name: 'R&D Tax Credit',
    description: 'Research and development tax credit analysis and filing',
    category: SERVICE_CATEGORIES.COMPLIANCE,
    hubspotProductId: '25683750273',
    pricingKey: 'rdCredit',
    msaDescription: 'R&D tax credit analysis and filing',
    commissionType: 'setup',
    icon: 'Beaker',
    standalone: false,
    requiresCoreService: true,
  },
  
  serviceRealEstateAdvisory: {
    key: 'serviceRealEstateAdvisory',
    name: 'Real Estate Advisory',
    description: 'Specialized real estate tax and financial advisory',
    category: SERVICE_CATEGORIES.COMPLIANCE,
    hubspotProductId: '25683750274',
    pricingKey: 'realEstateAdvisory',
    msaDescription: 'real estate tax and financial advisory',
    commissionType: 'monthly',
    icon: 'Building2',
    standalone: false,
    requiresCoreService: true,
  },
  
  serviceAgentOfService: {
    key: 'serviceAgentOfService',
    name: 'Agent of Service',
    description: 'Multi-state registered agent services',
    category: SERVICE_CATEGORIES.COMPLIANCE,
    hubspotProductId: '25683750275',
    pricingKey: 'agentOfService',
    msaDescription: 'registered agent services',
    commissionType: 'monthly',
    icon: 'Shield',
    standalone: false,
    requiresCoreService: true,
  },
} as const;

// TYPE HELPERS - Automatically generated from the registry
export type ServiceKey = keyof typeof SERVICE_REGISTRY;
export type ServiceDefinition = typeof SERVICE_REGISTRY[ServiceKey];
export type ServiceCategory = typeof SERVICE_CATEGORIES[keyof typeof SERVICE_CATEGORIES];

// UTILITY FUNCTIONS - Use these instead of hardcoding everywhere
export const getAllServices = () => Object.values(SERVICE_REGISTRY);

export const getServicesByCategory = (category: ServiceCategory) => 
  getAllServices().filter(service => service.category === category);

export const getCoreServices = () => 
  getAllServices().filter(service => service.standalone);

export const getAddonServices = () => 
  getAllServices().filter(service => !service.standalone);

export const getServiceByKey = (key: ServiceKey) => SERVICE_REGISTRY[key];

export const getServiceKeys = () => Object.keys(SERVICE_REGISTRY) as ServiceKey[];

export const getHubSpotProductIds = () => 
  Object.fromEntries(
    Object.entries(SERVICE_REGISTRY).map(([key, service]) => [key, service.hubspotProductId])
  );

export const getMsaDescriptions = () =>
  Object.fromEntries(
    Object.entries(SERVICE_REGISTRY).map(([key, service]) => [service.pricingKey, service.msaDescription])
  );

export const getServiceIcons = () =>
  Object.fromEntries(
    Object.entries(SERVICE_REGISTRY).map(([key, service]) => [service.pricingKey, service.icon])
  );

// ZOD SCHEMA HELPERS - Generate form schemas automatically
export const generateServiceZodFields = () => {
  const fields: Record<string, z.ZodBoolean> = {};
  getServiceKeys().forEach(key => {
    fields[key] = z.boolean().default(false);
  });
  return fields;
};

// SERVICE VALIDATION
export const validateServiceSelection = (selectedServices: Partial<Record<ServiceKey, boolean>>) => {
  const errors: string[] = [];
  const selected = getServiceKeys().filter(key => selectedServices[key]);
  
  // Check if any addon services are selected without core services
  const selectedAddonServices = selected.filter(key => !SERVICE_REGISTRY[key].standalone);
  const selectedCoreServices = selected.filter(key => SERVICE_REGISTRY[key].standalone);
  
  if (selectedAddonServices.length > 0 && selectedCoreServices.length === 0) {
    errors.push('Addon services require at least one core service to be selected');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// FORM DATA MAPPING - Convert between database and form formats
export const mapQuoteToFormServices = (quote: any) => {
  const serviceFields: Partial<Record<ServiceKey, boolean>> = {};
  getServiceKeys().forEach(key => {
    serviceFields[key] = quote[key] ?? false;
  });
  return serviceFields;
};

export const getSelectedServiceDescriptions = (selectedServices: Partial<Record<ServiceKey, boolean>>) => {
  const selected = getServiceKeys().filter(key => selectedServices[key]);
  return selected.map(key => SERVICE_REGISTRY[key].msaDescription);
};
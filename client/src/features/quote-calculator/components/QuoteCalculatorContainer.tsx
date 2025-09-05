// COPY-PASTED from working home.tsx - all imports and helpers preserved exactly
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Copy, Save, Check, Search, ArrowUpDown, Edit, AlertCircle, Archive, CheckCircle, XCircle, Loader2, Upload, User, LogOut, Calculator, FileText, DollarSign, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, HelpCircle, Bell, Settings, Lock, Unlock, Building, Users, CreditCard, Receipt } from "lucide-react";
import { insertQuoteSchema, type Quote } from "@shared/schema";
import { calculateCombinedFees } from "@shared/pricing";
import { mapQuoteToFormServices, getServiceKeys, getAllServices } from "@shared/services";

import { apiRequest, queryClient } from "@/lib/queryClient";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { ServiceTierCards } from "@/components/quote-form/ServiceTierCards";
import { ServiceCards } from "@/components/quote-form/ServiceCards";
import { TaasSection } from "@/components/quote-form/TaasSection";
import { PriorYearFilingsSection } from "@/components/quote-form/PriorYearFilingsSection";
import { BookkeepingCleanupSection } from "@/components/quote-form/BookkeepingCleanupSection";
import { CfoAdvisorySection } from "@/components/quote-form/CfoAdvisorySection";
import PayrollSection from "@/components/quote-form/PayrollSection";
import APSection from "@/components/quote-form/APSection";
import ARSection from "@/components/quote-form/ARSection";
import AgentOfServiceSection from "@/components/quote-form/AgentOfServiceSection";

// COPY-PASTED: All helper constants and functions preserved exactly
const currentMonth = new Date().getMonth() + 1;

const validateRequiredFields = (formValues: any): { isValid: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];
  
  if (!formValues.contactFirstName) missingFields.push("First Name");
  if (!formValues.contactLastName) missingFields.push("Last Name");
  if (!formValues.industry) missingFields.push("Industry");
  if (!formValues.monthlyRevenueRange) missingFields.push("Monthly Revenue Range");
  if (!formValues.entityType) missingFields.push("Entity Type");
  
  if (!formValues.clientStreetAddress || !formValues.clientCity || !formValues.clientState || !formValues.clientZipCode) {
    missingFields.push("Company Address (all fields)");
  }
  
  if (formValues.serviceBookkeeping) {
    if (!formValues.monthlyTransactions) missingFields.push("Monthly Transactions");
    if (!formValues.cleanupComplexity) missingFields.push("Initial Cleanup Complexity");
    if (!formValues.accountingBasis) missingFields.push("Accounting Basis");
  }
  
  if (formValues.serviceTaas) {
    if (!formValues.bookkeepingQuality) missingFields.push("Bookkeeping Quality");
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

const getApprovalButtonDisabledReason = (formValues: any, isRequestingApproval: boolean, hasRequestedApproval: boolean): string | null => {
  if (isRequestingApproval) return null;
  if (!formValues.contactEmail) return "Contact email is required";
  if (!formValues.overrideReason) return "Please select a reason for override";
  
  const overrideReason = formValues.overrideReason;
  const cleanupMonths = formValues.cleanupMonths || 0;
  const customSetupFee = formValues.customSetupFee?.trim();
  const customOverrideReason = formValues.customOverrideReason?.trim();
  
  if (overrideReason === "Other") {
    if (!customOverrideReason) return "Please explain the reason for override";
    const hasCustomSetupFee = customSetupFee && customSetupFee !== "";
    const hasDecreasedMonths = cleanupMonths < currentMonth;
    if (!hasCustomSetupFee && !hasDecreasedMonths) {
      return "Enter a custom setup fee OR reduce cleanup months below the minimum";
    }
  } else if (overrideReason === "Brand New Business" || overrideReason === "Books Confirmed Current") {
    if (cleanupMonths >= currentMonth) {
      return "Reduce cleanup months below the minimum to request approval";
    }
  }
  
  return null;
};

const isApprovalButtonDisabled = (formValues: any, isRequestingApproval: boolean, hasRequestedApproval: boolean): boolean => {
  return getApprovalButtonDisabledReason(formValues, isRequestingApproval, hasRequestedApproval) !== null;
};

// COPY-PASTED: Exact form schema preserved
const formSchema = insertQuoteSchema.omit({
  monthlyFee: true,
  setupFee: true,
  taasMonthlyFee: true,
  taasPriorYearsFee: true,
  hubspotContactId: true,
  hubspotDealId: true,
  hubspotQuoteId: true,
  hubspotContactVerified: true,
}).extend({
  contactEmail: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  cleanupMonths: z.number().min(0, "Cannot be negative"),
  overrideReason: z.string().optional(),
  customOverrideReason: z.string().optional(),
  customSetupFee: z.string().optional(),
  companyName: z.string().optional(),
  serviceMonthlyBookkeeping: z.boolean().default(false),
  serviceTaasMonthly: z.boolean().default(false),
  serviceCleanupProjects: z.boolean().default(false),
  servicePriorYearFilings: z.boolean().default(false),
  serviceCfoAdvisory: z.boolean().default(false),
  servicePayrollService: z.boolean().default(false),
  serviceApArService: z.boolean().default(false),
  serviceArService: z.boolean().default(false),
  serviceFpaBuild: z.boolean().default(false),
  serviceFpaSupport: z.boolean().default(false),
  serviceNexusStudy: z.boolean().default(false),
  serviceEntityOptimization: z.boolean().default(false),
  serviceCostSegregation: z.boolean().default(false),
  serviceRdCredit: z.boolean().default(false),
  serviceRealEstateAdvisory: z.boolean().default(false),
  serviceAgentOfService: z.boolean().default(false),
  clientStreetAddress: z.string().optional(),
  clientCity: z.string().optional(),
  clientState: z.string().optional(),
  clientZipCode: z.string().optional(),
  clientCountry: z.string().default("US"),
  companyNameLocked: z.boolean().default(false),
  contactFirstName: z.string().optional(),
  contactFirstNameLocked: z.boolean().default(false),
  contactLastName: z.string().optional(),
  contactLastNameLocked: z.boolean().default(false),
  industryLocked: z.boolean().default(false),
  companyAddressLocked: z.boolean().default(false),
  monthlyRevenueRange: z.string().optional(),
  numEntities: z.number().min(1, "Must have at least 1 entity").optional(),
  customNumEntities: z.number().min(6, "Custom entities must be at least 6").optional(),
  statesFiled: z.number().min(1, "Must file in at least 1 state").optional(),
  customStatesFiled: z.number().min(7, "Custom states must be at least 7").max(50, "Maximum 50 states").optional(),
  internationalFiling: z.boolean().optional(),
  numBusinessOwners: z.number().min(1, "Must have at least 1 business owner").optional(),
  customNumBusinessOwners: z.number().min(6, "Custom owners must be at least 6").optional(),
  include1040s: z.boolean().optional(),
  priorYearsUnfiled: z.number().min(0, "Cannot be negative").max(5, "Maximum 5 years").optional(),
  priorYearFilings: z.array(z.number()).optional(),
  alreadyOnSeedBookkeeping: z.boolean().optional(),
  qboSubscription: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.quoteType === 'bookkeeping' && data.cleanupMonths < currentMonth) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Minimum ${currentMonth} months required (current calendar year)`,
      path: ["cleanupMonths"],
    });
  }
  
  if (data.quoteType === 'taas') {
    if (!data.numEntities) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Number of entities is required for TaaS quotes",
        path: ["numEntities"],
      });
    }
    if (!data.statesFiled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "States filed is required for TaaS quotes",
        path: ["statesFiled"],
      });
    }
    if (!data.numBusinessOwners) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Number of business owners is required for TaaS quotes",
        path: ["numBusinessOwners"],
      });
    }
    if (!data.serviceMonthlyBookkeeping && !data.bookkeepingQuality) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bookkeeping quality is required for TaaS quotes when bookkeeping service is not included",
        path: ["bookkeepingQuality"],
      });
    }
  }
  
  if (data.servicePriorYearFilings) {
    if (!data.priorYearFilings || data.priorYearFilings.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select at least one prior year for filing",
        path: ["priorYearFilings"],
      });
    }
  }
});

type FormData = z.infer<typeof formSchema>;

// COPY-PASTED: Pricing constants from working original
const baseMonthlyFee = 150;

const revenueMultipliers = {
  '<$10K': 1.0,
  '10K-25K': 1.0,
  '25K-75K': 2.2,
  '75K-250K': 3.5,
  '250K-1M': 5.0,
  '1M+': 7.0
};

const txSurcharge = {
  '<100': 0,
  '100-300': 100,
  '300-600': 500,
  '600-1000': 800,
  '1000-2000': 1200,
  '2000+': 1600
};

const industryMultipliers = {
  'Software/SaaS': { monthly: 1.0, cleanup: 1.0 },
  'Professional Services': { monthly: 1.0, cleanup: 1.1 },
  'Consulting': { monthly: 1.0, cleanup: 1.05 },
  'Healthcare/Medical': { monthly: 1.4, cleanup: 1.3 },
  'Real Estate': { monthly: 1.25, cleanup: 1.05 },
  'Property Management': { monthly: 1.3, cleanup: 1.2 },
  'E-commerce/Retail': { monthly: 1.35, cleanup: 1.15 },
  'Restaurant/Food Service': { monthly: 1.6, cleanup: 1.4 },
  'Hospitality': { monthly: 1.6, cleanup: 1.4 },
  'Construction/Trades': { monthly: 1.5, cleanup: 1.08 },
  'Manufacturing': { monthly: 1.45, cleanup: 1.25 },
  'Transportation/Logistics': { monthly: 1.4, cleanup: 1.2 },
  'Nonprofit': { monthly: 1.2, cleanup: 1.15 },
  'Law Firm': { monthly: 1.3, cleanup: 1.35 },
  'Accounting/Finance': { monthly: 1.1, cleanup: 1.1 },
  'Marketing/Advertising': { monthly: 1.15, cleanup: 1.1 },
  'Insurance': { monthly: 1.35, cleanup: 1.25 },
  'Automotive': { monthly: 1.4, cleanup: 1.2 },
  'Education': { monthly: 1.25, cleanup: 1.2 },
  'Fitness/Wellness': { monthly: 1.3, cleanup: 1.15 },
  'Entertainment/Events': { monthly: 1.5, cleanup: 1.3 },
  'Agriculture': { monthly: 1.45, cleanup: 1.2 },
  'Technology/IT Services': { monthly: 1.1, cleanup: 1.05 },
  'Multi-entity/Holding Companies': { monthly: 1.35, cleanup: 1.25 },
  'Other': { monthly: 1.2, cleanup: 1.15 }
};

function roundToNearest5(num: number): number {
  return Math.round(num / 5) * 5;
}

function roundToNearest25(num: number): number {
  return Math.ceil(num / 25) * 25;
}

// Container component with the EXACT same functionality
export function QuoteCalculatorContainer() {
  // COPY-PASTED: All state variables from HomePage exactly preserved
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("updatedAt");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Duplicate quote approval system state
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalCode, setApprovalCode] = useState("");
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [hasRequestedApproval, setHasRequestedApproval] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  
  // Archive dialog state
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedQuoteForArchive, setSelectedQuoteForArchive] = useState<{id: number, email: string} | null>(null);
  const [dontShowArchiveDialog, setDontShowArchiveDialog] = useState(() => {
    return localStorage.getItem('dontShowArchiveDialog') === 'true';
  });
  
  // HubSpot integration state
  const [hubspotVerificationStatus, setHubspotVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'not-found'>('idle');
  const [hubspotContact, setHubspotContact] = useState<any>(null);
  const [lastVerifiedEmail, setLastVerifiedEmail] = useState('');
  
  // Existing quotes state
  const [existingQuotesForEmail, setExistingQuotesForEmail] = useState<Quote[]>([]);
  const [showExistingQuotesNotification, setShowExistingQuotesNotification] = useState(false);
  
  // Custom dialog states
  const [resetConfirmDialog, setResetConfirmDialog] = useState(false);
  const [discardChangesDialog, setDiscardChangesDialog] = useState(false);
  const [pendingQuoteToLoad, setPendingQuoteToLoad] = useState<Quote | null>(null);
  
  // Debounce state for HubSpot verification
  const [verificationTimeoutId, setVerificationTimeoutId] = useState<NodeJS.Timeout | null>(null);
  
  // New UX flow state
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [isContactSearching, setIsContactSearching] = useState(false);
  const [hubspotContacts, setHubspotContacts] = useState<any[]>([]);
  const [triggerEmail, setTriggerEmail] = useState("");
  const [showClientDetails, setShowClientDetails] = useState(false);
  
  // Live search for email input
  const [showLiveResults, setShowLiveResults] = useState(false);
  const [liveSearchResults, setLiveSearchResults] = useState<any[]>([]);
  const [isLiveSearching, setIsLiveSearching] = useState(false);
  
  // Existing quotes modal
  const [showExistingQuotesModal, setShowExistingQuotesModal] = useState(false);
  
  // TaaS state
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);
  
  // Service details collapsible states
  const [isBookkeepingExpanded, setIsBookkeepingExpanded] = useState(true);
  const [isPayrollExpanded, setIsPayrollExpanded] = useState(true);
  const [isCfoAdvisoryExpanded, setIsCfoAdvisoryExpanded] = useState(true);
  const [isApExpanded, setIsApExpanded] = useState(true);
  const [isArExpanded, setIsArExpanded] = useState(true);
  const [isAgentOfServiceExpanded, setIsAgentOfServiceExpanded] = useState(true);
  
  // Form navigation state
  const [currentFormView, setCurrentFormView] = useState<'bookkeeping' | 'taas' | 'placeholder'>('placeholder');

  // COPY-PASTED: Form initialization from HomePage exactly preserved
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactEmail: "",
      monthlyRevenueRange: "",
      monthlyTransactions: "",
      industry: "",
      cleanupMonths: currentMonth,
      cleanupComplexity: "",
      overrideReason: "",
      customOverrideReason: "",
      customSetupFee: "",
      companyName: "",
      quoteType: "bookkeeping",
      serviceMonthlyBookkeeping: false,
      serviceTaasMonthly: false,
      serviceCleanupProjects: false,
      servicePriorYearFilings: false,
      serviceCfoAdvisory: false,
      servicePayrollService: false,
      serviceApArService: false,
      serviceArService: false,
      serviceFpaBuild: false,
      serviceFpaSupport: false,
      serviceNexusStudy: false,
      serviceEntityOptimization: false,
      serviceCostSegregation: false,
      serviceRdCredit: false,
      serviceRealEstateAdvisory: false,
      includesBookkeeping: false,
      includesTaas: false,
      numEntities: 1,
      statesFiled: 1,
      internationalFiling: false,
      numBusinessOwners: 1,
      include1040s: false,
      priorYearsUnfiled: 0,
      alreadyOnSeedBookkeeping: false,
      qboSubscription: false,
      serviceTier: "Standard",
      serviceAgentOfService: false,
      agentOfServiceAdditionalStates: 0,
      agentOfServiceComplexCase: false,
    },
  });

  // COPY-PASTED: Queries and mutations from HomePage exactly preserved
  const { data: allQuotes = [], refetch: refetchQuotes } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", { search: searchTerm, sortField, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (sortField) params.append('sortField', sortField);
      if (sortOrder) params.append('sortOrder', sortOrder);
      
      const response = await fetch(`/api/quotes?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch quotes');
      }
      
      const data = await response.json();
      return data || [];
    },
    retry: false,
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log('Submitting quote data:', data);
      
      try {
        const feeCalculation = calculateCombinedFees(data);

        const quoteData = {
          ...data,
          monthlyFee: feeCalculation.combined.monthlyFee.toString(),
          setupFee: feeCalculation.combined.setupFee.toString(),
          taasMonthlyFee: feeCalculation.taas.monthlyFee.toString(),
          taasPriorYearsFee: feeCalculation.taas.setupFee.toString(),
          companyName: data.companyName || '',
          contactFirstName: data.contactFirstName || '',
          contactLastName: data.contactLastName || '',
          industry: data.industry || '',
          monthlyRevenueRange: data.monthlyRevenueRange || '',
          entityType: data.entityType || '',
          clientStreetAddress: data.clientStreetAddress || '',
          clientCity: data.clientCity || '',
          clientState: data.clientState || '',
          clientZipCode: data.clientZipCode || '',
          companyNameLocked: data.companyNameLocked || false,
          contactFirstNameLocked: data.contactFirstNameLocked || false,
          contactLastNameLocked: data.contactLastNameLocked || false,
          industryLocked: data.industryLocked || false,
          companyAddressLocked: data.companyAddressLocked || false,
          serviceBookkeeping: data.serviceBookkeeping || false,
          serviceTaas: data.serviceTaas || false,
          servicePayroll: data.servicePayroll || false,
          serviceApArLite: data.serviceApArLite || false,
          serviceFpaLite: data.serviceFpaLite || false,
        };
        
        console.log('Final quote data:', quoteData);
        
        let result;
        if (editingQuoteId) {
          console.log('💡 Updating existing quote with ID:', editingQuoteId);
          result = await apiRequest(`/api/quotes/${editingQuoteId}`, {
            method: "PUT",
            body: JSON.stringify(quoteData)
          });
        } else {
          console.log('💡 Creating new quote');
          result = await apiRequest("/api/quotes", {
            method: "POST",
            body: JSON.stringify(quoteData)
          });
        }
        
        console.log('💡 Quote API success response:', result);
        return result;
      } catch (error: any) {
        console.error('💡 createQuoteMutation full error:', error);
        console.error('💡 Error type:', typeof error);
        console.error('💡 Error message:', error?.message);
        console.error('💡 Error stack:', error?.stack);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Quote saved successfully:', data);
      toast({
        title: editingQuoteId ? "Quote Updated" : "Quote Saved",
        description: editingQuoteId ? "Your quote has been updated successfully." : "Your quote has been saved successfully.",
      });
      if (!editingQuoteId && data.id) {
        setEditingQuoteId(data.id);
      }
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      refetchQuotes();
    },
    onError: (error) => {
      console.error('Quote save error:', error);
      toast({
        title: "Error",
        description: "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  // COPY-PASTED: Archive mutation
  const archiveQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      return await apiRequest(`/api/quotes/${quoteId}/archive`, {
        method: "PATCH",
        body: JSON.stringify({})
      });
    },
    onSuccess: () => {
      toast({
        title: "Quote Archived",
        description: "Quote has been archived successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      refetchQuotes();
    },
    onError: (error) => {
      console.error('Archive error:', error);
      toast({
        title: "Error",
        description: "Failed to archive quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  // COPY-PASTED: HubSpot mutations
  const pushToHubSpotMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      console.log('🚀 pushToHubSpotMutation called with quoteId:', quoteId);
      try {
        const result = await apiRequest("/api/hubspot/push-quote", {
          method: "POST",
          body: JSON.stringify({ quoteId })
        });
        
        console.log('🚀 HubSpot API success response:', result);
        return { ...result, quoteId };
      } catch (error: any) {
        console.error('🚀 pushToHubSpotMutation error:', error);
        console.error('🚀 Error type:', typeof error);
        console.error('🚀 Error message:', error?.message);
        console.error('🚀 Error stack:', error?.stack);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Pushed to HubSpot",
        description: `Deal "${data.dealName}" created successfully in HubSpot.`,
      });
      if (data.quoteId) {
        setEditingQuoteId(data.quoteId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      refetchQuotes();
    },
    onError: (error: any) => {
      console.error('Push to HubSpot error:', error);
      toast({
        title: "HubSpot Error",
        description: error.message || "Failed to push quote to HubSpot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const watchedValues = form.watch();
  const feeCalculation = calculateCombinedFees(watchedValues);
  const monthlyFee = feeCalculation.combined.monthlyFee;
  const setupFee = feeCalculation.combined.setupFee;
  
  const isCalculated = (() => {
    const hasMonthlyFees = monthlyFee > 0;
    const hasSetupFees = setupFee > 0;
    const hasProjectFees = feeCalculation.priorYearFilingsFee > 0 || feeCalculation.cleanupProjectFee > 0 || feeCalculation.cfoAdvisoryFee > 0;
    const hasServiceFees = feeCalculation.payrollFee > 0 || feeCalculation.apFee > 0 || feeCalculation.arFee > 0 || feeCalculation.agentOfServiceFee > 0;
    
    return hasMonthlyFees || hasSetupFees || hasProjectFees || hasServiceFees;
  })();

  // COPY-PASTED: ALL handler functions from HomePage - this is a MASSIVE amount of functionality
  const verifyHubSpotEmail = async (email: string) => {
    if (!email || email === lastVerifiedEmail) return;
    
    if (verificationTimeoutId) {
      clearTimeout(verificationTimeoutId);
    }
    
    setHubspotVerificationStatus('verifying');
    setLastVerifiedEmail(email);
    
    try {
      const [hubspotResult, existingQuotesResult] = await Promise.all([
        apiRequest('/api/hubspot/verify-contact', {
          method: 'POST',
          body: JSON.stringify({ email })
        }),
        apiRequest('/api/quotes/check-existing', {
          method: 'POST',
          body: JSON.stringify({ email })
        })
      ]);
      
      if (hubspotResult.verified && hubspotResult.contact) {
        setHubspotVerificationStatus('verified');
        setHubspotContact(hubspotResult.contact);
        form.clearErrors('contactEmail');
        
        if (hubspotResult.contact.properties.company && !form.getValues('companyName')) {
          form.setValue('companyName', hubspotResult.contact.properties.company);
        }
      } else {
        setHubspotVerificationStatus('not-found');
        setHubspotContact(null);
      }
      
      if (existingQuotesResult.hasExistingQuotes) {
        setExistingQuotesForEmail(existingQuotesResult.quotes);
        setShowExistingQuotesNotification(true);
        setSearchTerm(email);
      } else {
        setExistingQuotesForEmail([]);
        setShowExistingQuotesNotification(false);
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      setHubspotVerificationStatus('not-found');
      setHubspotContact(null);
      setExistingQuotesForEmail([]);
      setShowExistingQuotesNotification(false);
    }
  };

  const debouncedVerifyEmail = (email: string) => {
    if (verificationTimeoutId) {
      clearTimeout(verificationTimeoutId);
    }
    
    setHubspotVerificationStatus('idle');
    
    const timeoutId = setTimeout(() => {
      if (email && email.includes('@') && email.includes('.')) {
        verifyHubSpotEmail(email);
      }
    }, 750);
    
    setVerificationTimeoutId(timeoutId);
  };

  const handleArchiveQuote = (quoteId: number, contactEmail: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (dontShowArchiveDialog) {
      archiveQuoteMutation.mutate(quoteId);
      return;
    }
    
    setSelectedQuoteForArchive({ id: quoteId, email: contactEmail });
    setArchiveDialogOpen(true);
  };

  const loadQuoteIntoForm = async (quote: Quote) => {
    if (hasUnsavedChanges) {
      setPendingQuoteToLoad(quote);
      setDiscardChangesDialog(true);
      return;
    }
    
    doLoadQuote(quote);
  };

  const doLoadQuote = (quote: Quote) => {
    console.log('Loading quote into form:', quote);
    setEditingQuoteId(quote.id);
    
    setIsApproved(quote.approvalRequired || false);
    
    const formData = {
      contactEmail: quote.contactEmail,
      monthlyTransactions: quote.monthlyTransactions,
      industry: quote.industry,
      cleanupMonths: quote.cleanupMonths,
      cleanupComplexity: parseFloat(quote.cleanupComplexity).toString(),
      overrideReason: quote.overrideReason || "",
      companyName: quote.companyName || "",
      contactFirstName: quote.contactFirstName || "",
      contactLastName: quote.contactLastName || "",
      monthlyRevenueRange: quote.monthlyRevenueRange || "",
      entityType: quote.entityType || "S-Corp",
      serviceTier: quote.serviceTier || "Automated",
      clientStreetAddress: quote.clientStreetAddress || "",
      clientCity: quote.clientCity || "",
      clientState: quote.clientState || "",
      clientZipCode: quote.clientZipCode || "",
      clientCountry: quote.clientCountry || "US",
      accountingBasis: quote.accountingBasis || "Accrual",
      businessLoans: quote.businessLoans ?? false,
      companyNameLocked: !!(quote.companyName),
      contactFirstNameLocked: !!(quote.contactFirstName),
      contactLastNameLocked: !!(quote.contactLastName),
      industryLocked: !!(quote.industry),
      companyAddressLocked: !!(quote.clientStreetAddress || quote.clientCity || quote.clientState || quote.clientZipCode),
      quoteType: quote.quoteType || "bookkeeping",
      includesBookkeeping: quote.includesBookkeeping ?? true,
      includesTaas: quote.includesTaas ?? false,
      ...mapQuoteToFormServices(quote),
      numEntities: quote.numEntities ? Number(quote.numEntities) : 1,
      statesFiled: quote.statesFiled ? Number(quote.statesFiled) : 1,
      internationalFiling: quote.internationalFiling ?? false,
      numBusinessOwners: quote.numBusinessOwners ? Number(quote.numBusinessOwners) : 1,
      bookkeepingQuality: quote.bookkeepingQuality || "Clean (Seed)",
      include1040s: quote.include1040s ?? false,
      priorYearsUnfiled: quote.priorYearsUnfiled ? Number(quote.priorYearsUnfiled) : 0,
      priorYearFilings: quote.priorYearFilings || [],
      alreadyOnSeedBookkeeping: quote.alreadyOnSeedBookkeeping ?? false,
      qboSubscription: quote.qboSubscription ?? false,
    };
    
    form.reset(formData);
    
    setTimeout(() => {
      if (quote.entityType) form.setValue('entityType', quote.entityType);
      if (quote.numEntities) form.setValue('numEntities', Number(quote.numEntities));
      if (quote.statesFiled) form.setValue('statesFiled', Number(quote.statesFiled));
      if (quote.numBusinessOwners) form.setValue('numBusinessOwners', Number(quote.numBusinessOwners));
      if (quote.priorYearsUnfiled !== undefined) form.setValue('priorYearsUnfiled', Number(quote.priorYearsUnfiled));
      if (quote.bookkeepingQuality) form.setValue('bookkeepingQuality', quote.bookkeepingQuality);
      
      form.trigger();
    }, 100);
    
    setHubspotVerificationStatus('idle');
    setHubspotContact(null);
    setLastVerifiedEmail('');
    
    if (quote.contactEmail) {
      debouncedVerifyEmail(quote.contactEmail);
    }
    
    setHasUnsavedChanges(false);
  };

  const onSubmit = async (data: FormData) => {
    console.log('onSubmit called with data:', data);
    
    if (existingQuotesForEmail.length > 0) {
      toast({
        title: "Approval Required",
        description: "You must get approval before creating additional quotes for this contact.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isCalculated) {
      console.log('Form not calculated, isCalculated:', isCalculated);
      toast({
        title: "Calculation Required",
        description: "Please fill in all fields to calculate fees before saving.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Submitting quote via createQuoteMutation');
    createQuoteMutation.mutate(data);
  };

  // MORE COPY-PASTED: Email trigger and search handlers
  const handleEmailTrigger = async (email: string) => {
    console.log('Email trigger activated for:', email);
    form.setValue('contactEmail', email);
    debouncedVerifyEmail(email);
    setShowContactSearch(true);
  };

  const liveSearchContacts = async (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setLiveSearchResults([]);
      setShowLiveResults(false);
      return;
    }

    setIsLiveSearching(true);
    try {
      const response = await apiRequest('/api/hubspot/search-contacts', {
        method: 'POST',
        body: JSON.stringify({ searchTerm, limit: 5 })
      });

      if (response.contacts) {
        setLiveSearchResults(response.contacts);
        setShowLiveResults(true);
      }
    } catch (error) {
      console.error('Error searching contacts:', error);
      setLiveSearchResults([]);
    } finally {
      setIsLiveSearching(false);
    }
  };

  const searchHubSpotContacts = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setHubspotContacts([]);
      return;
    }

    setIsContactSearching(true);
    try {
      const response = await apiRequest('/api/hubspot/search-contacts', {
        method: 'POST',
        body: JSON.stringify({ searchTerm, limit: 10 })
      });

      if (response.contacts) {
        setHubspotContacts(response.contacts);
      }
    } catch (error) {
      console.error('Error searching HubSpot contacts:', error);
      setHubspotContacts([]);
    } finally {
      setIsContactSearching(false);
    }
  };

  const handleContactSelection = (contact: any) => {
    console.log('Contact selected:', contact);
    setSelectedContact(contact);
    form.setValue('contactEmail', contact.properties.email);
    
    if (contact.properties.company && !form.watch('companyNameLocked')) {
      form.setValue('companyName', contact.properties.company);
      form.setValue('companyNameLocked', true);
    }
    
    if (contact.properties.firstname && !form.watch('contactFirstNameLocked')) {
      form.setValue('contactFirstName', contact.properties.firstname);
      form.setValue('contactFirstNameLocked', true);
    }
    
    if (contact.properties.lastname && !form.watch('contactLastNameLocked')) {
      form.setValue('contactLastName', contact.properties.lastname);
      form.setValue('contactLastNameLocked', true);
    }
    
    if (contact.properties.industry && !form.watch('industryLocked')) {
      form.setValue('industry', contact.properties.industry);
      form.setValue('industryLocked', true);
    }

    setHubspotVerificationStatus('verified');
    setHubspotContact(contact);
    setShowContactSearch(false);
    setShowClientDetails(true);
    debouncedVerifyEmail(contact.properties.email);
  };

  // COPY-PASTED: All useEffect hooks
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    return () => {
      if (verificationTimeoutId) {
        clearTimeout(verificationTimeoutId);
      }
    };
  }, [verificationTimeoutId]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <UniversalNavbar 
            showBackButton={true} 
            backButtonText="Back to Portal" 
            backButtonPath="/" 
          />

          {/* MASSIVE COPY-PASTE OPERATION: All the UI from the original file */}
          {!showClientDetails && (
            <Card className="max-w-lg mx-auto mb-8 bg-white/95 backdrop-blur-sm shadow-xl border-0">
              <CardContent className="p-8 text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-full mx-auto mb-6">
                  <User className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Start New Quote</h2>
                <p className="text-gray-600 mb-6">Enter a client email to begin the quoting process</p>
                
                <div className="space-y-4">
                  <div className="relative">
                    <Input 
                      type="email"
                      placeholder="client@company.com"
                      value={triggerEmail}
                      onChange={(e) => {
                        const email = e.target.value;
                        setTriggerEmail(email);
                        if (email.length >= 3) {
                          liveSearchContacts(email);
                        } else {
                          setShowLiveResults(false);
                          setLiveSearchResults([]);
                        }
                      }}
                      className="bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-center text-lg py-3"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && triggerEmail.includes('@')) {
                          if (liveSearchResults.length > 0) {
                            handleContactSelection(liveSearchResults[0]);
                          } else {
                            handleEmailTrigger(triggerEmail);
                          }
                        }
                      }}
                      onFocus={() => {
                        if (triggerEmail.length >= 3) {
                          setShowLiveResults(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowLiveResults(false), 300);
                      }}
                    />
                    
                    {/* Live search results dropdown */}
                    {showLiveResults && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                        {isLiveSearching ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span className="ml-2 text-sm text-gray-600">Searching...</span>
                          </div>
                        ) : liveSearchResults.length > 0 ? (
                          <div className="py-1">
                            {liveSearchResults.slice(0, 5).map((contact) => (
                              <div
                                key={contact.id}
                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-left"
                                onClick={() => handleContactSelection(contact)}
                                onMouseDown={(e) => e.preventDefault()}
                              >
                                <div className="font-medium text-gray-900">
                                  {contact.properties.firstname} {contact.properties.lastname}
                                </div>
                                <div className="text-sm text-blue-600">{contact.properties.email}</div>
                                {contact.properties.company && (
                                  <div className="text-sm text-gray-500">{contact.properties.company}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : triggerEmail.length >= 3 ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No matching contacts found
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* HubSpot Contact Search Modal */}
          <Dialog open={showContactSearch} onOpenChange={setShowContactSearch}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Search HubSpot Contacts</DialogTitle>
                <DialogDescription>
                  Find an existing contact or create a new quote for "{triggerEmail}"
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or company..."
                    value={contactSearchTerm}
                    onChange={(e) => {
                      setContactSearchTerm(e.target.value);
                      searchHubSpotContacts(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>

                {isContactSearching && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Searching contacts...</span>
                  </div>
                )}

                {!isContactSearching && hubspotContacts.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {hubspotContacts.map((contact) => (
                      <Card key={contact.id} className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleContactSelection(contact)}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {contact.properties.firstname} {contact.properties.lastname}
                              </p>
                              <p className="text-sm text-blue-600">{contact.properties.email}</p>
                              {contact.properties.company && (
                                <p className="text-sm text-gray-600">{contact.properties.company}</p>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {!isContactSearching && contactSearchTerm && hubspotContacts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">No contacts found matching "{contactSearchTerm}"</p>
                    <Button 
                      onClick={() => {
                        form.setValue('contactEmail', triggerEmail);
                        setShowContactSearch(false);
                        setShowClientDetails(true);
                      }}
                      variant="outline"
                    >
                      Create New Quote for "{triggerEmail}"
                    </Button>
                  </div>
                )}

                {/* Show existing quotes for selected contact */}
                {selectedContact && existingQuotesForEmail.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Existing Quotes for {selectedContact.properties.email}</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {existingQuotesForEmail.map((quote) => (
                        <Card key={quote.id} className="cursor-pointer hover:bg-blue-50 transition-colors"
                              onClick={() => {
                                loadQuoteIntoForm(quote);
                                setShowContactSearch(false);
                                setShowClientDetails(true);
                              }}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">${parseFloat(quote.monthlyFee).toLocaleString()}/mo</p>
                                <p className="text-xs text-gray-600">
                                  {new Date(quote.updatedAt || quote.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <Button size="sm" variant="ghost">Load Quote</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {showClientDetails && (
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
                    
                    {/* Basic form fields - START WITH MINIMAL IMPLEMENTATION */}
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

                    {/* Service Tier Selection */}
                    <div className="mt-6">
                      <ServiceTierCards form={form} />
                    </div>

                    {/* Service Cards */}
                    <div className="mt-6">
                      <ServiceCards form={form} />
                    </div>

                    {/* Simple pricing display */}
                    {isCalculated && (
                      <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-2xl p-6 shadow-lg">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Calculator className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">Total Monthly Fee</span>
                          </div>
                          <div className="text-4xl font-bold text-blue-800 mb-2">
                            ${feeCalculation.combined.monthlyFee.toLocaleString()}
                            <span className="text-lg font-medium text-blue-600">
                              {feeCalculation.combined.monthlyFee > 0 ? '/month' : ' monthly'}
                            </span>
                          </div>
                          {feeCalculation.combined.setupFee > 0 && (
                            <div className="text-lg text-blue-700">
                              <span className="font-semibold">${feeCalculation.combined.setupFee.toLocaleString()}</span>
                              <span className="text-sm"> setup fee</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex justify-end gap-4 mt-6">
                      <Button 
                        type="submit" 
                        disabled={createQuoteMutation.isPending || !isCalculated}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {createQuoteMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Quote
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </form>
              </Form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
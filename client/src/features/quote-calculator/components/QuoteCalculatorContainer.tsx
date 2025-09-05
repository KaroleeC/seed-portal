import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Copy, Save, Check, Search, ArrowUpDown, Edit, AlertCircle, Archive, CheckCircle, XCircle, Loader2, Upload, User, LogOut, Calculator, FileText, Sparkles, DollarSign, X, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { insertQuoteSchema, type Quote } from "@shared/schema";
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
import logoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";

// Get current month number (1-12)
const currentMonth = new Date().getMonth() + 1;

// Create form schema without the calculated fields
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
  contactEmail: z.string().email("Please enter a valid email address"),
  cleanupMonths: z.number().min(0, "Cannot be negative"),
  cleanupOverride: z.boolean().default(false),
  overrideReason: z.string().optional(),
  customOverrideReason: z.string().optional(),
  companyName: z.string().optional(),
  // TaaS fields
  numEntities: z.number().min(1, "Must have at least 1 entity").optional(),
  statesFiled: z.number().min(1, "Must file in at least 1 state").optional(),
  internationalFiling: z.boolean().optional(),
  numBusinessOwners: z.number().min(1, "Must have at least 1 business owner").optional(),
  include1040s: z.boolean().optional(),
  priorYearsUnfiled: z.number().min(0, "Cannot be negative").max(5, "Maximum 5 years").optional(),
  alreadyOnSeedBookkeeping: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // If cleanup override is checked, require a reason
  if (data.cleanupOverride && !data.overrideReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Override reason is required when cleanup override is enabled",
      path: ["overrideReason"],
    });
  }
  
  // If "Other" is selected as reason, require custom text
  if (data.cleanupOverride && data.overrideReason === "Other" && (!data.customOverrideReason || data.customOverrideReason.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please provide a detailed reason for the override",
      path: ["customOverrideReason"]
    });
  }
  
  // If override is not checked or not approved, enforce minimum cleanup months (only for bookkeeping)
  if (data.quoteType === 'bookkeeping' && !data.cleanupOverride && data.cleanupMonths < currentMonth) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Minimum ${currentMonth} months required (current calendar year) unless override is approved`,
      path: ["cleanupMonths"],
    });
  }
  
  // TaaS validations
  if (data.quoteType === 'taas') {
    if (!data.entityType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Entity type is required for TaaS quotes",
        path: ["entityType"],
      });
    }
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
    if (!data.bookkeepingQuality) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bookkeeping quality is required for TaaS quotes",
        path: ["bookkeepingQuality"],
      });
    }
    if (data.include1040s === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify if 1040s should be included",
        path: ["include1040s"],
      });
    }
    if (data.priorYearsUnfiled === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Prior years unfiled is required for TaaS quotes",
        path: ["priorYearsUnfiled"],
      });
    }
    if (data.alreadyOnSeedBookkeeping === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify if already on Seed Bookkeeping",
        path: ["alreadyOnSeedBookkeeping"],
      });
    }
  }
});

type FormData = z.infer<typeof formSchema>;

// Pricing data
const baseMonthlyFee = 150; // Starting base fee (updated to $150/mo)

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

function calculateFees(data: Partial<FormData>) {
  if (!data.revenueBand || !data.monthlyTransactions || !data.industry || data.cleanupMonths === undefined) {
    return { monthlyFee: 0, setupFee: 0 };
  }
  
  // If cleanup months is 0, cleanup complexity is not required
  if (data.cleanupMonths > 0 && !data.cleanupComplexity) {
    return { monthlyFee: 0, setupFee: 0 };
  }

  const revenueMultiplier = revenueMultipliers[data.revenueBand as keyof typeof revenueMultipliers] || 1.0;
  const txFee = txSurcharge[data.monthlyTransactions as keyof typeof txSurcharge] || 0;
  const industryData = industryMultipliers[data.industry as keyof typeof industryMultipliers] || { monthly: 1, cleanup: 1 };
  
  // Dynamic calculation: base fee * revenue multiplier + transaction surcharge, then apply industry multiplier
  const monthlyFee = Math.round((baseMonthlyFee * revenueMultiplier + txFee) * industryData.monthly);
  
  // Use the actual cleanup months value (override just allows values below normal minimum)
  const effectiveCleanupMonths = data.cleanupMonths;
  
  // If no cleanup months, setup fee is $0, but monthly fee remains normal
  let setupFee = 0;
  if (effectiveCleanupMonths > 0) {
    const cleanupMultiplier = parseFloat(data.cleanupComplexity || "0.75") * industryData.cleanup;
    setupFee = roundToNearest25(Math.max(monthlyFee, monthlyFee * cleanupMultiplier * effectiveCleanupMonths));
  }
  
  return { monthlyFee, setupFee };
}

// TaaS-specific calculation function based on provided logic
function calculateTaaSFees(data: Partial<FormData>, existingBookkeepingFees?: { monthlyFee: number; setupFee: number }) {
  if (!data.revenueBand || !data.industry || !data.entityType || !data.numEntities || !data.statesFiled || 
      data.internationalFiling === undefined || !data.numBusinessOwners || !data.bookkeepingQuality || 
      data.include1040s === undefined || data.priorYearsUnfiled === undefined || data.alreadyOnSeedBookkeeping === undefined) {
    return { monthlyFee: 0, setupFee: 0 };
  }

  const base = 150;

  // Entity upcharge
  const entityUpcharge = data.numEntities === 1 ? 0 : data.numEntities <= 3 ? 75 : 150;
  
  // State upcharge
  const stateUpcharge = data.statesFiled <= 1 ? 0 : data.statesFiled <= 5 ? 50 : 150;
  
  // International filing upcharge
  const intlUpcharge = data.internationalFiling ? 200 : 0;
  
  // Owner upcharge
  const ownerUpcharge = data.numBusinessOwners <= 1 ? 0 : data.numBusinessOwners <= 3 ? 50 : 100;
  
  // Bookkeeping quality upcharge
  const bookUpcharge = data.bookkeepingQuality === 'Clean (Seed)' ? 0 : 
                       data.bookkeepingQuality === 'Outside CPA' ? 75 : 150;
  
  // Personal 1040s
  const personal1040 = data.include1040s ? data.numBusinessOwners * 25 : 0;

  // Industry multiplier (simplified mapping from TaaS logic to our existing industries)
  const taasIndustryMult: Record<string, number> = {
    'Software/SaaS': 1.0,
    'Professional Services': 1.1, // Agencies
    'Consulting': 1.1, // Agencies  
    'Real Estate': 1.2,
    'E-commerce/Retail': 1.3,
    'Construction/Trades': 1.4,
    'Multi-entity/Holding Companies': 1.5,
    // Default to SaaS multiplier for others
  };
  
  const industryMult = taasIndustryMult[data.industry] || 1.0;

  // Revenue multiplier (map our revenue bands to average monthly revenue)
  const avgMonthlyRevenue = data.revenueBand === '<$10K' ? 5000 :
                           data.revenueBand === '10K-25K' ? 17500 :
                           data.revenueBand === '25K-75K' ? 50000 :
                           data.revenueBand === '75K-250K' ? 162500 :
                           data.revenueBand === '250K-1M' ? 625000 :
                           data.revenueBand === '1M+' ? 1000000 : 5000;

  const revenueMult = avgMonthlyRevenue <= 10000 ? 1.0 :
                     avgMonthlyRevenue <= 25000 ? 1.2 :
                     avgMonthlyRevenue <= 75000 ? 1.4 :
                     avgMonthlyRevenue <= 250000 ? 1.6 :
                     avgMonthlyRevenue <= 1000000 ? 1.8 : 2.0;

  // Calculate raw fee
  const rawFee = (base + entityUpcharge + stateUpcharge + intlUpcharge + ownerUpcharge + bookUpcharge + personal1040) * industryMult * revenueMult;

  // Apply Seed Bookkeeping discount if applicable
  const isBookkeepingClient = data.alreadyOnSeedBookkeeping;
  const monthlyFee = Math.max(150, Math.round((isBookkeepingClient ? rawFee * 0.9 : rawFee) / 5) * 5);

  // Setup fee calculation
  const perYearFee = monthlyFee * 0.8 * 12;
  const setupFee = Math.max(monthlyFee, perYearFee * data.priorYearsUnfiled);

  // If we have existing bookkeeping fees, add them on top
  if (existingBookkeepingFees) {
    return {
      monthlyFee: monthlyFee + existingBookkeepingFees.monthlyFee,
      setupFee: setupFee + existingBookkeepingFees.setupFee
    };
  }

  return { monthlyFee, setupFee };
}

// Combined calculation function for quotes that include both services
function calculateCombinedFees(data: Partial<FormData>) {
  const includesBookkeeping = data.includesBookkeeping !== false; // Default to true
  const includesTaas = data.includesTaas === true;
  
  let bookkeepingFees = { monthlyFee: 0, setupFee: 0 };
  let taasFees = { monthlyFee: 0, setupFee: 0 };
  
  if (includesBookkeeping) {
    bookkeepingFees = calculateFees(data);
  }
  
  if (includesTaas) {
    taasFees = calculateTaaSFees(data);
  }
  
  return {
    bookkeeping: bookkeepingFees,
    taas: taasFees,
    combined: {
      monthlyFee: bookkeepingFees.monthlyFee + taasFees.monthlyFee,
      setupFee: bookkeepingFees.setupFee + taasFees.setupFee
    },
    includesBookkeeping,
    includesTaas
  };
}

export function QuoteCalculatorContainer() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("updatedAt");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Approval system state
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalCode, setApprovalCode] = useState("");
  const [isApproved, setIsApproved] = useState(false);
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [customOverrideReason, setCustomOverrideReason] = useState("");
  
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
  
  // TaaS state

  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);
  
  // Form navigation state
  const [currentFormView, setCurrentFormView] = useState<'bookkeeping' | 'taas'>('bookkeeping');
  
  // Helper functions for navigation
  const getActiveServices = () => {
    const services: ('bookkeeping' | 'taas')[] = [];
    if (feeCalculation.includesBookkeeping) services.push('bookkeeping');
    if (feeCalculation.includesTaas) services.push('taas');
    return services;
  };
  
  const canNavigateLeft = () => {
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(currentFormView);
    return currentIndex > 0;
  };
  
  const canNavigateRight = () => {
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(currentFormView);
    return currentIndex < activeServices.length - 1;
  };
  
  const navigateLeft = () => {
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(currentFormView);
    if (currentIndex > 0) {
      setCurrentFormView(activeServices[currentIndex - 1]);
    }
  };
  
  const navigateRight = () => {
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(currentFormView);
    if (currentIndex < activeServices.length - 1) {
      setCurrentFormView(activeServices[currentIndex + 1]);
    }
  };
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactEmail: "",
      revenueBand: "",
      monthlyTransactions: "",
      industry: "",
      cleanupMonths: currentMonth,
      cleanupComplexity: "",
      cleanupOverride: false,
      overrideReason: "",
      customOverrideReason: "",
      companyName: "",
      quoteType: "bookkeeping",
      // Service flags for combined quotes
      includesBookkeeping: true,
      includesTaas: false,
      // TaaS defaults
      numEntities: 1,
      statesFiled: 1,
      internationalFiling: false,
      numBusinessOwners: 1,
      include1040s: false,
      priorYearsUnfiled: 0,
      alreadyOnSeedBookkeeping: false,
    },
  });

  // Query to fetch all quotes
  const { data: allQuotes = [], refetch: refetchQuotes } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", { search: searchTerm, sortField, sortOrder }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (sortField) params.append('sortField', sortField);
      if (sortOrder) params.append('sortOrder', sortOrder);
      
      return fetch(`/api/quotes?${params.toString()}`)
        .then(res => res.json());
    }
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log('Submitting quote data:', data);
      
      // Use combined calculation system
      const feeCalculation = calculateCombinedFees(data);
      console.log('Calculated combined fees:', feeCalculation);
      
      const quoteData = {
        ...data,
        monthlyFee: feeCalculation.combined.monthlyFee.toString(),
        setupFee: feeCalculation.combined.setupFee.toString(),
        taasMonthlyFee: feeCalculation.taas.monthlyFee.toString(),
        taasPriorYearsFee: feeCalculation.taas.setupFee.toString(),
        approvalRequired: data.cleanupOverride && isApproved,
      };
      
      console.log('Final quote data:', quoteData);
      
      if (editingQuoteId) {
        const response = await apiRequest("PUT", `/api/quotes/${editingQuoteId}`, quoteData);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/quotes", quoteData);
        return response.json();
      }
    },
    onSuccess: (data) => {
      console.log('Quote saved successfully:', data);
      toast({
        title: editingQuoteId ? "Quote Updated" : "Quote Saved",
        description: editingQuoteId ? "Your quote has been updated successfully." : "Your quote has been saved successfully.",
      });
      setEditingQuoteId(null);
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

  // Archive quote mutation
  const archiveQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const response = await apiRequest("PATCH", `/api/quotes/${quoteId}/archive`, {});
      return response.json();
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

  const handleArchiveQuote = (quoteId: number, contactEmail: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click event
    
    // If user has chosen to not show the dialog, directly archive
    if (dontShowArchiveDialog) {
      archiveQuoteMutation.mutate(quoteId);
      return;
    }
    
    // Otherwise, show the custom dialog
    setSelectedQuoteForArchive({ id: quoteId, email: contactEmail });
    setArchiveDialogOpen(true);
  };

  const handleConfirmArchive = () => {
    if (selectedQuoteForArchive) {
      archiveQuoteMutation.mutate(selectedQuoteForArchive.id);
      setArchiveDialogOpen(false);
      setSelectedQuoteForArchive(null);
    }
  };

  const handleArchiveDialogDontShow = (checked: boolean) => {
    setDontShowArchiveDialog(checked);
    localStorage.setItem('dontShowArchiveDialog', checked.toString());
  };

  // HubSpot email verification with proper debouncing
  const verifyHubSpotEmail = async (email: string) => {
    if (!email || email === lastVerifiedEmail) return;
    
    // Clear any pending verification timeout
    if (verificationTimeoutId) {
      clearTimeout(verificationTimeoutId);
    }
    
    setHubspotVerificationStatus('verifying');
    setLastVerifiedEmail(email);
    
    try {
      // Check for existing quotes and verify HubSpot contact in parallel
      const [hubspotResponse, existingQuotesResponse] = await Promise.all([
        apiRequest('POST', '/api/hubspot/verify-contact', { email }),
        apiRequest('POST', '/api/quotes/check-existing', { email })
      ]);
      
      const hubspotResult = await hubspotResponse.json();
      const existingQuotesResult = await existingQuotesResponse.json();
      
      // Handle HubSpot verification
      if (hubspotResult.verified && hubspotResult.contact) {
        setHubspotVerificationStatus('verified');
        setHubspotContact(hubspotResult.contact);
        
        // Auto-fill company name if available
        if (hubspotResult.contact.properties.company && !form.getValues('companyName')) {
          form.setValue('companyName', hubspotResult.contact.properties.company);
        }
      } else {
        setHubspotVerificationStatus('not-found');
        setHubspotContact(null);
      }
      
      // Handle existing quotes
      if (existingQuotesResult.hasExistingQuotes) {
        setExistingQuotesForEmail(existingQuotesResult.quotes);
        setShowExistingQuotesNotification(true);
        // Automatically filter the saved quotes table to show only this email's quotes
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

  // Debounced email verification function
  const debouncedVerifyEmail = (email: string) => {
    // Clear any existing timeout
    if (verificationTimeoutId) {
      clearTimeout(verificationTimeoutId);
    }
    
    // Set verification status to idle while waiting
    setHubspotVerificationStatus('idle');
    
    // Set new timeout
    const timeoutId = setTimeout(() => {
      if (email && email.includes('@') && email.includes('.')) {
        verifyHubSpotEmail(email);
      }
    }, 750); // Increased debounce delay to 750ms for better UX
    
    setVerificationTimeoutId(timeoutId);
  };

  // Push to HubSpot mutation
  const pushToHubSpotMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const response = await apiRequest("POST", "/api/hubspot/push-quote", { quoteId });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Pushed to HubSpot",
        description: `Deal "${data.dealName}" created successfully in HubSpot.`,
      });
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

  // Update HubSpot quote mutation
  const updateHubSpotMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const currentFormData = form.getValues();
      const response = await apiRequest("POST", "/api/hubspot/update-quote", { 
        quoteId, 
        currentFormData 
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "HubSpot Updated",
          description: "Quote successfully updated in HubSpot and saved.",
        });
        // Refresh the quotes list to show updated data
        queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
        refetchQuotes();
        setHasUnsavedChanges(false);
      } else if (data.needsNewQuote) {
        toast({
          title: "Quote Expired",
          description: "The HubSpot quote is no longer active. Use 'Push to HubSpot' to create a new quote.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error('Update HubSpot error:', error);
      toast({
        title: "HubSpot Error",
        description: error.message || "Failed to update quote in HubSpot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const watchedValues = form.watch();
  
  // Calculate fees using combined system
  const feeCalculation = calculateCombinedFees(watchedValues);
  const monthlyFee = feeCalculation.combined.monthlyFee;
  const setupFee = feeCalculation.combined.setupFee;
  
  const isCalculated = monthlyFee > 0;
  


  // Track form changes for unsaved changes detection
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (verificationTimeoutId) {
        clearTimeout(verificationTimeoutId);
      }
    };
  }, [verificationTimeoutId]);

  const loadQuoteIntoForm = async (quote: Quote) => {
    if (hasUnsavedChanges) {
      setPendingQuoteToLoad(quote);
      setDiscardChangesDialog(true);
      return;
    }
    
    doLoadQuote(quote);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const resetForm = () => {
    // Always show confirmation dialog when there are changes or when editing a quote
    if (hasUnsavedChanges || editingQuoteId !== null) {
      setResetConfirmDialog(true);
      return;
    }
    
    doResetForm();
  };

  // Helper function to actually load a quote (used by both direct loading and after dialog confirmation)
  const doLoadQuote = (quote: Quote) => {
    console.log('Loading quote into form:', quote);
    setEditingQuoteId(quote.id);
    
    // Set approval state before form reset
    setIsApproved(quote.approvalRequired || false);
    
    // Reset form with quote data
    const formData = {
      contactEmail: quote.contactEmail,
      revenueBand: quote.revenueBand,
      monthlyTransactions: quote.monthlyTransactions,
      industry: quote.industry,
      cleanupMonths: quote.cleanupMonths,
      cleanupComplexity: parseFloat(quote.cleanupComplexity).toString(), // Convert "1.00" to "1"
      cleanupOverride: quote.cleanupOverride || false,
      overrideReason: quote.overrideReason || "",
      companyName: quote.companyName || "",
    };
    
    console.log('Resetting form with data:', formData);
    form.reset(formData);
    
    // Use setTimeout to ensure form is reset before checking values
    setTimeout(() => {
      console.log('Form values after reset:', form.getValues());
    }, 50);
    
    // Reset HubSpot verification state and re-verify if email exists
    setHubspotVerificationStatus('idle');
    setHubspotContact(null);
    setLastVerifiedEmail('');
    
    // Re-verify the email if it exists
    if (quote.contactEmail) {
      debouncedVerifyEmail(quote.contactEmail);
    }
    
    setHasUnsavedChanges(false);
  };

  // Helper function to actually reset the form (used by both direct reset and after dialog confirmation)
  const doResetForm = () => {
    setEditingQuoteId(null);
    form.reset({
      contactEmail: "",
      revenueBand: "",
      monthlyTransactions: "",
      industry: "",
      cleanupMonths: currentMonth,
      cleanupComplexity: "",
      cleanupOverride: false,
      overrideReason: "",
      customOverrideReason: "",
      companyName: "",
    });
    
    // Reset all HubSpot verification state
    setHubspotVerificationStatus('idle');
    setHubspotContact(null);
    setLastVerifiedEmail('');
    setIsApproved(false);
    
    // Reset existing quotes state
    setExistingQuotesForEmail([]);
    setShowExistingQuotesNotification(false);
    
    // Clear search term to show all quotes again
    setSearchTerm("");
    
    setHasUnsavedChanges(false);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied to Clipboard",
        description: `$${text} has been copied to your clipboard.`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Request approval code from server and send Slack notification
  const requestApproval = async () => {
    setIsRequestingApproval(true);
    try {
      const formData = form.getValues();
      const fees = calculateFees(formData);
      
      const response = await apiRequest("POST", "/api/approval/request", {
        contactEmail: formData.contactEmail,
        quoteData: {
          contactEmail: formData.contactEmail,
          revenueBand: formData.revenueBand,
          monthlyTransactions: formData.monthlyTransactions,
          industry: formData.industry,
          cleanupMonths: formData.cleanupMonths,
          overrideReason: formData.overrideReason || "",
          customOverrideReason: formData.customOverrideReason || "",
          monthlyFee: fees.monthlyFee,
          setupFee: fees.setupFee
        }
      });
      
      if (response.ok) {
        toast({
          title: "Approval Requested",
          description: "Check Slack for the approval code.",
        });
        setIsApprovalDialogOpen(true);
      } else {
        throw new Error('Failed to request approval');
      }
    } catch (error) {
      console.error('Error requesting approval:', error);
      toast({
        title: "Request Failed",
        description: "Failed to request approval. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingApproval(false);
    }
  };

  // Validate approval code entered by user
  const validateApprovalCode = async () => {
    if (!approvalCode || approvalCode.length !== 4) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 4-digit approval code.",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingCode(true);
    try {
      const response = await apiRequest("POST", "/api/approval/validate", {
        code: approvalCode,
        contactEmail: form.getValues().contactEmail
      });
      
      const result = await response.json();
      
      if (result.valid) {
        setIsApproved(true);
        setIsApprovalDialogOpen(false);
        setApprovalCode("");
        toast({
          title: "Approval Granted",
          description: "You can now modify cleanup months.",
        });
      } else {
        toast({
          title: "Invalid Code",
          description: result.message || "Please check the code and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error validating approval code:', error);
      toast({
        title: "Validation Failed",
        description: "Failed to validate code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingCode(false);
    }
  };

  const onSubmit = (data: FormData) => {
    console.log('onSubmit called with data:', data);
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

  // Remove the old breakdown function since it's now handled in the calculation logic above

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="relative mb-8">
          {/* User Menu - Top Right */}
          <div className="absolute top-0 right-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20">
                  <User className="h-4 w-4 mr-2" />
                  {user?.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled>
                  <User className="h-4 w-4 mr-2" />
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {logoutMutation.isPending ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Logo and Title - Center */}
          <div className="text-center">
            <img 
              src={logoPath} 
              alt="Seed Financial Logo" 
              className="h-16 mx-auto mb-4"
            />
            <p className="text-lg text-gray-200">
              Internal Pricing Calculator
            </p>
          </div>
        </div>

        {/* Service Selection Cards - Optimized for desktop */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Bookkeeping Service Card */}
            <div 
              className={`
                cursor-pointer transition-all duration-200 rounded-xl p-5 border-2 shadow-sm
                ${feeCalculation.includesBookkeeping 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-green-100' 
                  : 'bg-gray-50 border-gray-200 hover:border-green-200 hover:bg-green-50/50'
                }
              `}
              onClick={() => {
                const newValue = !feeCalculation.includesBookkeeping;
                form.setValue('includesBookkeeping', newValue);
                form.trigger();
                
                // Navigation logic
                if (!feeCalculation.includesBookkeeping) {
                  // Activating bookkeeping - navigate to bookkeeping form
                  setCurrentFormView('bookkeeping');
                } else {
                  // Deactivating bookkeeping - navigate to next active service
                  if (feeCalculation.includesTaas) {
                    setCurrentFormView('taas');
                  }
                }
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  feeCalculation.includesBookkeeping ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {feeCalculation.includesBookkeeping && <Check className="h-4 w-4 text-white" />}
                </div>
                <h4 className={`font-semibold ${
                  feeCalculation.includesBookkeeping ? 'text-green-800' : 'text-gray-600'
                }`}>
                  Bookkeeping
                </h4>
              </div>
              <div className={`text-2xl font-bold mb-1 ${
                feeCalculation.includesBookkeeping ? 'text-green-800' : 'text-gray-400'
              }`}>
                ${feeCalculation.includesBookkeeping ? feeCalculation.bookkeeping.monthlyFee.toLocaleString() : '0'} / mo
              </div>
              <div className={`text-sm font-medium mb-2 ${
                feeCalculation.includesBookkeeping ? 'text-green-700' : 'text-gray-400'
              }`}>
                ${feeCalculation.includesBookkeeping ? feeCalculation.bookkeeping.setupFee.toLocaleString() : '0'} setup
              </div>
              <p className={`text-xs ${
                feeCalculation.includesBookkeeping ? 'text-green-600' : 'text-gray-500'
              }`}>
                Monthly bookkeeping, cleanup, and financial management
              </p>
            </div>

            {/* TaaS Service Card */}
            <div 
              className={`
                cursor-pointer transition-all duration-200 rounded-xl p-5 border-2 shadow-sm
                ${feeCalculation.includesTaas 
                  ? 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-300 shadow-blue-100' 
                  : 'bg-gray-50 border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                }
              `}
              onClick={() => {
                const newValue = !feeCalculation.includesTaas;
                form.setValue('includesTaas', newValue);
                form.trigger();
                
                // Navigation logic
                if (!feeCalculation.includesTaas) {
                  // Activating TaaS - navigate to TaaS form
                  setCurrentFormView('taas');
                } else {
                  // Deactivating TaaS - navigate to next active service
                  if (feeCalculation.includesBookkeeping) {
                    setCurrentFormView('bookkeeping');
                  }
                }
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  feeCalculation.includesTaas ? 'bg-blue-500' : 'bg-gray-300'
                }`}>
                  {feeCalculation.includesTaas && <Check className="h-4 w-4 text-white" />}
                </div>
                <h4 className={`font-semibold ${
                  feeCalculation.includesTaas ? 'text-blue-800' : 'text-gray-600'
                }`}>
                  TaaS
                </h4>
              </div>
              <div className={`text-2xl font-bold mb-1 ${
                feeCalculation.includesTaas ? 'text-blue-800' : 'text-gray-400'
              }`}>
                ${feeCalculation.includesTaas ? feeCalculation.taas.monthlyFee.toLocaleString() : '0'} / mo
              </div>
              <div className={`text-sm font-medium mb-2 ${
                feeCalculation.includesTaas ? 'text-blue-700' : 'text-gray-400'
              }`}>
                ${feeCalculation.includesTaas ? feeCalculation.taas.setupFee.toLocaleString() : '0'} prior years
              </div>
              <p className={`text-xs ${
                feeCalculation.includesTaas ? 'text-blue-600' : 'text-gray-500'
              }`}>
                Tax preparation, filing, and compliance services
              </p>
            </div>

            {/* Other Services Card - Coming Soon */}
            <div className="cursor-not-allowed rounded-xl p-5 border-2 border-dashed border-gray-300 shadow-sm bg-gray-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-gray-500" />
                </div>
                <h4 className="font-semibold text-gray-500">Other Services</h4>
              </div>
              <div className="text-2xl font-bold mb-1 text-gray-400">
                Coming Soon
              </div>
              <div className="text-sm font-medium mb-2 text-gray-400">
                Additional services
              </div>
              <p className="text-xs text-gray-500">
                Payroll, FBAR filing, APAP Lite, and more
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Quote Builder Form Card */}
          <Card className="bg-gray-50 shadow-xl border-0 quote-card">
            <CardContent className="p-6 sm:p-8">
              {/* Modern Navigation Toggle - Only show if multiple services are active */}
              {getActiveServices().length > 1 && (
                <div className="mb-6">
                  <div className="flex items-center justify-center">
                    <div className="bg-gray-100 rounded-lg p-1 flex items-center gap-1">
                      {getActiveServices().map((service) => (
                        <button
                          key={service}
                          type="button"
                          onClick={() => setCurrentFormView(service)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                            currentFormView === service
                              ? 'bg-white shadow-sm text-[#e24c00] border border-gray-200'
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          {service === 'bookkeeping' ? 'Bookkeeping' : 'Tax Service'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-[#e24c00] to-[#ff6b35] rounded-lg">
                  {currentFormView === 'bookkeeping' ? <Calculator className="h-5 w-5 text-white" /> : <FileText className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {currentFormView === 'bookkeeping' ? 'Bookkeeping Quote' : 'Tax as a Service (TaaS) Quote'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {currentFormView === 'bookkeeping' ? 'Configure your bookkeeping pricing' : 'Configure your tax preparation requirements'}
                  </p>
                </div>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Core Fields - Always Shown */}
                  <div className="space-y-6">
                    {/* Contact Email */}
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="email"
                              placeholder="client@company.com"
                              className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent pr-10"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                const email = e.target.value;
                                
                                // If email is cleared, reset existing quotes state
                                if (!email.trim()) {
                                  setExistingQuotesForEmail([]);
                                  setShowExistingQuotesNotification(false);
                                  setHubspotVerificationStatus('idle');
                                  setHubspotContact(null);
                                  setLastVerifiedEmail('');
                                  setSearchTerm(""); // Clear search filter when email is cleared
                                  form.setValue('companyName', ''); // Clear company name when email is cleared
                                }
                                
                                debouncedVerifyEmail(email);
                              }}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              {hubspotVerificationStatus === 'verifying' && (
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              )}
                              {hubspotVerificationStatus === 'verified' && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              {hubspotVerificationStatus === 'not-found' && (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Company Name */}
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Company Name"
                            className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        {hubspotVerificationStatus === 'verified' && hubspotContact?.properties.company && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Found in HubSpot: {hubspotContact.properties.company}
                          </p>
                        )}
                        {hubspotVerificationStatus === 'not-found' && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠ Contact not found in HubSpot - quote will be saved but cannot be pushed to HubSpot
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  {/* Existing Quotes Notification */}
                  {showExistingQuotesNotification && existingQuotesForEmail.length > 0 && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        <strong>Existing quotes found!</strong> This email has {existingQuotesForEmail.length} existing quote{existingQuotesForEmail.length > 1 ? 's' : ''}. 
                        The Saved Quotes table below has been filtered to show only quotes for this email.
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 ml-2 text-blue-600 underline"
                          onClick={() => setShowExistingQuotesNotification(false)}
                        >
                          Dismiss
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Industry */}
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Software/SaaS">Software/SaaS</SelectItem>
                            <SelectItem value="Professional Services">Professional Services</SelectItem>
                            <SelectItem value="Consulting">Consulting</SelectItem>
                            <SelectItem value="Healthcare/Medical">Healthcare/Medical</SelectItem>
                            <SelectItem value="Real Estate">Real Estate</SelectItem>
                            <SelectItem value="Property Management">Property Management</SelectItem>
                            <SelectItem value="E-commerce/Retail">E-commerce/Retail</SelectItem>
                            <SelectItem value="Restaurant/Food Service">Restaurant/Food Service</SelectItem>
                            <SelectItem value="Construction/Trades">Construction/Trades</SelectItem>
                            <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                            <SelectItem value="Transportation/Logistics">Transportation/Logistics</SelectItem>
                            <SelectItem value="Nonprofit">Nonprofit</SelectItem>
                            <SelectItem value="Law Firm">Law Firm</SelectItem>
                            <SelectItem value="Accounting/Finance">Accounting/Finance</SelectItem>
                            <SelectItem value="Marketing/Advertising">Marketing/Advertising</SelectItem>
                            <SelectItem value="Insurance">Insurance</SelectItem>
                            <SelectItem value="Automotive">Automotive</SelectItem>
                            <SelectItem value="Education">Education</SelectItem>
                            <SelectItem value="Fitness/Wellness">Fitness/Wellness</SelectItem>
                            <SelectItem value="Entertainment/Events">Entertainment/Events</SelectItem>
                            <SelectItem value="Agriculture">Agriculture</SelectItem>
                            <SelectItem value="Technology/IT Services">Technology/IT Services</SelectItem>
                            <SelectItem value="Multi-entity/Holding Companies">Multi-entity/Holding Companies</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Revenue Band */}
                  <FormField
                    control={form.control}
                    name="revenueBand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Revenue Band</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                              <SelectValue placeholder="Select revenue band" />
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

                  {/* Monthly Transactions */}
                  <FormField
                    control={form.control}
                    name="monthlyTransactions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Transactions</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                              <SelectValue placeholder="Select transaction volume" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="<100">&lt;100</SelectItem>
                            <SelectItem value="100-300">100 - 300</SelectItem>
                            <SelectItem value="300-600">300 - 600</SelectItem>
                            <SelectItem value="600-1000">600 - 1,000</SelectItem>
                            <SelectItem value="1000-2000">1,000 - 2,000</SelectItem>
                            <SelectItem value="2000+">2,000+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Cleanup Complexity */}
                  <FormField
                    control={form.control}
                    name="cleanupComplexity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cleanup Complexity</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                              <SelectValue placeholder="Select complexity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0.5">Clean and Current</SelectItem>
                            <SelectItem value="0.75">Standard</SelectItem>
                            <SelectItem value="1.0">Not Done / Years Behind</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Cleanup Months */}
                  <FormField
                    control={form.control}
                    name="cleanupMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Months of Cleanup Required</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min={(form.watch("cleanupOverride") && isApproved) ? "0" : currentMonth.toString()}
                            max="120"
                            placeholder={currentMonth.toString()}
                            className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                            disabled={form.watch("cleanupOverride") && !isApproved}
                            {...field}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (isNaN(value)) {
                                field.onChange(form.watch("cleanupOverride") && isApproved ? 0 : currentMonth);
                              } else {
                                field.onChange(Math.max(0, value));
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Cleanup Override Checkbox with Request Approval Button */}
                  <FormField
                    control={form.control}
                    name="cleanupOverride"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-y-0">
                        <div className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                if (!checked) {
                                  form.setValue("overrideReason", "");
                                  setIsApproved(false);
                                }
                              }}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Override Minimum Cleanup
                            </FormLabel>
                          </div>
                        </div>
                        
                        {/* Request Approval Button */}
                        {form.watch("cleanupOverride") && !isApproved && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={requestApproval}
                            disabled={
                              isRequestingApproval || 
                              !form.watch("contactEmail") || 
                              !form.watch("overrideReason") ||
                              (form.watch("overrideReason") === "Other" && (!form.watch("customOverrideReason") || form.watch("customOverrideReason")?.trim() === ""))
                            }
                            className="ml-4"
                          >
                            {isRequestingApproval ? "Requesting..." : "Request Approval"}
                          </Button>
                        )}
                        
                        {/* Approval Status */}
                        {form.watch("cleanupOverride") && isApproved && (
                          <div className="text-sm text-green-600 font-medium ml-4">
                            ✓ Approved
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  {/* Override Reason */}
                  {form.watch("cleanupOverride") && (
                    <FormField
                      control={form.control}
                      name="overrideReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                                <SelectValue placeholder="Select reason for override" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Brand New Business">Brand New Business</SelectItem>
                              <SelectItem value="Books Confirmed Current">Books Confirmed Current</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Custom reason text field when "Other" is selected */}
                  {form.watch("cleanupOverride") && form.watch("overrideReason") === "Other" && (
                    <FormField
                      control={form.control}
                      name="customOverrideReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Please explain the reason for override</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter detailed reason for cleanup months override..."
                              className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent min-h-[80px]"
                              {...field}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                field.onChange(e);
                                setCustomOverrideReason(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  </div>

                  {/* TaaS-specific Fields - Only show when currentFormView is 'taas' */}
                  {currentFormView === 'taas' && (
                    <div className="space-y-6 border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-800">Tax Service Details</h3>
                      
                      {/* Entity Type */}
                      <FormField
                        control={form.control}
                        name="entityType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Entity Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                                  <SelectValue placeholder="Select entity type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="LLC">LLC</SelectItem>
                                <SelectItem value="C-Corp">C-Corp</SelectItem>
                                <SelectItem value="S-Corp">S-Corp</SelectItem>
                                <SelectItem value="Partnership">Partnership</SelectItem>
                                <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Number of Entities */}
                      <FormField
                        control={form.control}
                        name="numEntities"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Entities</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                                  <SelectValue placeholder="Select number of entities" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="4">4</SelectItem>
                                <SelectItem value="5">5+</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* States Filed */}
                      <FormField
                        control={form.control}
                        name="statesFiled"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>States Filed</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                                  <SelectValue placeholder="Select number of states" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="4">4</SelectItem>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="6">6+</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* International Filing */}
                      <FormField
                        control={form.control}
                        name="internationalFiling"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-[#e24c00] data-[state=checked]:border-[#e24c00]"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>International Filing Required</FormLabel>
                              <p className="text-sm text-gray-500">Check if international tax filings are needed</p>
                            </div>
                          </FormItem>
                        )}
                      />

                      {/* Number of Business Owners */}
                      <FormField
                        control={form.control}
                        name="numBusinessOwners"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Business Owners</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                                  <SelectValue placeholder="Select number of owners" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="4">4</SelectItem>
                                <SelectItem value="5">5+</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Include 1040s */}
                      <FormField
                        control={form.control}
                        name="include1040s"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-[#e24c00] data-[state=checked]:border-[#e24c00]"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Include Personal 1040s</FormLabel>
                              <p className="text-sm text-gray-500">Check if personal tax returns should be included</p>
                            </div>
                          </FormItem>
                        )}
                      />

                      {/* Prior Years Unfiled */}
                      <FormField
                        control={form.control}
                        name="priorYearsUnfiled"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prior Years Unfiled</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                                  <SelectValue placeholder="Select number of years" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">0</SelectItem>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="4">4</SelectItem>
                                <SelectItem value="5">5</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Bookkeeping Quality */}
                      <FormField
                        control={form.control}
                        name="bookkeepingQuality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bookkeeping Quality</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                                  <SelectValue placeholder="Select bookkeeping quality" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Clean (Seed)">Clean (Seed)</SelectItem>
                                <SelectItem value="Outside CPA">Outside CPA</SelectItem>
                                <SelectItem value="Self-managed">Self-managed</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Already on Seed Bookkeeping */}
                      <FormField
                        control={form.control}
                        name="alreadyOnSeedBookkeeping"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-[#e24c00] data-[state=checked]:border-[#e24c00]"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Already on Seed Bookkeeping</FormLabel>
                              <p className="text-sm text-gray-500">Check if client is already using Seed Bookkeeping services</p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default QuoteCalculatorContainer;

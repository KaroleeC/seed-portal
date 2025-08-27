// Updated to fix mutation undefined error
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Copy, Save, Check, Search, ArrowUpDown, Edit, AlertCircle, Archive, CheckCircle, XCircle, Loader2, Upload, User, LogOut, Calculator, FileText, Sparkles, DollarSign, X, Plus, ChevronLeft, ChevronRight, HelpCircle, Bell, Settings, Lock, Unlock, Building, Users, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { insertQuoteSchema, type Quote } from "@shared/schema";

import { apiRequest, queryClient } from "@/lib/queryClient";

// Import the error handling function

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
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { UniversalNavbar } from "@/components/UniversalNavbar";

// Get current month number (1-12)
const currentMonth = new Date().getMonth() + 1;

// Helper function to validate required fields based on engaged services
const validateRequiredFields = (formValues: any): { isValid: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];
  
  // Always required fields (for any quote)
  if (!formValues.industry) missingFields.push("Industry");
  if (!formValues.monthlyRevenueRange) missingFields.push("Monthly Revenue Range");
  if (!formValues.entityType) missingFields.push("Entity Type");
  
  // Company address - all fields required
  if (!formValues.clientStreetAddress || !formValues.clientCity || !formValues.clientState || !formValues.clientZipCode) {
    missingFields.push("Company Address (all fields)");
  }
  
  // Only validate service-specific fields if that service is actually engaged
  if (formValues.serviceBookkeeping) {
    if (!formValues.monthlyTransactions) missingFields.push("Monthly Transactions");
    if (!formValues.cleanupComplexity) missingFields.push("Cleanup Complexity");
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

// Helper functions for approval logic
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
    // For "Other", button is enabled if custom setup fee is entered OR cleanup months are decreased
    const hasCustomSetupFee = customSetupFee && customSetupFee !== "";
    const hasDecreasedMonths = cleanupMonths < currentMonth;
    if (!hasCustomSetupFee && !hasDecreasedMonths) {
      return "Enter a custom setup fee OR reduce cleanup months below the minimum";
    }
  } else if (overrideReason === "Brand New Business" || overrideReason === "Books Confirmed Current") {
    // For these reasons, button is only enabled if cleanup months are decreased
    if (cleanupMonths >= currentMonth) {
      return "Reduce cleanup months below the minimum to request approval";
    }
  }
  
  return null;
};

const isApprovalButtonDisabled = (formValues: any, isRequestingApproval: boolean, hasRequestedApproval: boolean): boolean => {
  return getApprovalButtonDisabledReason(formValues, isRequestingApproval, hasRequestedApproval) !== null;
};

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
  contactEmail: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  cleanupMonths: z.number().min(0, "Cannot be negative"),
  cleanupOverride: z.boolean().default(false),
  overrideReason: z.string().optional(),
  customOverrideReason: z.string().optional(),
  customSetupFee: z.string().optional(),
  companyName: z.string().optional(),
  // New 5-service system
  serviceBookkeeping: z.boolean().default(false),
  serviceTaas: z.boolean().default(false), 
  servicePayroll: z.boolean().default(false),
  serviceApArLite: z.boolean().default(false),
  serviceFpaLite: z.boolean().default(false),
  // Client address fields for MSA generation
  clientStreetAddress: z.string().optional(),
  clientCity: z.string().optional(),
  clientState: z.string().optional(),
  clientZipCode: z.string().optional(),
  clientCountry: z.string().default("US"),
  // Company name lock status
  companyNameLocked: z.boolean().default(false),
  // Additional client detail fields with lock status
  contactFirstName: z.string().optional(),
  contactFirstNameLocked: z.boolean().default(false),
  contactLastName: z.string().optional(),
  contactLastNameLocked: z.boolean().default(false),
  industryLocked: z.boolean().default(false),
  companyAddressLocked: z.boolean().default(false),
  monthlyRevenueRange: z.string().optional(),
  // TaaS fields
  numEntities: z.number().min(1, "Must have at least 1 entity").optional(),
  customNumEntities: z.number().min(6, "Custom entities must be at least 6").optional(),
  statesFiled: z.number().min(1, "Must file in at least 1 state").optional(),
  customStatesFiled: z.number().min(7, "Custom states must be at least 7").max(50, "Maximum 50 states").optional(),
  internationalFiling: z.boolean().optional(),
  numBusinessOwners: z.number().min(1, "Must have at least 1 business owner").optional(),
  customNumBusinessOwners: z.number().min(6, "Custom owners must be at least 6").optional(),
  include1040s: z.boolean().optional(),
  priorYearsUnfiled: z.number().min(0, "Cannot be negative").max(5, "Maximum 5 years").optional(),
  alreadyOnSeedBookkeeping: z.boolean().optional(),
  qboSubscription: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // If cleanup override is checked, require a reason
  if (data.cleanupOverride && !data.overrideReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Override reason is required when cleanup override is enabled",
      path: ["overrideReason"],
    });
  }
  
  // If "Other" is selected as reason, require custom text and setup fee
  if (data.cleanupOverride && data.overrideReason === "Other") {
    if (!data.customOverrideReason || data.customOverrideReason.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide a detailed reason for the override",
        path: ["customOverrideReason"]
      });
    }
    if (!data.customSetupFee || data.customSetupFee.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a custom setup fee for manual approval",
        path: ["customSetupFee"]
      });
    }
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

function calculateFees(data: Partial<FormData>) {
  if (!data.monthlyRevenueRange || !data.monthlyTransactions || !data.industry || data.cleanupMonths === undefined) {
    return { 
      monthlyFee: 0, 
      setupFee: 0,
      breakdown: {
        baseFee: 0,
        revenueMultiplier: 1,
        afterRevenue: 0,
        txFee: 0,
        afterTx: 0,
        industryMultiplier: 1,
        finalMonthly: 0,
        cleanupComplexity: 0,
        cleanupMonths: 0,
        setupCalc: 0
      }
    };
  }
  
  // If cleanup months is 0, cleanup complexity is not required
  if (data.cleanupMonths > 0 && !data.cleanupComplexity) {
    return { 
      monthlyFee: 0, 
      setupFee: 0,
      breakdown: {
        baseFee: 0,
        revenueMultiplier: 1,
        afterRevenue: 0,
        txFee: 0,
        afterTx: 0,
        industryMultiplier: 1,
        finalMonthly: 0,
        cleanupComplexity: 0,
        cleanupMonths: 0,
        setupCalc: 0
      }
    };
  }

  const revenueMultiplier = revenueMultipliers[data.monthlyRevenueRange as keyof typeof revenueMultipliers] || 1.0;
  const txFee = txSurcharge[data.monthlyTransactions as keyof typeof txSurcharge] || 0;
  const industryData = industryMultipliers[data.industry as keyof typeof industryMultipliers] || { monthly: 1, cleanup: 1 };
  
  // Step-by-step calculation for breakdown
  const afterRevenue = baseMonthlyFee * revenueMultiplier;
  const afterTx = afterRevenue + txFee;
  let monthlyFee = Math.round(afterTx * industryData.monthly);
  
  // Add QBO Subscription fee if selected
  if (data.qboSubscription) {
    monthlyFee += 80;
  }
  
  // Use the actual cleanup months value (override just allows values below normal minimum)
  const effectiveCleanupMonths = data.cleanupMonths;
  
  // Calculate setup fee - custom setup fee ALWAYS overrides calculated values
  let setupFee = 0;
  let setupCalc = 0;
  const cleanupComplexityMultiplier = parseFloat(data.cleanupComplexity || "0.5");
  let industryCleanupMultiplier = 1;
  let cleanupBeforeIndustry = 0;
  
  // Check for custom setup fee override first (takes precedence regardless of cleanup months)
  if (data.overrideReason === "Other" && data.customSetupFee && parseFloat(data.customSetupFee) > 0) {
    setupFee = parseFloat(data.customSetupFee);
  } else if (effectiveCleanupMonths > 0) {
    // Standard cleanup calculation only if no custom override
    industryCleanupMultiplier = industryData.cleanup;
    cleanupBeforeIndustry = monthlyFee * cleanupComplexityMultiplier * effectiveCleanupMonths;
    const cleanupMultiplier = cleanupComplexityMultiplier * industryData.cleanup;
    setupCalc = monthlyFee * cleanupMultiplier * effectiveCleanupMonths;
    setupFee = roundToNearest25(Math.max(monthlyFee, setupCalc));
  }
  // If cleanup months is 0 and no custom override, setup fee remains 0
  
  return { 
    monthlyFee, 
    setupFee,
    breakdown: {
      baseFee: baseMonthlyFee,
      revenueMultiplier,
      afterRevenue: Math.round(afterRevenue),
      txFee,
      afterTx: Math.round(afterTx),
      industryMultiplier: industryData.monthly,
      finalMonthly: monthlyFee,
      cleanupComplexity: cleanupComplexityMultiplier * 100, // As percentage
      cleanupMonths: effectiveCleanupMonths,
      setupCalc: Math.round(setupCalc),
      cleanupBeforeIndustry: Math.round(cleanupBeforeIndustry),
      industryCleanupMultiplier
    }
  };
}

// TaaS-specific calculation function based on provided logic
function calculateTaaSFees(data: Partial<FormData>, existingBookkeepingFees?: { monthlyFee: number; setupFee: number }) {
  if (!data.monthlyRevenueRange || !data.industry || !data.entityType || !data.numEntities || !data.statesFiled || 
      data.internationalFiling === undefined || !data.numBusinessOwners || !data.bookkeepingQuality || 
      data.include1040s === undefined || data.priorYearsUnfiled === undefined || data.alreadyOnSeedBookkeeping === undefined) {
    return { 
      monthlyFee: 0, 
      setupFee: 0,
      breakdown: {
        base: 0,
        entityUpcharge: 0,
        stateUpcharge: 0,
        intlUpcharge: 0,
        ownerUpcharge: 0,
        bookUpcharge: 0,
        personal1040: 0,
        beforeMultipliers: 0,
        industryMult: 1,
        revenueMult: 1,
        afterMultipliers: 0,
        seedDiscount: 0,
        finalMonthly: 0,
        priorYearsUnfiled: 0,
        perYearFee: 0,
        setupFee: 0
      }
    };
  }

  const base = 150;

  // Get effective numbers (use custom values if "more" is selected)
  const effectiveNumEntities = data.customNumEntities || data.numEntities;
  const effectiveStatesFiled = data.customStatesFiled || data.statesFiled;
  const effectiveNumBusinessOwners = data.customNumBusinessOwners || data.numBusinessOwners;

  // Entity upcharge: Every entity above 5 adds $75/mo
  let entityUpcharge = 0;
  if (effectiveNumEntities > 5) {
    entityUpcharge = (effectiveNumEntities - 5) * 75;
  }
  
  // State upcharge: $50 per state above 1, up to 50 states
  let stateUpcharge = 0;
  if (effectiveStatesFiled > 1) {
    const additionalStates = Math.min(effectiveStatesFiled - 1, 49); // Cap at 49 additional states (50 total)
    stateUpcharge = additionalStates * 50;
  }
  
  // International filing upcharge
  const intlUpcharge = data.internationalFiling ? 200 : 0;
  
  // Owner upcharge: Every owner above 5 is $25/mo per owner
  let ownerUpcharge = 0;
  if (effectiveNumBusinessOwners > 5) {
    ownerUpcharge = (effectiveNumBusinessOwners - 5) * 25;
  }
  
  // Bookkeeping quality upcharge
  const bookUpcharge = data.bookkeepingQuality === 'Clean (Seed)' ? 0 : 
                       data.bookkeepingQuality === 'Outside CPA' ? 75 : 150;
  
  // Personal 1040s
  const personal1040 = data.include1040s ? effectiveNumBusinessOwners * 25 : 0;

  // Use the same comprehensive industry multipliers as bookkeeping (monthly values)
  const industryData = industryMultipliers[data.industry as keyof typeof industryMultipliers] || { monthly: 1.0, cleanup: 1.0 };
  const industryMult = industryData.monthly;

  // Revenue multiplier (map our revenue bands to average monthly revenue)
  const avgMonthlyRevenue = data.monthlyRevenueRange === '<$10K' ? 5000 :
                           data.monthlyRevenueRange === '10K-25K' ? 17500 :
                           data.monthlyRevenueRange === '25K-75K' ? 50000 :
                           data.monthlyRevenueRange === '75K-250K' ? 162500 :
                           data.monthlyRevenueRange === '250K-1M' ? 625000 :
                           data.monthlyRevenueRange === '1M+' ? 1000000 : 5000;

  const revenueMult = avgMonthlyRevenue <= 10000 ? 1.0 :
                     avgMonthlyRevenue <= 25000 ? 1.2 :
                     avgMonthlyRevenue <= 75000 ? 1.4 :
                     avgMonthlyRevenue <= 250000 ? 1.6 :
                     avgMonthlyRevenue <= 1000000 ? 1.8 : 2.0;

  // Step-by-step calculation for breakdown
  const beforeMultipliers = base + entityUpcharge + stateUpcharge + intlUpcharge + ownerUpcharge + bookUpcharge + personal1040;
  const afterMultipliers = beforeMultipliers * industryMult * revenueMult;

  // Apply Seed Bookkeeping discount if applicable (15% for existing clients)
  const isBookkeepingClient = data.alreadyOnSeedBookkeeping;
  const seedDiscount = isBookkeepingClient ? afterMultipliers * 0.15 : 0;
  const discountedFee = afterMultipliers - seedDiscount;
  const monthlyFee = Math.max(150, Math.round(discountedFee / 5) * 5);

  // Setup fee calculation - 0.5 × monthly × 12 with $1000 minimum per year
  const perYearFee = Math.max(1000, monthlyFee * 0.5 * 12);
  const setupFee = data.priorYearsUnfiled > 0 ? Math.max(monthlyFee, perYearFee * data.priorYearsUnfiled) : 0;

  // Add intermediate calculation for better breakdown display
  const afterIndustryMult = beforeMultipliers * industryMult;

  const breakdown = {
    base,
    entityUpcharge,
    stateUpcharge,
    intlUpcharge,
    ownerUpcharge,
    bookUpcharge,
    personal1040,
    beforeMultipliers,
    industryMult,
    afterIndustryMult: Math.round(afterIndustryMult),
    revenueMult,
    afterMultipliers: Math.round(afterMultipliers),
    seedDiscount: Math.round(seedDiscount),
    finalMonthly: monthlyFee,
    priorYearsUnfiled: data.priorYearsUnfiled,
    perYearFee: Math.round(perYearFee),
    setupFee
  };

  // If we have existing bookkeeping fees, add them on top
  if (existingBookkeepingFees) {
    return {
      monthlyFee: monthlyFee + existingBookkeepingFees.monthlyFee,
      setupFee: setupFee + existingBookkeepingFees.setupFee,
      breakdown
    };
  }

  return { monthlyFee, setupFee, breakdown };
}

// Combined calculation function for quotes that include both services
function calculateCombinedFees(data: Partial<FormData>) {
  // Use the new service selection fields (serviceBookkeeping, serviceTaas)
  // Also check legacy fields for backward compatibility
  const includesBookkeeping = data.serviceBookkeeping || data.includesBookkeeping !== false; // Default to true for legacy
  const includesTaas = data.serviceTaas || data.includesTaas === true;
  
  let bookkeepingFees: any = { monthlyFee: 0, setupFee: 0, breakdown: undefined };
  let taasFees: any = { monthlyFee: 0, setupFee: 0, breakdown: undefined };
  
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

export default function Home() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
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
  const [hasRequestedApproval, setHasRequestedApproval] = useState(false);
  const [customSetupFee, setCustomSetupFee] = useState<string>("");
  
  // Simplified approval system - lock fields permanently after approval
  const [fieldsLocked, setFieldsLocked] = useState(false);
  const [unlockConfirmDialog, setUnlockConfirmDialog] = useState(false);
  const [originalCleanupMonths, setOriginalCleanupMonths] = useState<number>(currentMonth);
  
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
  
  // Form navigation state
  const [currentFormView, setCurrentFormView] = useState<'bookkeeping' | 'taas' | 'placeholder'>('placeholder');
  
  // Helper functions for navigation (defined after feeCalculation)
  
  // Navigation functions will be defined after feeCalculation
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactEmail: "",
      monthlyRevenueRange: "",
      monthlyTransactions: "",
      industry: "",
      cleanupMonths: currentMonth,
      cleanupComplexity: "",
      cleanupOverride: false,
      overrideReason: "",
      customOverrideReason: "",
      customSetupFee: "",
      companyName: "",
      quoteType: "bookkeeping",
      // New 5-service system
      serviceBookkeeping: false,
      serviceTaas: false,
      servicePayroll: false,
      serviceApArLite: false,
      serviceFpaLite: false,
      // Service flags for combined quotes (legacy)
      includesBookkeeping: false,
      includesTaas: false,
      // TaaS defaults
      numEntities: 1,
      statesFiled: 1,
      internationalFiling: false,
      numBusinessOwners: 1,
      include1040s: false,
      priorYearsUnfiled: 0,
      alreadyOnSeedBookkeeping: false,
      qboSubscription: false,
    },
  });

  // Query to fetch all quotes
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
    retry: false, // Don't retry on auth failures
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log('Submitting quote data:', data);
      
      try {
        // Use combined calculation system
        const feeCalculation = calculateCombinedFees(data);

        const quoteData = {
          ...data,
          monthlyFee: feeCalculation.combined.monthlyFee.toString(),
          setupFee: feeCalculation.combined.setupFee.toString(),
          taasMonthlyFee: feeCalculation.taas.monthlyFee.toString(),
          taasPriorYearsFee: feeCalculation.taas.setupFee.toString(),
          approvalRequired: data.cleanupOverride && isApproved,
          // Ensure all client details are stored for future ClickUp integration
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
          // Lock status for form state preservation
          companyNameLocked: data.companyNameLocked || false,
          contactFirstNameLocked: data.contactFirstNameLocked || false,
          contactLastNameLocked: data.contactLastNameLocked || false,
          industryLocked: data.industryLocked || false,
          companyAddressLocked: data.companyAddressLocked || false,
          // Service selections for ClickUp project creation
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
      // When saving a new quote, set editingQuoteId so user can immediately update it in HubSpot
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

  // Archive quote mutation
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
      
      // Handle HubSpot verification
      if (hubspotResult.verified && hubspotResult.contact) {
        setHubspotVerificationStatus('verified');
        setHubspotContact(hubspotResult.contact);
        
        // Clear any email validation errors since HubSpot verification succeeded
        form.clearErrors('contactEmail');
        
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

  // Live search function for email input (after 3+ characters)
  const liveSearchContacts = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 3) {
      setLiveSearchResults([]);
      setShowLiveResults(false);
      return;
    }

    setIsLiveSearching(true);
    setShowLiveResults(true);
    try {
      const response = await fetch('/api/hubspot/search-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ searchTerm }),
      });

      if (response.ok) {
        const data = await response.json();
        setLiveSearchResults(data.contacts || []);
      } else {
        setLiveSearchResults([]);
      }
    } catch (error) {
      console.error('Error in live search:', error);
      setLiveSearchResults([]);
    } finally {
      setIsLiveSearching(false);
    }
  };

  // Search HubSpot contacts for modal
  const searchHubSpotContacts = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setHubspotContacts([]);
      return;
    }

    setIsContactSearching(true);
    try {
      const response = await fetch('/api/hubspot/search-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ searchTerm }),
      });

      if (response.ok) {
        const data = await response.json();
        setHubspotContacts(data.contacts || []);
      } else {
        setHubspotContacts([]);
      }
    } catch (error) {
      console.error('Error searching HubSpot contacts:', error);
      setHubspotContacts([]);
    } finally {
      setIsContactSearching(false);
    }
  };

  // Handle email trigger and open contact search modal
  const handleEmailTrigger = (email: string) => {
    setTriggerEmail(email);
    setContactSearchTerm(email);
    setShowContactSearch(true);
    // Search for the contact immediately
    searchHubSpotContacts(email);
  };

  // Handle contact selection - check for existing quotes first
  const handleContactSelection = async (contact: any) => {
    console.log('Contact selected:', contact);
    setSelectedContact(contact);
    setShowContactSearch(false);
    setShowLiveResults(false);
    
    // Search for existing quotes for this contact
    try {
      console.log('Searching for existing quotes for:', contact.properties.email);
      const response = await fetch(`/api/quotes?search=${encodeURIComponent(contact.properties.email)}`, {
        credentials: 'include',
      });
      
      console.log('Quotes search response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Existing quotes found:', data);
        setExistingQuotesForEmail(data || []);
        
        // Always show existing quotes modal (even if empty) with "Create New Quote" option
        console.log('Showing existing quotes modal');
        setShowExistingQuotesModal(true);
      } else {
        console.log('Quotes search failed, showing modal without existing quotes');
        setExistingQuotesForEmail([]);
        // Still show the modal even if the API failed
        setShowExistingQuotesModal(true);
      }
    } catch (error) {
      console.error('Error fetching existing quotes:', error);
      setExistingQuotesForEmail([]);
      // Still show the modal even if there's an error
      setShowExistingQuotesModal(true);
    }
  };

  // Function to populate form and proceed to client details
  const proceedToClientDetails = (contact: any) => {
    console.log('proceedToClientDetails called with contact:', contact);
    
    // Pre-populate form with contact data
    form.setValue('contactEmail', contact.properties.email || '');
    
    // Auto-lock fields that have data and set values
    if (contact.properties.company) {
      form.setValue('companyName', contact.properties.company);
      form.setValue('companyNameLocked', true);
    }
    
    if (contact.properties.firstname) {
      form.setValue('contactFirstName', contact.properties.firstname);
      form.setValue('contactFirstNameLocked', true);
    }
    
    if (contact.properties.lastname) {
      form.setValue('contactLastName', contact.properties.lastname);
      form.setValue('contactLastNameLocked', true);
    }
    
    // Map HubSpot company properties (industry, monthly revenue range, entity type)
    // These come from the associated company, not the contact
    if (contact.properties.industry) {
      form.setValue('industry', contact.properties.industry);
      form.setValue('industryLocked', true);
    }
    
    // Map HubSpot monthly_revenue_range (company property)
    if (contact.properties.monthly_revenue_range) {
      form.setValue('monthlyRevenueRange', contact.properties.monthly_revenue_range);
    }
    
    // Map HubSpot entity_type (company property)
    if (contact.properties.entity_type) {
      form.setValue('entityType', contact.properties.entity_type);
    }
    
    // Address fields - only lock if there's actual address data from HubSpot
    // Set address fields from HubSpot data
    form.setValue('clientStreetAddress', contact.properties.address || '');
    form.setValue('clientCity', contact.properties.city || '');
    form.setValue('clientState', contact.properties.state || '');
    form.setValue('clientZipCode', contact.properties.zip || '');
    
    // Only lock address if ALL required address fields are filled
    const hasCompleteAddressData = contact.properties.address && contact.properties.city && contact.properties.state && contact.properties.zip;
    form.setValue('companyAddressLocked', hasCompleteAddressData ? true : false);

    // Hide the existing quotes modal and show client details
    setShowExistingQuotesModal(false);
    
    // Auto-set verification status to verified since contact is from HubSpot
    setHubspotVerificationStatus('verified');
    setHubspotContact(contact);

    setShowClientDetails(true);
  };

  // Push to HubSpot mutation
  const pushToHubSpotMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      console.log('🚀 pushToHubSpotMutation called with quoteId:', quoteId);
      try {
        const result = await apiRequest("/api/hubspot/push-quote", {
          method: "POST",
          body: JSON.stringify({ quoteId })
        });
        
        console.log('🚀 HubSpot API success response:', result);
        return { ...result, quoteId }; // Include the original quoteId in the response
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
      // Set editingQuoteId so subsequent changes can update the HubSpot quote
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

  // Update HubSpot quote mutation
  const updateHubSpotMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const currentFormData = form.getValues();
      
      // Ensure calculated fees are included in form data
      const enhancedFormData = {
        ...currentFormData,
        monthlyFee: feeCalculation.combined.monthlyFee.toString(),
        setupFee: feeCalculation.combined.setupFee.toString(),
        taasMonthlyFee: feeCalculation.taas.monthlyFee.toString(),
        taasPriorYearsFee: feeCalculation.taas.setupFee.toString()
      };
      
      const result = await apiRequest("/api/hubspot/update-quote", {
        method: "POST",
        body: JSON.stringify({
          quoteId, 
          currentFormData: enhancedFormData 
        })
      });
      return result;
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

  // Helper functions for navigation (defined after feeCalculation)
  const getActiveServices = () => {
    const services: ('bookkeeping' | 'taas')[] = [];
    if (feeCalculation.includesBookkeeping) services.push('bookkeeping');
    if (feeCalculation.includesTaas) services.push('taas');
    return services;
  };

  // Determine what form to show based on active services
  const getFormViewToShow = () => {
    const activeServices = getActiveServices();
    if (activeServices.length === 0) return 'placeholder';
    if (currentFormView === 'placeholder' || !activeServices.includes(currentFormView)) {
      return activeServices[0]; // Show first active service
    }
    return currentFormView;
  };

  const actualFormView = getFormViewToShow();

  const canNavigateLeft = () => {
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(actualFormView);
    return currentIndex > 0;
  };
  
  const canNavigateRight = () => {
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(actualFormView);
    return currentIndex < activeServices.length - 1;
  };
  
  const navigateLeft = () => {
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(actualFormView);
    if (currentIndex > 0) {
      setCurrentFormView(activeServices[currentIndex - 1]);
    }
  };
  
  const navigateRight = () => {
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(actualFormView);
    if (currentIndex < activeServices.length - 1) {
      setCurrentFormView(activeServices[currentIndex + 1]);
    }
  };
  


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
    
    // Reset form with quote data and auto-lock populated fields
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
      contactFirstName: quote.contactFirstName || "",
      contactLastName: quote.contactLastName || "",
      monthlyRevenueRange: quote.monthlyRevenueRange || "",
      entityType: quote.entityType || "LLC",
      clientStreetAddress: quote.clientStreetAddress || "",
      clientCity: quote.clientCity || "",
      clientState: quote.clientState || "",
      clientZipCode: quote.clientZipCode || "",
      // Auto-lock fields that have data
      companyNameLocked: !!(quote.companyName),
      contactFirstNameLocked: !!(quote.contactFirstName),
      contactLastNameLocked: !!(quote.contactLastName),
      industryLocked: !!(quote.industry),
      companyAddressLocked: !!(quote.clientStreetAddress || quote.clientCity || quote.clientState || quote.clientZipCode),
      // Quote type and service flags
      quoteType: quote.quoteType || "bookkeeping",
      includesBookkeeping: quote.includesBookkeeping ?? true,
      includesTaas: quote.includesTaas ?? false,
      serviceBookkeeping: quote.includesBookkeeping ?? true,
      serviceTaas: quote.includesTaas ?? false,
      // TaaS-specific fields (ensure proper type conversion)
      numEntities: quote.numEntities ? Number(quote.numEntities) : 1,
      statesFiled: quote.statesFiled ? Number(quote.statesFiled) : 1,
      internationalFiling: quote.internationalFiling ?? false,
      numBusinessOwners: quote.numBusinessOwners ? Number(quote.numBusinessOwners) : 1,
      bookkeepingQuality: quote.bookkeepingQuality || "Clean (Seed)",
      include1040s: quote.include1040s ?? false,
      priorYearsUnfiled: quote.priorYearsUnfiled ? Number(quote.priorYearsUnfiled) : 0,
      alreadyOnSeedBookkeeping: quote.alreadyOnSeedBookkeeping ?? false,
    };
    
    console.log('Loading quote into form:', quote.id);
    
    form.reset(formData);
    
    // Force trigger and individual field updates to ensure all form fields update properly
    setTimeout(() => {
      // Force update individual TaaS fields to ensure Select components render correctly
      if (quote.entityType) form.setValue('entityType', quote.entityType);
      if (quote.numEntities) form.setValue('numEntities', Number(quote.numEntities));
      if (quote.statesFiled) form.setValue('statesFiled', Number(quote.statesFiled));
      if (quote.numBusinessOwners) form.setValue('numBusinessOwners', Number(quote.numBusinessOwners));
      if (quote.priorYearsUnfiled !== undefined) form.setValue('priorYearsUnfiled', Number(quote.priorYearsUnfiled));
      if (quote.bookkeepingQuality) form.setValue('bookkeepingQuality', quote.bookkeepingQuality);
      
      form.trigger();
    }, 100);
    
    // Reset HubSpot verification state and re-verify if email exists
    setHubspotVerificationStatus('idle');
    setHubspotContact(null);
    setLastVerifiedEmail('');
    
    // Re-verify the email if it exists
    if (quote.contactEmail) {
      debouncedVerifyEmail(quote.contactEmail);
    }
    
    // Set the appropriate form view based on the quote's services (delayed to ensure form reset completes)
    setTimeout(() => {
      if (quote.includesBookkeeping && quote.includesTaas) {
        // Combined quote - default to bookkeeping view
        setCurrentFormView('bookkeeping');
      } else if (quote.includesTaas) {
        // TaaS only
        setCurrentFormView('taas');
      } else {
        // Bookkeeping only (default)
        setCurrentFormView('bookkeeping');
      }
    }, 150);
    
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
      customSetupFee: "",
      companyName: "",
      // New 5-service system
      serviceBookkeeping: false,
      serviceTaas: false,
      servicePayroll: false,
      serviceApArLite: false,
      serviceFpaLite: false,
      // Client address fields
      clientStreetAddress: "",
      clientCity: "",
      clientState: "",
      clientZipCode: "",
      clientCountry: "US",
      // Company name lock status
      companyNameLocked: true,
      // Additional client detail fields with lock status
      contactFirstName: "",
      contactFirstNameLocked: true,
      contactLastName: "",
      contactLastNameLocked: true,
      industryLocked: true,
      companyAddressLocked: false,
      monthlyRevenueRange: "",
      quoteType: "bookkeeping",
      // Service flags for combined quotes
      includesBookkeeping: true,
      includesTaas: false,
      // TaaS defaults
      entityType: "LLC",
      numEntities: 1,
      statesFiled: 1,
      internationalFiling: false,
      numBusinessOwners: 1,
      bookkeepingQuality: "Clean (Seed)",
      include1040s: false,
      priorYearsUnfiled: 0,
      alreadyOnSeedBookkeeping: false,
    });
    
    // Reset all HubSpot verification state
    setHubspotVerificationStatus('idle');
    setHubspotContact(null);
    setLastVerifiedEmail('');
    setIsApproved(false);
    setHasRequestedApproval(false);
    setCustomSetupFee("");
    
    // Reset existing quotes state
    setExistingQuotesForEmail([]);
    setShowExistingQuotesNotification(false);
    
    // Clear search term to show all quotes again
    setSearchTerm("");
    
    // Reset form view to default (bookkeeping)
    setCurrentFormView('bookkeeping');
    
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
      
      // Include custom setup fee if "Other" reason is selected
      const setupFee = formData.overrideReason === "Other" && formData.customSetupFee 
        ? parseFloat(formData.customSetupFee) 
        : fees.setupFee;
      
      const result = await apiRequest("/api/approval/request", {
        method: "POST",
        body: JSON.stringify({
          contactEmail: formData.contactEmail,
          quoteData: {
            contactEmail: formData.contactEmail,
            monthlyRevenueRange: formData.monthlyRevenueRange,
            monthlyTransactions: formData.monthlyTransactions,
            industry: formData.industry,
            cleanupMonths: formData.cleanupMonths,
            requestedCleanupMonths: formData.cleanupMonths, // Add requested months
            overrideReason: formData.overrideReason || "",
            customOverrideReason: formData.customOverrideReason || "",
            customSetupFee: formData.customSetupFee || "",
            monthlyFee: fees.monthlyFee,
            setupFee: setupFee,
            originalCleanupMonths: currentMonth // Include original minimum
          }
        })
      });
      
      if (result) {
        setHasRequestedApproval(true);
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
      const result = await apiRequest("/api/approval/validate", {
        method: "POST",
        body: JSON.stringify({
          code: approvalCode,
          contactEmail: form.getValues().contactEmail
        })
      });
      
      if (result.valid) {
        // Lock all fields permanently after approval
        setIsApproved(true);
        setFieldsLocked(true);
        setIsApprovalDialogOpen(false);
        setApprovalCode("");
        toast({
          title: "Approval Granted",
          description: "Setup fee fields are now locked. Use the unlock button to make changes.",
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

  // Handle unlocking fields with confirmation
  const handleUnlockFields = () => {
    setUnlockConfirmDialog(true);
  };

  const confirmUnlockFields = () => {
    setFieldsLocked(false);
    setIsApproved(false);
    setHasRequestedApproval(false);
    setUnlockConfirmDialog(false);
    toast({
      title: "Fields Unlocked",
      description: "You can now make changes, but will need a new approval code before saving.",
      variant: "destructive",
    });
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
    
    // Check if override is used but not approved
    if (data.cleanupOverride && !isApproved) {
      toast({
        title: "Approval Required",
        description: "You must get approval before saving quotes with cleanup overrides.",
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
        <UniversalNavbar 
          showBackButton={true} 
          backButtonText="Back to Portal" 
          backButtonPath="/" 
        />

        {/* Email Trigger Section - Standalone starter */}
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
                      // Trigger live search after 3+ characters
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
                      // Delay hiding results to allow for click
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
                      // Create new contact flow
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

        {/* Client Details Section - Show after contact selection or email trigger */}
        {showClientDetails && (
          <Card className="max-w-6xl mx-auto mb-8 bg-white/95 backdrop-blur-sm shadow-xl border-0">
            <Form {...form}>
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
                  {/* Contact Email - Top Right Display */}
                  <div className="text-right">
                    <label className="text-gray-700 font-medium text-sm">Contact Email</label>
                    <div className="flex items-center gap-2 mt-1 p-2 bg-gray-50 border border-gray-200 rounded-md">
                      <span className="text-gray-900 font-medium text-sm">{form.watch('contactEmail')}</span>
                      {hubspotVerificationStatus === 'verified' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    {hubspotVerificationStatus === 'verified' && (
                      <p className="text-xs text-green-600 mt-1">✓ Verified in HubSpot</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-6">
                {/* Row 1: Company Name, First Name, Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Company Name with lock/unlock */}
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <label className="text-gray-700 font-medium text-sm block mb-2">Company Name</label>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Acme Corporation"
                              className={`${form.watch('companyNameLocked') ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'} border-gray-300 focus:ring-blue-500 focus:border-blue-500 flex-1`}
                              readOnly={form.watch('companyNameLocked')}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newValue = !form.watch('companyNameLocked');
                                form.setValue('companyNameLocked', newValue);
                                if (!newValue) {
                                  setTimeout(() => {
                                    const input = document.querySelector('input[name="companyName"]') as HTMLInputElement;
                                    input?.focus();
                                  }, 100);
                                }
                              }}
                              className="px-3 border-gray-300 hover:bg-gray-50"
                            >
                              {form.watch('companyNameLocked') ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                        {hubspotVerificationStatus === 'verified' && hubspotContact?.properties.company && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Found in HubSpot: {hubspotContact.properties.company}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  {/* Contact First Name */}
                  <FormField
                    control={form.control}
                    name="contactFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <label className="text-gray-700 font-medium text-sm block mb-2">First Name</label>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="John"
                              className={`${form.watch('contactFirstNameLocked') ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'} border-gray-300 focus:ring-blue-500 focus:border-blue-500 flex-1`}
                              readOnly={form.watch('contactFirstNameLocked')}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newValue = !form.watch('contactFirstNameLocked');
                                form.setValue('contactFirstNameLocked', newValue);
                              }}
                              className="px-3 border-gray-300 hover:bg-gray-50"
                            >
                              {form.watch('contactFirstNameLocked') ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Contact Last Name */}
                  <FormField
                    control={form.control}
                    name="contactLastName"
                    render={({ field }) => (
                      <FormItem>
                        <label className="text-gray-700 font-medium text-sm block mb-2">Last Name</label>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Smith"
                              className={`${form.watch('contactLastNameLocked') ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'} border-gray-300 focus:ring-blue-500 focus:border-blue-500 flex-1`}
                              readOnly={form.watch('contactLastNameLocked')}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newValue = !form.watch('contactLastNameLocked');
                                form.setValue('contactLastNameLocked', newValue);
                              }}
                              className="px-3 border-gray-300 hover:bg-gray-50"
                            >
                              {form.watch('contactLastNameLocked') ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row 2: Industry, Monthly Revenue Range, Entity Type */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Industry */}
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <label className="text-gray-700 font-medium text-sm block mb-2">Industry <span className="text-red-500">*</span></label>
                        <FormControl>
                          <div className="flex gap-2">
                            <Select onValueChange={field.onChange} value={field.value} disabled={form.watch('industryLocked')}>
                              <SelectTrigger className={`${form.watch('industryLocked') ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'} border-gray-300 focus:ring-blue-500 focus:border-blue-500 flex-1`}>
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Software/SaaS">Software/SaaS</SelectItem>
                                <SelectItem value="Professional Services">Professional Services</SelectItem>
                                <SelectItem value="Consulting">Consulting</SelectItem>
                                <SelectItem value="Healthcare/Medical">Healthcare/Medical</SelectItem>
                                <SelectItem value="Real Estate">Real Estate</SelectItem>
                                <SelectItem value="Property Management">Property Management</SelectItem>
                                <SelectItem value="E-commerce/Retail">E-commerce/Retail</SelectItem>
                                <SelectItem value="Restaurant/Food Service">Restaurant/Food Service</SelectItem>
                                <SelectItem value="Hospitality">Hospitality</SelectItem>
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
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newValue = !form.watch('industryLocked');
                                form.setValue('industryLocked', newValue);
                              }}
                              className="px-3 border-gray-300 hover:bg-gray-50"
                            >
                              {form.watch('industryLocked') ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Monthly Revenue Range */}
                  <FormField
                    control={form.control}
                    name="monthlyRevenueRange"
                    render={({ field }) => (
                      <FormItem>
                        <label className="text-gray-700 font-medium text-sm block mb-2">MONTHLY Revenue Range <span className="text-red-500">*</span></label>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500">
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

                  {/* Entity Type */}
                  <FormField
                    control={form.control}
                    name="entityType"
                    render={({ field }) => (
                      <FormItem>
                        <label className="text-gray-700 font-medium text-sm block mb-2">Entity Type <span className="text-red-500">*</span></label>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                              <SelectValue placeholder="Select entity type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="LLC">LLC</SelectItem>
                            <SelectItem value="C-Corp">C-Corp</SelectItem>
                            <SelectItem value="S-Corp">S-Corp</SelectItem>
                            <SelectItem value="Partnership">Partnership</SelectItem>
                            <SelectItem value="Non-Profit">Non-Profit</SelectItem>
                            <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row 3: Company Address - All fields on one line */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Building className="h-5 w-5 text-gray-600" />
                    <h3 className="text-md font-semibold text-gray-700">Company Address <span className="text-red-500">*</span></h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newValue = !form.watch('companyAddressLocked');
                        form.setValue('companyAddressLocked', newValue);
                      }}
                      className="px-3 border-gray-300 hover:bg-gray-50 ml-auto"
                    >
                      {form.watch('companyAddressLocked') ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="clientStreetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-sm text-gray-600 block mb-2">Street Address</label>
                          <FormControl>
                            <Input 
                              placeholder="123 Main Street"
                              className={`${form.watch('companyAddressLocked') ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'} border-gray-300 focus:ring-blue-500 focus:border-blue-500`}
                              readOnly={form.watch('companyAddressLocked')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="clientCity"
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-sm text-gray-600 block mb-2">City</label>
                          <FormControl>
                            <Input 
                              placeholder="Los Angeles"
                              className={`${form.watch('companyAddressLocked') ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'} border-gray-300 focus:ring-blue-500 focus:border-blue-500`}
                              readOnly={form.watch('companyAddressLocked')}
                              {...field}
                            />
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
                          <label className="text-sm text-gray-600 block mb-2">State</label>
                          <FormControl>
                            <Input 
                              placeholder="CA"
                              className={`${form.watch('companyAddressLocked') ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'} border-gray-300 focus:ring-blue-500 focus:border-blue-500`}
                              readOnly={form.watch('companyAddressLocked')}
                              {...field}
                            />
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
                          <label className="text-sm text-gray-600 block mb-2">Zip Code</label>
                          <FormControl>
                            <Input 
                              placeholder="90210"
                              className={`${form.watch('companyAddressLocked') ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'} border-gray-300 focus:ring-blue-500 focus:border-blue-500`}
                              readOnly={form.watch('companyAddressLocked')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                </div>
              </CardContent>
            </Form>
          </Card>
        )}

        {/* Enhanced 5-Service Card System */}
        {showClientDetails && (
        <>
        <div className="max-w-6xl mx-auto mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Select Services</h2>
            <p className="text-white/80">Choose the services you'd like to include in this quote</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Bookkeeping Service Card */}
            <Card 
              className={`
                cursor-pointer transition-all duration-300 hover:scale-105 border-2 shadow-lg
                ${form.watch('serviceBookkeeping')
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400 shadow-green-200' 
                  : 'bg-white/95 backdrop-blur-sm border-gray-200 hover:border-green-300 hover:shadow-xl'
                }
              `}
              onClick={() => {
                const newValue = !form.watch('serviceBookkeeping');
                form.setValue('serviceBookkeeping', newValue);
                form.trigger();
                
                // Update form view when service is selected
                if (newValue) {
                  setCurrentFormView('bookkeeping');
                } else {
                  // If deselecting and this was the current view, switch to another active service or placeholder
                  setTimeout(() => {
                    const activeServices = getActiveServices();
                    const remainingServices = activeServices.filter(s => s !== 'bookkeeping');
                    if (remainingServices.length > 0) {
                      setCurrentFormView(remainingServices[0]);
                    } else {
                      setCurrentFormView('placeholder');
                    }
                  }, 50); // Small delay to let form values update
                }
              }}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                  form.watch('serviceBookkeeping') ? 'bg-green-500 shadow-lg' : 'bg-gray-300'
                }`}>
                  {form.watch('serviceBookkeeping') ? 
                    <Check className="h-8 w-8 text-white" /> : 
                    <Calculator className="h-8 w-8 text-gray-500" />
                  }
                </div>
                <h4 className={`font-bold text-lg mb-2 ${
                  form.watch('serviceBookkeeping') ? 'text-green-800' : 'text-gray-700'
                }`}>
                  Bookkeeping
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Monthly books, cleanup & financial statements
                </p>
              </CardContent>
            </Card>

            {/* TaaS Service Card */}
            <Card 
              className={`
                cursor-pointer transition-all duration-300 hover:scale-105 border-2 shadow-lg
                ${form.watch('serviceTaas')
                  ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-400 shadow-blue-200' 
                  : 'bg-white/95 backdrop-blur-sm border-gray-200 hover:border-blue-300 hover:shadow-xl'
                }
              `}
              onClick={() => {
                const newValue = !form.watch('serviceTaas');
                form.setValue('serviceTaas', newValue);
                form.trigger();
                
                // Update form view when service is selected
                if (newValue) {
                  setCurrentFormView('taas');
                } else {
                  // If deselecting and this was the current view, switch to another active service or placeholder
                  setTimeout(() => {
                    const activeServices = getActiveServices();
                    const remainingServices = activeServices.filter(s => s !== 'taas');
                    if (remainingServices.length > 0) {
                      setCurrentFormView(remainingServices[0]);
                    } else {
                      setCurrentFormView('placeholder');
                    }
                  }, 50); // Small delay to let form values update
                }
              }}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                  form.watch('serviceTaas') ? 'bg-blue-500 shadow-lg' : 'bg-gray-300'
                }`}>
                  {form.watch('serviceTaas') ? 
                    <Check className="h-8 w-8 text-white" /> : 
                    <FileText className="h-8 w-8 text-gray-500" />
                  }
                </div>
                <h4 className={`font-bold text-lg mb-2 ${
                  form.watch('serviceTaas') ? 'text-blue-800' : 'text-gray-700'
                }`}>
                  TaaS
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Tax preparation, filing & planning services
                </p>
              </CardContent>
            </Card>

            {/* Payroll Service Card */}
            <Card 
              className={`
                cursor-pointer transition-all duration-300 hover:scale-105 border-2 shadow-lg
                ${form.watch('servicePayroll')
                  ? 'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-400 shadow-purple-200' 
                  : 'bg-white/95 backdrop-blur-sm border-gray-200 hover:border-purple-300 hover:shadow-xl'
                }
              `}
              onClick={() => {
                const newValue = !form.watch('servicePayroll');
                form.setValue('servicePayroll', newValue);
                form.trigger();
              }}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                  form.watch('servicePayroll') ? 'bg-purple-500 shadow-lg' : 'bg-gray-300'
                }`}>
                  {form.watch('servicePayroll') ? 
                    <Check className="h-8 w-8 text-white" /> : 
                    <User className="h-8 w-8 text-gray-500" />
                  }
                </div>
                <h4 className={`font-bold text-lg mb-2 ${
                  form.watch('servicePayroll') ? 'text-purple-800' : 'text-gray-700'
                }`}>
                  Payroll
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Employee payroll processing & tax filings
                </p>
              </CardContent>
            </Card>

            {/* AP/AR Lite Service Card */}
            <Card 
              className={`
                cursor-pointer transition-all duration-300 hover:scale-105 border-2 shadow-lg
                ${form.watch('serviceApArLite')
                  ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-400 shadow-orange-200' 
                  : 'bg-white/95 backdrop-blur-sm border-gray-200 hover:border-orange-300 hover:shadow-xl'
                }
              `}
              onClick={() => {
                const newValue = !form.watch('serviceApArLite');
                form.setValue('serviceApArLite', newValue);
                form.trigger();
              }}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                  form.watch('serviceApArLite') ? 'bg-orange-500 shadow-lg' : 'bg-gray-300'
                }`}>
                  {form.watch('serviceApArLite') ? 
                    <Check className="h-8 w-8 text-white" /> : 
                    <ArrowUpDown className="h-8 w-8 text-gray-500" />
                  }
                </div>
                <h4 className={`font-bold text-lg mb-2 ${
                  form.watch('serviceApArLite') ? 'text-orange-800' : 'text-gray-700'
                }`}>
                  AP/AR Lite
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Accounts payable & receivable management
                </p>
              </CardContent>
            </Card>

            {/* FP&A Lite Service Card */}
            <Card 
              className={`
                cursor-pointer transition-all duration-300 hover:scale-105 border-2 shadow-lg
                ${form.watch('serviceFpaLite')
                  ? 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-400 shadow-teal-200' 
                  : 'bg-white/95 backdrop-blur-sm border-gray-200 hover:border-teal-300 hover:shadow-xl'
                }
              `}
              onClick={() => {
                const newValue = !form.watch('serviceFpaLite');
                form.setValue('serviceFpaLite', newValue);
                form.trigger();
              }}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                  form.watch('serviceFpaLite') ? 'bg-teal-500 shadow-lg' : 'bg-gray-300'
                }`}>
                  {form.watch('serviceFpaLite') ? 
                    <Check className="h-8 w-8 text-white" /> : 
                    <Sparkles className="h-8 w-8 text-gray-500" />
                  }
                </div>
                <h4 className={`font-bold text-lg mb-2 ${
                  form.watch('serviceFpaLite') ? 'text-teal-800' : 'text-gray-700'
                }`}>
                  FP&A Lite
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Financial planning & analysis support
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quote builder section */}
        <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">
          <style>{`.quote-layout { display: flex; flex-direction: column; } @media (min-width: 1024px) { .quote-layout { flex-direction: row; } }`}</style>
          {/* Quote Builder Form Card */}
          <Card className="bg-gray-50 shadow-xl border-0 quote-card lg:flex-1" style={{ flex: '1', minWidth: 0 }}>
            <CardContent className="p-6 sm:p-8">
              {/* Modern Tab-Style Navigation - only show when multiple services are active */}
              {getActiveServices().length > 1 && (
                <div className="mb-6">
                  <div className="flex flex-col items-center gap-4">
                    {/* Tab Pills */}
                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                      {getActiveServices().map((service, index) => {
                        const isActive = actualFormView === service;
                        const serviceConfig = {
                          bookkeeping: { 
                            name: 'Bookkeeping', 
                            icon: Calculator, 
                            color: 'green',
                            bgClass: isActive ? 'bg-green-500 text-white shadow-md' : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                          },
                          taas: { 
                            name: 'TaaS', 
                            icon: FileText, 
                            color: 'blue',
                            bgClass: isActive ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                          },
                          payroll: { 
                            name: 'Payroll', 
                            icon: Users, 
                            color: 'purple',
                            bgClass: isActive ? 'bg-purple-500 text-white shadow-md' : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                          },
                          apArLite: { 
                            name: 'AP/AR Lite', 
                            icon: CreditCard, 
                            color: 'orange',
                            bgClass: isActive ? 'bg-orange-500 text-white shadow-md' : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                          },
                          fpaLite: { 
                            name: 'FP&A Lite', 
                            icon: Sparkles, 
                            color: 'teal',
                            bgClass: isActive ? 'bg-teal-500 text-white shadow-md' : 'text-gray-600 hover:text-teal-600 hover:bg-teal-50'
                          }
                        };
                        
                        const config = serviceConfig[service as keyof typeof serviceConfig];
                        const IconComponent = config.icon;
                        
                        return (
                          <button
                            key={service}
                            type="button"
                            onClick={() => setCurrentFormView(service as any)}
                            className={`
                              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium 
                              transition-all duration-200 ease-in-out
                              ${config.bgClass}
                            `}
                          >
                            <IconComponent className="h-4 w-4" />
                            {config.name}
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Progress Dots */}
                    <div className="flex items-center gap-2">
                      {getActiveServices().map((service, index) => (
                        <div
                          key={service}
                          className={`
                            w-2 h-2 rounded-full transition-all duration-200
                            ${actualFormView === service 
                              ? 'bg-gray-800 scale-125' 
                              : 'bg-gray-300 hover:bg-gray-400 cursor-pointer'
                            }
                          `}
                          onClick={() => setCurrentFormView(service as any)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                    actualFormView === 'bookkeeping' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                    actualFormView === 'taas' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                    'bg-gradient-to-r from-[#e24c00] to-[#ff6b35]'
                  }`}>
                    {actualFormView === 'bookkeeping' ? <Calculator className="h-5 w-5 text-white" /> : 
                     actualFormView === 'taas' ? <FileText className="h-5 w-5 text-white" /> :
                     <HelpCircle className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {actualFormView === 'bookkeeping' ? 'Bookkeeping' : 
                       actualFormView === 'taas' ? 'Tax as a Service (TaaS)' :
                       'Service Selection'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {actualFormView === 'bookkeeping' ? 'Configure your bookkeeping pricing' : 
                       actualFormView === 'taas' ? 'Configure your tax preparation requirements' :
                       'Choose a service to begin quote configuration'}
                    </p>
                  </div>
                </div>
                

              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                  {/* Placeholder Card - Show when no services are selected */}
                  {actualFormView === 'placeholder' && (
                    <div className="text-center py-16 space-y-6">
                      <div className="relative">
                        <div className="w-32 h-32 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center opacity-60 blur-sm">
                          <Calculator className="h-16 w-16 text-gray-400" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 shadow-lg border-2 border-dashed border-gray-300">
                            <div className="text-gray-600 font-medium">Select a service to begin</div>
                            <div className="text-sm text-gray-500 mt-1">Choose from the service cards above</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-gray-600">Ready to Create Your Quote?</p>
                        <p className="text-sm text-gray-500 max-w-md mx-auto">
                          Select one or more services from the cards above to start configuring your personalized quote
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Bookkeeping Service Details Section */}
                  {actualFormView === 'bookkeeping' && (
                    <div className="animate-in slide-in-from-right-3 duration-300">
                      <div className="space-y-6 border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-800">Bookkeeping Service Details</h3>
                    
                      {/* Monthly Transactions */}
                      <FormField
                        control={form.control}
                        name="monthlyTransactions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Transactions <span className="text-red-500">*</span></FormLabel>
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
                            <FormLabel>Cleanup Complexity <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                                  <SelectValue placeholder="Select complexity" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0.25">Clean and Current</SelectItem>
                                <SelectItem value="0.5">Standard</SelectItem>
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
                                min={form.watch("cleanupOverride") ? "0" : currentMonth.toString()}
                                max="120"
                                placeholder={currentMonth.toString()}
                                className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                                disabled={fieldsLocked}
                                {...field}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  
                                  if (isNaN(value)) {
                                    field.onChange(form.watch("cleanupOverride") ? 0 : currentMonth);
                                  } else {
                                    const minValue = form.watch("cleanupOverride") ? 0 : currentMonth;
                                    const newValue = Math.max(minValue, value);
                                    field.onChange(newValue);
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
                                  disabled={isApproved} // Permanently lock checkbox after approval
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (!checked) {
                                      // Reset when unchecking (only if not approved)
                                      form.setValue("cleanupMonths", originalCleanupMonths);
                                      form.setValue("overrideReason", "");
                                      form.setValue("customOverrideReason", "");
                                      form.setValue("customSetupFee", "");
                                      setCustomSetupFee("");
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
                            
                            {/* Request Approval / Enter Code Button */}
                            {form.watch("cleanupOverride") && !isApproved && (
                              <div className="ml-4">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={hasRequestedApproval ? () => setIsApprovalDialogOpen(true) : requestApproval}
                                  disabled={isApprovalButtonDisabled(form.getValues(), isRequestingApproval, hasRequestedApproval)}
                                  className="relative"
                                  title={getApprovalButtonDisabledReason(form.getValues(), isRequestingApproval, hasRequestedApproval) || ""}
                                >
                                  {isRequestingApproval ? "Requesting..." : hasRequestedApproval ? "Enter Code" : "Request Approval"}
                                  {isApprovalButtonDisabled(form.getValues(), isRequestingApproval, hasRequestedApproval) && (
                                    <HelpCircle className="h-3 w-3 ml-1 text-gray-400" />
                                  )}
                                </Button>
                              </div>
                            )}
                            
                            {/* Approval Status */}
                            {form.watch("cleanupOverride") && isApproved && (
                              <div className="text-sm text-green-600 font-medium ml-4">
                                ✓ Approved
                              </div>
                            )}
                            
                            {/* Unlock Button */}
                            {fieldsLocked && (
                              <div className="ml-4">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={handleUnlockFields}
                                  className="text-amber-600 border-amber-600 hover:bg-amber-50"
                                >
                                  🔓 Unlock Fields
                                </Button>
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
                              <Select onValueChange={field.onChange} value={field.value} disabled={fieldsLocked}>
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
                        <>
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
                                    disabled={fieldsLocked}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                      
                          {/* Custom Setup Fee when "Other" is selected */}
                          <FormField
                            control={form.control}
                            name="customSetupFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Custom Setup Fee</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="1"
                                      placeholder="2000"
                                      className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent pl-8"
                                      {...field}
                                      onChange={(e) => {
                                        const inputValue = e.target.value;
                                        
                                        // Handle empty input
                                        if (inputValue === "") {
                                          field.onChange("");
                                          setCustomSetupFee("");
                                          return;
                                        }
                                        
                                        // Ensure whole numbers only
                                        const value = Math.floor(parseFloat(inputValue) || 0).toString();
                                        field.onChange(value);
                                        setCustomSetupFee(value);
                                      }}
                                      disabled={fieldsLocked}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      {/* QBO Subscription Checkbox */}
                      <FormField
                        control={form.control}
                        name="qboSubscription"
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
                              <FormLabel>Add QBO Subscription?</FormLabel>
                              <p className="text-sm text-gray-500">
                                Adds $80/month to the bookkeeping monthly fee
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />

                      {/* Additional Information Section */}
                      <div className="border-t pt-6 space-y-6">
                        <h4 className="text-md font-medium text-gray-700">Additional Information</h4>
                        
                        {/* Accounting Basis */}
                        <FormField
                          control={form.control}
                          name="accountingBasis"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Accounting Basis <span className="text-red-500">*</span></FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                                    <SelectValue placeholder="Select accounting basis" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Cash">Cash</SelectItem>
                                  <SelectItem value="Accrual">Accrual</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Business Loans */}
                        <FormField
                          control={form.control}
                          name="businessLoans"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value || false}
                                  onCheckedChange={field.onChange}
                                  className="border-gray-300 data-[state=checked]:bg-[#e24c00] data-[state=checked]:border-[#e24c00]"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">
                                  Business Loans?
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  Check if the business has any loans
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      </div>
                    </div>
                  )}

                  {/* TaaS-specific Fields - Only show when actualFormView is 'taas' */}
                  {actualFormView === 'taas' && (
                    <div className="animate-in slide-in-from-left-3 duration-300">
                      <div className="space-y-6 border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-800">Tax Service Details</h3>
                      


                      {/* Number of Entities */}
                      <FormField
                        control={form.control}
                        name="numEntities"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Entities</FormLabel>
                            <Select onValueChange={(value) => {
                              const numValue = parseInt(value);
                              field.onChange(numValue);
                              // Clear custom value when selecting from dropdown
                              if (numValue !== 999) {
                                form.setValue('customNumEntities', undefined);
                              }
                            }} value={field.value?.toString() || ""}>
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
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="999">More</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Custom Number of Entities - Show when "More" is selected */}
                      {form.watch("numEntities") === 999 && (
                        <FormField
                          control={form.control}
                          name="customNumEntities"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Enter exact number of entities (6 or more)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="6"
                                  placeholder="Enter number of entities"
                                  className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    field.onChange(isNaN(value) ? undefined : value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* States Filed */}
                      <FormField
                        control={form.control}
                        name="statesFiled"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>States Filed</FormLabel>
                            <Select onValueChange={(value) => {
                              const numValue = parseInt(value);
                              field.onChange(numValue);
                              // Clear custom value when selecting from dropdown
                              if (numValue !== 999) {
                                form.setValue('customStatesFiled', undefined);
                              }
                            }} value={field.value?.toString() || ""}>
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
                                <SelectItem value="6">6</SelectItem>
                                <SelectItem value="999">More</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Custom States Filed - Show when "More" is selected */}
                      {form.watch("statesFiled") === 999 && (
                        <FormField
                          control={form.control}
                          name="customStatesFiled"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Enter exact number of states (7-50)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="7"
                                  max="50"
                                  placeholder="Enter number of states"
                                  className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    field.onChange(isNaN(value) ? undefined : value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

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
                            <Select onValueChange={(value) => {
                              const numValue = parseInt(value);
                              field.onChange(numValue);
                              // Clear custom value when selecting from dropdown
                              if (numValue !== 999) {
                                form.setValue('customNumBusinessOwners', undefined);
                              }
                            }} value={field.value?.toString() || ""}>
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
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="999">More</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Custom Number of Business Owners - Show when "More" is selected */}
                      {form.watch("numBusinessOwners") === 999 && (
                        <FormField
                          control={form.control}
                          name="customNumBusinessOwners"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Enter exact number of business owners (6 or more)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="6"
                                  placeholder="Enter number of business owners"
                                  className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    field.onChange(isNaN(value) ? undefined : value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

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
                            <FormLabel>Bookkeeping Quality <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                                  <SelectValue placeholder="Select bookkeeping quality" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Outside CPA">Outside CPA</SelectItem>
                                <SelectItem value="Self-Managed">Self-Managed</SelectItem>
                                <SelectItem value="Not Done / Behind">Not Done / Behind</SelectItem>
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
                                onCheckedChange={(checked) => {
                                  // Only allow checking if bookkeeping is active
                                  if (feeCalculation.includesBookkeeping || !checked) {
                                    field.onChange(checked);
                                  }
                                }}
                                disabled={!feeCalculation.includesBookkeeping}
                                className="data-[state=checked]:bg-[#e24c00] data-[state=checked]:border-[#e24c00] disabled:opacity-50"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className={!feeCalculation.includesBookkeeping ? "text-gray-400" : ""}>
                                Seed Bookkeeping Package
                              </FormLabel>
                              <p className={`text-sm ${!feeCalculation.includesBookkeeping ? "text-gray-300" : "text-gray-500"}`}>
                                {!feeCalculation.includesBookkeeping 
                                  ? "Only available when bookkeeping service is selected"
                                  : "Check if client is interested in or already using Seed Bookkeeping services (provides 50% discount)"
                                }
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                      </div>
                    </div>
                  )}
                  
                  {/* Note: Quotes are generated automatically when required fields are completed */}
                </form>
              </Form>
            </CardContent>
          </Card>
          {/* Pricing Summary Card */}
          <Card className="bg-white shadow-xl border-0 quote-card lg:flex-1" style={{ flex: '1', minWidth: 0 }}>
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-[#e24c00] to-[#ff6b35] rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Pricing Summary
                  </h2>
                  <p className="text-sm text-gray-500">Your calculated quote breakdown</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Combined Total Card */}
                {(feeCalculation.includesBookkeeping && feeCalculation.includesTaas) && (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                          <Calculator className="h-4 w-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-purple-800">Combined Total</h4>
                      </div>

                    </div>
                    <div className="text-3xl font-bold text-purple-800 mb-2">
                      ${feeCalculation.combined.monthlyFee.toLocaleString()} / mo
                    </div>
                    <div className="text-xl font-semibold text-purple-700 mb-2">
                      ${feeCalculation.combined.setupFee.toLocaleString()} total setup
                    </div>
                    <p className="text-sm text-purple-600">
                      Complete bookkeeping and tax services package
                    </p>
                  </div>
                )}

                {/* Single Service Total */}
                {(feeCalculation.includesBookkeeping && !feeCalculation.includesTaas) && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-green-800">Bookkeeping Package Total</h4>

                    </div>
                    <div className="text-2xl font-bold text-green-800 mb-1">
                      ${feeCalculation.bookkeeping.monthlyFee.toLocaleString()} / mo
                    </div>
                    <div className="text-lg font-semibold text-green-700 mb-2">
                      ${feeCalculation.bookkeeping.setupFee.toLocaleString()} setup fee
                    </div>
                    <p className="text-sm text-green-600">
                      Monthly bookkeeping, cleanup, and financial management
                    </p>
                  </div>
                )}

                {(!feeCalculation.includesBookkeeping && feeCalculation.includesTaas) && (
                  <div className="bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-blue-800">TaaS Package Total</h4>

                    </div>
                    <div className="text-3xl font-bold text-blue-800 mb-2">
                      ${feeCalculation.taas.monthlyFee.toLocaleString()} / mo
                    </div>
                    <div className="text-xl font-semibold text-blue-700">
                      ${feeCalculation.taas.setupFee.toLocaleString()} prior years fee
                    </div>
                  </div>
                )}

                {/* No Services Selected */}
                {(!feeCalculation.includesBookkeeping && !feeCalculation.includesTaas) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                    <div className="text-gray-500 mb-2">
                      <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    </div>
                    <h4 className="font-semibold text-gray-600 mb-1">No Services Selected</h4>
                    <p className="text-sm text-gray-500">Click on the service cards above to start building your quote</p>
                  </div>
                )}

                {/* Calculation Breakdown */}
                {isCalculated && (feeCalculation.includesBookkeeping || feeCalculation.includesTaas) && (
                  <div className="border-t pt-6">
                    <button
                      type="button"
                      onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
                      className="flex items-center gap-2 mb-4 w-full text-left hover:bg-gray-50 p-2 rounded-md transition-colors"
                    >
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <h3 className="text-lg font-bold text-gray-800 flex-1">
                        Calculation Breakdown
                      </h3>
                      <div className={`transition-transform duration-200 ${isBreakdownExpanded ? 'rotate-180' : ''}`}>
                        <ArrowUpDown className="h-4 w-4 text-gray-500" />
                      </div>
                    </button>
                    
                    {isBreakdownExpanded && (
                      <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {feeCalculation.includesBookkeeping && (
                          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 shadow-sm">
                            <div className="font-semibold text-green-800 mb-3 text-lg border-b border-green-200 pb-2">📊 Bookkeeping Service</div>
                            <div className="space-y-2 text-sm">
                              <div className="space-y-1">
                                <div className="flex justify-between font-medium">
                                  <span className="text-green-700">Monthly Fee:</span>
                                  <span className="text-green-800">${feeCalculation.bookkeeping.monthlyFee.toLocaleString()}</span>
                                </div>
                                {feeCalculation.bookkeeping.breakdown && (
                                  <>
                                    <div className="flex justify-between pl-4 text-xs text-green-600">
                                      <span>Base Fee:</span>
                                      <span>${feeCalculation.bookkeeping.breakdown.baseFee.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between pl-4 text-xs text-green-600">
                                      <span>Revenue Multiplier ({feeCalculation.bookkeeping.breakdown.revenueMultiplier.toFixed(1)}x):</span>
                                      <span>${feeCalculation.bookkeeping.breakdown.afterRevenue.toLocaleString()}</span>
                                    </div>
                                    {feeCalculation.bookkeeping.breakdown.txFee > 0 && (
                                      <div className="flex justify-between pl-4 text-xs text-green-600">
                                        <span>Transaction Surcharge:</span>
                                        <span>+${feeCalculation.bookkeeping.breakdown.txFee.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {feeCalculation.bookkeeping.breakdown.industryMultiplier !== 1 && (
                                      <div className="flex justify-between pl-4 text-xs text-green-600">
                                        <span>Industry Multiplier ({feeCalculation.bookkeeping.breakdown.industryMultiplier.toFixed(1)}x):</span>
                                        <span>${feeCalculation.bookkeeping.breakdown.finalMonthly.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {form.watch('qboSubscription') && (
                                      <div className="flex justify-between pl-4 text-xs text-green-600">
                                        <span>QBO Subscription:</span>
                                        <span>+$80</span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                              {feeCalculation.bookkeeping.setupFee > 0 && (
                                <div className="border-t border-green-200 pt-2">
                                  <div className="flex justify-between font-medium">
                                    <span className="text-green-700">Setup/Cleanup Fee:</span>
                                    <span className="text-green-800">${feeCalculation.bookkeeping.setupFee.toLocaleString()}</span>
                                  </div>
                                  {feeCalculation.bookkeeping.breakdown && feeCalculation.bookkeeping.setupFee > 0 && (
                                    <div className="space-y-1">
                                      <div className="flex justify-between pl-4 text-xs text-green-600">
                                        <span>Setup Base (Monthly Fee):</span>
                                        <span>${feeCalculation.bookkeeping.breakdown.finalMonthly.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between pl-4 text-xs text-green-600">
                                        <span>× Complexity ({feeCalculation.bookkeeping.breakdown.cleanupComplexity.toFixed(0)}%):</span>
                                        <span>${Math.round(feeCalculation.bookkeeping.breakdown.finalMonthly * (feeCalculation.bookkeeping.breakdown.cleanupComplexity / 100)).toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between pl-4 text-xs text-green-600">
                                        <span>× {feeCalculation.bookkeeping.breakdown.cleanupMonths} months:</span>
                                        <span>${feeCalculation.bookkeeping.breakdown.setupCalc.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between pl-4 text-xs text-green-600 font-medium border-t border-green-300 pt-1">
                                        <span>Final (Max of calculated vs monthly):</span>
                                        <span>${feeCalculation.bookkeeping.setupFee.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {feeCalculation.includesTaas && (
                          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
                            <div className="font-semibold text-blue-800 mb-3 text-lg border-b border-blue-200 pb-2">📋 Tax as a Service (TaaS)</div>
                            <div className="space-y-2 text-sm">
                              <div className="space-y-1">
                                <div className="flex justify-between font-medium">
                                  <span className="text-blue-700">Monthly Fee:</span>
                                  <span className="text-blue-800">${feeCalculation.taas.monthlyFee.toLocaleString()}</span>
                                </div>
                                {feeCalculation.taas.breakdown && (
                                  <>
                                    <div className="flex justify-between pl-4 text-xs text-blue-600">
                                      <span>Base Fee:</span>
                                      <span>${feeCalculation.taas.breakdown.base.toLocaleString()}</span>
                                    </div>
                                    {feeCalculation.taas.breakdown.entityUpcharge > 0 && (
                                      <div className="flex justify-between pl-4 text-xs text-blue-600">
                                        <span>Entity Upcharge ({(form.watch('customNumEntities') || form.watch('numEntities'))} entities):</span>
                                        <span>+${feeCalculation.taas.breakdown.entityUpcharge.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {feeCalculation.taas.breakdown.stateUpcharge > 0 && (
                                      <div className="flex justify-between pl-4 text-xs text-blue-600">
                                        <span>State Upcharge ({(form.watch('customStatesFiled') || form.watch('statesFiled'))} states):</span>
                                        <span>+${feeCalculation.taas.breakdown.stateUpcharge.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {feeCalculation.taas.breakdown.intlUpcharge > 0 && (
                                      <div className="flex justify-between pl-4 text-xs text-blue-600">
                                        <span>International Filing:</span>
                                        <span>+${feeCalculation.taas.breakdown.intlUpcharge.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {feeCalculation.taas.breakdown.ownerUpcharge > 0 && (
                                      <div className="flex justify-between pl-4 text-xs text-blue-600">
                                        <span>Owner Upcharge ({(form.watch('customNumBusinessOwners') || form.watch('numBusinessOwners'))} owners):</span>
                                        <span>+${feeCalculation.taas.breakdown.ownerUpcharge.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {feeCalculation.taas.breakdown.bookUpcharge > 0 && (
                                      <div className="flex justify-between pl-4 text-xs text-blue-600">
                                        <span>Bookkeeping Quality:</span>
                                        <span>+${feeCalculation.taas.breakdown.bookUpcharge.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {feeCalculation.taas.breakdown.personal1040 > 0 && (
                                      <div className="flex justify-between pl-4 text-xs text-blue-600">
                                        <span>Personal 1040s:</span>
                                        <span>+${feeCalculation.taas.breakdown.personal1040.toLocaleString()}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between pl-4 text-xs text-blue-600">
                                      <span>Before Multipliers:</span>
                                      <span>${feeCalculation.taas.breakdown.beforeMultipliers.toLocaleString()}</span>
                                    </div>
                                    {feeCalculation.taas.breakdown.industryMult !== 1 && (
                                      <div className="flex justify-between pl-4 text-xs text-blue-600">
                                        <span>Industry Multiplier ({feeCalculation.taas.breakdown.industryMult.toFixed(1)}x):</span>
                                        <span>${feeCalculation.taas.breakdown.afterIndustryMult?.toLocaleString() || feeCalculation.taas.breakdown.beforeMultipliers.toLocaleString()}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between pl-4 text-xs text-blue-600">
                                      <span>Revenue Multiplier ({feeCalculation.taas.breakdown.revenueMult.toFixed(1)}x):</span>
                                      <span>${feeCalculation.taas.breakdown.afterMultipliers.toLocaleString()}</span>
                                    </div>
                                    {feeCalculation.taas.breakdown.seedDiscount > 0 && (
                                      <div className="flex justify-between pl-4 text-xs text-blue-600">
                                        <span>Seed Bookkeeping Discount (15%):</span>
                                        <span className="text-green-600">-${feeCalculation.taas.breakdown.seedDiscount.toLocaleString()}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                              {feeCalculation.taas.setupFee > 0 && (
                                <div className="border-t border-blue-200 pt-2">
                                  <div className="flex justify-between font-medium">
                                    <span className="text-blue-700">Prior Years Fee:</span>
                                    <span className="text-blue-800">${feeCalculation.taas.setupFee.toLocaleString()}</span>
                                  </div>
                                  {feeCalculation.taas.breakdown && (
                                    <>
                                      <div className="flex justify-between pl-4 text-xs text-blue-600">
                                        <span>Unfiled Years: {feeCalculation.taas.breakdown.priorYearsUnfiled}</span>
                                        <span>✓</span>
                                      </div>
                                      <div className="flex justify-between pl-4 text-xs text-blue-600">
                                        <span>Per Year Fee:</span>
                                        <span>${feeCalculation.taas.breakdown.perYearFee.toLocaleString()}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-6 space-y-3">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => {
                        console.log('Save button clicked');
                        console.log('Form values:', form.getValues());
                        console.log('Form errors:', form.formState.errors);
                        form.handleSubmit(onSubmit)();
                      }}
                      disabled={createQuoteMutation.isPending || !isCalculated}
                      className="flex-1 bg-[#253e31] text-white font-semibold py-4 px-6 rounded-lg hover:bg-[#253e31]/90 active:bg-[#253e31]/80 focus:ring-2 focus:ring-[#e24c00] focus:ring-offset-2 button-shimmer transition-all duration-300"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {createQuoteMutation.isPending ? 'Saving...' : (editingQuoteId ? 'Update Quote' : 'Save Quote')}
                    </Button>
                    
                    <Button
                      type="button"
                      onClick={resetForm}
                      variant="outline"
                      className="px-4 py-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Reset
                    </Button>
                  </div>
                  
                  {/* HubSpot Integration Button */}
                  {isCalculated && (
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={async () => {
                          console.log('🔵 Push to HubSpot button clicked');
                          console.log('🔵 editingQuoteId:', editingQuoteId);
                          console.log('🔵 hasUnsavedChanges:', hasUnsavedChanges);
                          console.log('🔵 allQuotes length:', allQuotes?.length);
                          console.log('🔵 form contact email:', form.getValues().contactEmail);
                          
                          // Check if current quote has HubSpot IDs
                          const currentQuote = editingQuoteId ? allQuotes?.find((q: Quote) => q.id === editingQuoteId) : null;
                          const hasHubSpotIds = currentQuote?.hubspotQuoteId && currentQuote?.hubspotDealId;
                          
                          console.log('🔵 currentQuote:', currentQuote);
                          console.log('🔵 hasHubSpotIds:', hasHubSpotIds);
                          
                          if (!editingQuoteId && hasUnsavedChanges) {
                            console.log('🟡 PATH: Auto-save then push to HubSpot');
                            // Auto-save the quote first, then push to HubSpot
                            const formData = form.getValues();
                            try {
                              await new Promise((resolve, reject) => {
                                createQuoteMutation.mutate(formData, {
                                  onSuccess: (savedQuote) => {
                                    console.log('🟢 Quote saved, now pushing to HubSpot with ID:', savedQuote.id);
                                    // Now push to HubSpot
                                    pushToHubSpotMutation.mutate(savedQuote.id);
                                    resolve(savedQuote);
                                  },
                                  onError: reject
                                });
                              });
                            } catch (error) {
                              console.error('Failed to save quote before pushing to HubSpot:', error);
                            }
                          } else if (hasHubSpotIds) {
                            // Update existing quote in HubSpot
                            const quoteId = editingQuoteId || currentQuote?.id;
                            if (quoteId && hasUnsavedChanges) {
                              // Auto-save the form changes first (editingQuoteId is already set)
                              const formData = form.getValues();
                              try {
                                await new Promise((resolve, reject) => {
                                  createQuoteMutation.mutate(formData, {
                                    onSuccess: (savedQuote) => {
                                      // Now update in HubSpot
                                      updateHubSpotMutation.mutate(quoteId);
                                      resolve(savedQuote);
                                    },
                                    onError: reject
                                  });
                                });
                              } catch (error) {
                                console.error('Failed to save quote before updating HubSpot:', error);
                              }
                            } else if (quoteId) {
                              // No unsaved changes, just update HubSpot
                              updateHubSpotMutation.mutate(quoteId);
                            }
                          } else if (editingQuoteId) {
                            // Editing a quote that hasn't been pushed to HubSpot yet
                            if (hasUnsavedChanges) {
                              // Auto-save first, then push to HubSpot
                              const formData = form.getValues();
                              try {
                                await new Promise((resolve, reject) => {
                                  createQuoteMutation.mutate(formData, {
                                    onSuccess: (savedQuote) => {
                                      // Now push to HubSpot
                                      pushToHubSpotMutation.mutate(editingQuoteId);
                                      resolve(savedQuote);
                                    },
                                    onError: reject
                                  });
                                });
                              } catch (error) {
                                console.error('Failed to save quote before pushing to HubSpot:', error);
                              }
                            } else {
                              // No unsaved changes, just push to HubSpot
                              pushToHubSpotMutation.mutate(editingQuoteId);
                            }
                          } else {
                            console.log('🟡 PATH: Find most recent quote and push');
                            // Find the most recent quote for this contact and push it
                            const mostRecentQuote = allQuotes?.find((q: Quote) => 
                              q.contactEmail === form.getValues().contactEmail
                            );
                            
                            console.log('🔵 mostRecentQuote found:', mostRecentQuote);
                            
                            if (mostRecentQuote && mostRecentQuote.id) {
                              console.log('🟢 Pushing quote to HubSpot with ID:', mostRecentQuote.id);
                              pushToHubSpotMutation.mutate(mostRecentQuote.id);
                            } else {
                              console.log('🔴 No recent quote found, showing error');
                              toast({
                                title: "Error",
                                description: "Please save the quote first before pushing to HubSpot.",
                                variant: "destructive",
                              });
                            }
                          }
                        }}
                        disabled={(() => {
                          const formValues = form.getValues();
                          const requiredFieldsValidation = validateRequiredFields(formValues);
                          
                          return (
                            !isCalculated || 
                            hubspotVerificationStatus !== 'verified' || 
                            !requiredFieldsValidation.isValid ||
                            pushToHubSpotMutation.isPending || 
                            updateHubSpotMutation.isPending ||
                            createQuoteMutation.isPending ||
                            // Disable if override requires approval but not yet approved
                            (form.watch("cleanupOverride") && !isApproved && (() => {
                              const overrideReason = form.watch("overrideReason");
                              const customSetupFee = form.watch("customSetupFee");
                              const cleanupMonths = form.watch("cleanupMonths");
                              
                              if (overrideReason === "Other") {
                                // For "Other" - requires approval if custom setup fee OR cleanup months reduced
                                return (customSetupFee && parseFloat(customSetupFee) > 0) || cleanupMonths < currentMonth;
                              } else {
                                // For other reasons - only requires approval if cleanup months reduced
                                return cleanupMonths < currentMonth;
                              }
                            })())
                          );
                        })()}
                        className="flex-1 bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-orange-700 active:bg-orange-800 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 button-shimmer transition-all duration-300"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {pushToHubSpotMutation.isPending || updateHubSpotMutation.isPending || (createQuoteMutation.isPending && !editingQuoteId)
                          ? 'Pushing to HubSpot...' 
                          : (() => {
                              // Check if current quote has HubSpot IDs
                              const currentQuote = editingQuoteId ? allQuotes?.find((q: Quote) => q.id === editingQuoteId) : null;
                              const hasHubSpotIds = currentQuote?.hubspotQuoteId && currentQuote?.hubspotDealId;
                              return (editingQuoteId || hasHubSpotIds) ? 'Update in HubSpot' : 'Push to HubSpot';
                            })()
                        }
                      </Button>
                    </div>
                  )}
                  
                  {hubspotVerificationStatus === 'not-found' && isCalculated && (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        Contact not found in HubSpot. Please verify the email address or add the contact to HubSpot before pushing.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Show missing required fields alert */}
                  {(() => {
                    const formValues = form.getValues();
                    
                    // Show missing fields alert when any service is engaged and there are missing fields
                    if (formValues.serviceBookkeeping || formValues.serviceTaas) {
                      const requiredFieldsValidation = validateRequiredFields(formValues);
                      
                      if (!requiredFieldsValidation.isValid) {
                        return (
                          <Alert className="border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              <div className="font-medium mb-1">Missing required fields:</div>
                              <ul className="list-disc list-inside text-sm">
                                {requiredFieldsValidation.missingFields.map((field, index) => (
                                  <li key={index}>{field}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        );
                      }
                    }
                    return null;
                  })()}
                  
                  {editingQuoteId && (
                    <Alert>
                      <Edit className="h-4 w-4" />
                      <AlertDescription>
                        Editing existing quote (ID: {editingQuoteId}). Changes will update the original quote.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {hasUnsavedChanges && !editingQuoteId && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You have unsaved changes. Remember to save your quote before leaving.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="text-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-xs font-medium text-gray-600">
                        Quote valid for 30 days
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Generated on {new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Commission Tracking Section */}
        {isCalculated && (() => {
          // Calculate commissions properly accounting for custom setup fees and combined services
          const totalSetupFee = setupFee;
          const totalMonthlyFee = monthlyFee;
          
          // Month 1 Commission: 20% of setup fee + 40% of monthly fee
          const month1SetupCommission = totalSetupFee * 0.20;
          const month1MonthlyCommission = totalMonthlyFee * 0.40;
          const totalMonth1Commission = month1SetupCommission + month1MonthlyCommission;
          
          // Ongoing Commission: 10% of monthly fee for months 2-12
          const ongoingMonthlyCommission = totalMonthlyFee * 0.10;
          const totalOngoingCommission = ongoingMonthlyCommission * 11;
          
          // Total first year commission
          const totalFirstYearCommission = totalMonth1Commission + totalOngoingCommission;
          
          return (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl mt-8 border border-green-200 quote-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-800">
                      Commission Preview
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Your earnings from this quote</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Month 1 Commission */}
                  <div className="bg-white rounded-lg p-6 shadow-md border border-green-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">Month 1 Commission</h3>
                      <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        First Month
                      </div>
                    </div>
                    <div className="space-y-3">
                      {totalSetupFee > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Setup Fee (20%):</span>
                          <span className="font-semibold text-gray-800">
                            ${month1SetupCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Monthly Fee (40%):</span>
                        <span className="font-semibold text-gray-800">
                          ${month1MonthlyCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-semibold text-gray-800">Total Month 1:</span>
                          <span className="text-xl font-bold text-green-600">
                            ${totalMonth1Commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ongoing Commission */}
                  <div className="bg-white rounded-lg p-6 shadow-md border border-green-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">Ongoing Commission</h3>
                      <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        Months 2-12
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Monthly Fee (10%):</span>
                        <span className="font-semibold text-gray-800">
                          ${ongoingMonthlyCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">× 11 months:</span>
                        <span className="font-semibold text-gray-800">
                          ${totalOngoingCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-semibold text-gray-800">Total Months 2-12:</span>
                          <span className="text-xl font-bold text-blue-600">
                            ${totalOngoingCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Annual Commission */}
                <div className="mt-6 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-6 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Total First Year Commission</h3>
                      <p className="text-sm text-gray-600 mt-1">Complete earnings potential from this client</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-amber-600">
                        ${totalFirstYearCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Based on current quote
                      </div>
                    </div>
                  </div>
                  
                  {/* Breakdown for combined services */}
                  {(feeCalculation.includesBookkeeping && feeCalculation.includesTaas) && (
                    <div className="mt-4 pt-4 border-t border-amber-200">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600 mb-1">Bookkeeping Service:</div>
                          <div className="text-gray-800">
                            Monthly: ${feeCalculation.bookkeeping.monthlyFee.toLocaleString()}
                            {feeCalculation.bookkeeping.setupFee > 0 && (
                              <span> | Setup: ${feeCalculation.bookkeeping.setupFee.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 mb-1">TaaS Service:</div>
                          <div className="text-gray-800">
                            Monthly: ${feeCalculation.taas.monthlyFee.toLocaleString()}
                            {feeCalculation.taas.setupFee > 0 && (
                              <span> | Setup: ${feeCalculation.taas.setupFee.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}
        
        {/* Quote History Section */}
        <Card className="bg-white shadow-xl mt-8 border-0 quote-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800">
                  Saved Quotes
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">Manage and review your quote history</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by contact email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {dontShowArchiveDialog && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDontShowArchiveDialog(false);
                    localStorage.removeItem('dontShowArchiveDialog');
                    toast({
                      title: "Archive Confirmations Enabled",
                      description: "Archive confirmation dialogs will now be shown again.",
                    });
                  }}
                  className="text-xs"
                >
                  Enable Archive Confirmations
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {allQuotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No quotes found. Create your first quote above!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('contactEmail')}
                      >
                        <div className="flex items-center gap-1">
                          Contact Email
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('updatedAt')}
                      >
                        <div className="flex items-center gap-1">
                          Last Updated
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('monthlyFee')}
                      >
                        <div className="flex items-center gap-1">
                          Monthly Fee
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('setupFee')}
                      >
                        <div className="flex items-center gap-1">
                          Setup Fee
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allQuotes.map((quote) => (
                      <TableRow 
                        key={quote.id} 
                        className="cursor-pointer quote-table-row"
                        onClick={() => loadQuoteIntoForm(quote)}
                      >
                        <TableCell className="font-medium">{quote.contactEmail}</TableCell>
                        <TableCell>
                          {new Date(quote.updatedAt || quote.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-semibold">${parseFloat(quote.monthlyFee).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-[#e24c00]">${parseFloat(quote.setupFee).toLocaleString()}</TableCell>
                        <TableCell>{quote.industry}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleArchiveQuote(quote.id, quote.contactEmail, e)}
                            disabled={archiveQuoteMutation.isPending}
                            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                            title="Archive Quote"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white text-sm opacity-80">
            Internal Tool • Seed Financial Sales Team
          </p>
        </div>
        
        {/* Approval Code Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Approval Code</DialogTitle>
            <DialogDescription>
              Enter the 4-digit approval code from Slack to unlock cleanup month editing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="approvalCode" className="block text-sm font-medium text-gray-700 mb-2">
                Approval Code
              </label>
              <Input
                id="approvalCode"
                type="text"
                maxLength={4}
                placeholder="0000"
                value={approvalCode}
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setApprovalCode(value);
                }}
                className="text-center text-2xl tracking-widest font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && approvalCode.length === 4) {
                    validateApprovalCode();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsApprovalDialogOpen(false);
                  setApprovalCode("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={validateApprovalCode}
                disabled={isValidatingCode || approvalCode.length !== 4}
                className="flex-1"
              >
                {isValidatingCode ? "Validating..." : "Validate Code"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Existing Quotes Modal */}
      <Dialog open={showExistingQuotesModal} onOpenChange={setShowExistingQuotesModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {existingQuotesForEmail.length > 0 ? "Existing Quotes Found" : "Create New Quote"}
            </DialogTitle>
            <DialogDescription>
              {selectedContact && existingQuotesForEmail.length > 0 
                ? `Found ${existingQuotesForEmail.length} existing quotes for ${selectedContact.properties.firstname} ${selectedContact.properties.lastname} (${selectedContact.properties.email})`
                : selectedContact 
                  ? `Create a new quote for ${selectedContact.properties.firstname} ${selectedContact.properties.lastname} (${selectedContact.properties.email})`
                  : "Create a new quote for this contact"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {existingQuotesForEmail.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Select an existing quote to edit:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {existingQuotesForEmail.map((quote) => (
                    <Card key={quote.id} className="cursor-pointer hover:bg-blue-50 transition-colors"
                          onClick={() => {
                            loadQuoteIntoForm(quote);
                            setShowExistingQuotesModal(false);
                            setShowClientDetails(true);
                          }}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">${parseFloat(quote.monthlyFee).toLocaleString()}/month</p>
                            <p className="text-sm text-gray-600">
                              Services: {[
                                quote.includesBookkeeping && "Bookkeeping",
                                quote.includesTaas && "TaaS", 
                                quote.includesPayroll && "Payroll",
                                quote.includesApArLite && "AP/AR Lite",
                                quote.includesFpaLite && "FP&A Lite"
                              ].filter(Boolean).join(", ")}
                            </p>
                            <p className="text-xs text-gray-500">
                              Updated: {new Date(quote.updatedAt || quote.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            <div className="border-t pt-4">
              <Button 
                onClick={() => {
                  setShowExistingQuotesModal(false);
                  proceedToClientDetails(selectedContact);
                }}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                {existingQuotesForEmail.length > 0 ? "Create New Quote Instead" : "Create New Quote"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive the quote for {selectedQuoteForArchive?.email}? 
              This will hide it from the main list but preserve it for auditing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex items-center space-x-2 my-4">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowArchiveDialog}
              onCheckedChange={handleArchiveDialogDontShow}
            />
            <label
              htmlFor="dontShowAgain"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Don't show this dialog again
            </label>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setArchiveDialogOpen(false);
              setSelectedQuoteForArchive(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmArchive}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Archive Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetConfirmDialog} onOpenChange={setResetConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start New Quote</AlertDialogTitle>
            <AlertDialogDescription>
              {hasUnsavedChanges 
                ? "You have unsaved changes. Are you sure you want to start a new quote? All current data will be lost."
                : "Are you sure you want to start a new quote? This will clear all current data."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setResetConfirmDialog(false);
                doResetForm();
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Start New Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Changes Dialog */}
      <AlertDialog open={discardChangesDialog} onOpenChange={setDiscardChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load Quote</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to load this quote? All current data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingQuoteToLoad(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setDiscardChangesDialog(false);
                if (pendingQuoteToLoad) {
                  doLoadQuote(pendingQuoteToLoad);
                  setPendingQuoteToLoad(null);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
            >
              Load Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlock Confirmation Dialog */}
      <AlertDialog open={unlockConfirmDialog} onOpenChange={setUnlockConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Unlock Setup Fee Fields?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlock the setup fee fields? This will allow you to make changes, but you'll need to request a new approval code before saving any quote with overrides, regardless of whether you increase or decrease the values.
              <br /><br />
              <strong>Note:</strong> The override checkbox will remain locked to prevent accidental changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUnlockFields}
              className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600"
            >
              Yes, Unlock Fields
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}

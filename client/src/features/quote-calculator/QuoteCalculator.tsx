import {
  currentMonth,
  quoteFormSchema,
  type QuoteFormFields,
} from "@/features/quote-calculator/schema";
import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Quote } from "@shared/schema";
import { calculateCombinedFees, calculateQuotePricing } from "@shared/pricing";
import type { PricingConfig as SimplePricingConfig } from "@shared/pricing";
import { mapQuoteToFormServices, getAllServices } from "@shared/services";
import { apiRequest } from "@/lib/queryClient";
import { usePricingConfig } from "@/hooks/usePricingConfig";
import { useCalculatorContent } from "@/hooks/useCalculatorContent";
import { checkExistingQuotes } from "@/services/quotes";
import {
  verifyContact as verifyHubspotContact,
  searchContacts as searchHubspotContactsApi,
} from "@/services/hubspot";

import { useToast } from "@/hooks/use-toast";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { Form } from "@/components/ui/form";
import { QuoteSummarySection } from "@/components/seedqc/QuoteSummarySection";
import { ExistingQuotesModal } from "@/components/seedqc/ExistingQuotesModal";
import { ApprovalCodeDialog } from "@/components/seedqc/ApprovalCodeDialog";
import { StartNewQuoteCard } from "@/components/seedqc/StartNewQuoteCard";
import { ContactSearchModal } from "@/components/seedqc/ContactSearchModal";
import { QuoteActionsBar } from "@/components/seedqc/QuoteActionsBar";
import { ServiceCards } from "@/components/quote-form/ServiceCards";
import { ContactSection } from "@/components/quote-form/ContactSection";
import { TaasSection } from "@/components/quote-form/TaasSection";
import { PriorYearFilingsSection } from "@/components/quote-form/PriorYearFilingsSection";
import { BookkeepingCleanupSection } from "@/components/quote-form/BookkeepingCleanupSection";
import BookkeepingSection from "@/components/quote-form/BookkeepingSection";
import { CfoAdvisorySection } from "@/components/quote-form/CfoAdvisorySection";
import PayrollSection from "@/components/quote-form/PayrollSection";
import APSection from "@/components/quote-form/APSection";
import ARSection from "@/components/quote-form/ARSection";
import AgentOfServiceSection from "@/components/quote-form/AgentOfServiceSection";
import { CommissionPreview } from "@/components/seedqc/CommissionPreview";
import { useQuotes } from "@/hooks/use-quotes";
import { useAuth } from "@/hooks/use-auth";
import type { FeeCalculation } from "@/components/seedqc/types";
import { useHubSpotSync } from "@/features/quote-calculator/hooks/useHubSpotSync";
import { useQuotePersistence } from "@/features/quote-calculator/hooks/useQuotePersistence";
import { useDebouncedPricingValues } from "@/features/quote-calculator/hooks/useDebouncedPricingValues";

type FormData = QuoteFormFields;

function QuoteCalculator() {
  // Initialize hooks
  const { data: pricingConfig, isLoading: _isLoadingPricing } = usePricingConfig();
  const { isLoading: _isLoadingContent } = useCalculatorContent();
  const { toast } = useToast();
  const { user } = useAuth();

  // Note: form is initialized below with schema-aligned defaults

  // UI state
  const [_copiedField, _setCopiedField] = useState<string | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Approval state
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalCode, setApprovalCode] = useState("");
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);
  const [hasRequestedApproval, setHasRequestedApproval] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  // Dialog states
  const [resetConfirmDialog, setResetConfirmDialog] = useState(false);
  const [discardChangesDialog, setDiscardChangesDialog] = useState(false);
  const [pendingQuoteToLoad, setPendingQuoteToLoad] = useState<Quote | null>(null);
  const [unlockConfirmDialog, setUnlockConfirmDialog] = useState(false);
  const [fieldsLocked, setFieldsLocked] = useState(false);

  // Contact search state
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [isContactSearching, setIsContactSearching] = useState(false);
  const [hubspotContacts, setHubspotContacts] = useState<any[]>([]);
  const [triggerEmail, setTriggerEmail] = useState("");
  const [showClientDetails, setShowClientDetails] = useState(false);

  // Live search state
  const [showLiveResults, setShowLiveResults] = useState(false);
  const [liveSearchResults, setLiveSearchResults] = useState<any[]>([]);
  const [isLiveSearching, setIsLiveSearching] = useState(false);

  // Form sections state
  // (removed unused UI expansion flags and bank toggles to reduce lint noise)

  // Form submission state
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Archive dialog state
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedQuoteForArchive, setSelectedQuoteForArchive] = useState<{
    id: number;
    email: string;
  } | null>(null);
  const [dontShowArchiveDialog, setDontShowArchiveDialog] = useState(() => {
    return localStorage.getItem("dontShowArchiveDialog") === "true";
  });

  // HubSpot verification state
  const [hubspotVerificationStatus, setHubspotVerificationStatus] = useState<
    "idle" | "verifying" | "verified" | "not-found"
  >("idle");
  const [hubspotContact, setHubspotContact] = useState<any>(null);
  const [lastVerifiedEmail, setLastVerifiedEmail] = useState("");

  // Existing quotes state
  const [existingQuotesForEmail, setExistingQuotesForEmail] = useState<Quote[]>([]);
  const [existingQuotesInfoMessage, setExistingQuotesInfoMessage] = useState<string | null>(null);
  const [showExistingQuotesNotification, setShowExistingQuotesNotification] = useState(false);

  // Break down state
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);

  // Existing quotes modal state
  const [showExistingQuotesModal, setShowExistingQuotesModal] = useState(false);
  // Note: currentMonth (numeric) comes from schema import

  // Use the pricing data directly since it doesn't have a pricingConfig property
  // (removed unused isLoading aggregation to avoid lint warnings)
  // (removed duplicate hubspotContact/lastVerifiedEmail declarations)

  // Dialog and UI state (deduplicated)
  const [verificationTimeoutId, setVerificationTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const mappedPricingConfig = useMemo<SimplePricingConfig | undefined>(() => {
    const cfg: any = pricingConfig as any;
    if (!cfg) return undefined;
    const baseMonthlyFee = cfg?.baseFees?.bookkeeping ?? 150;
    const qboMonthly = cfg?.serviceSettings?.bookkeeping?.qbo_subscription_fee ?? 60;
    return {
      services: {
        bookkeeping: { enabled: true },
        taas: { enabled: true },
        payroll: { enabled: true },
        ap: { enabled: true },
        ar: { enabled: true },
        agentOfService: { enabled: true },
        cfoAdvisory: { enabled: true },
        qbo: { enabled: true },
      },
      fees: {
        baseMonthlyFee,
        qboMonthly,
        priorYearFilingPerYear: 1500,
        cleanupPerMonth: 100,
        serviceTierFees: { Automated: 0, Guided: 79, Concierge: 249 },
      },
      discounts: { bookkeepingWithTaasPct: 0.5 },
      rounding: { monthlyStep: 25 },
    } satisfies SimplePricingConfig;
  }, [pricingConfig]);

  const [currentFormView, setCurrentFormView] = useState<"bookkeeping" | "taas" | "placeholder">(
    "placeholder"
  );

  const form = useForm<FormData>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      contactEmail: "",
      monthlyRevenueRange: "",
      monthlyTransactions: "",
      industry: "",
      entityType: "",
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
      qboSubscription: false,
      serviceTier: "Standard",
      // Bookkeeping metadata (non-pricing)
      accountingBasis: "Accrual",
      businessLoans: false,
      currentBookkeepingSoftware: "",
      otherBookkeepingSoftware: "",
      primaryBank: "",
      otherPrimaryBank: "",
      additionalBanks: [],
      otherAdditionalBanks: [],
      merchantProviders: [],
      otherMerchantProvider: "",
      serviceAgentOfService: false,
      agentOfServiceAdditionalStates: 0,
      agentOfServiceComplexCase: false,
      approvalCode: "",
    },
  });

  const { data: allQuotes = [], refetch: refetchQuotes } = useQuotes({
    search: searchTerm,
    sortField,
    sortOrder,
  });

  // Quote persistence (create/update + unsaved changes)
  const { hasUnsavedChanges, clearUnsavedChanges, saveQuote, creating } = useQuotePersistence({
    form,
    mappedPricingConfig,
    editingQuoteId,
    setEditingQuoteId,
    refetchQuotes,
  });

  // Debounced pricing values - only recalculates after 300ms of no changes
  // This reduces calculations from ~100-200 per quote to ~10-20 (90% reduction)
  const debouncedPricingValues = useDebouncedPricingValues(form, 300);

  // Memoized pricing calculation - only recalculates when pricing values change
  const feeCalculation: FeeCalculation = useMemo(() => {
    try {
      const rawCalc: any = mappedPricingConfig
        ? calculateQuotePricing(debouncedPricingValues as any, mappedPricingConfig)
        : calculateCombinedFees(debouncedPricingValues as any);

      return {
        combined: {
          monthlyFee: Number(rawCalc?.combined?.monthlyFee) || 0,
          setupFee: Number(rawCalc?.combined?.setupFee) || 0,
        },
        bookkeeping: {
          monthlyFee: Number(rawCalc?.bookkeeping?.monthlyFee) || 0,
          setupFee: Number(rawCalc?.bookkeeping?.setupFee) || 0,
          breakdown: rawCalc?.bookkeeping?.breakdown,
        },
        taas: {
          monthlyFee: Number(rawCalc?.taas?.monthlyFee) || 0,
          setupFee: Number(rawCalc?.taas?.setupFee) || 0,
          breakdown: rawCalc?.taas?.breakdown,
        },
        priorYearFilingsFee: Number(rawCalc?.priorYearFilingsFee) || 0,
        cleanupProjectFee: Number(rawCalc?.cleanupProjectFee) || 0,
        cfoAdvisoryFee: Number(rawCalc?.cfoAdvisoryFee) || 0,
        payrollFee: Number(rawCalc?.payrollFee) || 0,
        payrollBreakdown: rawCalc?.payrollBreakdown,
        apFee: Number(rawCalc?.apFee) || 0,
        apBreakdown: rawCalc?.apBreakdown,
        arFee: Number(rawCalc?.arFee) || 0,
        arBreakdown: rawCalc?.arBreakdown,
        agentOfServiceFee: Number(rawCalc?.agentOfServiceFee) || 0,
        agentOfServiceBreakdown: rawCalc?.agentOfServiceBreakdown,
        serviceTierFee: Number(rawCalc?.serviceTierFee) || 0,
        qboFee: Number(rawCalc?.qboFee) || 0,
        includesBookkeeping: Boolean(rawCalc?.includesBookkeeping),
        includesTaas: Boolean(rawCalc?.includesTaas),
      } as FeeCalculation;
    } catch (err) {
      try {
        const rawCalc: any = calculateCombinedFees(debouncedPricingValues as any);
        return {
          combined: {
            monthlyFee: Number(rawCalc?.combined?.monthlyFee) || 0,
            setupFee: Number(rawCalc?.combined?.setupFee) || 0,
          },
          bookkeeping: {
            monthlyFee: Number(rawCalc?.bookkeeping?.monthlyFee) || 0,
            setupFee: Number(rawCalc?.bookkeeping?.setupFee) || 0,
            breakdown: rawCalc?.bookkeeping?.breakdown,
          },
          taas: {
            monthlyFee: Number(rawCalc?.taas?.monthlyFee) || 0,
            setupFee: Number(rawCalc?.taas?.setupFee) || 0,
            breakdown: rawCalc?.taas?.breakdown,
          },
          priorYearFilingsFee: Number(rawCalc?.priorYearFilingsFee) || 0,
          cleanupProjectFee: Number(rawCalc?.cleanupProjectFee) || 0,
          cfoAdvisoryFee: Number(rawCalc?.cfoAdvisoryFee) || 0,
          payrollFee: Number(rawCalc?.payrollFee) || 0,
          payrollBreakdown: rawCalc?.payrollBreakdown,
          apFee: Number(rawCalc?.apFee) || 0,
          apBreakdown: rawCalc?.apBreakdown,
          arFee: Number(rawCalc?.arFee) || 0,
          arBreakdown: rawCalc?.arBreakdown,
          agentOfServiceFee: Number(rawCalc?.agentOfServiceFee) || 0,
          agentOfServiceBreakdown: rawCalc?.agentOfServiceBreakdown,
          serviceTierFee: Number(rawCalc?.serviceTierFee) || 0,
          qboFee: Number(rawCalc?.qboFee) || 0,
          includesBookkeeping: Boolean(rawCalc?.includesBookkeeping),
          includesTaas: Boolean(rawCalc?.includesTaas),
        } as FeeCalculation;
      } catch (err2) {
        return {
          combined: { monthlyFee: 0, setupFee: 0 },
          bookkeeping: { monthlyFee: 0, setupFee: 0 },
          taas: { monthlyFee: 0, setupFee: 0 },
          priorYearFilingsFee: 0,
          cleanupProjectFee: 0,
          cfoAdvisoryFee: 0,
          payrollFee: 0,
          apFee: 0,
          arFee: 0,
          agentOfServiceFee: 0,
          serviceTierFee: 0,
          qboFee: 0,
          includesBookkeeping: false,
          includesTaas: false,
        } as FeeCalculation;
      }
    }
  }, [debouncedPricingValues, mappedPricingConfig]);

  const monthlyFee = feeCalculation.combined.monthlyFee;
  const setupFee = feeCalculation.combined.setupFee;
  const isCalculated = (() => {
    const hasMonthlyFees = monthlyFee > 0;
    const hasSetupFees = setupFee > 0;
    const hasProjectFees =
      Number(feeCalculation.priorYearFilingsFee || 0) > 0 ||
      Number(feeCalculation.cleanupProjectFee || 0) > 0 ||
      Number(feeCalculation.cfoAdvisoryFee || 0) > 0;
    const hasServiceFees =
      Number(feeCalculation.payrollFee || 0) > 0 ||
      Number(feeCalculation.apFee || 0) > 0 ||
      Number(feeCalculation.arFee || 0) > 0 ||
      Number(feeCalculation.agentOfServiceFee || 0) > 0;
    return hasMonthlyFees || hasSetupFees || hasProjectFees || hasServiceFees;
  })();

  const hubspotSync = useHubSpotSync({
    form,
    feeCalculation,
    editingQuoteId,
    hasUnsavedChanges,
    allQuotes,
    isCalculated,
    hubspotVerificationStatus,
    creating,
    refetchQuotes,
    saveQuote: async (data) => {
      return await saveQuote(data as any);
    },
    clearUnsavedChanges,
  });

  const getActiveServices = () => {
    const services: ("bookkeeping" | "taas")[] = [];
    if (feeCalculation.includesBookkeeping) services.push("bookkeeping");
    if (feeCalculation.includesTaas) services.push("taas");
    return services;
  };
  const getFormViewToShow = () => {
    const activeServices = getActiveServices();
    if (activeServices.length === 0) return "placeholder";
    if (currentFormView === "placeholder" || !activeServices.includes(currentFormView)) {
      return activeServices[0];
    }
    return currentFormView;
  };
  const actualFormView = getFormViewToShow();

  // Unsaved changes are tracked inside useQuotePersistence

  useEffect(() => {
    return () => {
      if (verificationTimeoutId) clearTimeout(verificationTimeoutId);
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

  const doLoadQuote = (quote: Quote) => {
    console.log("Loading quote into form:", quote);
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
      currentBookkeepingSoftware: quote.currentBookkeepingSoftware || "",
      otherBookkeepingSoftware: quote.otherBookkeepingSoftware || "",
      primaryBank: quote.primaryBank || "",
      otherPrimaryBank: quote.otherPrimaryBank || "",
      additionalBanks: quote.additionalBanks || [],
      otherAdditionalBanks: quote.otherAdditionalBanks || [],
      merchantProviders: quote.merchantProviders || [],
      otherMerchantProvider: quote.otherMerchantProvider || "",
      companyNameLocked: !!quote.companyName,
      contactFirstNameLocked: !!quote.contactFirstName,
      contactLastNameLocked: !!quote.contactLastName,
      industryLocked: !!quote.industry,
      companyAddressLocked: !!(
        quote.clientStreetAddress ||
        quote.clientCity ||
        quote.clientState ||
        quote.clientZipCode
      ),
      quoteType: quote.quoteType || "bookkeeping",
      includesBookkeeping: quote.includesBookkeeping ?? true,
      includesTaas: quote.includesTaas ?? false,
      ...mapQuoteToFormServices(quote),
      cfoAdvisoryType: quote.cfoAdvisoryType || "",
      cfoAdvisoryBundleHours: quote.cfoAdvisoryBundleHours || 8,
      payrollEmployeeCount: quote.payrollEmployeeCount || 1,
      payrollStateCount: quote.payrollStateCount || 1,
      apVendorBillsBand: quote.apVendorBillsBand || "",
      apVendorCount: quote.apVendorCount || 5,
      customApVendorCount: quote.customApVendorCount || null,
      apServiceTier: quote.apServiceTier || "lite",
      arCustomerInvoicesBand: quote.arCustomerInvoicesBand || "",
      arCustomerCount: quote.arCustomerCount || 6,
      customArCustomerCount: quote.customArCustomerCount || null,
      arServiceTier: quote.arServiceTier || "advanced",
      agentOfServiceAdditionalStates: quote.agentOfServiceAdditionalStates || 0,
      agentOfServiceComplexCase: quote.agentOfServiceComplexCase ?? false,
      numEntities: quote.numEntities ? Number(quote.numEntities) : 1,
      statesFiled: quote.statesFiled ? Number(quote.statesFiled) : 1,
      internationalFiling: quote.internationalFiling ?? false,
      numBusinessOwners: quote.numBusinessOwners ? Number(quote.numBusinessOwners) : 1,
      bookkeepingQuality: quote.bookkeepingQuality || "Clean (Seed)",
      include1040s: quote.include1040s ?? false,
      priorYearsUnfiled: quote.priorYearsUnfiled ? Number(quote.priorYearsUnfiled) : 0,
      priorYearFilings: quote.priorYearFilings || [],
      qboSubscription: quote.qboSubscription ?? false,
      cleanupPeriods: quote.cleanupPeriods || [],
    } as any;
    console.log("Loading quote into form:", quote.id);
    form.reset(formData);
    setTimeout(() => {
      if (quote.entityType) form.setValue("entityType", quote.entityType);
      if (quote.numEntities) form.setValue("numEntities", Number(quote.numEntities));
      if (quote.statesFiled) form.setValue("statesFiled", Number(quote.statesFiled));
      if (quote.numBusinessOwners)
        form.setValue("numBusinessOwners", Number(quote.numBusinessOwners));
      if (quote.priorYearsUnfiled !== undefined)
        form.setValue("priorYearsUnfiled", Number(quote.priorYearsUnfiled));
      if (quote.bookkeepingQuality) form.setValue("bookkeepingQuality", quote.bookkeepingQuality);
      form.trigger();
    }, 100);
    setHubspotVerificationStatus("idle");
    setHubspotContact(null);
    setLastVerifiedEmail("");
    if (quote.contactEmail) {
      debouncedVerifyEmail(quote.contactEmail);
    }
    setTimeout(() => {
      const selectedServices = mapQuoteToFormServices(quote);
      const allServices = getAllServices();
      const hasBookkeepingServices =
        selectedServices.serviceMonthlyBookkeeping || selectedServices.serviceCleanupProjects;
      const hasTaasServices =
        selectedServices.serviceTaasMonthly || selectedServices.servicePriorYearFilings;
      const otherServiceKeys = allServices
        .filter(
          (s) =>
            ![
              "serviceMonthlyBookkeeping",
              "serviceCleanupProjects",
              "serviceTaasMonthly",
              "servicePriorYearFilings",
            ].includes(s.key)
        )
        .map((s) => s.key);
      const hasOtherServices = otherServiceKeys.some(
        (key) => selectedServices[key as keyof typeof selectedServices]
      );
      if (hasBookkeepingServices || (!hasTaasServices && !hasOtherServices)) {
        setCurrentFormView("bookkeeping");
      } else if (hasTaasServices) {
        setCurrentFormView("taas");
      } else {
        setCurrentFormView("bookkeeping");
      }
    }, 150);
    clearUnsavedChanges();
  };

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
      const contactEmail = form.getValues().contactEmail || selectedContact?.properties?.email;
      if (!contactEmail) {
        toast({
          title: "Error",
          description: "Contact email is required for validation.",
          variant: "destructive",
        });
        setIsValidatingCode(false);
        return;
      }
      const result = await apiRequest("/api/approval/validate", {
        method: "POST",
        body: JSON.stringify({ code: approvalCode, contactEmail }),
      });
      if (result.valid) {
        if (selectedContact) {
          setIsApprovalDialogOpen(false);
          form.setValue("approvalCode", approvalCode);
          setApprovalCode("");
          toast({
            title: "Approval Granted",
            description: "Proceeding to quote calculator.",
          });
          proceedToClientDetails(selectedContact);
        } else {
          form.setValue("approvalCode", approvalCode);
          setApprovalCode("");
          toast({
            title: "Approval Granted",
            description: "Code validated successfully.",
          });
        }
      } else {
        toast({
          title: "Invalid Code",
          description: result.message || "Please check the code and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: "Failed to validate code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingCode(false);
    }
  };

  const liveSearchContacts = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 3) {
      setLiveSearchResults([]);
      setShowLiveResults(false);
      return;
    }
    setIsLiveSearching(true);
    setShowLiveResults(true);
    try {
      const data = await searchHubspotContactsApi(searchTerm);
      setLiveSearchResults(data.contacts || []);
    } catch (error) {
      setLiveSearchResults([]);
    } finally {
      setIsLiveSearching(false);
    }
  };

  const searchHubSpotContacts = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setHubspotContacts([]);
      return;
    }
    setIsContactSearching(true);
    try {
      const data = await searchHubspotContactsApi(searchTerm);
      setHubspotContacts(data.contacts || []);
    } catch (error) {
      setHubspotContacts([]);
    } finally {
      setIsContactSearching(false);
    }
  };

  const verifyHubSpotEmail = async (email: string) => {
    if (!email || email === lastVerifiedEmail) return;
    if (verificationTimeoutId) clearTimeout(verificationTimeoutId);
    setHubspotVerificationStatus("verifying");
    setLastVerifiedEmail(email);
    try {
      const [hubspotResult, existingQuotesResult] = await Promise.all([
        verifyHubspotContact(email),
        checkExistingQuotes(email),
      ]);
      if (hubspotResult.verified && hubspotResult.contact) {
        setHubspotVerificationStatus("verified");
        setHubspotContact(hubspotResult.contact);
        form.clearErrors("contactEmail");
        if (hubspotResult.contact.properties.company && !form.getValues("companyName")) {
          form.setValue("companyName", hubspotResult.contact.properties.company);
        }
      } else {
        setHubspotVerificationStatus("not-found");
        setHubspotContact(null);
      }
      if (existingQuotesResult.hasExistingQuotes) {
        const verifiedItems = existingQuotesResult?.data?.verified || [];
        if (Array.isArray(verifiedItems) && verifiedItems.length > 0) {
          const editableIds = new Set(
            verifiedItems.filter((v: any) => v?.existsInHubSpot).map((v: any) => v.id)
          );
          const filteredQuotes = (existingQuotesResult.quotes || []).filter((q: any) =>
            editableIds.has(q.id)
          );
          setExistingQuotesForEmail(filteredQuotes);
          setShowExistingQuotesNotification(filteredQuotes.length > 0);
          if (filteredQuotes.length > 0) setSearchTerm(email);
        } else {
          setExistingQuotesForEmail(existingQuotesResult.quotes || []);
          setShowExistingQuotesNotification((existingQuotesResult.quotes || []).length > 0);
          if ((existingQuotesResult.quotes || []).length > 0) setSearchTerm(email);
        }
      } else {
        setExistingQuotesForEmail([]);
        setShowExistingQuotesNotification(false);
      }
    } catch (error) {
      setHubspotVerificationStatus("not-found");
      setHubspotContact(null);
      setExistingQuotesForEmail([]);
      setShowExistingQuotesNotification(false);
    }
  };

  const debouncedVerifyEmail = (email: string) => {
    if (verificationTimeoutId) clearTimeout(verificationTimeoutId);
    setHubspotVerificationStatus("idle");
    const timeoutId = setTimeout(() => {
      if (email && email.includes("@") && email.includes(".")) verifyHubSpotEmail(email);
    }, 750);
    setVerificationTimeoutId(timeoutId);
  };

  const handleEmailTrigger = (email: string) => {
    setTriggerEmail(email);
    setContactSearchTerm(email);
    setShowContactSearch(true);
    searchHubSpotContacts(email);
  };

  const handleContactSelection = async (contact: any) => {
    setSelectedContact(contact);
    setShowContactSearch(false);
    setShowLiveResults(false);
    try {
      const existing = await checkExistingQuotes(contact.properties.email);
      const verifiedItems = existing?.data?.verified || [];
      let filtered: any[] = [];
      if (Array.isArray(verifiedItems) && verifiedItems.length > 0) {
        const editableIds = new Set(
          verifiedItems.filter((v: any) => v?.existsInHubSpot).map((v: any) => v.id)
        );
        filtered = (existing.quotes || []).filter((q: any) => editableIds.has(q.id));
        const nonEditableCount = verifiedItems.filter((v: any) => !v?.existsInHubSpot).length;
        if (nonEditableCount > 0) {
          setExistingQuotesInfoMessage(
            `We found ${nonEditableCount} historical quote${nonEditableCount > 1 ? "s" : ""} that no longer ${nonEditableCount > 1 ? "exist" : "exists"} in HubSpot. These cannot be edited. Create a new quote instead.`
          );
        } else {
          setExistingQuotesInfoMessage(null);
        }
      } else {
        filtered = existing.quotes || [];
        setExistingQuotesInfoMessage(null);
      }
      setExistingQuotesForEmail(filtered);
      setShowExistingQuotesModal(true);
    } catch (error) {
      setExistingQuotesForEmail([]);
      setExistingQuotesInfoMessage(null);
      setShowExistingQuotesModal(true);
    }
  };

  const requestNewQuoteApproval = async (contact: any) => {
    setIsRequestingApproval(true);
    try {
      const result = await apiRequest("/api/approval-request", {
        method: "POST",
        body: JSON.stringify({
          type: "duplicate_quote",
          email: contact.properties.email,
          contactName:
            `${contact.properties.firstname || ""} ${contact.properties.lastname || ""}`.trim() ||
            contact.properties.email,
          requestedBy: user?.email,
          reason: `Creating additional quote for existing contact: ${contact.properties.email}`,
          contactData: contact,
        }),
      });
      if (result.success) {
        setHasRequestedApproval(true);
        setIsApprovalDialogOpen(true);
        setShowExistingQuotesModal(false);
        toast({
          title: "Approval Requested",
          description: "Request sent to admins. Check Slack for approval code.",
        });
      } else {
        throw new Error(result.message || "Failed to send approval request");
      }
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Failed to request approval. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingApproval(false);
    }
  };

  const proceedToClientDetails = (contact: any) => {
    form.setValue("contactEmail", contact.properties.email || "");
    if (contact.properties.company) {
      form.setValue("companyName", contact.properties.company);
      form.setValue("companyNameLocked", true);
    }
    if (contact.properties.firstname) {
      form.setValue("contactFirstName", contact.properties.firstname);
      form.setValue("contactFirstNameLocked", true);
    }
    if (contact.properties.lastname) {
      form.setValue("contactLastName", contact.properties.lastname);
      form.setValue("contactLastNameLocked", true);
    }
    if (contact.properties.industry) {
      form.setValue("industry", contact.properties.industry);
      form.setValue("industryLocked", true);
    }
    if (contact.properties.monthly_revenue_range) {
      form.setValue("monthlyRevenueRange", contact.properties.monthly_revenue_range);
    }
    if (contact.properties.entity_type) {
      form.setValue("entityType", contact.properties.entity_type);
    }
    form.setValue("clientStreetAddress", contact.properties.address || "");
    form.setValue("clientCity", contact.properties.city || "");
    form.setValue("clientState", contact.properties.state || "");
    form.setValue("clientZipCode", contact.properties.zip || "");
    const hasCompleteAddressData =
      contact.properties.address &&
      contact.properties.city &&
      contact.properties.state &&
      contact.properties.zip;
    form.setValue("companyAddressLocked", !!hasCompleteAddressData);
    setShowExistingQuotesModal(false);
    setHubspotVerificationStatus("verified");
    setHubspotContact(contact);
    setShowClientDetails(true);
  };

  const onSubmit = async (data: FormData) => {
    if (existingQuotesForEmail.length > 0) {
      toast({
        title: "Approval Required",
        description: "You must get approval before creating additional quotes for this contact.",
        variant: "destructive",
      });
      return;
    }
    if (!isCalculated) {
      toast({
        title: "Calculation Required",
        description: "Please fill in all fields to calculate fees before saving.",
        variant: "destructive",
      });
      return;
    }
    await saveQuote(data);
  };

  return (
    <>
      <div className="min-h-screen theme-seed-dark bg-gradient-to-br from-[#253e31] to-[#75c29a] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <UniversalNavbar showBackButton={true} fallbackPath="/" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {!showClientDetails && (
                <StartNewQuoteCard
                  triggerEmail={triggerEmail}
                  setTriggerEmail={setTriggerEmail}
                  showLiveResults={showLiveResults}
                  setShowLiveResults={setShowLiveResults}
                  liveSearchResults={liveSearchResults}
                  isLiveSearching={isLiveSearching}
                  onContactClick={handleContactSelection}
                  onEmailTrigger={handleEmailTrigger}
                  liveSearchContacts={liveSearchContacts}
                />
              )}

              <ContactSearchModal
                open={showContactSearch}
                onOpenChange={setShowContactSearch}
                triggerEmail={triggerEmail}
                contactSearchTerm={contactSearchTerm}
                setContactSearchTerm={setContactSearchTerm}
                searchHubSpotContacts={searchHubSpotContacts}
                isContactSearching={isContactSearching}
                hubspotContacts={hubspotContacts}
                onContactSelect={handleContactSelection}
                onCreateNewQuote={() => {
                  form.setValue("contactEmail", triggerEmail);
                  setShowContactSearch(false);
                  setShowClientDetails(true);
                }}
              />

              {showClientDetails && (
                <>
                  <ContactSection
                    control={form.control}
                    hubspotVerificationStatus={hubspotVerificationStatus}
                    hubspotContact={hubspotContact}
                    onEmailChange={debouncedVerifyEmail}
                  />

                  <ServiceCards
                    selectedServices={{
                      serviceMonthlyBookkeeping: !!form.watch("serviceMonthlyBookkeeping"),
                      serviceCleanupProjects: !!form.watch("serviceCleanupProjects"),
                      serviceTaasMonthly: !!form.watch("serviceTaasMonthly"),
                      servicePriorYearFilings: !!form.watch("servicePriorYearFilings"),
                      serviceCfoAdvisory: !!form.watch("serviceCfoAdvisory"),
                      servicePayrollService: !!form.watch("servicePayrollService"),
                      serviceApArService: !!form.watch("serviceApArService"),
                      serviceArService: !!form.watch("serviceArService"),
                      serviceApLite: false,
                      serviceArLite: false,
                      serviceApAdvanced: false,
                      serviceArAdvanced: false,
                      serviceFpaBuild: !!form.watch("serviceFpaBuild"),
                      serviceFpaSupport: !!form.watch("serviceFpaSupport"),
                      serviceAgentOfService: !!form.watch("serviceAgentOfService"),
                      serviceNexusStudy: !!form.watch("serviceNexusStudy"),
                      serviceEntityOptimization: !!form.watch("serviceEntityOptimization"),
                      serviceCostSegregation: !!form.watch("serviceCostSegregation"),
                      serviceRdCredit: !!form.watch("serviceRdCredit"),
                      serviceRealEstateAdvisory: !!form.watch("serviceRealEstateAdvisory"),
                    }}
                    onServiceChange={(updates) => {
                      const allowed = new Set([
                        "serviceMonthlyBookkeeping",
                        "serviceCleanupProjects",
                        "serviceTaasMonthly",
                        "servicePriorYearFilings",
                        "serviceCfoAdvisory",
                        "servicePayrollService",
                        "serviceApArService",
                        "serviceArService",
                        "serviceFpaBuild",
                        "serviceFpaSupport",
                        "serviceAgentOfService",
                        "serviceNexusStudy",
                        "serviceEntityOptimization",
                        "serviceCostSegregation",
                        "serviceRdCredit",
                        "serviceRealEstateAdvisory",
                      ]);
                      Object.entries(updates).forEach(([k, v]) => {
                        if (allowed.has(k)) form.setValue(k as any, Boolean(v));
                      });
                      form.trigger();
                    }}
                    feeCalculation={{
                      includesBookkeeping: !!feeCalculation.includesBookkeeping,
                      includesTaas: !!feeCalculation.includesTaas,
                    }}
                  />

                  <div className="space-y-8">
                    <TaasSection
                      control={form.control}
                      currentFormView={actualFormView as "bookkeeping" | "taas"}
                      form={form}
                    />
                    <BookkeepingSection form={form} />
                    <BookkeepingCleanupSection control={form.control} form={form} />
                    <PriorYearFilingsSection control={form.control as any} form={form as any} />
                    <PayrollSection form={form} />
                    <APSection form={form} />
                    <ARSection form={form} />
                    <AgentOfServiceSection form={form} />
                    <CfoAdvisorySection control={form.control} form={form} />
                  </div>

                  {/* Pricing Summary should appear above Commission Preview per final screenshot */}
                  <div className="mt-6">
                    <QuoteSummarySection
                      form={form}
                      feeCalculation={feeCalculation}
                      isBreakdownExpanded={isBreakdownExpanded}
                      onToggleBreakdown={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
                    />
                  </div>

                  <QuoteActionsBar
                    onSave={() => {
                      form.handleSubmit(onSubmit)();
                    }}
                    onReset={() => {
                      if (hasUnsavedChanges || editingQuoteId !== null) {
                        setResetConfirmDialog(true);
                        return;
                      }
                      form.reset();
                    }}
                    isSaveDisabled={creating || !isCalculated}
                    saveLabel={
                      creating ? "Saving..." : editingQuoteId ? "Update Quote" : "Save Quote"
                    }
                    showHubspotButton={isCalculated}
                    onPushToHubSpot={hubspotSync.onPushToHubSpot}
                    isPushDisabled={hubspotSync.isPushDisabled}
                    pushLabel={hubspotSync.pushLabel}
                    showNotFoundAlert={hubspotVerificationStatus === "not-found" && isCalculated}
                    editingQuoteId={editingQuoteId}
                    hasUnsavedChanges={hasUnsavedChanges}
                  />

                  {showClientDetails && (
                    <div className="mt-6">
                      <CommissionPreview
                        setupFee={feeCalculation.combined.setupFee}
                        monthlyFee={feeCalculation.combined.monthlyFee}
                      />
                    </div>
                  )}
                </>
              )}

              <ExistingQuotesModal
                open={showExistingQuotesModal}
                onOpenChange={setShowExistingQuotesModal}
                selectedContact={selectedContact}
                existingQuotesForEmail={existingQuotesForEmail}
                onQuoteClick={(quote: any) => {
                  loadQuoteIntoForm(quote);
                  setShowContactSearch(false);
                  setShowClientDetails(true);
                }}
                onPrimaryAction={() => {
                  if (existingQuotesForEmail.length > 0) {
                    requestNewQuoteApproval(selectedContact);
                  } else {
                    setShowExistingQuotesModal(false);
                    proceedToClientDetails(selectedContact);
                  }
                }}
                primaryActionLabel={
                  existingQuotesForEmail.length > 0
                    ? "Request Approval for New Quote"
                    : "Create New Quote"
                }
                infoMessage={existingQuotesInfoMessage || undefined}
              />

              <ApprovalCodeDialog
                open={isApprovalDialogOpen}
                onOpenChange={setIsApprovalDialogOpen}
                approvalCode={approvalCode}
                setApprovalCode={setApprovalCode}
                isValidating={isValidatingCode}
                onValidate={validateApprovalCode}
              />
            </form>
          </Form>
        </div>
      </div>
    </>
  );
}

export default QuoteCalculator;

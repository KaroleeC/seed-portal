import {
  quoteFormSchema,
  type QuoteFormFields,
  currentMonth,
} from "@/features/quote-calculator/schema";
import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Quote } from "@shared/schema";
import { calculateCombinedFees, calculateQuotePricing } from "@shared/pricing";
import type { PricingConfig as SimplePricingConfig } from "@shared/pricing";
import { usePricingConfig } from "@/hooks/usePricingConfig";
import { useCalculatorContent } from "@/hooks/useCalculatorContent";
import { mapQuoteToFormServices, getAllServices } from "@shared/services";

import { apiRequest, queryClient } from "@/lib/queryClient";
import { archiveQuote as archiveQuoteApi, checkExistingQuotes } from "@/services/quotes";
import {
  verifyContact as verifyHubspotContact,
  searchContacts as searchHubspotContactsApi,
} from "@/services/hubspot";

import { useToast } from "@/hooks/use-toast";
import { Form } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { QuoteSummarySection } from "@/components/seedqc/QuoteSummarySection";
import { ExistingQuotesModal } from "@/components/seedqc/ExistingQuotesModal";
import { ApprovalCodeDialog } from "@/components/seedqc/ApprovalCodeDialog";
import { StartNewQuoteCard } from "@/components/seedqc/StartNewQuoteCard";
import { ContactSearchModal } from "@/components/seedqc/ContactSearchModal";
import { QuoteActionsBar } from "@/components/seedqc/QuoteActionsBar";
import { ServiceCards } from "@/components/quote-form/ServiceCards";
import { ContactSection } from "@/components/quote-form/ContactSection";
import { FormNavigation } from "@/components/quote-form/FormNavigation";
import { TaasSection } from "@/components/quote-form/TaasSection";
import { PriorYearFilingsSection } from "@/components/quote-form/PriorYearFilingsSection";
import { BookkeepingCleanupSection } from "@/components/quote-form/BookkeepingCleanupSection";
import { CfoAdvisorySection } from "@/components/quote-form/CfoAdvisorySection";
import PayrollSection from "@/components/quote-form/PayrollSection";
import APSection from "@/components/quote-form/APSection";
import ARSection from "@/components/quote-form/ARSection";
import AgentOfServiceSection from "@/components/quote-form/AgentOfServiceSection";
import { useQuotes } from "@/hooks/use-quotes";
import type { FeeCalculation } from "@/components/seedqc/types";
import { useHubSpotSync } from "@/features/quote-calculator/hooks/useHubSpotSync";
import { useQuotePersistence } from "@/features/quote-calculator/hooks/useQuotePersistence";
import { useMutation } from "@tanstack/react-query";
import QuoteCalculatorContainer from "@/features/quote-calculator/QuoteCalculator";

// Typed form data
type FormData = QuoteFormFields;

function QuoteCalculator() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Duplicate quote approval system state
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalCode, setApprovalCode] = useState("");
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [hasRequestedApproval, setHasRequestedApproval] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  // Archive dialog state
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedQuoteForArchive, setSelectedQuoteForArchive] = useState<{
    id: number;
    email: string;
  } | null>(null);
  const [dontShowArchiveDialog, setDontShowArchiveDialog] = useState(() => {
    return localStorage.getItem("dontShowArchiveDialog") === "true";
  });

  // HubSpot integration state
  const [hubspotVerificationStatus, setHubspotVerificationStatus] = useState<
    "idle" | "verifying" | "verified" | "not-found"
  >("idle");
  const [hubspotContact, setHubspotContact] = useState<any>(null);
  const [lastVerifiedEmail, setLastVerifiedEmail] = useState("");

  // Existing quotes state
  const [existingQuotesForEmail, setExistingQuotesForEmail] = useState<Quote[]>([]);
  const [existingQuotesInfoMessage, setExistingQuotesInfoMessage] = useState<string | null>(null);
  const [showExistingQuotesNotification, setShowExistingQuotesNotification] = useState(false);

  // Custom dialog states
  const [resetConfirmDialog, setResetConfirmDialog] = useState(false);
  const [discardChangesDialog, setDiscardChangesDialog] = useState(false);
  const [pendingQuoteToLoad, setPendingQuoteToLoad] = useState<Quote | null>(null);
  const [unlockConfirmDialog, setUnlockConfirmDialog] = useState(false);
  const [fieldsLocked, setFieldsLocked] = useState(false);

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
  // Hoisted UI state for render sections to comply with hooks rules
  const [showAllBanks, setShowAllBanks] = useState(false);
  const [isAddingAdditionalBanks, setIsAddingAdditionalBanks] = useState(false);
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

  // Load pricing config and calculator content (SOW/agreement)
  const { data: pricingConfig } = usePricingConfig();
  useCalculatorContent(); // prefetch for later use in compose/send flows

  // Map DB-backed pricing config to shared simple config accepted by calculateQuotePricing
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

  // Form navigation state
  const [currentFormView, setCurrentFormView] = useState<"bookkeeping" | "taas" | "placeholder">(
    "placeholder"
  );

  // Helper functions for navigation (defined after feeCalculation)

  // Navigation functions will be defined after feeCalculation

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
      // Service selections - using correct field names
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
      qboSubscription: false,
      serviceTier: "Standard",
      // Agent of Service defaults
      serviceAgentOfService: false,
      agentOfServiceAdditionalStates: 0,
      agentOfServiceComplexCase: false,
      approvalCode: "",
    },
  });

  // Query to fetch all quotes (centralized hook)
  const { data: allQuotes = [], refetch: refetchQuotes } = useQuotes({
    search: searchTerm,
    sortField,
    sortOrder,
  });

  // Use extracted persistence hook
  const { hasUnsavedChanges, clearUnsavedChanges, saveQuote, creating, setHasUnsavedChanges } =
    useQuotePersistence({
      form,
      mappedPricingConfig,
      editingQuoteId,
      setEditingQuoteId,
      refetchQuotes,
    });

  // Calculate fees for HubSpot sync hook (needs to be before hook call)
  const watchedValues = form.getValues();
  let feeCalculation: FeeCalculation;
  try {
    const rawCalc: any = mappedPricingConfig
      ? calculateQuotePricing(watchedValues as any, mappedPricingConfig)
      : calculateCombinedFees(watchedValues as any);
    feeCalculation = {
      combined: {
        monthlyFee: Number(rawCalc?.combined?.monthlyFee) || 0,
        setupFee: Number(rawCalc?.combined?.setupFee) || 0,
      },
      bookkeeping: {
        monthlyFee: Number(rawCalc?.bookkeeping?.monthlyFee) || 0,
        setupFee: Number(rawCalc?.bookkeeping?.setupFee) || 0,
      },
      taas: {
        monthlyFee: Number(rawCalc?.taas?.monthlyFee) || 0,
        setupFee: Number(rawCalc?.taas?.setupFee) || 0,
      },
      priorYearFilingsFee: Number(rawCalc?.priorYearFilingsFee) || 0,
      cleanupProjectFee: Number(rawCalc?.cleanupProjectFee) || 0,
      cfoAdvisoryFee: Number(rawCalc?.cfoAdvisoryFee) || 0,
      payrollFee: Number(rawCalc?.payrollFee) || 0,
      apFee: Number(rawCalc?.apFee) || 0,
      arFee: Number(rawCalc?.arFee) || 0,
      agentOfServiceFee: Number(rawCalc?.agentOfServiceFee) || 0,
      serviceTierFee: Number(rawCalc?.serviceTierFee) || 0,
      qboFee: Number(rawCalc?.qboFee) || 0,
      includesBookkeeping: Boolean(rawCalc?.includesBookkeeping),
      includesTaas: Boolean(rawCalc?.includesTaas),
    } as FeeCalculation;
  } catch (err) {
    console.error("feeCalculation error, using safe defaults:", err);
    feeCalculation = {
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

  const isCalculated = (() => {
    const hasMonthlyFees = feeCalculation.combined.monthlyFee > 0;
    const hasSetupFees = feeCalculation.combined.setupFee > 0;
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

  // Use extracted HubSpot sync hook
  const {
    onPushToHubSpot,
    isPushDisabled,
    pushLabel,
    pushToHubSpotMutation,
    updateHubSpotMutation,
  } = useHubSpotSync({
    form,
    feeCalculation,
    editingQuoteId,
    hasUnsavedChanges,
    allQuotes,
    isCalculated,
    hubspotVerificationStatus,
    creating,
    refetchQuotes,
    saveQuote,
    clearUnsavedChanges,
  });

  // Archive quote mutation
  const archiveQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      return await archiveQuoteApi(quoteId);
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
      console.error("Archive error:", error);
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
    localStorage.setItem("dontShowArchiveDialog", checked.toString());
  };

  // HubSpot email verification with proper debouncing
  const verifyHubSpotEmail = async (email: string) => {
    if (!email || email === lastVerifiedEmail) return;

    // Clear any pending verification timeout
    if (verificationTimeoutId) {
      clearTimeout(verificationTimeoutId);
    }

    setHubspotVerificationStatus("verifying");
    setLastVerifiedEmail(email);

    try {
      // Check for existing quotes and verify HubSpot contact in parallel
      const [hubspotResult, existingQuotesResult] = await Promise.all([
        verifyHubspotContact(email),
        checkExistingQuotes(email),
      ]);

      // Handle HubSpot verification
      if (hubspotResult.verified && hubspotResult.contact) {
        setHubspotVerificationStatus("verified");
        setHubspotContact(hubspotResult.contact);

        // Clear any email validation errors since HubSpot verification succeeded
        form.clearErrors("contactEmail");

        // Auto-fill company name if available
        if (hubspotResult.contact.properties.company && !form.getValues("companyName")) {
          form.setValue("companyName", hubspotResult.contact.properties.company);
        }
      } else {
        setHubspotVerificationStatus("not-found");
        setHubspotContact(null);
      }

      // Handle existing quotes with HubSpot existence verification
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
          // Fallback to legacy behavior if verified array not present
          setExistingQuotesForEmail(existingQuotesResult.quotes || []);
          setShowExistingQuotesNotification((existingQuotesResult.quotes || []).length > 0);
          if ((existingQuotesResult.quotes || []).length > 0) setSearchTerm(email);
        }
      } else {
        setExistingQuotesForEmail([]);
        setShowExistingQuotesNotification(false);
      }
    } catch (error) {
      console.error("Error verifying email:", error);
      setHubspotVerificationStatus("not-found");
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
    setHubspotVerificationStatus("idle");

    // Set new timeout
    const timeoutId = setTimeout(() => {
      if (email && email.includes("@") && email.includes(".")) {
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
      const data = await searchHubspotContactsApi(searchTerm);
      setLiveSearchResults(data.contacts || []);
    } catch (error) {
      console.error("Error in live search:", error);
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
      const data = await searchHubspotContactsApi(searchTerm);
      setHubspotContacts(data.contacts || []);
    } catch (error) {
      console.error("Error searching HubSpot contacts:", error);
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
    console.log("Contact selected:", contact);
    setSelectedContact(contact);
    setShowContactSearch(false);
    setShowLiveResults(false);

    // Search for existing quotes for this contact
    try {
      console.log("Searching for existing quotes for:", contact.properties.email);
      // Use BFF to check existing quotes AND verify HubSpot quote existence
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
        // Fallback to legacy behavior if verified array not present
        filtered = existing.quotes || [];
        setExistingQuotesInfoMessage(null);
      }
      console.log("Existing editable quotes found:", filtered);
      setExistingQuotesForEmail(filtered);
      // Always show existing quotes modal (even if empty) with "Create New Quote" option
      console.log("Showing existing quotes modal");
      setShowExistingQuotesModal(true);
    } catch (error) {
      console.error("Error fetching existing quotes:", error);
      setExistingQuotesForEmail([]);
      setExistingQuotesInfoMessage(null);
      // Still show the modal even if there's an error
      setShowExistingQuotesModal(true);
    }
  };

  // Request approval for creating new quote when existing quotes exist
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
      console.error("Approval request failed:", error);
      toast({
        title: "Request Failed",
        description: "Failed to request approval. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingApproval(false);
    }
  };

  // Function to populate form and proceed to client details
  const proceedToClientDetails = (contact: any) => {
    console.log("proceedToClientDetails called with contact:", contact);

    // Pre-populate form with contact data
    form.setValue("contactEmail", contact.properties.email || "");

    // Auto-lock fields that have data and set values
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

    // Map HubSpot company properties (industry, monthly revenue range, entity type)
    // These come from the associated company, not the contact
    if (contact.properties.industry) {
      form.setValue("industry", contact.properties.industry);
      form.setValue("industryLocked", true);
    }

    // Map HubSpot monthly_revenue_range (company property)
    if (contact.properties.monthly_revenue_range) {
      form.setValue("monthlyRevenueRange", contact.properties.monthly_revenue_range);
    }

    // Map HubSpot entity_type (company property)
    if (contact.properties.entity_type) {
      form.setValue("entityType", contact.properties.entity_type);
    }

    // Address fields - only lock if there's actual address data from HubSpot
    // Set address fields from HubSpot data
    form.setValue("clientStreetAddress", contact.properties.address || "");
    form.setValue("clientCity", contact.properties.city || "");
    form.setValue("clientState", contact.properties.state || "");
    form.setValue("clientZipCode", contact.properties.zip || "");

    // Only lock address if ALL required address fields are filled
    const hasCompleteAddressData =
      contact.properties.address &&
      contact.properties.city &&
      contact.properties.state &&
      contact.properties.zip;
    form.setValue("companyAddressLocked", !!hasCompleteAddressData);

    // Hide the existing quotes modal and show client details
    setShowExistingQuotesModal(false);

    // Auto-set verification status to verified since contact is from HubSpot
    setHubspotVerificationStatus("verified");
    setHubspotContact(contact);

    setShowClientDetails(true);
  };

  // Helper functions for navigation (defined after feeCalculation)
  const getActiveServices = () => {
    const services: ("bookkeeping" | "taas")[] = [];
    if (feeCalculation.includesBookkeeping) services.push("bookkeeping");
    if (feeCalculation.includesTaas) services.push("taas");
    return services;
  };

  // Determine what form to show based on active services
  const getFormViewToShow = () => {
    const activeServices = getActiveServices();
    if (activeServices.length === 0) return "placeholder";
    if (currentFormView === "placeholder" || !activeServices.includes(currentFormView)) {
      return activeServices[0]; // Show first active service
    }
    return currentFormView;
  };

  const actualFormView = getFormViewToShow();

  const canNavigateLeft = () => {
    if (actualFormView === "placeholder") return false;
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(actualFormView as "bookkeeping" | "taas");
    return currentIndex > 0;
  };

  const canNavigateRight = () => {
    if (actualFormView === "placeholder") return false;
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(actualFormView as "bookkeeping" | "taas");
    return currentIndex < activeServices.length - 1;
  };

  const navigateLeft = () => {
    if (actualFormView === "placeholder") return;
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(actualFormView as "bookkeeping" | "taas");
    if (currentIndex > 0) {
      const next = activeServices[currentIndex - 1] ?? "placeholder";
      setCurrentFormView(next as "bookkeeping" | "taas" | "placeholder");
    }
  };

  const navigateRight = () => {
    if (actualFormView === "placeholder") return;
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(actualFormView as "bookkeeping" | "taas");
    if (currentIndex < activeServices.length - 1) {
      const next = activeServices[currentIndex + 1] ?? "placeholder";
      setCurrentFormView(next as "bookkeeping" | "taas" | "placeholder");
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
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
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
    console.log("Loading quote into form:", quote);
    setEditingQuoteId(quote.id);

    // Set approval state before form reset
    setIsApproved(quote.approvalRequired || false);

    // Reset form with quote data and auto-lock populated fields
    const formData = {
      contactEmail: quote.contactEmail,
      monthlyTransactions: quote.monthlyTransactions,
      industry: quote.industry,
      cleanupMonths: quote.cleanupMonths,
      cleanupComplexity: parseFloat(quote.cleanupComplexity).toString(), // Convert "1.00" to "1"
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
      // Auto-lock fields that have data
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
      // Quote type and service flags
      quoteType: quote.quoteType || "bookkeeping",
      includesBookkeeping: quote.includesBookkeeping ?? true,
      includesTaas: quote.includesTaas ?? false,
      // ALL comprehensive service selections (automatically mapped from service registry)
      ...mapQuoteToFormServices(quote),
      // Service-specific configuration fields
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
      // TaaS-specific fields (ensure proper type conversion)
      numEntities: quote.numEntities ? Number(quote.numEntities) : 1,
      statesFiled: quote.statesFiled ? Number(quote.statesFiled) : 1,
      internationalFiling: quote.internationalFiling ?? false,
      numBusinessOwners: quote.numBusinessOwners ? Number(quote.numBusinessOwners) : 1,
      bookkeepingQuality: quote.bookkeepingQuality || "Clean (Seed)",
      include1040s: quote.include1040s ?? false,
      priorYearsUnfiled: quote.priorYearsUnfiled ? Number(quote.priorYearsUnfiled) : 0,
      priorYearFilings: quote.priorYearFilings || [],
      qboSubscription: quote.qboSubscription ?? false,
      // Cleanup periods
      cleanupPeriods: quote.cleanupPeriods || [],
    };

    console.log("Loading quote into form:", quote.id);

    form.reset(formData);

    // Force trigger and individual field updates to ensure all form fields update properly
    setTimeout(() => {
      // Force update individual TaaS fields to ensure Select components render correctly
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

    // Reset HubSpot verification state and re-verify if email exists
    setHubspotVerificationStatus("idle");
    setHubspotContact(null);
    setLastVerifiedEmail("");

    // Re-verify the email if it exists
    if (quote.contactEmail) {
      debouncedVerifyEmail(quote.contactEmail);
    }

    // Set the appropriate form view based on the quote's services (delayed to ensure form reset completes)
    setTimeout(() => {
      // Use service registry to intelligently determine form view
      const selectedServices = mapQuoteToFormServices(quote);
      const allServices = getAllServices();

      // Check for bookkeeping services
      const hasBookkeepingServices =
        selectedServices.serviceMonthlyBookkeeping || selectedServices.serviceCleanupProjects;

      // Check for TaaS services
      const hasTaasServices =
        selectedServices.serviceTaasMonthly || selectedServices.servicePriorYearFilings;

      // Check for other services
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
        // Default to bookkeeping view if bookkeeping services or no clear preference
        setCurrentFormView("bookkeeping");
      } else if (hasTaasServices) {
        // TaaS services detected
        setCurrentFormView("taas");
      } else {
        // Other services - default to bookkeeping view
        setCurrentFormView("bookkeeping");
      }
    }, 150);

    setHasUnsavedChanges(false);
  };

  // Helper function to actually reset the form (used by both direct reset and after dialog confirmation)
  const doResetForm = () => {
    setEditingQuoteId(null);
    form.reset({
      contactEmail: "",
      monthlyTransactions: "",
      industry: "",
      cleanupMonths: currentMonth,
      cleanupComplexity: "",

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
      entityType: "S-Corp",
      numEntities: 1,
      statesFiled: 1,
      internationalFiling: false,
      numBusinessOwners: 1,
      bookkeepingQuality: "Clean (Seed)",
      include1040s: false,
      priorYearsUnfiled: 0,
      serviceTier: "Standard",
      // Reset Agent of Service fields
      serviceAgentOfService: false,
      agentOfServiceAdditionalStates: 0,
      agentOfServiceComplexCase: false,
    });

    // Reset all HubSpot verification state
    setHubspotVerificationStatus("idle");
    setHubspotContact(null);
    setLastVerifiedEmail("");
    setIsApproved(false);
    setHasRequestedApproval(false);
    form.setValue("customSetupFee", "");

    // Reset existing quotes state
    setExistingQuotesForEmail([]);
    setShowExistingQuotesNotification(false);

    // Clear search term to show all quotes again
    setSearchTerm("");

    // Reset form view to default (bookkeeping)
    setCurrentFormView("bookkeeping");

    setHasUnsavedChanges(false);
  };

  // Request approval code from server and send Slack notification
  const requestApproval = async () => {
    setIsRequestingApproval(true);
    try {
      const formData = form.getValues();

      // Check if this is for duplicate quotes or cleanup override
      if (existingQuotesForEmail.length > 0) {
        // This is a duplicate quote approval request
        const result = await apiRequest("/api/approval-request", {
          method: "POST",
          body: JSON.stringify({
            type: "duplicate_quote",
            email: formData.contactEmail,
            contactName: `${formData.contactFirstName} ${formData.contactLastName}`,
            requestedBy: user?.email || "Unknown",
            reason: "Additional quote requested for existing contact",
            contactData: formData,
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
      } else {
        // This is a cleanup override approval request (existing logic)
        const fees = calculateCombinedFees(formData as any);

        // Include custom setup fee if "Other" reason is selected
        const setupFee =
          formData.overrideReason === "Other" && formData.customSetupFee
            ? parseFloat(formData.customSetupFee)
            : fees.bookkeeping.setupFee;

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
              monthlyFee: (fees as any)?.combined?.monthlyFee ?? 0,
              setupFee,
              originalCleanupMonths: currentMonth, // Include original minimum
            },
          }),
        });

        if (result) {
          setHasRequestedApproval(true);
          toast({
            title: "Approval Requested",
            description: "Check Slack for the approval code.",
          });
          setIsApprovalDialogOpen(true);
        } else {
          throw new Error("Failed to request approval");
        }
      }
    } catch (error) {
      console.error("Error requesting approval:", error);
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
      // Get the email from form or selectedContact
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
        body: JSON.stringify({
          code: approvalCode,
          contactEmail,
        }),
      });

      if (result.valid) {
        // For duplicate quote approval, proceed to client details
        if (selectedContact) {
          setIsApprovalDialogOpen(false);
          // Store the validated approval code in form before clearing it
          form.setValue("approvalCode", approvalCode);
          setApprovalCode("");
          toast({
            title: "Approval Granted",
            description: "Proceeding to quote calculator.",
          });
          proceedToClientDetails(selectedContact);
        } else {
          // For any other approval validation, also update the form
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
      console.error("Error validating approval code:", error);
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

  const onSubmit = async (data: FormData) => {
    console.log("onSubmit called with data:", data);

    // Check if duplicate quote approval is required
    if (existingQuotesForEmail.length > 0) {
      toast({
        title: "Approval Required",
        description: "You must get approval before creating additional quotes for this contact.",
        variant: "destructive",
      });
      return;
    }

    if (!isCalculated) {
      console.log("Form not calculated, isCalculated:", isCalculated);
      toast({
        title: "Calculation Required",
        description: "Please fill in all fields to calculate fees before saving.",
        variant: "destructive",
      });
      return;
    }

    // Cleanup override logic removed

    console.log("Submitting quote via saveQuote");
    saveQuote(data);
  };

  // Remove the old breakdown function since it's now handled in the calculation logic above

  return (
    <>
      <div className="min-h-screen theme-seed-dark bg-gradient-to-br from-[#253e31] to-[#75c29a] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <UniversalNavbar showBackButton={true} fallbackPath="/" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Email Trigger Section - Standalone starter */}
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

              {/* HubSpot Contact Search Modal */}
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

              {/* Main Total Display - Clickable for detailed breakdown */}
              {showClientDetails && isCalculated && (
                <QuoteSummarySection
                  form={form}
                  feeCalculation={feeCalculation}
                  isBreakdownExpanded={isBreakdownExpanded}
                  onToggleBreakdown={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
                />
              )}

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
                      // Options not represented in form schema; keep false placeholders
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
                        if (allowed.has(k)) {
                          form.setValue(k as any, Boolean(v));
                        }
                      });
                      form.trigger();
                    }}
                    feeCalculation={{
                      includesBookkeeping: !!feeCalculation.includesBookkeeping,
                      includesTaas: !!feeCalculation.includesTaas,
                    }}
                  />

                  <FormNavigation
                    activeServices={getActiveServices()}
                    currentFormView={actualFormView as "bookkeeping" | "taas"}
                    onViewChange={(v) => setCurrentFormView(v)}
                  />

                  {/* Service-specific sections */}
                  <TaasSection
                    control={form.control}
                    currentFormView={actualFormView as "bookkeeping" | "taas"}
                    form={form}
                  />
                  <BookkeepingCleanupSection control={form.control} form={form} />
                  <PriorYearFilingsSection control={form.control as any} form={form as any} />
                  <PayrollSection form={form} />
                  <APSection form={form} />
                  <ARSection form={form} />
                  <AgentOfServiceSection form={form} />
                  <CfoAdvisorySection control={form.control} form={form} />

                  <QuoteActionsBar
                    onSave={() => {
                      console.log("Save button clicked");
                      console.log("Form values:", form.getValues());
                      console.log("Form errors:", form.formState.errors);
                      form.handleSubmit(onSubmit)();
                    }}
                    onReset={resetForm}
                    isSaveDisabled={creating || !isCalculated}
                    saveLabel={
                      creating ? "Saving..." : editingQuoteId ? "Update Quote" : "Save Quote"
                    }
                    showHubspotButton={isCalculated}
                    onPushToHubSpot={onPushToHubSpot}
                    isPushDisabled={isPushDisabled}
                    pushLabel={pushLabel}
                    showNotFoundAlert={hubspotVerificationStatus === "not-found" && isCalculated}
                    editingQuoteId={editingQuoteId}
                    hasUnsavedChanges={hasUnsavedChanges}
                  />
                </>
              )}

              {/* Existing Quotes Modal */}
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

              {/* Approval Code Dialog */}
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

export default function HomePage() {
  return <QuoteCalculatorContainer />;
}

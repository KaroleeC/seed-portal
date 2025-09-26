import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KbCard } from "@/components/seedkb/KbCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Calendar,
  Target,
  Users,
  Award,
  Zap,
  Trophy,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Star,
  Gift,
  PlusCircle,
  Eye,
  Bell,
  User,
  Settings,
  LogOut,
  Filter,
  Download,
  Search,
  ExternalLink,
  Edit,
  FileText,
  Calculator,
  Building2,
  CreditCard,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calculateMonthlyBonus,
  calculateMilestoneBonus,
  getNextMilestone,
  calculateTotalEarnings,
} from "@shared/commission-calculator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useDealsByOwner } from "@/hooks/useDeals";
import { useToast } from "@/hooks/use-toast";

interface Commission {
  id: string;
  dealId: string;
  dealName: string;
  companyName: string;
  serviceType: string;
  type: "month_1" | "residual";
  monthNumber: number;
  amount: number;
  status: "pending" | "approved" | "paid" | "disputed";
  dateEarned: string;
  datePaid?: string;
  salesRep?: string;
}

// Removed unused interfaces

interface SalesRepStats {
  totalCommissionsEarned: number;
  totalClientsClosedMonthly: number;
  totalClientsClosedAllTime: number;
  currentPeriodCommissions: number;
  projectedEarnings: number;
}

interface PipelineDeal {
  projectedCommission?: number;
}

export function SalesCommissionTracker() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  // Helper type and function to get current period dates (14th to 13th)
  interface CurrentPeriod {
    periodStart: string;
    periodEnd: string;
    paymentDate: string;
  }

  const getCurrentPeriod = (): CurrentPeriod => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth(); // 0-based (0 = January, 7 = August)
    const currentYear = now.getFullYear();

    // Commission period runs from 14th to 13th of the next month
    // If today is the 14th or later, we're in the new period
    // If today is before the 14th, we're still in the previous period
    let periodStart, periodEnd, paymentDate;

    if (currentDay >= 14) {
      // We're in the period that started on the 14th of this month
      periodStart = new Date(currentYear, currentMonth, 14);
      periodEnd = new Date(currentYear, currentMonth + 1, 13);
      paymentDate = new Date(currentYear, currentMonth + 1, 15);
    } else {
      // We're still in the period that started on the 14th of last month
      periodStart = new Date(currentYear, currentMonth - 1, 14);
      periodEnd = new Date(currentYear, currentMonth, 13);
      paymentDate = new Date(currentYear, currentMonth, 15);
    }

    return {
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      paymentDate: paymentDate.toISOString().slice(0, 10),
    };
  };

  const [currentPeriod, setCurrentPeriod] = useState<CurrentPeriod>(getCurrentPeriod());

  // Update current period on mount and when date changes
  useEffect(() => {
    // Check if period needs updating every time component mounts
    const newPeriod = getCurrentPeriod();
    setCurrentPeriod(newPeriod);

    // Also check periodically (every minute) in case date changes while page is open
    const interval = setInterval(() => {
      const updatedPeriod = getCurrentPeriod();
      setCurrentPeriod(updatedPeriod);
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // State
  const [salesRepStats, setSalesRepStats] = useState<SalesRepStats>({
    totalCommissionsEarned: 0,
    totalClientsClosedMonthly: 0,
    totalClientsClosedAllTime: 0,
    currentPeriodCommissions: 0,
    projectedEarnings: 0,
  });

  // Fetch real commission data from API
  const {
    data: liveCommissions = [],
    isLoading: commissionsLoading,
    error: commissionsError,
  } = useQuery<Commission[]>({
    queryKey: ["/api/commissions"],
    enabled: !!user,
    queryFn: async ({ queryKey }) => {
      const result = await apiRequest<Commission[]>("GET", "/api/commissions");
      // Handle null response from 401 gracefully
      return result || [];
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  // Centralized deals by HubSpot owner (sales rep ≡ owner)
  const ownerId = user?.hubspotUserId || undefined;
  const {
    data: dealsResult,
    isLoading: dealsLoading,
    error: dealsError,
  } = useDealsByOwner(ownerId, {
    enabled: !!ownerId,
    limit: 100,
  });

  // Fetch pipeline projections filtered by owner for accuracy and performance
  const {
    data: pipelineDeals = [],
    isLoading: pipelineLoading,
    error: pipelineError,
  } = useQuery<PipelineDeal[]>({
    queryKey: ["/api/pipeline-projections", ownerId ?? "none"],
    enabled: !!user,
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (ownerId) qs.set("ownerId", ownerId);
      const url = `/api/pipeline-projections${qs.toString() ? `?${qs.toString()}` : ""}`;
      const result = await apiRequest<PipelineDeal[]>("GET", url);
      // Handle null response from 401 gracefully
      return result || [];
    },
    staleTime: 30000,
  });

  // Dialog states
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [commissionHistoryModalOpen, setCommissionHistoryModalOpen] =
    useState(false);
  const [commissionDetailsModalOpen, setCommissionDetailsModalOpen] =
    useState(false);
  const [selectedCommission, setSelectedCommission] =
    useState<Commission | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  const { toast } = useToast();

  // Define loading states for bonus tracking sections
  const monthlyBonusesLoading = commissionsLoading || dealsLoading;
  const milestoneBonusesLoading = commissionsLoading || pipelineLoading;

  // Service type icon function - properly memoized as a direct function
  const getServiceTypeIcon = useCallback((serviceType: string) => {
    const icons = {
      bookkeeping: <Calculator className="w-4 h-4 text-blue-600" />,
      "bookkeeping + taas": (
        <div className="flex gap-1">
          <Calculator className="w-3 h-3 text-blue-600" />
          <Building2 className="w-3 h-3 text-purple-600" />
        </div>
      ),
      taas: <Building2 className="w-4 h-4 text-purple-600" />,
      payroll: <CreditCard className="w-4 h-4 text-green-600" />,
      "ap/ar lite": <FileText className="w-4 h-4 text-orange-600" />,
      "fp&a lite": <BarChart3 className="w-4 h-4 text-red-600" />,
      mixed: (
        <div className="flex gap-1">
          <Calculator className="w-3 h-3 text-blue-600" />
          <Building2 className="w-3 h-3 text-purple-600" />
        </div>
      ),
    };

    return (
      icons[serviceType as keyof typeof icons] || (
        <Calculator className="w-4 h-4 text-muted-foreground" />
      )
    );
  }, []);

  // Process real API data - memoized userName to prevent infinite loops
  const userName = useMemo(() => {
    return `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  }, [user?.firstName, user?.lastName]);

  // Memoized commission processing to prevent infinite loops
  const processedCommissions = useMemo<Commission[]>(() => {
    const list = (liveCommissions ?? []) as Commission[];
    if (list.length === 0 || !user) return [];

    return (list as any[])
      .filter((invoice: any) => {
        // Build expected user name variations for better matching
        const firstName = user.firstName || "";
        const lastName = user.lastName || "";
        const fullName = `${firstName} ${lastName}`.trim();
        const salesRepName = invoice.salesRep || "";

        // Filter by sales rep name - try multiple matching strategies
        const matchesUser =
          salesRepName === fullName ||
          salesRepName === userName ||
          salesRepName === `${firstName} ${lastName}` ||
          salesRepName === `${lastName} ${firstName}` ||
          (firstName &&
            salesRepName.toLowerCase().includes(firstName.toLowerCase())) ||
          (lastName &&
            salesRepName.toLowerCase().includes(lastName.toLowerCase()));
        return matchesUser;
      })
      .map(
        (invoice: any): Commission => ({
          id: invoice.id?.toString() || "unknown",
          dealId:
            invoice.dealId?.toString() || invoice.id?.toString() || "unknown",
          dealName: invoice.companyName || "Unknown",
          companyName: invoice.companyName || "Unknown Company",
          serviceType: invoice.serviceType || "bookkeeping",
          type:
            invoice.type === "First Month"
              ? ("month_1" as const)
              : ("residual" as const),
          monthNumber: invoice.monthNumber || 1,
          amount: parseFloat(invoice.amount?.toString() || "0"),
          status: (invoice.status || "pending").toLowerCase() as
            | "pending"
            | "approved"
            | "paid"
            | "disputed",
          dateEarned:
            invoice.dateEarned ||
            invoice.invoiceDate ||
            new Date().toISOString().slice(0, 10),
          datePaid: invoice.datePaid || undefined,
          salesRep: invoice.salesRep || userName,
        }),
      );
  }, [liveCommissions, user?.firstName, user?.lastName, userName]);

  // Directly use processed commissions instead of causing cascading state updates
  // Remove the useEffect that was causing infinite loops
  // setCommissions is now only used by user actions, not automatic updates
  // Filter to only show current period commissions in the main table
  const displayCommissions: Commission[] = processedCommissions.filter(
    (c: Commission) =>
      c.dateEarned >= currentPeriod.periodStart &&
      c.dateEarned <= currentPeriod.periodEnd,
  );

  // Memoized stats calculation
  const calculatedStats = useMemo(() => {
    if (processedCommissions.length === 0) {
      return {
        totalCommissionsEarned: 0,
        totalClientsClosedMonthly: 0,
        totalClientsClosedAllTime: 0,
        currentPeriodCommissions: 0,
        projectedEarnings: 0,
      };
    }

    // Calculate real metrics based on filtered data
    const currentPeriodCommissions = processedCommissions
      .filter(
        (c: Commission) =>
          c.dateEarned >= currentPeriod.periodStart &&
          c.dateEarned <= currentPeriod.periodEnd,
      )
      .reduce((sum: number, c: Commission) => sum + c.amount, 0);

    // Total earnings should only include approved/paid commissions from previous periods
    const totalPaidEarnings = processedCommissions
      .filter(
        (c: Commission) =>
          (c.status === "approved" || c.status === "paid") &&
          c.dateEarned < currentPeriod.periodStart,
      )
      .reduce((sum: number, c: Commission) => sum + c.amount, 0);

    // Count unique clients closed this period for bonuses
    const currentPeriodClients = new Set(
      processedCommissions
        .filter(
          (c: Commission) =>
            c.dateEarned >= currentPeriod.periodStart &&
            c.dateEarned <= currentPeriod.periodEnd,
        )
        .map((c: Commission) => c.companyName),
    ).size;

    // Count total clients all time (from all commissions for milestone tracking)
    const totalClientsAllTime = new Set(
      processedCommissions.map((c: Commission) => c.companyName),
    ).size;

    // Calculate projected earnings from pipeline projections
    // With ownerId filtering at the API, include all returned deals
    const projectedFromPipeline = pipelineDeals.reduce(
      (sum: number, deal: PipelineDeal) =>
        sum + (deal.projectedCommission || 0),
      0,
    );

    return {
      totalCommissionsEarned: totalPaidEarnings,
      totalClientsClosedMonthly: currentPeriodClients,
      totalClientsClosedAllTime: totalClientsAllTime,
      currentPeriodCommissions: currentPeriodCommissions,
      projectedEarnings: projectedFromPipeline,
    };
  }, [
    processedCommissions,
    pipelineDeals,
    user?.firstName,
    user?.lastName,
    userName,
    currentPeriod,
  ]);

  // Directly use calculated stats instead of causing cascading state updates
  const displayStats = calculatedStats;

  // Removed unused deals processing logic

  // Helper function - properly memoized as a direct function
  const getStatusBadge = useCallback((status: string) => {
    const variants = {
      pending: (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          Pending
        </Badge>
      ),
      approved: (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Approved
        </Badge>
      ),
      paid: (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Paid
        </Badge>
      ),
      disputed: (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          Disputed
        </Badge>
      ),
    };

    return (
      variants[status as keyof typeof variants] || (
        <Badge variant="outline">{status}</Badge>
      )
    );
  }, []);

  // Calculate bonus eligibility using display stats
  const monthlyBonusEligibility = calculateMonthlyBonus(
    displayStats.totalClientsClosedMonthly,
  );
  const milestoneBonusEligibility = calculateMilestoneBonus(
    displayStats.totalClientsClosedAllTime,
  );
  const nextMilestone = getNextMilestone(
    displayStats.totalClientsClosedAllTime,
  );
  const totalEarnings = calculateTotalEarnings(
    displayStats.totalCommissionsEarned,
    [],
    [],
  );

  // Event handlers - memoized to prevent infinite re-renders
  const handleRequestAdjustment = useCallback((commission: Commission) => {
    setSelectedCommission(commission);
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setAdjustmentDialogOpen(true);
  }, []); // No dependencies needed as it only sets state

  const handleViewCommissionDetails = useCallback((commission: Commission) => {
    setSelectedCommission(commission);
    setCommissionDetailsModalOpen(true);
  }, []); // No dependencies needed as it only sets state

  const handleSubmitAdjustment = useCallback(async () => {
    if (!selectedCommission || !adjustmentReason.trim()) return;

    setSubmittingAdjustment(true);

    try {
      const adjustmentData = {
        commissionId: selectedCommission.id,
        originalAmount: selectedCommission.amount,
        requestedAmount: adjustmentAmount
          ? parseFloat(adjustmentAmount)
          : selectedCommission.amount,
        reason: adjustmentReason,
      };

      await apiRequest("/api/commission-adjustments", {
        method: "POST",
        body: JSON.stringify(adjustmentData),
      });

      // Show success message
      toast({
        title: "Adjustment Request Submitted",
        description:
          "Your commission adjustment request has been submitted for review.",
      });

      // Close dialog and reset form
      setAdjustmentDialogOpen(false);
      setSelectedCommission(null);
      setAdjustmentAmount("");
      setAdjustmentReason("");

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
    } catch (error) {
      console.error("Error submitting adjustment request:", error);
      toast({
        title: "Error",
        description: "Failed to submit adjustment request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingAdjustment(false);
    }
  }, [
    selectedCommission,
    adjustmentAmount,
    adjustmentReason,
    toast,
    queryClient,
  ]); // Dependencies for async function

  // Check for authentication errors
  const hasAuthError =
    commissionsError?.message?.includes("401") ||
    commissionsError?.message?.includes("Authentication") ||
    dealsError?.message?.includes("401") ||
    dealsError?.message?.includes("Authentication") ||
    pipelineError?.message?.includes("401") ||
    pipelineError?.message?.includes("Authentication");

  // Show authentication error fallback
  if (hasAuthError) {
    return (
      <div className="min-h-screen theme-seed-dark bg-gradient-to-br from-[#253e31] to-[#75c29a]">
        <UniversalNavbar />

        <div className="container mx-auto px-4 py-8">
          <KbCard className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center mb-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Authentication Required
              </h2>
              <p className="text-muted-foreground mb-6">
                There was an issue loading your commission data. This usually
                happens when your session has expired.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full bg-[#253e31] hover:bg-[#1a2e24] text-white"
                >
                  Refresh Page
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/auth")}
                  className="w-full"
                >
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </KbCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-seed-dark bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <UniversalNavbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-end mb-8">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button
              size="sm"
              data-testid="button-view-history"
              onClick={() => setCommissionHistoryModalOpen(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View All History
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <KbCard data-testid="card-current-period">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Current Period
                  </p>
                  {commissionsLoading ? (
                    <div className="text-2xl font-bold text-blue-600">
                      Loading...
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-blue-600">
                      $
                      {(
                        displayStats.currentPeriodCommissions || 0
                      ).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(currentPeriod.periodStart).toLocaleDateString()} -{" "}
                    {new Date(currentPeriod.periodEnd).toLocaleDateString()}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </KbCard>

          <KbCard data-testid="card-total-earnings">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Earnings
                  </p>
                  {commissionsLoading ? (
                    <div className="text-2xl font-bold text-green-600">
                      Loading...
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-green-600">
                      $
                      {(
                        displayStats.totalCommissionsEarned || 0
                      ).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">All time</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </KbCard>

          <KbCard data-testid="card-pending">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Approval
                  </p>
                  {commissionsLoading ? (
                    <div className="text-2xl font-bold text-orange-600">
                      Loading...
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-orange-600">
                      $
                      {displayCommissions
                        .filter((c) => c.status === "pending")
                        .reduce((sum, c) => sum + (c.amount || 0), 0)
                        .toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {
                      displayCommissions.filter((c) => c.status === "pending")
                        .length
                    }{" "}
                    items
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </KbCard>

          <KbCard data-testid="card-projected">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Projected Earnings
                  </p>
                  {commissionsLoading ? (
                    <div className="text-2xl font-bold text-purple-600">
                      Loading...
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-purple-600">
                      $
                      {(displayStats.projectedEarnings || 0).toLocaleString(
                        "en-US",
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Pending commissions
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </KbCard>
        </div>

        {/* Commission History - Primary Focus */}
        <KbCard className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Commission History
                </CardTitle>
                <CardDescription>
                  View and manage all your commission earnings
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommissionHistoryModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {commissionsLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-pulse text-muted-foreground">
                  Loading commissions...
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Month</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Earned</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayCommissions.slice(0, 5).map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell className="font-medium">
                            <div>
                              <p className="font-semibold">
                                {commission.dealName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {commission.companyName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getServiceTypeIcon(commission.serviceType)}
                              <span className="capitalize">
                                {commission.serviceType}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                commission.type === "month_1"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {commission.type === "month_1"
                                ? "First Month"
                                : `Month ${commission.monthNumber}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {commission.monthNumber}
                          </TableCell>
                          <TableCell className="font-semibold">
                            $
                            {commission.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(commission.status)}
                          </TableCell>
                          <TableCell>
                            {new Date(
                              commission.dateEarned,
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() =>
                                  handleViewCommissionDetails(commission)
                                }
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Details
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() =>
                                  handleRequestAdjustment(commission)
                                }
                              >
                                Request Adjustment
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {displayCommissions.length > 5 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Showing {Math.min(5, displayCommissions.length)} of{" "}
                      {displayCommissions.length} commissions
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </KbCard>

        {/* Bonus Tracking Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Bonus Tracking */}
          <KbCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-orange-600" />
                Monthly Bonus Progress
              </CardTitle>
              <CardDescription>
                Track your monthly client goals and bonus eligibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {monthlyBonusesLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-pulse text-muted-foreground">
                    Loading bonus data...
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Clients Closed This Month</span>
                      <span className="font-medium">
                        {displayStats.totalClientsClosedMonthly}
                      </span>
                    </div>
                    <Progress
                      value={
                        (displayStats.totalClientsClosedMonthly / 15) * 100
                      }
                      className="h-2"
                    />
                  </div>

                  {monthlyBonusEligibility && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-800">
                          Bonus Eligible!
                        </span>
                      </div>
                      <p className="text-sm text-green-700">
                        {monthlyBonusEligibility.description}
                      </p>
                      <p className="text-lg font-bold text-green-800">
                        ${monthlyBonusEligibility.amount}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>5 Clients</span>
                      <span>$500 or AirPods</span>
                    </div>
                    <div className="flex justify-between">
                      <span>10 Clients</span>
                      <span>$1,000 or Apple Watch</span>
                    </div>
                    <div className="flex justify-between">
                      <span>15+ Clients</span>
                      <span>$1,500 or MacBook Air</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </KbCard>

          {/* Milestone Bonus Tracking */}
          <KbCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Milestone Progress
              </CardTitle>
              <CardDescription>
                Track lifetime client milestones and major bonuses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {milestoneBonusesLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-pulse text-muted-foreground">
                    Loading milestone data...
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        Progress to {nextMilestone.nextMilestone} Clients
                      </span>
                      <span className="font-medium">
                        {displayStats.totalClientsClosedAllTime}/
                        {nextMilestone.nextMilestone}
                      </span>
                    </div>
                    <Progress value={nextMilestone.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {nextMilestone.remaining} clients remaining
                    </p>
                  </div>

                  {/* Show last achievement if user has reached a milestone */}
                  {salesRepStats.totalClientsClosedAllTime >= 25 && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-yellow-600" />
                        <span className="font-medium text-yellow-800">
                          Last Achievement
                        </span>
                      </div>
                      <p className="text-sm text-yellow-700">
                        25 Client Milestone
                      </p>
                      <p className="text-lg font-bold text-yellow-800">
                        $1,000 Bonus
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>25 Clients</span>
                      <span>$1,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>40 Clients</span>
                      <span>$5,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>60 Clients</span>
                      <span>$7,500</span>
                    </div>
                    <div className="flex justify-between">
                      <span>100 Clients</span>
                      <span>$10,000 + Equity</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </KbCard>
        </div>

        {/* Commission History Modal */}
        <Dialog
          open={commissionHistoryModalOpen}
          onOpenChange={setCommissionHistoryModalOpen}
        >
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Complete Commission History</DialogTitle>
              <DialogDescription>
                View all your commission earnings and manage adjustments
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto max-h-[60vh]">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Earned</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedCommissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p className="font-medium">
                              {commission.companyName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {commission.dealName}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getServiceTypeIcon(commission.serviceType)}
                            <span className="capitalize">
                              {commission.serviceType}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {commission.type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{commission.monthNumber}</TableCell>
                        <TableCell className="font-medium">
                          $
                          {commission.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(commission.status)}
                        </TableCell>
                        <TableCell>
                          {new Date(commission.dateEarned).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              setCommissionHistoryModalOpen(false);
                              handleRequestAdjustment(commission);
                            }}
                          >
                            Request Adjustment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter>
              <div className="flex items-center justify-between w-full">
                <div className="text-sm text-muted-foreground">
                  Total: {processedCommissions.length} commission entries
                </div>
                <Button onClick={() => setCommissionHistoryModalOpen(false)}>
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Commission Details Modal */}
        <Dialog
          open={commissionDetailsModalOpen}
          onOpenChange={setCommissionDetailsModalOpen}
        >
          <DialogContent
            className="sm:max-w-[700px]"
            data-testid="dialog-commission-details"
          >
            <DialogHeader>
              <DialogTitle>Commission Details</DialogTitle>
              <DialogDescription>
                {selectedCommission &&
                  `Details for ${selectedCommission.dealName}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCommission && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Company
                        </Label>
                        <p className="text-lg font-semibold">
                          {selectedCommission.companyName}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Deal Name
                        </Label>
                        <p className="text-lg font-semibold">
                          {selectedCommission.dealName}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Service Type
                        </Label>
                        <div className="flex items-center gap-2">
                          {getServiceTypeIcon(selectedCommission.serviceType)}
                          <span className="capitalize">
                            {selectedCommission.serviceType.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Commission Type
                        </Label>
                        <Badge
                          variant={
                            selectedCommission.type === "month_1"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {selectedCommission.type === "month_1"
                            ? "First Month"
                            : `Month ${selectedCommission.monthNumber}`}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Status
                        </Label>
                        {getStatusBadge(selectedCommission.status)}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Date Earned
                        </Label>
                        <p>
                          {new Date(
                            selectedCommission.dateEarned,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Commission Breakdown
                    </Label>
                    <div className="grid grid-cols-1 gap-4 mt-2">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Commission Amount
                        </p>
                        <p className="text-xl font-bold text-blue-600">
                          $
                          {selectedCommission.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedCommission.type === "month_1"
                            ? "First month commission (40% of monthly fee)"
                            : "Residual commission (2% of monthly fee)"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedCommission.datePaid && (
                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Payment Information
                      </Label>
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">
                          Date Paid
                        </p>
                        <p className="font-semibold">
                          {new Date(
                            selectedCommission.datePaid,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCommissionDetailsModalOpen(false)}
                data-testid="button-close-commission-details"
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCommissionDetailsModalOpen(false);
                  handleRequestAdjustment(selectedCommission!);
                }}
                disabled={selectedCommission?.status === "paid"}
                data-testid="button-create-adjustment-from-details"
              >
                <Edit className="w-4 h-4 mr-2" />
                Request Adjustment
              </Button>
              {selectedCommission && (
                <Button asChild data-testid="button-view-hubspot-deal">
                  <a
                    href={`https://app.hubspot.com/contacts/deal/${selectedCommission.dealId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View in HubSpot
                  </a>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adjustment Request Dialog */}
        <Dialog
          open={adjustmentDialogOpen}
          onOpenChange={setAdjustmentDialogOpen}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Request Commission Adjustment</DialogTitle>
              <DialogDescription>
                Submit a request to adjust the commission amount for this deal.
              </DialogDescription>
            </DialogHeader>

            {selectedCommission && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg border">
                  <h4 className="font-semibold">
                    {selectedCommission.companyName}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedCommission.dealName}
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    Current Amount: $
                    {selectedCommission.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjustment-amount">
                    Requested Amount (optional)
                  </Label>
                  <Input
                    id="adjustment-amount"
                    type="number"
                    step="0.01"
                    placeholder="Leave blank if not requesting amount change"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjustment-reason">
                    Reason for Adjustment *
                  </Label>
                  <Textarea
                    id="adjustment-reason"
                    placeholder="Please explain why this adjustment is needed..."
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAdjustmentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAdjustment}
                disabled={!adjustmentReason.trim() || submittingAdjustment}
                data-testid="button-submit-adjustment"
              >
                {submittingAdjustment ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default SalesCommissionTracker;

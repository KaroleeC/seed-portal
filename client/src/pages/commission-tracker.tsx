import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SurfaceCard } from "@/components/ds/SurfaceCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { useQuery } from "@tanstack/react-query";
import { seedpayKeys } from "@/lib/queryKeys";
import { useCommissionSummary } from "@/hooks/useCommissionSummary";
import { useSalesRepMe } from "@/hooks/useSalesRepMe";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  calculateProjectedCommission,
} from "@shared/commission-calculator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useDealsByOwner } from "@/hooks/useDeals";

interface Commission {
  id: string;
  dealName: string;
  serviceType: "bookkeeping" | "taas" | "combined";
  type: "month_1" | "residual";
  amount: number;
  monthNumber: number;
  status: "pending" | "processing" | "paid";
  dateEarned: string;
  datePaid?: string;
  companyName: string;
  salesRep: string;
  dealId: string;
  hubspotDealId?: string;
}

interface Deal {
  id: string;
  dealName: string;
  companyName: string;
  amount: number;
  setupFee: number;
  monthlyFee: number;
  status: "open" | "closed_won" | "closed_lost";
  closedDate?: string;
  serviceType: "bookkeeping" | "taas" | "combined";
  salesRep: string;
  hubspotDealId?: string;
  pipelineStage?: string;
  probability?: number;
}

interface MonthlyBonus {
  id: string;
  month: string;
  clientsClosedCount: number;
  bonusAmount: number;
  bonusType: "cash" | "airpods" | "apple_watch" | "macbook_air";
  status: "pending" | "processing" | "paid";
  dateEarned: string;
  datePaid?: string;
  salesRep: string;
}

interface MilestoneBonus {
  id: string;
  milestone: number;
  bonusAmount: number;
  includesEquity: boolean;
  status: "pending" | "processing" | "paid";
  dateEarned: string;
  datePaid?: string;
  salesRep: string;
}

interface SalesRepStats {
  totalClientsClosedMonthly: number;
  totalClientsClosedAllTime: number;
  currentMonthDeals: number;
  pipelineValue: number;
  projectedCommissions: number;
}

interface SalesRep {
  id: string;
  name: string;
  email: string;
  hubspotUserId?: string;
  totalCommissions: number;
  currentPeriodCommissions: number;
  projectedCommissions: number;
  isActive: boolean;
}

interface AdjustmentRequest {
  id: string;
  commissionId: string;
  salesRep: string;
  originalAmount: number;
  requestedAmount: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
  reviewNotes?: string;
}

interface CommissionPeriod {
  id: string;
  periodStart: string; // 14th of month
  periodEnd: string; // 13th of next month
  status: "active" | "closed" | "processing";
  totalPaid: number;
  totalPending: number;
  payrollDate: string; // 15th of month after period ends
}

export default function CommissionTracker() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  // State management
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [monthlyBonuses, setMonthlyBonuses] = useState<MonthlyBonus[]>([]);
  const [milestoneBonuses, setMilestoneBonuses] = useState<MilestoneBonus[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [adjustmentRequests, setAdjustmentRequests] = useState<AdjustmentRequest[]>([]);
  const [commissionPeriods, setCommissionPeriods] = useState<CommissionPeriod[]>([]);

  // Filter and search states
  const [selectedSalesRep, setSelectedSalesRep] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedAdjustmentRequest, setSelectedAdjustmentRequest] =
    useState<AdjustmentRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [dealDetailsDialogOpen, setDealDetailsDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Fetch user's sales rep profile first
  const { data: currentSalesRep, isLoading: salesRepLoading } = useSalesRepMe();

  // Fetch commission data for current user only
  const { data: commissionData = [], isLoading: commissionsLoading } = useQuery({
    queryKey: seedpayKeys.commissions.list(currentSalesRep?.id),
    queryFn: async () => {
      if (!currentSalesRep?.id) return [];
      return await apiRequest<Commission[]>(
        "GET",
        `/api/apps/seedpay/commissions?salesRepId=${currentSalesRep.id}`
      );
    },
    enabled: !!currentSalesRep?.id,
  });

  // Use centralized Deals BFF filtered by HubSpot owner (sales rep ≡ owner)
  const ownerId = user?.hubspotUserId || undefined;
  const { data: dealsResult, isLoading: dealsLoading } = useDealsByOwner(ownerId, {
    enabled: !!ownerId,
    limit: 100,
  });

  const { data: monthlyBonusData = [], isLoading: monthlyBonusLoading } = useQuery({
    queryKey: seedpayKeys.bonuses.monthly(currentSalesRep?.id),
    queryFn: async () => {
      if (!currentSalesRep?.id) return [];
      return await apiRequest<MonthlyBonus[]>(
        "GET",
        `/api/apps/seedpay/monthly-bonuses?salesRepId=${currentSalesRep.id}`
      );
    },
    enabled: !!currentSalesRep?.id,
  });

  const { data: milestoneBonusData = [], isLoading: milestoneBonusLoading } = useQuery({
    queryKey: seedpayKeys.bonuses.milestone(currentSalesRep?.id),
    queryFn: async () => {
      if (!currentSalesRep?.id) return [];
      return await apiRequest<MilestoneBonus[]>(
        "GET",
        `/api/apps/seedpay/milestone-bonuses?salesRepId=${currentSalesRep.id}`
      );
    },
    enabled: !!currentSalesRep?.id,
  });

  // Fetch current period commission summary (from centrally processed data)
  const { data: hubspotCommissionData = null, isLoading: hubspotLoading } = useCommissionSummary();

  // Set the fetched data to state
  useEffect(() => {
    if (commissionData) {
      setCommissions(commissionData);
    }
  }, [commissionData]);

  useEffect(() => {
    const normalizedDeals = dealsResult?.deals || [];
    if (Array.isArray(normalizedDeals)) {
      const transformed: Deal[] = normalizedDeals.map(
        (d: {
          id?: string | number;
          name?: string;
          companyName?: string;
          amount?: string | number;
          stage?: string;
          closeDate?: string;
        }) => ({
          id: String(d.id),
          dealName: d.name || "Untitled Deal",
          companyName: d.companyName || "Unknown Company",
          amount: Number(d.amount) || 0,
          setupFee: 0,
          monthlyFee: 0,
          status:
            typeof d.stage === "string" && /won/i.test(d.stage)
              ? "closed_won"
              : typeof d.stage === "string" && /lost/i.test(d.stage)
                ? "closed_lost"
                : "open",
          closedDate: d.closeDate || undefined,
          serviceType: "bookkeeping",
          salesRep: "Unknown Rep",
          hubspotDealId: String(d.id),
          pipelineStage: d.stage || undefined,
          probability: undefined,
        })
      );
      setDeals(transformed);
    }
  }, [dealsResult]);

  useEffect(() => {
    if (monthlyBonusData) {
      setMonthlyBonuses(monthlyBonusData);
    }
  }, [monthlyBonusData]);

  useEffect(() => {
    if (milestoneBonusData) {
      setMilestoneBonuses(milestoneBonusData);
    }
  }, [milestoneBonusData]);

  useEffect(() => {
    if (currentSalesRep) {
      setSalesReps([
        {
          id: String(currentSalesRep.id),
          name: currentSalesRep.name || user?.email?.split("@")[0] || "Unknown",
          email: currentSalesRep.email || user?.email || "unknown@email.com",
          hubspotUserId: currentSalesRep.hubspotUserId || undefined,
          totalCommissions: 0,
          currentPeriodCommissions: 0,
          projectedCommissions: 0,
          isActive: true,
        },
      ]);
    }
  }, [currentSalesRep, user?.email]);

  // Calculate commission periods dynamically (14th to 13th cycle)
  useEffect(() => {
    const getCurrentPeriod = () => {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const currentDay = today.getDate();

      let periodStartMonth, periodStartYear, periodEndMonth, periodEndYear;

      if (currentDay >= 14) {
        // We're in the current period (14th of this month to 13th of next month)
        periodStartMonth = currentMonth;
        periodStartYear = currentYear;
        periodEndMonth = currentMonth + 1;
        periodEndYear = currentYear;

        // Handle year rollover
        if (periodEndMonth > 11) {
          periodEndMonth = 0;
          periodEndYear = currentYear + 1;
        }
      } else {
        // We're in the previous period (14th of last month to 13th of this month)
        periodStartMonth = currentMonth - 1;
        periodStartYear = currentYear;
        periodEndMonth = currentMonth;
        periodEndYear = currentYear;

        // Handle year rollover
        if (periodStartMonth < 0) {
          periodStartMonth = 11;
          periodStartYear = currentYear - 1;
        }
      }

      const periodStart = new Date(periodStartYear, periodStartMonth, 14);
      const periodEnd = new Date(periodEndYear, periodEndMonth, 13);
      const payrollDate = new Date(periodEndYear, periodEndMonth, 15);

      return {
        periodStart: periodStart.toISOString().slice(0, 10),
        periodEnd: periodEnd.toISOString().slice(0, 10),
        payrollDate: payrollDate.toISOString().slice(0, 10),
      };
    };

    const currentPeriodDates = getCurrentPeriod();
    const currentPeriodCommissions: CommissionPeriod[] = [
      {
        id: "1",
        periodStart: currentPeriodDates.periodStart,
        periodEnd: currentPeriodDates.periodEnd,
        status: "active",
        totalPaid: 0,
        totalPending: 0, // Will be calculated from real data
        payrollDate: currentPeriodDates.payrollDate,
      },
    ];

    // Adjustment requests placeholder until backend implemented
    const sampleAdjustmentRequests: AdjustmentRequest[] = [];

    setCommissionPeriods(currentPeriodCommissions);
    setAdjustmentRequests(sampleAdjustmentRequests);
  }, []);

  // Calculate key metrics for admin dashboard - memoized to prevent infinite re-renders
  const currentPeriod = useMemo<CommissionPeriod>(() => {
    return (
      commissionPeriods.find((p) => p.status === "active") ||
      commissionPeriods[0] || {
        id: "0",
        periodStart: new Date().toISOString().slice(0, 10),
        periodEnd: new Date().toISOString().slice(0, 10),
        status: "active",
        totalPaid: 0,
        totalPending: 0,
        payrollDate: new Date().toISOString().slice(0, 10),
      }
    );
  }, [commissionPeriods]);

  // Use HubSpot data for current period if available, otherwise fall back to database data
  const totalCurrentPeriodCommissions = useMemo(() => {
    if (hubspotCommissionData !== null) {
      return hubspotCommissionData.total_commissions;
    }

    if (!currentPeriod || !currentPeriod.periodStart || !currentPeriod.periodEnd) {
      return 0;
    }

    return commissions
      .filter(
        (c) => c.dateEarned >= currentPeriod.periodStart && c.dateEarned <= currentPeriod.periodEnd
      )
      .reduce((sum, c) => sum + c.amount, 0);
  }, [hubspotCommissionData, commissions, currentPeriod]);

  const totalPendingCommissions = useMemo(() => {
    return commissions.filter((c) => c.status === "pending").reduce((sum, c) => sum + c.amount, 0);
  }, [commissions]);

  const totalProcessingCommissions = useMemo(() => {
    return commissions
      .filter((c) => c.status === "processing")
      .reduce((sum, c) => sum + c.amount, 0);
  }, [commissions]);

  // Calculate projected commissions based on pipeline
  const projectedCommissions = useMemo(() => {
    return deals
      .filter((d) => d.status === "open" && d.probability)
      .reduce((sum, d) => {
        const proj = calculateProjectedCommission(
          d.setupFee || 0,
          d.monthlyFee || 0,
          d.serviceType || "bookkeeping"
        );
        // For dashboard purposes, project the first-month commission weighted by probability
        return sum + proj.firstMonth * ((d.probability || 0) / 100);
      }, 0);
  }, [deals]);

  // Sales rep stats and bonuses/milestones wiring (mechanical, no UI change)
  const { totalClientsClosedMonthly, totalClientsClosedAllTime } = useMemo(() => {
    // Determine current calendar month range
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    // Unique deals closed (month_1) by dealId
    const closedThisMonthIds = new Set(
      commissions
        .filter((c) => c.type === "month_1")
        .filter((c) => {
          const d = new Date(c.dateEarned);
          return d >= monthStart && d <= monthEnd;
        })
        .map((c) => c.dealId)
    );
    const allClosedIds = new Set(
      commissions.filter((c) => c.type === "month_1").map((c) => c.dealId)
    );
    return {
      totalClientsClosedMonthly: closedThisMonthIds.size,
      totalClientsClosedAllTime: allClosedIds.size,
    };
  }, [commissions]);

  const monthlyBonusEligibility = useMemo(() => {
    return calculateMonthlyBonus(totalClientsClosedMonthly);
  }, [totalClientsClosedMonthly]);

  const nextMilestone = useMemo(() => {
    return getNextMilestone(totalClientsClosedAllTime);
  }, [totalClientsClosedAllTime]);

  const salesRepStats = useMemo(() => {
    return {
      totalClientsClosedMonthly,
      totalClientsClosedAllTime,
    } as Pick<SalesRepStats, "totalClientsClosedMonthly" | "totalClientsClosedAllTime"> &
      Partial<SalesRepStats>;
  }, [totalClientsClosedMonthly, totalClientsClosedAllTime]);

  // Filter commissions based on current filters - memoized to prevent infinite re-renders
  const filteredCommissions = useMemo(() => {
    return commissions.filter((commission) => {
      const matchesRep = selectedSalesRep === "all" || commission.salesRep === selectedSalesRep;
      const matchesStatus = statusFilter === "all" || commission.status === statusFilter;
      const matchesSearch =
        searchTerm === "" ||
        commission.dealName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commission.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commission.salesRep.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesRep && matchesStatus && matchesSearch;
    });
  }, [commissions, selectedSalesRep, statusFilter, searchTerm]);

  // Calculate sales rep performance metrics
  const getSalesRepMetrics = (repName: string) => {
    const repCommissions = commissions.filter((c) => c.salesRep === repName);
    const repDeals = deals.filter((d) => d.salesRep === repName);

    const currentPeriodCommissions = repCommissions
      .filter(
        (c) => c.dateEarned >= currentPeriod.periodStart && c.dateEarned <= currentPeriod.periodEnd
      )
      .reduce((sum, c) => sum + c.amount, 0);

    const firstMonthCommissions = repCommissions
      .filter((c) => c.type === "month_1")
      .reduce((sum, c) => sum + c.amount, 0);

    const residualCommissions = repCommissions
      .filter((c) => c.type === "residual")
      .reduce((sum, c) => sum + c.amount, 0);

    const pipelineValue = repDeals
      .filter((d) => d.status === "open")
      .reduce((sum, d) => sum + d.amount, 0);

    return {
      currentPeriodCommissions,
      firstMonthCommissions,
      residualCommissions,
      pipelineValue,
      totalCommissions: repCommissions.reduce((sum, c) => sum + c.amount, 0),
    };
  };

  // Helper functions for UI
  const getStatusBadge = (
    status:
      | Commission["status"]
      | MonthlyBonus["status"]
      | MilestoneBonus["status"]
      | AdjustmentRequest["status"]
  ) => {
    switch (status) {
      case "paid":
        return (
          <Badge
            className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200"
            data-testid="badge-paid"
          >
            Paid
          </Badge>
        );
      case "processing":
        return (
          <Badge
            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200"
            data-testid="badge-processing"
          >
            Processing
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-muted text-foreground hover:bg-muted" data-testid="badge-pending">
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200"
            data-testid="badge-approved"
          >
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-200"
            data-testid="badge-rejected"
          >
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-foreground hover:bg-muted" data-testid="badge-unknown">
            Unknown
          </Badge>
        );
    }
  };

  const getServiceTypeIcon = (serviceType: string) => {
    switch (serviceType) {
      case "bookkeeping":
        return <BarChart3 className="w-4 h-4" />;
      case "taas":
        return <Calendar className="w-4 h-4" />;
      case "combined":
        return <Star className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getPriorityIcon = (probability?: number) => {
    if (!probability) return <Clock className="w-4 h-4 text-muted-foreground" />;
    if (probability >= 75) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (probability >= 50) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  // Handler functions for admin actions
  const handleRequestAdjustment = (commission: Commission) => {
    setSelectedCommission(commission);
    setAdjustmentReason("");
    setAdjustmentAmount(commission.amount.toString());
    setAdjustmentDialogOpen(true);
  };

  const handleSubmitAdjustment = () => {
    if (!selectedCommission || !adjustmentReason) return;

    const newRequest: AdjustmentRequest = {
      id: `adj_${Date.now()}`,
      commissionId: selectedCommission.id,
      salesRep: selectedCommission.salesRep,
      originalAmount: selectedCommission.amount,
      requestedAmount: parseFloat(adjustmentAmount) || selectedCommission.amount,
      reason: adjustmentReason,
      status: "pending",
      requestedDate: new Date().toISOString().slice(0, 10),
    };

    setAdjustmentRequests((prev) => [...prev, newRequest]);
    setAdjustmentDialogOpen(false);
    setSelectedCommission(null);
    setAdjustmentReason("");
    setAdjustmentAmount("");
  };

  const handleReviewAdjustment = (request: AdjustmentRequest) => {
    setSelectedAdjustmentRequest(request);
    setReviewNotes("");
    setReviewDialogOpen(true);
  };

  const handleApproveAdjustment = () => {
    if (!selectedAdjustmentRequest) return;

    setAdjustmentRequests((prev) =>
      prev.map((req) =>
        req.id === selectedAdjustmentRequest.id
          ? {
              ...req,
              status: "approved",
              reviewedBy: user?.email || "Admin",
              reviewedDate: new Date().toISOString().slice(0, 10),
              reviewNotes,
            }
          : req
      )
    );

    // Update the commission amount
    setCommissions((prev) =>
      prev.map((comm) =>
        comm.id === selectedAdjustmentRequest.commissionId
          ? { ...comm, amount: selectedAdjustmentRequest.requestedAmount }
          : comm
      )
    );

    setReviewDialogOpen(false);
    setSelectedAdjustmentRequest(null);
    setReviewNotes("");
  };

  const handleRejectAdjustment = () => {
    if (!selectedAdjustmentRequest) return;

    setAdjustmentRequests((prev) =>
      prev.map((req) =>
        req.id === selectedAdjustmentRequest.id
          ? {
              ...req,
              status: "rejected",
              reviewedBy: user?.email || "Admin",
              reviewedDate: new Date().toISOString().slice(0, 10),
              reviewNotes,
            }
          : req
      )
    );

    setReviewDialogOpen(false);
    setSelectedAdjustmentRequest(null);
    setReviewNotes("");
  };

  const handleViewDealDetails = (dealId: string) => {
    const deal = deals.find((d) => d.id === dealId);
    if (deal) {
      setSelectedDeal(deal);
      setDealDetailsDialogOpen(true);
    }
  };

  return (
    <div className="min-h-screen page-bg theme-seed-dark">
      <div className="max-w-7xl mx-auto p-6">
        <UniversalNavbar showBackButton={true} fallbackPath="/admin" />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2" data-testid="page-title">
                Commission Tracking
              </h1>
              <p className="text-white/80">
                Current Period:{" "}
                {hubspotCommissionData
                  ? `${new Date(hubspotCommissionData.period_start).toLocaleDateString()} - ${new Date(hubspotCommissionData.period_end).toLocaleDateString()}`
                  : `${new Date(currentPeriod.periodStart).toLocaleDateString()} - ${new Date(currentPeriod.periodEnd).toLocaleDateString()}`}
                <span className="ml-4">
                  Next Payroll: {new Date(currentPeriod.payrollDate).toLocaleDateString()}
                </span>
                {hubspotCommissionData && (
                  <span className="ml-4 inline-flex items-center gap-1 text-green-200">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    Live HubSpot Data
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                data-testid="button-export"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button
                className="bg-white text-[#253e31] hover:bg-white/90"
                data-testid="button-process-payroll"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Process Payroll
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <SurfaceCard
            className="bg-white/95 backdrop-blur border-0 shadow-xl"
            data-testid="card-current-period"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Period Total</p>
                  <p className="text-2xl font-bold text-foreground">
                    $
                    {totalCurrentPeriodCommissions.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  {hubspotCommissionData && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <p>
                        {hubspotCommissionData.invoice_count} paid invoices •{" "}
                        {hubspotCommissionData.subscription_count} active subscriptions
                      </p>
                      {hubspotCommissionData.invoice_count === 0 &&
                        hubspotCommissionData.subscription_count === 0 && (
                          <p className="text-blue-600 mt-1 font-medium">
                            🎯 New: Commissions now based on actual invoice payments
                          </p>
                        )}
                    </div>
                  )}
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </SurfaceCard>

          <SurfaceCard
            className="bg-white/95 backdrop-blur border-0 shadow-xl"
            data-testid="card-pending"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    $
                    {totalPendingCommissions.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </SurfaceCard>

          <SurfaceCard
            className="bg-white/95 backdrop-blur border-0 shadow-xl"
            data-testid="card-processing"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold text-blue-600">
                    $
                    {totalProcessingCommissions.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </SurfaceCard>

          <SurfaceCard
            className="bg-white/95 backdrop-blur border-0 shadow-xl"
            data-testid="card-projected"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Projected</p>
                  <p className="text-2xl font-bold text-purple-600">
                    $
                    {projectedCommissions.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </SurfaceCard>

          <SurfaceCard
            className="bg-white/95 backdrop-blur border-0 shadow-xl"
            data-testid="card-adjustments"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Adjustments</p>
                  <p className="text-2xl font-bold text-red-600">
                    {adjustmentRequests.filter((req) => req.status === "pending").length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </SurfaceCard>
        </div>

        {/* Filters and Search */}
        <Card
          className="bg-white/95 backdrop-blur border-0 shadow-xl mb-8"
          data-testid="card-filters"
        >
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search deals, companies, or reps..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                  data-testid="input-search"
                />
              </div>
              <Select value={selectedSalesRep} onValueChange={setSelectedSalesRep}>
                <SelectTrigger className="w-48" data-testid="select-sales-rep">
                  <SelectValue placeholder="All Sales Reps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sales Reps</SelectItem>
                  {salesReps.map((rep) => (
                    <SelectItem key={rep.id} value={rep.name}>
                      {rep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="select-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40" data-testid="select-period">
                  <SelectValue placeholder="Current Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Period</SelectItem>
                  <SelectItem value="last">Last Period</SelectItem>
                  <SelectItem value="all">All Periods</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Tabbed Interface */}
        <Tabs defaultValue="commissions" className="space-y-6" data-testid="main-tabs">
          <TabsList
            className="bg-white/95 backdrop-blur border-0 shadow-xl"
            data-testid="tabs-list"
          >
            <TabsTrigger
              value="commissions"
              className="data-[state=active]:bg-[#253e31] data-[state=active]:text-white"
              data-testid="tab-commissions"
            >
              Commission Tracking
            </TabsTrigger>
            <TabsTrigger
              value="reps"
              className="data-[state=active]:bg-[#253e31] data-[state=active]:text-white"
              data-testid="tab-reps"
            >
              Sales Rep Performance
            </TabsTrigger>
            <TabsTrigger
              value="adjustments"
              className="data-[state=active]:bg-[#253e31] data-[state=active]:text-white"
              data-testid="tab-adjustments"
            >
              Adjustment Requests (
              {adjustmentRequests.filter((req) => req.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger
              value="pipeline"
              className="data-[state=active]:bg-[#253e31] data-[state=active]:text-white"
              data-testid="tab-pipeline"
            >
              Pipeline Projections
            </TabsTrigger>
          </TabsList>

          {/* Commission Tracking Tab */}
          <TabsContent value="commissions" data-testid="content-commissions">
            <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Commission Tracking - Current Period
                </CardTitle>
                <CardDescription>
                  Commissions earned between{" "}
                  {new Date(currentPeriod.periodStart).toLocaleDateString()} and{" "}
                  {new Date(currentPeriod.periodEnd).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table data-testid="table-commissions">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal / Company</TableHead>
                        <TableHead>Sales Rep</TableHead>
                        <TableHead>Service Type</TableHead>
                        <TableHead>Commission Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Earned</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCommissions.map((commission) => (
                        <TableRow
                          key={commission.id}
                          data-testid={`row-commission-${commission.id}`}
                        >
                          <TableCell className="font-medium">
                            <div>
                              <p className="font-semibold text-foreground">{commission.dealName}</p>
                              <p className="text-sm text-muted-foreground">
                                {commission.companyName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span>{commission.salesRep}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getServiceTypeIcon(commission.serviceType)}
                              <span className="capitalize">
                                {commission.serviceType.replace("_", " ")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">
                            {commission.type === "month_1"
                              ? "First Month"
                              : commission.monthNumber
                                ? `Month ${commission.monthNumber}`
                                : "Residual"}
                          </TableCell>
                          <TableCell className="font-semibold">
                            $
                            {commission.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>{getStatusBadge(commission.status)}</TableCell>
                          <TableCell>
                            {new Date(commission.dateEarned).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRequestAdjustment(commission)}
                                data-testid={`button-adjust-${commission.id}`}
                              >
                                <Edit className="w-4 h-4 mr-1" /> Adjust
                              </Button>
                              {commission.hubspotDealId && (
                                <Button variant="outline" size="sm" asChild>
                                  <a
                                    href={`https://app.hubspot.com/contacts/deal/${commission.hubspotDealId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Adjustment Requests Tab */}
          <TabsContent value="adjustments" data-testid="content-adjustments">
            <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Adjustment Requests
                </CardTitle>
                <CardDescription>
                  Review and approve commission adjustment requests from sales reps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table data-testid="table-adjustments">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sales Rep</TableHead>
                        <TableHead>Deal</TableHead>
                        <TableHead>Original Amount</TableHead>
                        <TableHead>Requested Amount</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Requested</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adjustmentRequests.map((request) => {
                        const commission = commissions.find((c) => c.id === request.commissionId);
                        return (
                          <TableRow key={request.id} data-testid={`row-adjustment-${request.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span>{request.salesRep}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {commission ? (
                                <div>
                                  <p className="font-semibold text-foreground">
                                    {commission.dealName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {commission.companyName}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Deal not found</span>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              $
                              {request.originalAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="font-semibold">
                              <span
                                className={
                                  request.requestedAmount > request.originalAmount
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                $
                                {request.requestedAmount.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {request.reason}
                              </p>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(request.status)}
                              {request.reviewedBy && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  By {request.reviewedBy}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(request.requestedDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {request.status === "pending" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReviewAdjustment(request)}
                                  data-testid={`button-review-${request.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Review
                                </Button>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {request.status === "approved" ? "Approved" : "Rejected"}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pipeline Projections Tab */}
          <TabsContent value="pipeline" data-testid="content-pipeline">
            <div className="space-y-6">
              {/* Pipeline Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card
                  className="bg-white/95 backdrop-blur border-0 shadow-xl"
                  data-testid="card-pipeline-total"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Pipeline Value
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          $
                          {deals
                            .filter((d) => d.status === "open")
                            .reduce((sum, d) => sum + d.amount, 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="bg-white/95 backdrop-blur border-0 shadow-xl"
                  data-testid="card-pipeline-weighted"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Weighted Pipeline
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          $
                          {deals
                            .filter((d) => d.status === "open" && d.probability)
                            .reduce((sum, d) => sum + d.amount * (d.probability! / 100), 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="bg-white/95 backdrop-blur border-0 shadow-xl"
                  data-testid="card-pipeline-commission"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Projected Commissions
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          $
                          {projectedCommissions.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pipeline Deals Table */}
              <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Pipeline Deals & Commission Projections
                  </CardTitle>
                  <CardDescription>
                    Future commission projections based on current pipeline and probability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table data-testid="table-pipeline">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Deal / Company</TableHead>
                          <TableHead>Sales Rep</TableHead>
                          <TableHead>Deal Value</TableHead>
                          <TableHead>Stage / Probability</TableHead>
                          <TableHead>Projected Commission</TableHead>
                          <TableHead>Setup Fee Commission</TableHead>
                          <TableHead>Monthly Commission</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deals
                          .filter((deal) => deal.status === "open")
                          .map((deal) => {
                            const firstMonthCommission =
                              deal.setupFee * 0.2 + deal.monthlyFee * 0.4;
                            const monthlyCommission = deal.monthlyFee * 0.1;
                            const projectedCommission =
                              firstMonthCommission * ((deal.probability || 0) / 100);

                            return (
                              <TableRow key={deal.id} data-testid={`row-pipeline-${deal.id}`}>
                                <TableCell className="font-medium">
                                  <div>
                                    <p className="font-semibold text-foreground">{deal.dealName}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {deal.companyName}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span>{deal.salesRep}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold">
                                  ${deal.amount.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {getPriorityIcon(deal.probability)}
                                    <div>
                                      <p className="text-sm font-medium">
                                        {deal.pipelineStage || "Unknown"}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {deal.probability || 0}% probability
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold text-green-600">
                                  $
                                  {projectedCommission.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <p className="font-medium">
                                      ${(deal.setupFee * 0.2).toLocaleString()}
                                    </p>
                                    <p className="text-muted-foreground">
                                      20% of ${deal.setupFee.toLocaleString()} setup fee
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <p className="font-medium">
                                      ${monthlyCommission.toLocaleString()}
                                    </p>
                                    <p className="text-muted-foreground">
                                      10% of ${deal.monthlyFee.toLocaleString()} monthly fee
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewDealDetails(deal.id)}
                                      data-testid={`button-view-pipeline-${deal.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    {deal.hubspotDealId && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        data-testid={`button-hubspot-pipeline-${deal.id}`}
                                      >
                                        <a
                                          href={`https://app.hubspot.com/contacts/deal/${deal.hubspotDealId}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Adjustment Request Dialog */}
        <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" data-testid="dialog-adjustment-request">
            <DialogHeader>
              <DialogTitle>Request Commission Adjustment</DialogTitle>
              <DialogDescription>
                {selectedCommission && `Requesting adjustment for ${selectedCommission.dealName}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCommission && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Current Amount:</span>
                      <p className="text-lg font-bold">
                        ${selectedCommission.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Commission Type:</span>
                      <p>
                        {selectedCommission.type === "month_1"
                          ? "First Month"
                          : `Month ${selectedCommission.monthNumber}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="adjustment-amount">New Amount (optional)</Label>
                <Input
                  id="adjustment-amount"
                  type="number"
                  step="0.01"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder={selectedCommission?.amount.toString()}
                  data-testid="input-adjustment-amount"
                />
              </div>

              <div>
                <Label htmlFor="adjustment-reason">Reason for Adjustment *</Label>
                <Textarea
                  id="adjustment-reason"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Please provide a detailed reason for this adjustment request..."
                  className="min-h-[100px]"
                  data-testid="textarea-adjustment-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAdjustmentDialogOpen(false)}
                data-testid="button-cancel-adjustment"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAdjustment}
                disabled={!adjustmentReason.trim()}
                data-testid="button-submit-adjustment"
              >
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review Adjustment Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]" data-testid="dialog-review-adjustment">
            <DialogHeader>
              <DialogTitle>Review Adjustment Request</DialogTitle>
              <DialogDescription>
                {selectedAdjustmentRequest &&
                  `Review request from ${selectedAdjustmentRequest.salesRep}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedAdjustmentRequest && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">Original Amount:</span>
                        <p className="text-lg font-bold">
                          ${selectedAdjustmentRequest.originalAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Requested Amount:</span>
                        <p
                          className={`text-lg font-bold ${selectedAdjustmentRequest.requestedAmount > selectedAdjustmentRequest.originalAmount ? "text-green-600" : "text-red-600"}`}
                        >
                          ${selectedAdjustmentRequest.requestedAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Reason for Adjustment:</p>
                    <div className="p-3 bg-gray-50 rounded-md mt-1">
                      <p className="text-sm text-gray-700">{selectedAdjustmentRequest.reason}</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="review-notes">Review Notes</Label>
                    <Textarea
                      id="review-notes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add your review notes (optional)..."
                      className="min-h-[80px]"
                      data-testid="textarea-review-notes"
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReviewDialogOpen(false)}
                data-testid="button-cancel-review"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectAdjustment}
                data-testid="button-reject-adjustment"
              >
                Reject
              </Button>
              <Button onClick={handleApproveAdjustment} data-testid="button-approve-adjustment">
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deal Details Dialog */}
        <Dialog open={dealDetailsDialogOpen} onOpenChange={setDealDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[700px]" data-testid="dialog-deal-details">
            <DialogHeader>
              <DialogTitle>Deal Details</DialogTitle>
              <DialogDescription>
                {selectedDeal && `Details for ${selectedDeal.dealName}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedDeal && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Company</p>
                        <p className="text-lg font-semibold">{selectedDeal.companyName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Deal Value</p>
                        <p className="text-lg font-semibold">
                          ${selectedDeal.amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Service Type</p>
                        <div className="flex items-center gap-2">
                          {getServiceTypeIcon(selectedDeal.serviceType)}
                          <span className="capitalize">
                            {selectedDeal.serviceType.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Sales Rep</p>
                        <p className="text-lg font-semibold">{selectedDeal.salesRep}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Status</p>
                        <Badge
                          variant={selectedDeal.status === "closed_won" ? "default" : "secondary"}
                        >
                          {selectedDeal.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Close Date</p>
                        <p>
                          {selectedDeal.closedDate
                            ? new Date(selectedDeal.closedDate).toLocaleDateString()
                            : "Not closed"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Commission Breakdown</p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Setup Fee Commission (20%)</p>
                        <p className="text-lg font-bold text-green-600">
                          ${(selectedDeal.setupFee * 0.2).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          from ${selectedDeal.setupFee.toLocaleString()} setup fee
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">First Month Commission (40%)</p>
                        <p className="text-lg font-bold text-blue-600">
                          ${(selectedDeal.monthlyFee * 0.4).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          from ${selectedDeal.monthlyFee.toLocaleString()} monthly fee
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg col-span-2">
                        <p className="text-sm text-gray-600">Total First Month Commission</p>
                        <p className="text-xl font-bold text-purple-600">
                          $
                          {(
                            selectedDeal.setupFee * 0.2 +
                            selectedDeal.monthlyFee * 0.4
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedDeal.status === "open" && selectedDeal.probability && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">Pipeline Information</p>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="text-sm text-gray-600">Pipeline Stage</p>
                          <p className="font-semibold">{selectedDeal.pipelineStage}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Close Probability</p>
                          <p className="font-semibold">{selectedDeal.probability}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDealDetailsDialogOpen(false)}
                data-testid="button-close-deal-details"
              >
                Close
              </Button>
              {selectedDeal?.hubspotDealId && (
                <Button asChild data-testid="button-view-hubspot-deal">
                  <a
                    href={`https://app.hubspot.com/contacts/deal/${selectedDeal.hubspotDealId}`}
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

        {/* Bonus Tracking Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Bonus Tracking */}
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
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
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Clients Closed This Month</span>
                  <span className="font-medium">{salesRepStats.totalClientsClosedMonthly}</span>
                </div>
                <Progress
                  value={(salesRepStats.totalClientsClosedMonthly / 15) * 100}
                  className="h-2"
                />
              </div>

              {monthlyBonusEligibility && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Bonus Eligible!</span>
                  </div>
                  <p className="text-sm text-green-700">{monthlyBonusEligibility.description}</p>
                  <p className="text-lg font-bold text-green-800">
                    ${monthlyBonusEligibility.amount}
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm text-gray-600">
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
            </CardContent>
          </Card>

          {/* Milestone Bonus Tracking */}
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Milestone Progress
              </CardTitle>
              <CardDescription>Track lifetime client milestones and major bonuses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress to {nextMilestone.nextMilestone} Clients</span>
                  <span className="font-medium">
                    {salesRepStats.totalClientsClosedAllTime}/{nextMilestone.nextMilestone}
                  </span>
                </div>
                <Progress value={nextMilestone.progress} className="h-2" />
                <p className="text-xs text-gray-500">{nextMilestone.remaining} clients remaining</p>
              </div>

              {milestoneBonuses.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Last Achievement</span>
                  </div>
                  <p className="text-sm text-yellow-700">40 Client Milestone</p>
                  <p className="text-lg font-bold text-yellow-800">$5,000 Bonus</p>
                </div>
              )}

              <div className="space-y-2 text-sm text-gray-600">
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
            </CardContent>
          </Card>
        </div>

        {/* Additional Content Tabs */}
        <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
          <CardContent className="p-6">
            <Tabs defaultValue="deals" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="deals">Recent Deals</TabsTrigger>
                <TabsTrigger value="monthly-bonuses">Monthly Bonuses</TabsTrigger>
                <TabsTrigger value="milestone-bonuses">Milestone Bonuses</TabsTrigger>
              </TabsList>

              <TabsContent value="deals" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Recent Closed Deals</h3>
                    <Badge variant="outline">{deals.length} deals</Badge>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Setup Fee</TableHead>
                          <TableHead>Monthly Fee</TableHead>
                          <TableHead>Total Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Closed Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deals.map((deal) => (
                          <TableRow key={deal.id}>
                            <TableCell className="font-medium">{deal.companyName}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getServiceTypeIcon(deal.serviceType)}
                                <span className="capitalize">{deal.serviceType}</span>
                              </div>
                            </TableCell>
                            <TableCell>${deal.setupFee.toLocaleString()}</TableCell>
                            <TableCell>${deal.monthlyFee.toLocaleString()}</TableCell>
                            <TableCell className="font-medium">
                              ${deal.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                {deal.status.replace("_", " ").toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {deal.closedDate
                                ? new Date(deal.closedDate).toLocaleDateString()
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="monthly-bonuses" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Monthly Bonuses</h3>
                    <Badge variant="outline">{monthlyBonuses.length} bonuses</Badge>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Clients Closed</TableHead>
                          <TableHead>Bonus Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date Earned</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyBonuses.map((bonus) => (
                          <TableRow key={bonus.id}>
                            <TableCell className="font-medium">{bonus.month}</TableCell>
                            <TableCell>{bonus.clientsClosedCount}</TableCell>
                            <TableCell className="capitalize">
                              {bonus.bonusType.replace("_", " ")}
                            </TableCell>
                            <TableCell className="font-medium">
                              $
                              {bonus.bonusAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell>{getStatusBadge(bonus.status)}</TableCell>
                            <TableCell>{new Date(bonus.dateEarned).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="milestone-bonuses" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Milestone Bonuses</h3>
                    <Badge variant="outline">{milestoneBonuses.length} achievements</Badge>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Milestone</TableHead>
                          <TableHead>Bonus Amount</TableHead>
                          <TableHead>Includes Equity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date Earned</TableHead>
                          <TableHead>Date Paid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {milestoneBonuses.map((bonus) => (
                          <TableRow key={bonus.id}>
                            <TableCell className="font-medium">{bonus.milestone} Clients</TableCell>
                            <TableCell className="font-medium">
                              $
                              {bonus.bonusAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell>
                              {bonus.includesEquity ? (
                                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                                  Yes
                                </Badge>
                              ) : (
                                <span className="text-gray-500">No</span>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(bonus.status)}</TableCell>
                            <TableCell>{new Date(bonus.dateEarned).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {bonus.datePaid ? new Date(bonus.datePaid).toLocaleDateString() : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

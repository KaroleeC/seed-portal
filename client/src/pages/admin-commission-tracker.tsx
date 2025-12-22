import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useDealsAll } from "@/hooks/useDeals";
import { useSalesRepList } from "@/hooks/useSalesRepList";
import { Button } from "@/components/ui/button";
import {
  Card,
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
  RotateCcw,
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

interface Commission {
  id: string;
  dealId: string;
  dealName: string;
  companyName: string;
  salesRep: string;
  serviceType: string;
  type: "month_1" | "residual";
  monthNumber: number;
  amount: number;
  status: "pending" | "approved" | "paid" | "disputed" | "rejected";
  dateEarned: string;
  datePaid?: string;
  hubspotDealId?: string;
}

interface Deal {
  id: string;
  dealName: string;
  companyName: string;
  salesRep: string;
  serviceType: string;
  amount: number;
  setupFee: number;
  monthlyFee: number;
  status: "open" | "closed_won" | "closed_lost";
  closedDate?: string;
  hubspotDealId?: string;
  probability?: number;
  pipelineStage?: string;
}

interface SalesRep {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
  hubspotUserId?: string | null;
  totalCommissions: number;
  projectedCommissions: number;
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

export function AdminCommissionTracker() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  // State for commission period
  // Calculate current commission period dynamically
  const getCurrentPeriod = () => {
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

  const [currentPeriod, setCurrentPeriod] = useState(getCurrentPeriod());

  // State for commissions and data
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  // No longer using local state - adjustmentRequests comes from database query below

  // State for dialogs and forms
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [dealDetailsDialogOpen, setDealDetailsDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] =
    useState<Commission | null>(null);
  const [selectedAdjustmentRequest, setSelectedAdjustmentRequest] =
    useState<AdjustmentRequest | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  // Filter states
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSalesRep, setFilterSalesRep] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Sync states
  const [syncLoading, setSyncLoading] = useState(false);

  // Check if user is admin
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <KbCard className="w-96">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              This page is only accessible to administrators.
            </p>
            <Button onClick={() => navigate("/admin")} variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </KbCard>
      </div>
    );
  }

  // Fetch real commission data from API
  const {
    data: liveCommissions = [],
    isLoading: commissionsLoading,
    refetch: refetchCommissions,
  } = useQuery({
    queryKey: ["/api/commissions"],
    queryFn: async () => {
      console.log("🔄 Making fresh commissions API call...");
      const data = await apiRequest<any[]>(
        "GET",
        `/api/commissions?v=${  Date.now()}`,
      );
      console.log("📥 Raw commissions API response:", data);
      return data;
    },
  });

  const { data: liveSalesReps = [], isLoading: salesRepsLoading } =
    useSalesRepList({ enabled: true });

  const selectedOwnerId = useMemo(() => {
    if (!filterSalesRep || filterSalesRep === "all") return undefined;
    const rep = salesReps.find((r) => r.name === filterSalesRep);
    return rep?.hubspotUserId ?? undefined;
  }, [salesReps, filterSalesRep]);

  const { data: dealsResult, isLoading: dealsLoading } = useDealsAll({
    enabled: true,
    limit: 200,
    ownerId: selectedOwnerId,
  });

  const { data: pipelineDeals = [], isLoading: pipelineLoading } = useQuery({
    queryKey: ["/api/pipeline-projections"],
    queryFn: async () => {
      console.log("🔄 Making fresh pipeline projections API call...");
      const data = await apiRequest<any[]>(
        "GET",
        `/api/pipeline-projections?v=${  Date.now()}`,
      );
      console.log("📥 Raw pipeline projections API response:", data);
      return data;
    },
    refetchInterval: 15000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const queryClient = useQueryClient();

  // Fetch commission adjustments from database
  const { data: adjustmentRequests = [], refetch: refetchAdjustments } =
    useQuery<AdjustmentRequest[]>({
      queryKey: ["/api/commission-adjustments"],
      enabled: !!user?.role && user.role === "admin",
    });

  // Mutations for commission adjustments
  const createAdjustmentMutation = useMutation({
    mutationFn: (adjustmentData: any) =>
      apiRequest("/api/commission-adjustments", {
        method: "POST",
        body: JSON.stringify(adjustmentData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/commission-adjustments"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
    },
  });

  const updateAdjustmentMutation = useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest(`/api/commission-adjustments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/commission-adjustments"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
    },
  });

  // Update component state when data loads
  useEffect(() => {
    if (liveCommissions.length > 0) {
      // Transform API data to match component interface
      const transformedCommissions: Commission[] = liveCommissions.map(
        (invoice) => ({
          id: invoice.id?.toString() || "unknown",
          dealId:
            invoice.dealId?.toString() || invoice.id?.toString() || "unknown",
          dealName: invoice.companyName || "Unknown",
          companyName: invoice.companyName || "Unknown Company",
          salesRep: invoice.salesRep || "Unknown Rep",
          serviceType: invoice.serviceType || "mixed",
          type: "total" as any,
          monthNumber: invoice.monthNumber || 1,
          amount: Number(invoice.amount) || 0,
          status: invoice.status || "pending",
          dateEarned:
            invoice.dateEarned || new Date().toISOString().slice(0, 10),
          hubspotDealId: invoice.hubspotDealId?.toString() || null,
          breakdown: {
            setup: Number(invoice.setupAmount) || 0,
            month1: Number(invoice.month1Amount) || 0,
            residual: Number(invoice.residualAmount) || 0,
          },
        }),
      );
      setCommissions(transformedCommissions);
      console.log(
        "📊 Transformed invoice commissions:",
        transformedCommissions,
      );
    }
  }, [liveCommissions]);

  useEffect(() => {
    if (liveSalesReps.length > 0) {
      // Transform API data to match component interface (fields already normalized by useSalesRepList)
      const transformedSalesReps: SalesRep[] = liveSalesReps.map(
        (rep: any) => ({
          id: String(rep.id ?? rep.userId ?? ""),
          name: rep.name ?? "",
          email: rep.email ?? "unknown@email.com",
          isActive: rep.isActive ?? true,
          hubspotUserId: rep.hubspotUserId ?? null,
          totalCommissions: 0, // Will be calculated
          projectedCommissions: 0, // Will be calculated
        }),
      );
      setSalesReps(transformedSalesReps);
      console.log("📊 Transformed sales reps:", transformedSalesReps);
    } else {
      console.log("⚠️ No sales reps data available:", liveSalesReps);
    }
  }, [liveSalesReps]);

  useEffect(() => {
    const allDeals = dealsResult?.deals || [];
    if (Array.isArray(allDeals)) {
      // Transform normalized deals (BFF shape) to match component interface
      const transformedDeals: Deal[] = (allDeals as any[]).map((d) => ({
        id: String(d.id),
        dealName: d.name || "Untitled Deal",
        companyName: d.companyName || "Unknown Company",
        salesRep: "Unknown Rep",
        serviceType: "bookkeeping",
        amount: Number(d.amount) || 0,
        setupFee: 0,
        monthlyFee: 0,
        status:
          typeof d.stage === "string" && /won/i.test(d.stage)
            ? "closed_won"
            : typeof d.stage === "string" && /lost/i.test(d.stage)
              ? "closed_lost"
              : "open",
        probability: undefined,
        closedDate: d.closeDate || undefined,
        hubspotDealId: String(d.id),
      }));
      setDeals(transformedDeals);
    }
  }, [dealsResult]);

  // Data is now fetched via useQuery hooks above

  // Filter commissions based on current filters AND current period
  const filteredCommissions = commissions.filter((commission) => {
    const matchesStatus =
      filterStatus === "all" || commission.status === filterStatus;
    const matchesSalesRep =
      filterSalesRep === "all" || commission.salesRep === filterSalesRep;
    const matchesSearch =
      searchTerm === "" ||
      commission.dealName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.salesRep.toLowerCase().includes(searchTerm.toLowerCase());

    // Also filter by current period
    const matchesPeriod =
      commission.dateEarned >= currentPeriod.periodStart &&
      commission.dateEarned <= currentPeriod.periodEnd;

    return matchesStatus && matchesSalesRep && matchesSearch && matchesPeriod;
  });

  // Calculate metrics
  const totalCurrentPeriodCommissions = filteredCommissions
    .filter(
      (c) =>
        c.dateEarned >= currentPeriod.periodStart &&
        c.dateEarned <= currentPeriod.periodEnd,
    )
    .reduce((sum, c) => sum + c.amount, 0);

  // Calculate pipeline metrics from real HubSpot data
  const totalPipelineValue = pipelineDeals.reduce(
    (sum, deal) => sum + (deal.dealValue || 0),
    0,
  );

  const projectedCommissions = pipelineDeals.reduce(
    (sum, deal) => sum + (deal.projectedCommission || 0),
    0,
  );

  // Weighted pipeline calculation - assumes all deals at "Decision Maker Bought-In" stage have 70% probability
  // In a real implementation, this would use actual stage probabilities from HubSpot pipeline configuration
  const weightedPipelineValue = pipelineDeals.reduce((sum, deal) => {
    const stageProbability =
      deal.dealStage === "Decision Maker Bought-In" ? 0.7 : 0.5; // Default probability
    return sum + (deal.dealValue || 0) * stageProbability;
  }, 0);

  // Memoize helper functions to prevent re-calculations
  const getStatusBadge = useCallback((status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      disputed: "bg-red-100 text-red-800",
      rejected: "bg-red-100 text-red-800",
    };

    return (
      <Badge
        className={
          variants[status as keyof typeof variants] ||
          "bg-gray-100 text-gray-800"
        }
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  }, []);

  // Memoize getServiceTypeIcon to prevent re-calculations
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
        <Calculator className="w-4 h-4 text-gray-600" />
      )
    );
  }, []);

  // Memoize getPriorityIcon to prevent re-calculations
  const getPriorityIcon = useCallback((probability?: number) => {
    if (!probability) return <Clock className="w-4 h-4 text-gray-400" />;
    if (probability >= 75)
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (probability >= 50)
      return <Target className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  }, []);

  // Memoize getMonthlyBonusTier to prevent re-calculations
  const getMonthlyBonusTier = useCallback((clientsClosedThisMonth: number) => {
    if (clientsClosedThisMonth >= 15)
      return {
        name: "MacBook Air",
        target: 15,
        reward: "$1,500",
        color: "text-purple-600",
        bgColor: "bg-purple-50",
      };
    if (clientsClosedThisMonth >= 10)
      return {
        name: "Apple Watch",
        target: 10,
        reward: "$1,000",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      };
    if (clientsClosedThisMonth >= 5)
      return {
        name: "AirPods",
        target: 5,
        reward: "$500",
        color: "text-green-600",
        bgColor: "bg-green-50",
      };
    return {
      name: "Next Bonus",
      target: 5,
      reward: "$500",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    };
  }, []);

  // Memoize getSalesRepMetrics to prevent infinite re-renders
  const getSalesRepMetrics = useCallback(
    (repName: string) => {
      const repCommissions = commissions.filter((c) => c.salesRep === repName);
      const currentPeriodCommissions = repCommissions
        .filter(
          (c) =>
            c.dateEarned >= currentPeriod.periodStart &&
            c.dateEarned <= currentPeriod.periodEnd,
        )
        .reduce((sum, c) => sum + c.amount, 0);

      const firstMonthCommissions = repCommissions
        .filter((c) => c.type === "month_1")
        .reduce((sum, c) => sum + c.amount, 0);

      const residualCommissions = repCommissions
        .filter((c) => c.type === "residual")
        .reduce((sum, c) => sum + c.amount, 0);

      const totalCommissions = repCommissions.reduce(
        (sum, c) => sum + c.amount,
        0,
      );

      const pipelineValue = deals
        .filter((d) => d.salesRep === repName && d.status === "open")
        .reduce((sum, d) => sum + d.amount, 0);

      // Count unique clients closed this month (based on commission records)
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const clientsClosedThisMonth = new Set(
        repCommissions
          .filter(
            (c) =>
              c.dateEarned >= currentPeriod.periodStart &&
              c.dateEarned <= currentPeriod.periodEnd,
          )
          .map((c) => c.companyName),
      ).size;

      // Get current milestone progress (total clients closed all time)
      const totalClientsAllTime = new Set(
        repCommissions.map((c) => c.companyName),
      ).size;

      const monthlyBonusTier = getMonthlyBonusTier(clientsClosedThisMonth);

      return {
        currentPeriodCommissions,
        firstMonthCommissions,
        residualCommissions,
        totalCommissions,
        pipelineValue,
        clientsClosedThisMonth,
        totalClientsAllTime,
        monthlyBonusTier,
      };
    },
    [commissions, deals, currentPeriod],
  );

  // Event handlers
  const handleRequestAdjustment = (commission: Commission) => {
    setSelectedCommission(commission);
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setAdjustmentDialogOpen(true);
  };

  const handleSubmitAdjustment = () => {
    if (selectedCommission && adjustmentReason.trim()) {
      const adjustmentData = {
        commissionId: parseInt(selectedCommission.id),
        originalAmount: selectedCommission.amount,
        requestedAmount: adjustmentAmount
          ? parseFloat(adjustmentAmount)
          : selectedCommission.amount,
        reason: adjustmentReason,
      };

      createAdjustmentMutation.mutate(adjustmentData);
      setAdjustmentDialogOpen(false);
      setSelectedCommission(null);
      setAdjustmentAmount("");
      setAdjustmentReason("");
    }
  };

  const handleReviewAdjustment = (request: AdjustmentRequest) => {
    setSelectedAdjustmentRequest(request);
    setReviewNotes("");
    setReviewDialogOpen(true);
  };

  const handleApproveAdjustment = () => {
    if (selectedAdjustmentRequest) {
      const updateData = {
        id: selectedAdjustmentRequest.id,
        status: "approved",
        finalAmount: selectedAdjustmentRequest.requestedAmount,
        notes: reviewNotes,
      };

      updateAdjustmentMutation.mutate(updateData);
      setReviewDialogOpen(false);
      setSelectedAdjustmentRequest(null);
      setReviewNotes("");
    }
  };

  const handleRejectAdjustment = () => {
    if (selectedAdjustmentRequest) {
      const updateData = {
        id: selectedAdjustmentRequest.id,
        status: "rejected",
        notes: reviewNotes,
      };

      updateAdjustmentMutation.mutate(updateData);
      setReviewDialogOpen(false);
      setSelectedAdjustmentRequest(null);
      setReviewNotes("");
    }
  };

  // Memoize commission action handlers to prevent infinite re-renders
  const handleViewDealDetails = useCallback(
    (dealId: string) => {
      const deal =
        deals.find((d) => d.id === dealId) ||
        commissions.find((c) => c.dealId === dealId);
      if (deal) {
        // Convert commission to deal format if needed - memoized to prevent infinite re-renders
        const dealData =
          "setupFee" in deal
            ? deal
            : {
                id: deal.dealId,
                dealName: deal.dealName,
                companyName: deal.companyName,
                salesRep: deal.salesRep,
                serviceType: deal.serviceType,
                // Calculate actual deal amount from commission breakdown
                // Setup commission is 20% of setup fee, month1 commission is 40% of monthly fee
                amount:
                  ((deal as any).breakdown?.setup || 0) / 0.2 +
                  ((deal as any).breakdown?.month1 || 0) / 0.4,
                setupFee: (deal as any).breakdown?.setup || 0, // Actual setup commission
                monthlyFee: (deal as any).breakdown?.month1 || 0, // Actual month 1 commission
                status: "closed_won" as const,
                closedDate: deal.dateEarned,
                hubspotDealId: deal.hubspotDealId,
              };

        setSelectedDeal(dealData);
        setDealDetailsDialogOpen(true);
      }
    },
    [deals, commissions],
  ); // Dependencies: only recreate if deals or commissions change

  const handleViewDealDetailsClick = useCallback(
    (dealId: string) => {
      handleViewDealDetails(dealId);
    },
    [handleViewDealDetails],
  );

  const handleApproveCommission = async (commissionId: string) => {
    // Show confirmation dialog first
    const confirmed = confirm(
      "Are you sure you want to approve this commission? This action will mark it as approved and ready for payment.",
    );
    if (!confirmed) return;

    try {
      // Get CSRF token first
      const csrfResponse = await fetch("/api/csrf-token");
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/commissions/${commissionId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
      });

      if (response.ok) {
        console.log(`Commission ${commissionId} approved`);
        // Show success message
        alert("Commission approved successfully!");
        // Refresh commissions data
        await refetchCommissions();
      } else {
        const error = await response.json();
        console.error("Failed to approve commission:", error);
        alert(`Failed to approve commission: ${  error.message}`);
      }
    } catch (error) {
      console.error("Approve commission error:", error);
      alert("Failed to approve commission. Please try again.");
    }
  };

  const handleRejectCommission = async (commissionId: string) => {
    // Show confirmation dialog first
    const confirmed = confirm(
      "Are you sure you want to reject this commission? This will set the amount to $0 and mark it as rejected.",
    );
    if (!confirmed) return;

    try {
      // Get CSRF token first
      const csrfResponse = await fetch("/api/csrf-token");
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/commissions/${commissionId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
      });

      if (response.ok) {
        console.log(`Commission ${commissionId} rejected`);
        // Show success message
        alert("Commission rejected successfully!");
        // Refresh commissions data
        await refetchCommissions();
      } else {
        const error = await response.json();
        console.error("Failed to reject commission:", error);
        alert(`Failed to reject commission: ${  error.message}`);
      }
    } catch (error) {
      console.error("Reject commission error:", error);
      alert("Failed to reject commission. Please try again.");
    }
  };

  const handleApproveCommissionClick = useCallback(
    (commissionId: string) => {
      handleApproveCommission(commissionId);
    },
    [handleApproveCommission],
  );

  const handleRejectCommissionClick = useCallback(
    (commissionId: string) => {
      handleRejectCommission(commissionId);
    },
    [handleRejectCommission],
  );

  const handleUnrejectCommission = async (commissionId: string) => {
    // Show confirmation dialog first
    const confirmed = confirm(
      "Are you sure you want to restore this commission to pending status? This will reverse the rejection and restore the commission amount.",
    );
    if (!confirmed) return;

    try {
      // Get CSRF token first
      const csrfResponse = await fetch("/api/csrf-token");
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(
        `/api/commissions/${commissionId}/unreject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
        },
      );

      if (response.ok) {
        console.log(`Commission ${commissionId} unrejected`);
        // Show success message
        alert("Commission successfully restored to pending status!");
        // Refresh commissions data
        await refetchCommissions();
      } else {
        const error = await response.json();
        console.error("Failed to unreject commission:", error);
        alert(`Failed to unreject commission: ${  error.message}`);
      }
    } catch (error) {
      console.error("Unreject commission error:", error);
      alert("Failed to unreject commission. Please try again.");
    }
  };

  const handleUnrejectCommissionClick = useCallback(
    (commissionId: string) => {
      handleUnrejectCommission(commissionId);
    },
    [handleUnrejectCommission],
  );

  const handleReviewAdjustmentClick = useCallback((request: any) => {
    handleReviewAdjustment(request);
  }, []);

  const handleSyncHubSpot = async () => {
    setSyncLoading(true);
    try {
      // Get CSRF token first
      const csrfResponse = await fetch("/api/csrf-token");
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch("/api/commissions/sync-hubspot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log("HubSpot sync completed:", result);

        // Show success message
        alert(
          `HubSpot sync completed successfully!\n\nResults:\n- Sales reps: ${result.results.salesRepsProcessed}\n- Invoices: ${result.results.invoicesProcessed}\n- Deals: ${result.results.dealsProcessed}\n- Commissions: ${result.results.commissionsCreated}`,
        );

        // Refresh all data after sync
        await refetchCommissions();
      } else {
        const error = await response.json();
        console.error("HubSpot sync failed:", error);
        alert(`Failed to sync HubSpot data: ${  error.message}`);
      }
    } catch (error) {
      console.error("HubSpot sync error:", error);
      alert("Failed to sync HubSpot data. Please try again.");
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="min-h-screen theme-seed-dark bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <UniversalNavbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-end mb-8">
          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={handleSyncHubSpot}
              disabled={syncLoading}
              data-testid="button-sync-hubspot"
            >
              {syncLoading ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {syncLoading ? "Syncing..." : "Sync HubSpot Data"}
            </Button>
            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Period Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <KbCard data-testid="card-current-period">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Current Period
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    $
                    {totalCurrentPeriodCommissions.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(currentPeriod.periodStart).toLocaleDateString()} -{" "}
                    {new Date(currentPeriod.periodEnd).toLocaleDateString()}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </KbCard>

          <KbCard data-testid="card-pending-approvals">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Approvals
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {commissions.filter((c) => c.status === "pending").length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    $
                    {commissions
                      .filter((c) => c.status === "pending")
                      .reduce((sum, c) => sum + c.amount, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </KbCard>

          <KbCard data-testid="card-adjustment-requests">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Adjustment Requests
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {
                      adjustmentRequests.filter((r) => r.status === "pending")
                        .length
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    requiring review
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </KbCard>

          <KbCard data-testid="card-projected">
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
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">from pipeline</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </KbCard>
        </div>

        {/* Filters */}
        <KbCard className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search deals, companies, or reps..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40" data-testid="select-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filterSalesRep}
                  onValueChange={setFilterSalesRep}
                >
                  <SelectTrigger
                    className="w-48"
                    data-testid="select-sales-rep"
                  >
                    <SelectValue placeholder="Sales Rep" />
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
              </div>

              <div className="text-sm text-gray-500">
                Showing {filteredCommissions.length} of {commissions.length}{" "}
                commissions
              </div>
            </div>
          </CardContent>
        </KbCard>

        {/* Main Content - Tabbed Interface */}
        <Tabs
          defaultValue="commissions"
          className="space-y-6"
          data-testid="main-tabs"
        >
          <TabsList
            className="bg-muted border rounded-xl p-1"
            data-testid="tabs-list"
          >
            <TabsTrigger
              value="commissions"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              data-testid="tab-commissions"
            >
              Commission Tracking
            </TabsTrigger>
            <TabsTrigger
              value="reps"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              data-testid="tab-reps"
            >
              Sales Rep Performance
            </TabsTrigger>
            <TabsTrigger
              value="adjustments"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              data-testid="tab-adjustments"
            >
              Adjustment Requests (
              {
                adjustmentRequests.filter((req) => req.status === "pending")
                  .length
              }
              )
            </TabsTrigger>
            <TabsTrigger
              value="pipeline"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              data-testid="tab-pipeline"
            >
              Pipeline Projections
            </TabsTrigger>
          </TabsList>

          {/* Commission Tracking Tab */}
          <TabsContent value="commissions" data-testid="content-commissions">
            <KbCard>
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
                        <TableHead>Company</TableHead>
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
                            <p className="font-semibold text-gray-900">
                              {commission.companyName}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
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
                          <TableCell>
                            <Badge
                              variant={
                                commission.type === "month_1"
                                  ? "default"
                                  : "secondary"
                              }
                              data-testid={`badge-type-${commission.type}`}
                            >
                              {commission.type === "month_1"
                                ? "First Month"
                                : `Month ${commission.monthNumber}`}
                            </Badge>
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
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleViewDealDetailsClick(commission.dealId)
                                }
                                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                                data-testid={`button-view-deal-${commission.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {commission.status === "pending" && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() =>
                                      handleApproveCommissionClick(
                                        commission.id,
                                      )
                                    }
                                    className="bg-green-600 hover:bg-green-700"
                                    data-testid={`button-approve-${commission.id}`}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                      handleRejectCommissionClick(commission.id)
                                    }
                                    data-testid={`button-reject-${commission.id}`}
                                  >
                                    <AlertCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {commission.status === "rejected" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleUnrejectCommissionClick(commission.id)
                                  }
                                  className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
                                  data-testid={`button-unreject-${commission.id}`}
                                >
                                  <RotateCcw className="w-4 h-4" />
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
            </KbCard>
          </TabsContent>

          {/* Sales Rep Performance Tab */}
          <TabsContent value="reps" data-testid="content-reps">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {salesReps.map((rep) => {
                const metrics = getSalesRepMetrics(rep.name);
                return (
                  <KbCard key={rep.id} data-testid={`card-rep-${rep.id}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#253e31] to-[#75c29a] rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{rep.name}</h3>
                            <p className="text-sm text-gray-500">{rep.email}</p>
                          </div>
                        </div>
                        <Badge
                          variant={rep.isActive ? "default" : "secondary"}
                          data-testid={`badge-status-${rep.id}`}
                        >
                          {rep.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              Current Period
                            </span>
                            <span className="font-semibold">
                              $
                              {metrics.currentPeriodCommissions.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              First Month Premium
                            </span>
                            <span className="font-semibold text-green-600">
                              ${metrics.firstMonthCommissions.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              Residual Monthly
                            </span>
                            <span className="font-semibold text-blue-600">
                              ${metrics.residualCommissions.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              Total Commissions
                            </span>
                            <span className="font-semibold">
                              ${metrics.totalCommissions.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              Pipeline Value
                            </span>
                            <span className="font-semibold text-purple-600">
                              ${metrics.pipelineValue.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              Projected
                            </span>
                            <span className="font-semibold text-orange-600">
                              ${rep.projectedCommissions.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Monthly Bonus Progress */}
                      <div className="space-y-3">
                        <div
                          className={`p-3 rounded-lg ${metrics.monthlyBonusTier.bgColor}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium flex items-center gap-2">
                              <span className={metrics.monthlyBonusTier.color}>
                                Monthly Bonus
                              </span>
                              <Badge
                                variant="outline"
                                className={`${metrics.monthlyBonusTier.color} border-current`}
                              >
                                {metrics.monthlyBonusTier.name} (
                                {metrics.monthlyBonusTier.reward})
                              </Badge>
                            </span>
                            <span className="text-sm text-gray-500">
                              {Math.round(
                                (metrics.clientsClosedThisMonth /
                                  metrics.monthlyBonusTier.target) *
                                  100,
                              )}
                              %
                            </span>
                          </div>
                          <Progress
                            value={Math.min(
                              (metrics.clientsClosedThisMonth /
                                metrics.monthlyBonusTier.target) *
                                100,
                              100,
                            )}
                            className="h-3"
                            data-testid={`progress-bonus-${rep.id}`}
                          />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {metrics.clientsClosedThisMonth} /{" "}
                              {metrics.monthlyBonusTier.target} clients
                            </span>
                            <span
                              className={`text-xs font-medium ${metrics.clientsClosedThisMonth >= metrics.monthlyBonusTier.target ? "text-green-600" : "text-gray-500"}`}
                            >
                              {metrics.clientsClosedThisMonth >=
                              metrics.monthlyBonusTier.target
                                ? "🎉 Bonus Earned!"
                                : `${metrics.monthlyBonusTier.target - metrics.clientsClosedThisMonth} more to bonus`}
                            </span>
                          </div>
                        </div>

                        {/* Milestone Progress */}
                        <div className="p-3 rounded-lg bg-indigo-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium flex items-center gap-2">
                              <span className="text-indigo-700">
                                Milestone Progress
                              </span>
                              <Badge
                                variant="outline"
                                className="text-indigo-600 border-indigo-300"
                              >
                                {metrics.totalClientsAllTime >= 100
                                  ? "🏆 Elite"
                                  : metrics.totalClientsAllTime >= 60
                                    ? "🥇 Master"
                                    : metrics.totalClientsAllTime >= 40
                                      ? "🥈 Expert"
                                      : metrics.totalClientsAllTime >= 25
                                        ? "🥉 Pro"
                                        : "Rising Star"}
                              </Badge>
                            </span>
                            <span className="text-sm text-indigo-600">
                              {metrics.totalClientsAllTime} total clients
                            </span>
                          </div>

                          {/* Current milestone progress bar */}
                          <div className="mb-3">
                            {metrics.totalClientsAllTime < 25 && (
                              <>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-indigo-600">
                                    Progress to first milestone ($1,000)
                                  </span>
                                  <span className="text-xs text-indigo-500">
                                    {Math.round(
                                      (metrics.totalClientsAllTime / 25) * 100,
                                    )}
                                    %
                                  </span>
                                </div>
                                <Progress
                                  value={Math.min(
                                    (metrics.totalClientsAllTime / 25) * 100,
                                    100,
                                  )}
                                  className="h-2 bg-indigo-100"
                                  data-testid={`progress-milestone-${rep.id}`}
                                />
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-indigo-400">
                                    {metrics.totalClientsAllTime} / 25 clients
                                  </span>
                                  <span className="text-xs text-indigo-500">
                                    {25 - metrics.totalClientsAllTime} more to
                                    milestone
                                  </span>
                                </div>
                              </>
                            )}
                            {metrics.totalClientsAllTime >= 25 &&
                              metrics.totalClientsAllTime < 40 && (
                                <>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-indigo-600">
                                      Progress to $5,000 milestone
                                    </span>
                                    <span className="text-xs text-indigo-500">
                                      {Math.round(
                                        ((metrics.totalClientsAllTime - 25) /
                                          15) *
                                          100,
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Progress
                                    value={Math.min(
                                      ((metrics.totalClientsAllTime - 25) /
                                        15) *
                                        100,
                                      100,
                                    )}
                                    className="h-2 bg-indigo-100"
                                    data-testid={`progress-milestone-${rep.id}`}
                                  />
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-indigo-400">
                                      {metrics.totalClientsAllTime} / 40 clients
                                    </span>
                                    <span className="text-xs text-indigo-500">
                                      {40 - metrics.totalClientsAllTime} more to
                                      milestone
                                    </span>
                                  </div>
                                </>
                              )}
                            {metrics.totalClientsAllTime >= 40 &&
                              metrics.totalClientsAllTime < 60 && (
                                <>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-indigo-600">
                                      Progress to $7,500 milestone
                                    </span>
                                    <span className="text-xs text-indigo-500">
                                      {Math.round(
                                        ((metrics.totalClientsAllTime - 40) /
                                          20) *
                                          100,
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Progress
                                    value={Math.min(
                                      ((metrics.totalClientsAllTime - 40) /
                                        20) *
                                        100,
                                      100,
                                    )}
                                    className="h-2 bg-indigo-100"
                                    data-testid={`progress-milestone-${rep.id}`}
                                  />
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-indigo-400">
                                      {metrics.totalClientsAllTime} / 60 clients
                                    </span>
                                    <span className="text-xs text-indigo-500">
                                      {60 - metrics.totalClientsAllTime} more to
                                      milestone
                                    </span>
                                  </div>
                                </>
                              )}
                            {metrics.totalClientsAllTime >= 60 &&
                              metrics.totalClientsAllTime < 100 && (
                                <>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-indigo-600">
                                      Progress to Elite ($10,000 + Equity)
                                    </span>
                                    <span className="text-xs text-indigo-500">
                                      {Math.round(
                                        ((metrics.totalClientsAllTime - 60) /
                                          40) *
                                          100,
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Progress
                                    value={Math.min(
                                      ((metrics.totalClientsAllTime - 60) /
                                        40) *
                                        100,
                                      100,
                                    )}
                                    className="h-2 bg-indigo-100"
                                    data-testid={`progress-milestone-${rep.id}`}
                                  />
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-indigo-400">
                                      {metrics.totalClientsAllTime} / 100
                                      clients
                                    </span>
                                    <span className="text-xs text-indigo-500">
                                      {100 - metrics.totalClientsAllTime} more
                                      to Elite status
                                    </span>
                                  </div>
                                </>
                              )}
                            {metrics.totalClientsAllTime >= 100 && (
                              <div className="text-center py-2">
                                <span className="text-sm font-medium text-indigo-700">
                                  🏆 Elite Status Achieved!
                                </span>
                                <p className="text-xs text-indigo-600 mt-1">
                                  Congratulations on reaching the highest
                                  milestone!
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Milestone achievement list */}
                          <div className="space-y-1 border-t border-indigo-200 pt-2">
                            <div className="flex items-center justify-between text-xs">
                              <span
                                className={
                                  metrics.totalClientsAllTime >= 25
                                    ? "text-indigo-700 font-medium"
                                    : "text-indigo-400"
                                }
                              >
                                25 Clients - $1,000
                              </span>
                              {metrics.totalClientsAllTime >= 25 ? (
                                <span className="text-indigo-600">✓</span>
                              ) : (
                                <span className="text-indigo-300">○</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span
                                className={
                                  metrics.totalClientsAllTime >= 40
                                    ? "text-indigo-700 font-medium"
                                    : "text-indigo-400"
                                }
                              >
                                40 Clients - $5,000
                              </span>
                              {metrics.totalClientsAllTime >= 40 ? (
                                <span className="text-indigo-600">✓</span>
                              ) : (
                                <span className="text-indigo-300">○</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span
                                className={
                                  metrics.totalClientsAllTime >= 60
                                    ? "text-indigo-700 font-medium"
                                    : "text-indigo-400"
                                }
                              >
                                60 Clients - $7,500
                              </span>
                              {metrics.totalClientsAllTime >= 60 ? (
                                <span className="text-indigo-600">✓</span>
                              ) : (
                                <span className="text-indigo-300">○</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span
                                className={
                                  metrics.totalClientsAllTime >= 100
                                    ? "text-indigo-700 font-medium"
                                    : "text-indigo-400"
                                }
                              >
                                100 Clients - $10,000 + Equity
                              </span>
                              {metrics.totalClientsAllTime >= 100 ? (
                                <span className="text-indigo-600">✓</span>
                              ) : (
                                <span className="text-indigo-300">○</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </KbCard>
                );
              })}
            </div>
          </TabsContent>

          {/* Adjustment Requests Tab */}
          <TabsContent value="adjustments" data-testid="content-adjustments">
            <KbCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Adjustment Requests
                </CardTitle>
                <CardDescription>
                  Review and approve commission adjustment requests from sales
                  reps
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
                        const commission = commissions.find(
                          (c) => c.id === request.commissionId,
                        );
                        return (
                          <TableRow
                            key={request.id}
                            data-testid={`row-adjustment-${request.id}`}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span>{request.salesRep}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {commission ? (
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {commission.dealName}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {commission.companyName}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-gray-400">
                                  Deal not found
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              $
                              {request.originalAmount.toLocaleString(
                                undefined,
                                { minimumFractionDigits: 2 },
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              <span
                                className={
                                  request.requestedAmount >
                                  request.originalAmount
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                $
                                {request.requestedAmount.toLocaleString(
                                  undefined,
                                  { minimumFractionDigits: 2 },
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm text-gray-700 line-clamp-2">
                                {request.reason}
                              </p>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(request.status)}
                              {request.reviewedBy && (
                                <p className="text-xs text-gray-500 mt-1">
                                  By {request.reviewedBy}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(
                                request.requestedDate,
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {request.status === "pending" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleReviewAdjustmentClick(request)
                                  }
                                  data-testid={`button-review-${request.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Review
                                </Button>
                              ) : (
                                <span className="text-sm text-gray-500">
                                  {request.status === "approved"
                                    ? "Approved"
                                    : "Rejected"}
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
            </KbCard>
          </TabsContent>

          {/* Pipeline Projections Tab */}
          <TabsContent value="pipeline" data-testid="content-pipeline">
            <div className="space-y-6">
              {/* Pipeline Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KbCard data-testid="card-pipeline-total">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Pipeline Value
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          $
                          {totalPipelineValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </KbCard>

                <KbCard data-testid="card-pipeline-weighted">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Weighted Pipeline
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          $
                          {weightedPipelineValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </KbCard>

                <KbCard data-testid="card-pipeline-projected">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Projected Commissions
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          $
                          {projectedCommissions.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </KbCard>
              </div>

              {/* Pipeline Deals Table */}
              <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Pipeline Deals & Commission Projections
                  </CardTitle>
                  <CardDescription>
                    Future commission projections based on current pipeline and
                    probability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table data-testid="table-pipeline">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Sales Rep</TableHead>
                          <TableHead>Deal Value</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Projected Commission</TableHead>
                          <TableHead>Setup Commission</TableHead>
                          <TableHead>Monthly Commission</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pipelineLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                                <span className="ml-2">
                                  Loading pipeline projections...
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : pipelineDeals.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center py-8 text-gray-500"
                            >
                              No pipeline deals found
                            </TableCell>
                          </TableRow>
                        ) : (
                          pipelineDeals.map((deal) => {
                            return (
                              <TableRow
                                key={deal.id}
                                data-testid={`row-pipeline-${deal.id}`}
                              >
                                <TableCell className="font-medium">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {deal.dealName}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {deal.companyName}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span>{deal.salesRep}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold">
                                  ${(deal.dealValue || 0).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <p className="text-sm font-medium">
                                    {deal.dealStage || "Unknown"}
                                  </p>
                                </TableCell>
                                <TableCell className="font-semibold text-green-600">
                                  $
                                  {(
                                    deal.projectedCommission || 0
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <p className="font-medium">
                                      $
                                      {(
                                        deal.setupCommission || 0
                                      ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                      })}
                                    </p>
                                    <p className="text-gray-500">
                                      20% of setup fees
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <p className="font-medium">
                                      $
                                      {(
                                        deal.monthlyCommission || 0
                                      ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                      })}
                                    </p>
                                    <p className="text-gray-500">
                                      40% of first month
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        console.log(
                                          "View deal details:",
                                          deal.id,
                                        )
                                      }
                                      data-testid={`button-view-pipeline-${deal.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    {deal.dealId && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        data-testid={`button-hubspot-pipeline-${deal.id}`}
                                      >
                                        <a
                                          href={`https://app.hubspot.com/contacts/21143099/deal/${deal.dealId}`}
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
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Adjustment Request Dialog */}
        <Dialog
          open={adjustmentDialogOpen}
          onOpenChange={setAdjustmentDialogOpen}
        >
          <DialogContent
            className="sm:max-w-[500px]"
            data-testid="dialog-adjustment-request"
          >
            <DialogHeader>
              <DialogTitle>Create Commission Adjustment</DialogTitle>
              <DialogDescription>
                {selectedCommission &&
                  `Creating adjustment for ${selectedCommission.dealName}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCommission && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">
                        Current Amount:
                      </span>
                      <p className="text-lg font-bold">
                        ${selectedCommission.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        Commission Type:
                      </span>
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
                <Label htmlFor="adjustment-amount">New Amount</Label>
                <Input
                  id="adjustment-amount"
                  type="text"
                  value={
                    adjustmentAmount
                      ? `$${parseFloat(adjustmentAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value.replace(/[$,]/g, "");
                    if (value === "" || !isNaN(parseFloat(value))) {
                      setAdjustmentAmount(value);
                    }
                  }}
                  placeholder={`$${selectedCommission?.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  data-testid="input-adjustment-amount"
                />
              </div>

              <div>
                <Label htmlFor="adjustment-reason">
                  Reason for Adjustment *
                </Label>
                <Textarea
                  id="adjustment-reason"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Please provide a detailed reason for this adjustment..."
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
                Create Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review Adjustment Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent
            className="sm:max-w-[600px]"
            data-testid="dialog-review-adjustment"
          >
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
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">
                          Original Amount:
                        </span>
                        <p className="text-lg font-bold">
                          $
                          {selectedAdjustmentRequest.originalAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">
                          Requested Amount:
                        </span>
                        <p
                          className={`text-lg font-bold ${selectedAdjustmentRequest.requestedAmount > selectedAdjustmentRequest.originalAmount ? "text-green-600" : "text-red-600"}`}
                        >
                          $
                          {selectedAdjustmentRequest.requestedAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Reason for Adjustment:</Label>
                    <div className="p-3 bg-gray-50 rounded-md mt-1">
                      <p className="text-sm text-gray-700">
                        {selectedAdjustmentRequest.reason}
                      </p>
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
              <Button
                onClick={handleApproveAdjustment}
                data-testid="button-approve-adjustment"
              >
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deal Details Dialog */}
        <Dialog
          open={dealDetailsDialogOpen}
          onOpenChange={setDealDetailsDialogOpen}
        >
          <DialogContent
            className="sm:max-w-[700px]"
            data-testid="dialog-deal-details"
          >
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
                        <Label className="text-sm font-medium text-gray-600">
                          Company
                        </Label>
                        <p className="text-lg font-semibold">
                          {selectedDeal.companyName}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Deal Value
                        </Label>
                        <p className="text-lg font-semibold">
                          ${selectedDeal.amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Service Type
                        </Label>
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
                        <Label className="text-sm font-medium text-gray-600">
                          Sales Rep
                        </Label>
                        <p className="text-lg font-semibold">
                          {selectedDeal.salesRep}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Status
                        </Label>
                        <Badge
                          variant={
                            selectedDeal.status === "closed_won"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {selectedDeal.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Close Date
                        </Label>
                        <p>
                          {selectedDeal.closedDate
                            ? new Date(
                                selectedDeal.closedDate,
                              ).toLocaleDateString()
                            : "Not closed"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium text-gray-600">
                      Commission Breakdown
                    </Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Setup Fee Commission (20%)
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          $
                          {(selectedDeal.setupFee * 0.2).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          20% of ${selectedDeal.setupFee.toLocaleString()} setup
                          fee
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          First Month Commission (40%)
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          $
                          {(selectedDeal.monthlyFee * 0.4).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          40% of ${selectedDeal.monthlyFee.toLocaleString()}{" "}
                          monthly fee
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg col-span-2">
                        <p className="text-sm text-gray-600">
                          Total First Month Commission
                        </p>
                        <p className="text-xl font-bold text-purple-600">
                          $
                          {(
                            selectedDeal.setupFee * 0.2 +
                            selectedDeal.monthlyFee * 0.4
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedDeal.status === "open" &&
                    selectedDeal.probability && (
                      <div className="border-t pt-4">
                        <Label className="text-sm font-medium text-gray-600">
                          Pipeline Information
                        </Label>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <p className="text-sm text-gray-600">
                              Pipeline Stage
                            </p>
                            <p className="font-semibold">
                              {selectedDeal.pipelineStage}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              Close Probability
                            </p>
                            <p className="font-semibold">
                              {selectedDeal.probability}%
                            </p>
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
              <Button
                variant="outline"
                onClick={() => {
                  const commission = commissions.find(
                    (c) => c.dealId === selectedDeal?.id,
                  );
                  if (commission) {
                    handleRequestAdjustment(commission);
                    setDealDetailsDialogOpen(false);
                  }
                }}
                disabled={
                  (selectedDeal &&
                    commissions.find((c) => c.dealId === selectedDeal.id)
                      ?.status === "approved") ||
                  commissions.find((c) => c.dealId === selectedDeal?.id)
                    ?.status === "paid"
                }
                data-testid="button-create-adjustment"
              >
                <Edit className="w-4 h-4 mr-2" />
                Create Adjustment
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
      </div>
    </div>
  );
}

export default AdminCommissionTracker;

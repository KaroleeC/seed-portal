import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CreditCard,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

interface StripeRevenue {
  currentMonth: {
    revenue: number;
    transactions: number;
  };
  lastMonth: {
    revenue: number;
    transactions: number;
  };
  yearToDate: {
    revenue: number;
    transactions: number;
  };
  growth: {
    monthOverMonth: number;
  };
  lastUpdated: string;
}

interface StripeTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  customer: string;
  created: string;
  receipt_url: string | null;
}

interface StripeTransactions {
  transactions: StripeTransaction[];
  lastUpdated: string;
}

export default function StripeDashboard() {
  const queryClient = useQueryClient();

  // Fetch revenue data
  const {
    data: revenueData,
    isLoading: revenueLoading,
    error: revenueError,
  } = useQuery<StripeRevenue>({
    queryKey: ["/api/stripe/revenue"],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Fetch recent transactions
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useQuery<StripeTransactions>({
    queryKey: ["/api/stripe/recent-transactions"],
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "succeeded":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/stripe/"] });
  };

  if (revenueError || transactionsError) {
    const error = revenueError || transactionsError;
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load Stripe data: {error?.message || "Unknown error"}
            {error?.message?.includes("not configured") && (
              <div className="mt-2">
                <p>
                  Please ensure your Stripe API keys are properly configured in the environment
                  variables.
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Stripe Revenue Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time revenue analytics and transaction monitoring
          </p>
        </div>
        <Button onClick={refreshData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueLoading ? "..." : formatCurrency(revenueData?.currentMonth.revenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {revenueData?.currentMonth.transactions || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueLoading ? "..." : formatCurrency(revenueData?.lastMonth.revenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {revenueData?.lastMonth.transactions || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Year to Date</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueLoading ? "..." : formatCurrency(revenueData?.yearToDate.revenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {revenueData?.yearToDate.transactions || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month Growth</CardTitle>
            {(revenueData?.growth.monthOverMonth || 0) >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (revenueData?.growth.monthOverMonth || 0) >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {revenueLoading ? "..." : `${(revenueData?.growth.monthOverMonth || 0).toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">vs previous month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
          <CardDescription>Latest payment activity from your Stripe account</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          ) : transactionsData?.transactions.length ? (
            <div className="space-y-4">
              {transactionsData.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                      <CreditCard className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-gray-600">
                        {transaction.customer} • {formatDate(transaction.created)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(transaction.amount)}</p>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}
                    >
                      {transaction.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No recent transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {revenueData?.lastUpdated && (
        <p className="text-sm text-gray-500 text-center">
          Last updated: {formatDate(revenueData.lastUpdated)}
        </p>
      )}
    </div>
  );
}

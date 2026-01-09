import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Search,
  Building,
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Sparkles,
  ArrowLeft,
  Bell,
  User,
  Settings,
  LogOut,
  Target,
  Zap,
  Activity,
  Upload,
  Eye,
  Download,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KbCard } from "@/components/seedkb/KbCard";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { UniversalNavbar } from "@/components/UniversalNavbar";

interface ClientSnapshot {
  id: string;
  email: string;
  companyName: string;
  industry: string;
  revenue: string;
  employees: number;
  lifecycleStage?: string;
  hubspotContact: any;
  qboData: any;
  quotes: any[];
  painPoints: string[];
  services: string[];
  lastActivity: string;
  riskScore: number;
  upsellOpportunities: string[];
  documents: any[];
  airtableData?: {
    lead_score?: number;
    contact_verified?: string;
    business_operational?: string;
    urgency?: string;
    description?: string;
    [key: string]: any;
  };
}

export default function ClientIntel() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientSnapshot | null>(
    null,
  );
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Debounced search term to prevent excessive API calls
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Enhance prospect data mutation
  const enhanceDataMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const data = await apiRequest<{ message?: string; airtableData?: any }>(
        "POST",
        `/api/client-intel/enhance/${contactId}`,
        {},
      );
      return data;
    },
    onSuccess: (data) => {
      console.log("Enhancement successful:", data);
      toast({
        title: "Data Enhanced",
        description:
          data.message ||
          "Contact and company data has been automatically populated in HubSpot.",
      });
      // Invalidate search results to show updated data
      queryClient.invalidateQueries({ queryKey: ["/api/client-intel/search"] });
    },
    onError: (error: any) => {
      console.error("Enhancement error:", error);
      toast({
        title: "Enhancement Failed",
        description:
          error.message ||
          "Unable to enhance data at this time. Please try again later.",
        variant: "destructive",
      });
    },
  });

  const enhanceProspectData = (contactId: string) => {
    enhanceDataMutation.mutate(contactId);
  };

  const enhanceSelectedRecord = async () => {
    if (!selectedClient?.id) return;

    try {
      const result = await enhanceDataMutation.mutateAsync(selectedClient.id);
      console.log("Enhancement result:", result);

      // Update selected client with Airtable data if available
      if (result?.airtableData) {
        setSelectedClient({
          ...selectedClient,
          airtableData: result.airtableData,
        });
      }

      // Search results will refresh automatically due to reactive query
    } catch (error) {
      // The mutation's onError handler will show the toast
      console.log("Enhancement handled by mutation error handler");
    }
  };

  // Search for clients/prospects with error handling
  const {
    data: searchResults = [],
    isLoading: isSearching,
    error: searchError,
  } = useQuery({
    queryKey: ["/api/client-intel/search", debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm.trim()) return [];

      console.log(`[Frontend] Searching for: "${debouncedSearchTerm}"`);

      try {
        const data = await apiRequest<any[]>(
          "GET",
          `/api/client-intel/search?q=${encodeURIComponent(debouncedSearchTerm)}`,
        );

        // Update the count of results
        // setResultsCount(data.length);

        // Log summary of results for debugging
        if (data.length > 0) {
          const sample = data[0];
          console.log(
            `[Frontend] Search returned ${data.length} results. Sample:`,
            {
              id: sample.id,
              name: sample.name,
              email: sample.email,
            },
          );
        }

        return data;
      } catch (error) {
        console.error("[Frontend] Search error:", error);
        throw error;
      }
    },
    enabled: debouncedSearchTerm.length > 2,
    staleTime: 30000, // Cache for 30 seconds instead of 0
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });

  // Handle search errors with useEffect
  useEffect(() => {
    if (searchError) {
      console.error("Search error:", searchError);
      toast({
        title: "Search Failed",
        description: "Unable to search contacts. Please try again.",
        variant: "destructive",
      });
    }
  }, [searchError, toast]);

  // State for job polling
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<string>("");

  // Generate AI insights for selected client (async with polling)
  const generateInsightsMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const data = await apiRequest<any>(
        "POST",
        "/api/client-intel/generate-insights",
        { clientId },
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.status === "queued" || data.status === "processing") {
        // Start polling for job completion
        setCurrentJobId(data.jobId);
        setJobProgress(data.progress || 0);
        setJobStatus(data.status);
        setIsGeneratingInsights(true);

        toast({
          title: "AI Analysis Started",
          description:
            data.message || "Processing insights in the background...",
        });

        // Start polling
        pollJobStatus(data.jobId);
      } else {
        // Direct response (cached result)
        if (selectedClient) {
          setSelectedClient({ ...selectedClient, ...data });
        }
        setIsGeneratingInsights(false);
        toast({
          title: "Insights Generated",
          description: "AI analysis complete with recommendations.",
        });
      }
    },
    onError: (error: any) => {
      setIsGeneratingInsights(false);
      setCurrentJobId(null);
      toast({
        title: "Analysis Failed",
        description:
          error.message || "Failed to generate insights. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Poll job status until completion
  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const statusData = await apiRequest<{
          progress?: number;
          status?: string;
          result?: any;
          error?: string;
        }>("GET", `/api/jobs/${jobId}/status`);

        setJobProgress(statusData.progress || 0);

        if (statusData.status === "completed") {
          clearInterval(pollInterval);
          setIsGeneratingInsights(false);
          setCurrentJobId(null);

          // Update client with results
          if (selectedClient && statusData.result) {
            setSelectedClient({ ...selectedClient, ...statusData.result });
          }

          toast({
            title: "Insights Complete",
            description: "AI analysis finished with new recommendations.",
          });
        } else if (statusData.status === "failed") {
          clearInterval(pollInterval);
          setIsGeneratingInsights(false);
          setCurrentJobId(null);

          toast({
            title: "Analysis Failed",
            description:
              statusData.error ||
              "Background processing failed. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Polling error:", error);
        clearInterval(pollInterval);
        setIsGeneratingInsights(false);
        setCurrentJobId(null);
      }
    }, 2000); // Poll every 2 seconds

    // Clean up after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (currentJobId) {
        setIsGeneratingInsights(false);
        setCurrentJobId(null);
        toast({
          title: "Analysis Timeout",
          description:
            "Processing is taking longer than expected. Please try again.",
          variant: "destructive",
        });
      }
    }, 300000); // 5 minutes timeout
  };

  const handleClientSelect = async (client: any) => {
    setSelectedClient(client);
  };

  const handleGenerateInsights = () => {
    if (selectedClient) {
      setIsGeneratingInsights(true);
      generateInsightsMutation.mutate(selectedClient.id);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-600 bg-red-100";
    if (score >= 60) return "text-orange-600 bg-orange-100";
    if (score >= 40) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case "bookkeeping":
        return <FileText className="h-4 w-4" />;
      case "tax":
        return <Calendar className="h-4 w-4" />;
      case "payroll":
        return <Users className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen theme-seed-dark bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <UniversalNavbar showBackButton={true} fallbackPath="/" />
      {/* Main Content */}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-muted border rounded-full flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-light text-white">Client Intel</h1>
          </div>
          <p className="text-white/80 text-lg">
            AI-powered client insights for strategic engagement
          </p>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <KbCard>
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Search by company name, email, or industry..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border focus:ring-[#e24c00] focus:border-transparent text-lg py-3"
                />
              </div>
            </CardContent>
          </KbCard>
        </div>

        {/* Search Results - Top Priority */}
        <div className="mb-8">
          <KbCard>
            <CardHeader className="pb-4">
              <CardTitle className="font-semibold tracking-tight text-lg text-foreground">
                Search Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto" />
                  <p className="text-white/70 mt-2">Searching...</p>
                </div>
              ) : searchResults?.length > 0 ? (
                (searchResults ?? []).map((client: any) => (
                  <div
                    key={client.id}
                    onClick={() => handleClientSelect(client)}
                    className="p-4 bg-muted border rounded-lg shadow-sm hover:shadow-md hover:bg-muted/70 transition-all cursor-pointer border-l-4 border-l-blue-500"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">
                          {client.companyName}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {client.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {client.industry &&
                          client.industry !== "Unknown" &&
                          client.industry !== "unknown"
                            ? `${client.industry} • `
                            : ""}
                          {client.revenue || "Revenue not specified"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Badge
                          variant={
                            client.lifecycleStage?.toLowerCase() === "customer"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {client.lifecycleStage?.toLowerCase() === "customer"
                            ? "Client"
                            : "Prospect"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {client.services?.length || 0} services
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : searchTerm.length > 2 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-white/50 mx-auto mb-2" />
                  <p className="text-white/70">No clients found</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="h-8 w-8 text-white/50 mx-auto mb-2" />
                  <p className="text-white/70">Enter 3+ characters to search</p>
                </div>
              )}
            </CardContent>
          </KbCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Enhancement Card - Priority */}
          <div className="lg:col-span-1">
            <KbCard className="mb-6">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="font-semibold tracking-tight text-lg text-foreground">
                      AI Data Enhancement
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Auto-populate missing fields
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedClient ? (
                  <div className="space-y-3">
                    <p className="text-sm text-foreground">
                      {selectedClient.lifecycleStage?.toLowerCase() ===
                      "customer"
                        ? "Client"
                        : "Prospect"}{" "}
                      selected: {selectedClient.companyName}
                    </p>
                    <Button
                      onClick={() => enhanceSelectedRecord()}
                      disabled={
                        enhanceDataMutation.isPending || !selectedClient
                      }
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0"
                    >
                      {enhanceDataMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Enhancing...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Enhance Record
                        </div>
                      )}
                    </Button>
                  </div>
                ) : searchTerm.length > 2 ? (
                  <p className="text-muted-foreground text-sm">
                    Select a contact to enhance
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Search and select a contact to enable enhancement
                  </p>
                )}
              </CardContent>
            </KbCard>
          </div>

          {/* Client Details */}
          <div className="lg:col-span-2">
            {selectedClient ? (
              <div className="space-y-6">
                {/* Client Overview */}
                <KbCard>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <Building className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-white text-xl">
                            {selectedClient.companyName}
                          </CardTitle>
                          <p className="text-white/80">
                            {selectedClient.email}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge
                              variant={
                                selectedClient.lifecycleStage?.toLowerCase() ===
                                "customer"
                                  ? "default"
                                  : "secondary"
                              }
                              className="px-2 py-1"
                            >
                              {selectedClient.lifecycleStage?.toLowerCase() ===
                              "customer"
                                ? "Client"
                                : "Prospect"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="px-2 py-1 text-white border-white/30"
                            >
                              {selectedClient.services?.length || 0} Services
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleGenerateInsights}
                        disabled={
                          generateInsightsMutation.isPending ||
                          isGeneratingInsights
                        }
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                      >
                        {isGeneratingInsights ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            {jobStatus === "queued"
                              ? "Queued..."
                              : jobStatus === "active"
                                ? `Processing ${jobProgress}%`
                                : "Analyzing..."}
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Insights
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-muted border rounded-lg p-3 text-center">
                        <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-foreground">
                          {selectedClient.revenue}
                        </p>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                      <div className="bg-muted border rounded-lg p-3 text-center">
                        <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-foreground">
                          {selectedClient.employees || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Employees
                        </p>
                      </div>
                      <div className="bg-muted border rounded-lg p-3 text-center">
                        <Target className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-foreground">
                          {selectedClient.industry &&
                          selectedClient.industry !== "Unknown" &&
                          selectedClient.industry !== "unknown"
                            ? selectedClient.industry
                            : "Not specified"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Industry
                        </p>
                      </div>
                      <div className="bg-muted border rounded-lg p-3 text-center">
                        <AlertCircle className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-foreground">
                          {selectedClient.riskScore || 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Risk Score
                        </p>
                      </div>
                    </div>

                    {/* Current Services */}
                    <div className="mb-4">
                      <h4 className="text-white font-medium mb-2">
                        Current Services
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedClient.services?.map(
                          (service: string, index: number) => (
                            <Badge
                              key={index}
                              className="bg-green-100 text-green-800 flex items-center gap-1"
                            >
                              {getServiceIcon(service)}
                              {service}
                            </Badge>
                          ),
                        ) || (
                          <p className="text-white/70 text-sm">
                            No services recorded
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Prospect Intelligence from Airtable */}
                    {selectedClient.lifecycleStage?.toLowerCase() !==
                      "customer" &&
                      selectedClient.airtableData && (
                        <div className="mb-4">
                          <div className="bg-muted border rounded-lg p-4">
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Prospect Intelligence
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-foreground">
                                  Lead Score:
                                </span>
                                <div className="mt-1 text-foreground font-semibold">
                                  {selectedClient.airtableData.lead_score ||
                                    "Not set"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-foreground">
                                  Contact Verified:
                                </span>
                                <div className="mt-1 text-muted-foreground">
                                  {selectedClient.airtableData
                                    .contact_verified === "YES"
                                    ? "✅ Verified"
                                    : selectedClient.airtableData
                                        .contact_verified || "Not verified"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-foreground">
                                  Business Operational:
                                </span>
                                <div className="mt-1 text-muted-foreground">
                                  {selectedClient.airtableData
                                    .business_operational === "YES"
                                    ? "✅ Active"
                                    : selectedClient.airtableData
                                        .business_operational || "Unknown"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-foreground">
                                  Urgency:
                                </span>
                                <div className="mt-1 text-muted-foreground capitalize">
                                  {selectedClient.airtableData.urgency ||
                                    "Not set"}
                                </div>
                              </div>
                            </div>
                            {selectedClient.airtableData.description && (
                              <div className="mt-4">
                                <span className="font-medium text-foreground">
                                  Reasoning Summary:
                                </span>
                                <p className="mt-1 text-muted-foreground text-sm">
                                  {selectedClient.airtableData.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </KbCard>

                {/* Detailed Insights Tabs */}
                <KbCard>
                  <CardContent className="p-6">
                    <Tabs defaultValue="insights" className="w-full">
                      <TabsList className="grid w-full grid-cols-4 bg-muted">
                        <TabsTrigger
                          value="insights"
                          className="text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
                        >
                          AI Insights
                        </TabsTrigger>
                        <TabsTrigger
                          value="activity"
                          className="text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
                        >
                          Activity
                        </TabsTrigger>
                        <TabsTrigger
                          value="quotes"
                          className="text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
                        >
                          Quotes
                        </TabsTrigger>
                        <TabsTrigger
                          value="documents"
                          className="text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
                        >
                          Documents
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="insights" className="mt-6 space-y-4">
                        {/* Pain Points */}
                        <div className="bg-muted border rounded-lg p-4">
                          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            Pain Points
                          </h4>
                          <div className="space-y-2">
                            {selectedClient.painPoints?.map(
                              (point: string, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                                  <p className="text-sm text-muted-foreground">
                                    {point}
                                  </p>
                                </div>
                              ),
                            ) || (
                              <p className="text-muted-foreground text-sm">
                                No pain points identified
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Upsell Opportunities */}
                        <div className="bg-muted border rounded-lg p-4">
                          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            Upsell Opportunities
                          </h4>
                          <div className="space-y-2">
                            {selectedClient.upsellOpportunities?.map(
                              (opp: string, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2" />
                                  <p className="text-sm text-muted-foreground">
                                    {opp}
                                  </p>
                                </div>
                              ),
                            ) || (
                              <p className="text-muted-foreground text-sm">
                                No opportunities identified
                              </p>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="activity" className="mt-6">
                        <div className="bg-muted border rounded-lg p-4">
                          <h4 className="font-medium text-foreground mb-3">
                            Recent Activity
                          </h4>
                          <p className="text-muted-foreground text-sm">
                            Activity timeline coming soon...
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="quotes" className="mt-6">
                        <div className="bg-muted border rounded-lg p-4">
                          <h4 className="font-medium text-foreground mb-3">
                            Quote History
                          </h4>
                          <p className="text-muted-foreground text-sm">
                            Quote history will be displayed here...
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="documents" className="mt-6">
                        <div className="bg-muted border rounded-lg p-4">
                          <h4 className="font-medium text-foreground mb-3">
                            Documents & Files
                          </h4>
                          <p className="text-muted-foreground text-sm">
                            Document management coming soon...
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </KbCard>
              </div>
            ) : (
              <KbCard>
                <CardContent className="p-12 text-center">
                  <Sparkles className="h-16 w-16 text-white/50 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">
                    Select a Client
                  </h3>
                  <p className="text-white/70">
                    Search and select a client to view their AI-generated
                    insights
                  </p>
                </CardContent>
              </KbCard>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

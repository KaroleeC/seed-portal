import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  ExternalLink,
  Filter,
  Inbox,
  Calendar,
  User,
  X,
  Search,
} from "lucide-react";
import {
  format,
  parseISO,
  isAfter,
  isBefore,
  startOfDay,
  endOfDay,
} from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

interface SalesLead {
  id: string;
  properties: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    hs_avatar_filemanager_key?: string;
    hubspot_owner_assigneddate?: string;
    hs_createdate?: string;
    lifecyclestage?: string;
    hs_lead_status?: string;
  };
  leadStage: string;
  hubspotContactUrl: string;
}

interface SalesInboxProps {
  limit?: number;
}

export function SalesInbox({ limit = 8 }: SalesInboxProps) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const {
    data: leadsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/sales-inbox/leads", limit, user?.email],
    queryFn: async () => {
      return await apiRequest(`/api/sales-inbox/leads?limit=${limit}`);
    },
    staleTime: 0, // Always consider data stale - fetch fresh data every time
    gcTime: 0, // Don't cache data to prevent user data leakage
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid excessive requests
  });

  // Separate query for all leads (for modal)
  const { data: allLeadsData, isLoading: isLoadingAll } = useQuery({
    queryKey: ["/api/sales-inbox/leads", "all", user?.email],
    queryFn: async () => {
      return await apiRequest("/api/sales-inbox/leads?limit=100"); // Get up to 100 leads
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    enabled: true, // Always fetch to get the total count for button
  });

  const leads: SalesLead[] = (leadsData?.leads || []).sort(
    (a: SalesLead, b: SalesLead) => {
      // Sort by assigned date (most recent first) - use this reliable date field
      const dateA = new Date(
        a.properties.hubspot_owner_assigneddate ||
          a.properties.hs_createdate ||
          "1970-01-01",
      );
      const dateB = new Date(
        b.properties.hubspot_owner_assigneddate ||
          b.properties.hs_createdate ||
          "1970-01-01",
      );
      return dateB.getTime() - dateA.getTime();
    },
  );

  const allLeads: SalesLead[] = allLeadsData?.leads || [];
  const totalLeadCount = allLeads.length > 0 ? allLeads.length : leads.length;

  // Filter function for modal leads
  const filteredLeads = allLeads.filter((lead) => {
    // Search filter (company name or email)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const companyName = (lead.properties.company || "").toLowerCase();
      const email = (lead.properties.email || "").toLowerCase();
      const firstName = (lead.properties.firstname || "").toLowerCase();
      const lastName = (lead.properties.lastname || "").toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();

      if (
        !companyName.includes(query) &&
        !email.includes(query) &&
        !fullName.includes(query)
      ) {
        return false;
      }
    }

    // Stage filter
    if (stageFilter !== "all" && lead.leadStage !== stageFilter) {
      return false;
    }

    // Date range filter
    if (dateFilter.start || dateFilter.end) {
      const leadDate =
        lead.properties.hubspot_owner_assigneddate ||
        lead.properties.hs_createdate;
      if (!leadDate) return false;

      const leadDateObj = parseISO(leadDate);

      if (dateFilter.start) {
        const startDate = startOfDay(parseISO(dateFilter.start));
        if (isBefore(leadDateObj, startDate)) return false;
      }

      if (dateFilter.end) {
        const endDate = endOfDay(parseISO(dateFilter.end));
        if (isAfter(leadDateObj, endDate)) return false;
      }
    }

    return true;
  });

  // Get unique lead stages for filter dropdown
  const uniqueStages = Array.from(
    new Set(allLeads.map((lead) => lead.leadStage)),
  );

  const clearFilters = () => {
    setDateFilter({ start: "", end: "" });
    setStageFilter("all");
    setSearchQuery("");
  };

  const formatContactName = (lead: SalesLead) => {
    const firstName = lead.properties.firstname || "";
    const lastName = lead.properties.lastname || "";
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) return firstName;
    if (lastName) return lastName;
    return lead.properties.email;
  };

  const formatCreateDate = (dateString?: string) => {
    if (!dateString) return "No date";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const getAvatarUrl = (lead: SalesLead) => {
    // If HubSpot has an avatar URL, use it
    if (lead.properties.hs_avatar_filemanager_key) {
      return `https://app.hubspot.com/file-preview/${lead.properties.hs_avatar_filemanager_key}`;
    }
    return null;
  };

  const getLeadStageColor = (stage: string) => {
    const lowerStage = stage.toLowerCase();
    if (lowerStage.includes("new") || lowerStage.includes("lead")) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    if (
      lowerStage.includes("qualified") ||
      lowerStage.includes("opportunity")
    ) {
      return "bg-green-100 text-green-800 border-green-200";
    }
    if (lowerStage.includes("contact") || lowerStage.includes("attempt")) {
      return "bg-orange-100 text-orange-800 border-orange-200";
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  if (isLoading) {
    return (
      <Card className="bg-white/30 backdrop-blur-md border border-white/40 shadow-xl h-fit">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Inbox className="h-6 w-6 text-orange-300" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Sales Inbox</CardTitle>
              <CardDescription className="text-white/80">
                Loading active leads...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-white/20 border border-white/20 rounded-lg animate-pulse"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/30 rounded-full" />
                  <div>
                    <div className="h-4 bg-white/30 rounded w-32 mb-2" />
                    <div className="h-3 bg-white/30 rounded w-48" />
                  </div>
                </div>
                <div className="h-8 bg-white/30 rounded w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/30 backdrop-blur-md border border-white/40 shadow-xl h-fit">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Inbox className="h-6 w-6 text-red-300" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Sales Inbox</CardTitle>
              <CardDescription className="text-red-300">
                Failed to load leads
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/80">
            Unable to connect to HubSpot. Please check your integration
            settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/30 backdrop-blur-md border border-white/40 shadow-xl h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium text-white">
              Sales Inbox
            </CardTitle>
            <CardDescription className="text-sm text-white/80">
              Active leads requiring attention
            </CardDescription>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
                View All ({totalLeadCount})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  All Active Leads
                </DialogTitle>
              </DialogHeader>

              {/* Filter Controls */}
              <div className="border-b pb-4 mb-4 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by company name, email, or contact name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Filters:</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor="stage-filter" className="text-sm">
                      Stage:
                    </Label>
                    <Select value={stageFilter} onValueChange={setStageFilter}>
                      <SelectTrigger className="w-48" id="stage-filter">
                        <SelectValue placeholder="All stages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All stages</SelectItem>
                        {uniqueStages.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor="date-start" className="text-sm">
                      From:
                    </Label>
                    <Input
                      id="date-start"
                      type="date"
                      value={dateFilter.start}
                      onChange={(e) =>
                        setDateFilter((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                      className="w-36"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor="date-end" className="text-sm">
                      To:
                    </Label>
                    <Input
                      id="date-end"
                      type="date"
                      value={dateFilter.end}
                      onChange={(e) =>
                        setDateFilter((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
                      className="w-36"
                    />
                  </div>

                  {(stageFilter !== "all" ||
                    dateFilter.start ||
                    dateFilter.end ||
                    searchQuery) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="h-9"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                <div className="text-sm text-gray-600">
                  Showing {filteredLeads.length} of {allLeads.length} leads
                </div>
              </div>

              <ScrollArea className="h-[60vh] pr-4">
                {isLoadingAll ? (
                  <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg animate-pulse"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-300 rounded-full" />
                          <div>
                            <div className="h-4 bg-gray-300 rounded w-32 mb-2" />
                            <div className="h-3 bg-gray-300 rounded w-48" />
                          </div>
                        </div>
                        <div className="h-8 bg-gray-300 rounded w-24" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredLeads
                      .sort((a: SalesLead, b: SalesLead) => {
                        const dateA = new Date(
                          a.properties.hubspot_owner_assigneddate ||
                            a.properties.hs_createdate ||
                            "1970-01-01",
                        );
                        const dateB = new Date(
                          b.properties.hubspot_owner_assigneddate ||
                            b.properties.hs_createdate ||
                            "1970-01-01",
                        );
                        return dateB.getTime() - dateA.getTime();
                      })
                      .map((lead) => (
                        <div
                          key={lead.id}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 text-base">
                                {lead.properties.company || "Unknown Company"}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {formatContactName(lead)} •{" "}
                                {formatCreateDate(
                                  lead.properties.hubspot_owner_assigneddate ||
                                    lead.properties.hs_createdate,
                                )}{" "}
                                • {lead.leadStage}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() =>
                              window.open(lead.hubspotContactUrl, "_blank")
                            }
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in HubSpot
                          </Button>
                        </div>
                      ))}
                    {filteredLeads.length === 0 && allLeads.length > 0 && (
                      <div className="text-center py-12">
                        <Filter className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                          No leads match your filters
                        </h3>
                        <p className="text-gray-500">
                          Try adjusting your date range or stage selection.
                        </p>
                      </div>
                    )}
                    {allLeads.length === 0 && (
                      <div className="text-center py-12">
                        <Inbox className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                          No active leads
                        </h3>
                        <p className="text-gray-500">
                          All caught up! No leads requiring attention at the
                          moment.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3" style={{ minHeight: "520px" }}>
        {leads.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-12 w-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No active leads
            </h3>
            <p className="text-white/60">
              All caught up! No leads requiring attention at the moment.
            </p>
          </div>
        ) : (
          <>
            {leads.slice(0, 8).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-4 bg-white border-l-4 border-l-orange-500 rounded-lg shadow-sm"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {lead.properties.company || "Unknown Company"}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {formatContactName(lead)} •{" "}
                      {formatCreateDate(
                        lead.properties.hubspot_owner_assigneddate ||
                          lead.properties.hs_createdate,
                      )}{" "}
                      • {lead.leadStage}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => window.open(lead.hubspotContactUrl, "_blank")}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                >
                  Open in HubSpot
                </Button>
              </div>
            ))}
            {/* Fill remaining space for consistent height */}
            {leads.length < 8 && (
              <div style={{ height: `${(8 - leads.length) * 80}px` }} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

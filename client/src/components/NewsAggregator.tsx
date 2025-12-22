import { useState, useEffect } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KbCard } from "@/components/seedkb/KbCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Newspaper, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  category: "tax" | "accounting" | "finance";
}

export function NewsAggregator() {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Simulate news fetching with a mock API that returns relevant tax and accounting news
  const {
    data: articles = [],
    isLoading,
    refetch,
  } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/tax-accounting"],
    queryFn: async () => {
      // In a real implementation, this would call your backend which aggregates news from various sources
      // For now, we'll simulate with some example articles
      return [
        {
          title: "IRS Announces New Tax Filing Deadlines for 2024",
          description:
            "The Internal Revenue Service has updated filing deadlines for various business entities following recent legislative changes.",
          url: "https://www.irs.gov/newsroom/irs-announces-new-tax-filing-deadlines-2024",
          source: "IRS",
          publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          category: "tax",
        },
        {
          title: "FASB Issues New Revenue Recognition Guidelines",
          description:
            "The Financial Accounting Standards Board releases updated guidance on revenue recognition for service-based businesses.",
          url: "https://www.fasb.org/news/revenue-recognition-update",
          source: "FASB",
          publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
          category: "accounting",
        },
        {
          title: "Small Business Tax Deduction Changes Take Effect",
          description:
            "New regulations affecting Section 199A deductions for pass-through entities are now in effect for the current tax year.",
          url: "https://www.sba.gov/tax-deduction-changes",
          source: "SBA",
          publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
          category: "tax",
        },
        {
          title: "Cash Flow Management Best Practices Update",
          description:
            "Industry experts share updated strategies for maintaining healthy cash flow in uncertain economic conditions.",
          url: "https://www.aicpa.org/cash-flow-management",
          source: "AICPA",
          publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
          category: "finance",
        },
      ];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 30 * 60 * 1000, // Auto-refresh every 30 minutes
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "tax":
        return "bg-red-100 text-red-800 border-red-200";
      case "accounting":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "finance":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-muted text-foreground border";
    }
  };

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  return (
    <KbCard className="h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-white">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Newspaper className="h-5 w-5 text-blue-300" />
            </div>
            Tax & Accounting News
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <p className="text-white/70 text-sm">
          Latest updates from trusted sources • Updated{" "}
          {formatTimeAgo(lastRefresh.toISOString())}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-white/20 rounded mb-2" />
                <div className="h-3 bg-white/10 rounded mb-1" />
                <div className="h-3 bg-white/10 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          articles.map((article, index) => (
            <div
              key={index}
              className="p-3 bg-muted border rounded-lg hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getCategoryColor(article.category)}`}
                    >
                      {article.category.toUpperCase()}
                    </Badge>
                    <span className="text-white/60 text-xs">
                      {formatTimeAgo(article.publishedAt)}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1 line-clamp-2">
                    {article.title}
                  </h4>
                  <p className="text-xs text-white/70 line-clamp-2 mb-2">
                    {article.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">
                      {article.source}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-white/70 hover:text-white hover:bg-white/10 h-auto p-1"
                    >
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="text-xs">Read</span>
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </KbCard>
  );
}

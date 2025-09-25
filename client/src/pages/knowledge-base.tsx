import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  BookOpen,
  Calculator,
  TrendingUp,
  BrainCircuit,
  Target,
  Shield,
  Wrench,
  Heart,
  Compass,
  Folder,
  Eye,
  Clock,
  ChevronRight,
  Settings,
  ArrowLeft,
  User,
  LogOut,
} from "lucide-react";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { apiRequest } from "@/lib/queryClient";
import { logoLight as logoLightData, logoDark as logoDarkData } from "@/assets/logos";
import { useTheme } from "@/theme";

// Types
interface KbCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KbArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  categoryId: number;
  authorId: number;
  status: string;
  featured: boolean;
  tags: string[] | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

// Icon mapping for dynamic icons
const iconMap: Record<string, any> = {
  compass: Compass,
  calculator: Calculator,
  "book-open": BookOpen,
  "trending-up": TrendingUp,
  "brain-circuit": BrainCircuit,
  target: Target,
  shield: Shield,
  wrench: Wrench,
  heart: Heart,
  folder: Folder,
  settings: Settings,
};

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<KbCategory | null>(
    null,
  );
  const [selectedArticle, setSelectedArticle] = useState<KbArticle | null>(
    null,
  );
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);

  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? logoDarkData : logoLightData;

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setLocation("/");
  };

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<
    KbCategory[]
  >({
    queryKey: ["/api/kb/categories"],
  });

  // Fetch articles for selected category
  const { data: categoryArticles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["/api/kb/articles", selectedCategory?.id, "published"],
    queryFn: async () => {
      if (!selectedCategory?.id) return [];
      return apiRequest(
        `/api/kb/articles?categoryId=${selectedCategory.id}&status=published`,
      );
    },
    enabled: !!selectedCategory,
  });

  // Search articles
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["/api/kb/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      return apiRequest(`/api/kb/search?q=${encodeURIComponent(searchQuery)}`);
    },
    enabled: searchQuery.length >= 2,
  });

  const handleCategoryClick = (category: KbCategory) => {
    setSelectedCategory(category);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedArticle(null);
  };

  const handleArticleClick = (article: KbArticle) => {
    setSelectedArticle(article);
  };

  const handleBackToArticles = () => {
    setSelectedArticle(null);
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Folder;
    return IconComponent;
  };

  // Article detail view
  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
        {/* Navigation Header */}
        <div className="bg-popover backdrop-blur-sm border-b border-border px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-orange-200 hover:bg-white/10"
              onClick={handleBackToArticles}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to {selectedCategory?.name}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-orange-200 hover:bg-white/10"
                >
                  <User className="h-4 w-4 mr-2" />
                  {user?.firstName || user?.email?.split("@")[0] || "User"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setLocation("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/kb-admin")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Knowledge Base Admin</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Article Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Article Header */}
          <div className="mb-8">
            <h1
              className="text-3xl font-bold text-white mb-4 border-b-2 border-orange-500 pb-3"
              style={{ fontFamily: "Open Sans, sans-serif" }}
            >
              {selectedArticle.title}
            </h1>

            {/* Article Metadata */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-white/80 mb-4">
              <div className="flex items-center gap-1">
                <span className="font-medium">Document Type:</span>
                <span>Internal Sales Training</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Target Team:</span>
                <span>Sales Team</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Last Reviewed:</span>
                <span>
                  {new Date(selectedArticle.updatedAt).toLocaleDateString(
                    "en-US",
                    { month: "long", year: "numeric" },
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/70">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {selectedArticle.viewCount} views
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(selectedArticle.updatedAt).toLocaleDateString()}
              </span>
            </div>

            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
              <div className="flex gap-2 mt-4">
                {selectedArticle.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="border-orange-200 text-orange-700 bg-orange-50"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Article Body */}
          <div
            className="prose max-w-none text-white leading-relaxed"
            style={{
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: "1.6",
              color: "inherit",
            }}
            dangerouslySetInnerHTML={{
              __html: (() => {
                let content = selectedArticle.content;

                // Remove the first h1 tag (duplicate title)
                content = content.replace(/<h1[^>]*>.*?<\/h1>/, "");

                // Comprehensive metadata removal - handles all variations
                // Remove any paragraph containing Document Type, Target Team, or Last Reviewed
                content = content.replace(
                  /<p[^>]*>.*?(?:Document Type|Target Team|Last Reviewed).*?<\/p>/gi,
                  "",
                );

                // Remove any div containing Document Type, Target Team, or Last Reviewed
                content = content.replace(
                  /<div[^>]*>.*?(?:Document Type|Target Team|Last Reviewed).*?<\/div>/gi,
                  "",
                );

                // Remove any standalone text containing these patterns (in case they're not wrapped)
                content = content.replace(
                  /Document Type:\s*[^\n<]*(?:\n|<br[^>]*>)?/gi,
                  "",
                );
                content = content.replace(
                  /Target Team:\s*[^\n<]*(?:\n|<br[^>]*>)?/gi,
                  "",
                );
                content = content.replace(
                  /Last Reviewed:\s*[^\n<]*(?:\n|<br[^>]*>)?/gi,
                  "",
                );

                // Remove any remaining metadata blocks (more aggressive)
                content = content.replace(
                  /<[^>]*>\s*Document Type:.*?<\/[^>]*>/gi,
                  "",
                );
                content = content.replace(
                  /<[^>]*>\s*Target Team:.*?<\/[^>]*>/gi,
                  "",
                );
                content = content.replace(
                  /<[^>]*>\s*Last Reviewed:.*?<\/[^>]*>/gi,
                  "",
                );

                // Clean up any empty paragraphs or divs left behind
                content = content.replace(/<p[^>]*>\s*<\/p>/g, "");
                content = content.replace(/<div[^>]*>\s*<\/div>/g, "");

                // Apply styling to remaining headings and elements
                return content
                  .replace(
                    /<h1([^>]*)>/g,
                    '<h1$1 style="color: #2d3748; margin-top: 2em; border-bottom: 2px solid #f97316; padding-bottom: 10px;">',
                  )
                  .replace(
                    /<h2([^>]*)>/g,
                    '<h2$1 style="color: #2d3748; margin-top: 2em; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">',
                  )
                  .replace(
                    /<h3([^>]*)>/g,
                    '<h3$1 style="color: #2d3748; margin-top: 2em;">',
                  )
                  .replace(
                    /<blockquote([^>]*)>/g,
                    '<blockquote$1 style="border-left: 4px solid #f97316; margin: 20px 0; padding: 10px 20px; background: #fef5e7;">',
                  )
                  .trim();
              })(),
            }}
          />
        </div>
      </div>
    );
  }

  // Main categories view
  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <UniversalNavbar showBackButton={true} fallbackPath="/" />

          {/* Title */}
          <div className="text-center mb-12">
            <h1
              className="text-8xl font-bold text-white mb-4"
              style={{ fontFamily: "League Spartan, sans-serif" }}
            >
              SEED<span style={{ color: "#e24c00" }}>KB</span>
            </h1>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
              <Input
                placeholder="Search knowledge base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg bg-white/15 backdrop-blur-md border-white/30 placeholder:text-white/60 text-white focus:bg-white/20 focus:border-white/50"
                onClick={() => setIsSearchDialogOpen(true)}
              />
            </div>

            {/* Search Results Dialog */}
            <Dialog
              open={isSearchDialogOpen && searchQuery.length >= 2}
              onOpenChange={setIsSearchDialogOpen}
            >
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Search Results</DialogTitle>
                </DialogHeader>

                {searchLoading ? (
                  <div className="text-center py-8">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No articles found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="space-y-4">
                    {searchResults.map((article: KbArticle) => (
                      <Card
                        key={article.id}
                        className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3
                              className="font-semibold text-lg mb-2"
                              style={{ fontFamily: "Open Sans, sans-serif" }}
                            >
                              {article.title}
                            </h3>
                            {article.excerpt && (
                              <p className="text-gray-600 text-sm mb-3">
                                {article.excerpt}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {article.viewCount} views
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(
                                  article.updatedAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categoriesLoading ? (
              <div className="col-span-full text-center text-white">
                Loading categories...
              </div>
            ) : (
              categories.map((category: KbCategory) => {
                const IconComponent = getIconComponent(category.icon);

                return (
                  <Card
                    key={category.id}
                    className="group h-80 cursor-pointer transition-all duration-500 hover:scale-[1.05] hover:shadow-2xl hover:shadow-black/40 bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 hover:from-slate-700/90 hover:to-slate-800/90 hover:border-orange-400/70 backdrop-blur-xl border-2 rounded-2xl overflow-hidden relative transform hover:-translate-y-2"
                    onClick={() => handleCategoryClick(category)}
                  >
                    {/* Strong background overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Dramatic glow effect */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-2xl" />

                    <div className="relative p-8 h-full flex flex-col items-center justify-center text-center">
                      {/* Dramatically enhanced icon container */}
                      <div
                        className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-6 shadow-2xl shadow-black/50 group-hover:shadow-3xl group-hover:scale-125 transition-all duration-500 relative overflow-hidden border-2 border-white/20 group-hover:border-white/40`}
                      >
                        {/* Strong icon glow effect */}
                        <div className="absolute inset-0 bg-white/30 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <IconComponent className="h-12 w-12 text-white relative z-10 group-hover:scale-110 transition-transform duration-500 drop-shadow-lg" />
                      </div>

                      {/* Enhanced typography with stronger contrast */}
                      <h3 className="text-xl font-bold text-white mb-4 group-hover:text-orange-200 transition-colors duration-300 drop-shadow-lg">
                        {category.name}
                      </h3>

                      <p className="text-gray-300 text-sm leading-relaxed group-hover:text-white transition-colors duration-300">
                        {category.description}
                      </p>

                      {/* Strong bottom accent with animation */}
                      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-orange-400/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* Corner accent */}
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-bl-3xl" />
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Coming Soon Features - Enhanced Design */}
          <div className="mt-20 relative">
            {/* Beautiful background section with stronger contrast */}
            <div className="relative bg-gradient-to-br from-black/80 via-slate-900/60 to-orange-900/40 backdrop-blur-xl rounded-3xl border-2 border-orange-400/30 shadow-2xl shadow-orange-500/20 overflow-hidden">
              {/* More dramatic animated background pattern */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,22,0.15),transparent),radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.1),transparent)] opacity-80" />
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500/60 via-orange-400/80 to-orange-500/60" />

              <div className="relative p-12">
                {/* Enhanced title */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
                      <BrainCircuit className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">
                      Coming Soon: Advanced AI Features
                    </h2>
                  </div>
                  <p className="text-white/70 text-lg max-w-2xl mx-auto">
                    Revolutionizing knowledge management with cutting-edge AI
                    capabilities
                  </p>
                </div>

                {/* Enhanced feature grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  <div className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 hover:border-orange-300/40 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Search className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-3 group-hover:text-orange-100 transition-colors">
                      AI Search Copilot
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed group-hover:text-white/90 transition-colors">
                      Natural language search with intelligent recommendations
                      and contextual understanding
                    </p>
                  </div>

                  <div className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 hover:border-orange-300/40 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Target className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-3 group-hover:text-orange-100 transition-colors">
                      Visual SOP Maps
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed group-hover:text-white/90 transition-colors">
                      Interactive flowcharts and visual process maps for complex
                      procedures
                    </p>
                  </div>

                  <div className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 hover:border-orange-300/40 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <BrainCircuit className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-3 group-hover:text-orange-100 transition-colors">
                      Decision Trees
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed group-hover:text-white/90 transition-colors">
                      AI-guided decision making for tax and financial strategies
                    </p>
                  </div>

                  <div className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 hover:border-orange-300/40 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Settings className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-3 group-hover:text-orange-100 transition-colors">
                      Auto-SOP Generator
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed group-hover:text-white/90 transition-colors">
                      AI creates step-by-step procedures from simple
                      descriptions
                    </p>
                  </div>

                  <div className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 hover:border-orange-300/40 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <BookOpen className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-3 group-hover:text-orange-100 transition-colors">
                      Smart Tagging
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed group-hover:text-white/90 transition-colors">
                      Automatic content categorization and intelligent
                      cross-referencing
                    </p>
                  </div>

                  <div className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 hover:border-orange-300/40 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Heart className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-3 group-hover:text-orange-100 transition-colors">
                      Finance Meme Wall
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed group-hover:text-white/90 transition-colors">
                      AI-curated humor for team culture and client engagement
                    </p>
                  </div>
                </div>

                {/* Call to action */}
                <div className="text-center mt-12">
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-full border border-orange-400/30 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                    <span className="text-orange-200 text-sm font-medium">
                      AI features in active development
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Category articles view
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="relative mb-8">
          <div className="absolute top-0 left-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20"
              onClick={handleBackToCategories}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Categories
            </Button>
          </div>

          <div className="absolute top-0 right-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20"
                >
                  <User className="h-4 w-4 mr-2" />
                  {user?.firstName || user?.email?.split("@")[0] || "User"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setLocation("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/kb-admin")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Knowledge Base Admin</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex justify-center">
            <img src={logoSrc} alt="Seed Financial Logo" className="h-16" />
          </div>
        </div>

        {/* Category Header */}
        <div className="text-center mb-8">
          <div
            className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${selectedCategory.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}
          >
            {(() => {
              const IconComponent = getIconComponent(selectedCategory.icon);
              return <IconComponent className="h-10 w-10 text-white" />;
            })()}
          </div>
          <h1
            className="text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "League Spartan, sans-serif" }}
          >
            {selectedCategory.name}
          </h1>
          <p className="text-white/80 text-lg">
            {selectedCategory.description}
          </p>
        </div>

        {/* Articles */}
        <Card className="bg-white/15 backdrop-blur-md border-white/30">
          <div className="p-8">
            {articlesLoading ? (
              <div className="text-center text-white py-8">
                Loading articles...
              </div>
            ) : categoryArticles.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-16 w-16 text-white/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Articles Yet
                </h3>
                <p className="text-white/70 mb-6">
                  This category doesn't have any published articles yet.
                </p>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => setLocation("/kb-admin")}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Add Content
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.isArray(categoryArticles) ? (
                  categoryArticles.map((article: KbArticle) => (
                    <Card
                      key={article.id}
                      className="bg-white/10 border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
                      onClick={() => handleArticleClick(article)}
                    >
                      <div className="p-6">
                        <h3
                          className="text-lg font-semibold text-white mb-3"
                          style={{ fontFamily: "Open Sans, sans-serif" }}
                        >
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-white/70 text-sm mb-4">
                            {article.excerpt}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-sm text-white/60">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {article.viewCount} views
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(article.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {article.featured && (
                            <Badge
                              variant="outline"
                              className="border-orange-500 text-orange-200"
                            >
                              Featured
                            </Badge>
                          )}
                        </div>
                        {article.tags && article.tags.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {article.tags.slice(0, 3).map((tag, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs border-white/30 text-white/70"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center text-white py-8">
                    Error loading articles. Please try again.
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

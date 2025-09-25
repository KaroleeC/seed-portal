import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Users,
  Search,
  Bookmark,
  Wand2,
  Sparkles,
  RefreshCw,
  MoreVertical,
  Archive,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { AIArticleGenerator } from "@/components/AIArticleGenerator";
import { RichTextEditor } from "@/components/RichTextEditor";
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

// Form schemas
const articleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  excerpt: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  categoryId: z.number().min(1, "Category is required"),
  status: z.enum(["draft", "published", "archived"]),
  featured: z.boolean().default(false),
  tags: z.string().optional(),
});

type ArticleFormData = z.infer<typeof articleSchema>;

export default function KbAdmin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KbArticle | null>(null);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(
    null,
  );
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [showAdvancedDelete, setShowAdvancedDelete] = useState(false);

  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? logoDarkData : logoLightData;

  // Fetch categories - only when authenticated
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/kb/categories"],
    queryFn: async () => {
      return await apiRequest<KbCategory[]>("GET", "/api/kb/categories");
    },
    enabled: !!user,
  });

  // Fetch articles - only when authenticated
  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["/api/kb/articles", selectedCategory],
    queryFn: async () => {
      const params = selectedCategory ? `?categoryId=${selectedCategory}` : "";
      return await apiRequest<KbArticle[]>("GET", `/api/kb/articles${params}`);
    },
    enabled: !!user,
  });

  // Article form
  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      excerpt: "",
      content: "",
      categoryId: selectedCategory || undefined,
      status: "draft",
      featured: false,
      tags: "",
    },
  });

  // Create article mutation
  const createArticleMutation = useMutation({
    mutationFn: async (data: ArticleFormData) => {
      const payload = {
        ...data,
        tags: data.tags
          ? data.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
      };
      return await apiRequest<KbArticle>("POST", "/api/kb/articles", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/articles"] });
      setIsArticleDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Article created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create article",
        variant: "destructive",
      });
    },
  });

  // Update article mutation
  const updateArticleMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<ArticleFormData>;
    }) => {
      const payload = {
        ...data,
        tags: data.tags
          ? data.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : undefined,
      };
      return await apiRequest<KbArticle>(
        "PATCH",
        `/api/kb/articles/${id}`,
        payload,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/articles"] });
      setIsArticleDialogOpen(false);
      setEditingArticle(null);
      form.reset();
      toast({
        title: "Success",
        description: "Article updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update article",
        variant: "destructive",
      });
    },
  });

  // Delete article mutation (permanent deletion)
  const deleteArticleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest<{ success: boolean }>(
        "DELETE",
        `/api/kb/articles/${id}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/articles"] });
      setDeleteDialogOpen(false);
      setSelectedArticleId(null);
      toast({
        title: "Success",
        description: "Article permanently deleted from database",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete article",
        variant: "destructive",
      });
    },
  });

  // Archive article mutation
  const archiveArticleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest<{ success: boolean }>(
        "PATCH",
        `/api/kb/articles/${id}/archive`,
        {},
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/articles"] });
      setArchiveDialogOpen(false);
      setSelectedArticleId(null);
      toast({
        title: "Success",
        description: "Article archived successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive article",
        variant: "destructive",
      });
    },
  });

  // Publish/Unpublish article mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const newStatus = status === "published" ? "draft" : "published";
      return await apiRequest<KbArticle>("PATCH", `/api/kb/articles/${id}`, {
        status: newStatus,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/articles"] });
      const newStatus =
        variables.status === "published" ? "draft" : "published";
      toast({
        title: "Success",
        description: `Article ${newStatus === "published" ? "published" : "unpublished"} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update article status",
        variant: "destructive",
      });
    },
  });

  // Generate metadata mutation
  const generateMetadataMutation = useMutation({
    mutationFn: async (data: { content: string; title: string }) => {
      const response = await apiRequest("/api/kb/ai/generate-metadata", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data: { excerpt: string; tags: string[] }) => {
      form.setValue("excerpt", data.excerpt);
      form.setValue("tags", data.tags.join(", "));
      toast({
        title: "Metadata Generated",
        description:
          "Excerpt and tags have been auto-generated based on your content.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate metadata",
        variant: "destructive",
      });
    },
  });

  const handleGenerateExcerpt = () => {
    const content = form.getValues("content");
    const title = form.getValues("title");
    if (content && title) {
      generateMetadataMutation.mutate({ content, title });
    }
  };

  const handleCreateArticle = (data: ArticleFormData) => {
    // Generate base slug from title
    const baseSlug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .trim();

    // Ensure unique slug by adding timestamp suffix
    const timestamp = Date.now();
    const uniqueSlug = `${baseSlug}-${timestamp}`;

    const articleData = {
      ...data,
      slug: uniqueSlug,
    };

    createArticleMutation.mutate(articleData);
  };

  const handleUpdateArticle = (data: ArticleFormData) => {
    if (editingArticle) {
      updateArticleMutation.mutate({ id: editingArticle.id, data });
    }
  };

  const handleEditArticle = (article: KbArticle) => {
    setEditingArticle(article);
    form.reset({
      title: article.title,
      excerpt: article.excerpt || "",
      content: article.content,
      categoryId: article.categoryId,
      status: article.status as "draft" | "published" | "archived",
      featured: article.featured,
      tags: article.tags?.join(", ") || "",
    });
    setIsArticleDialogOpen(true);
  };

  // Handler functions for delete and archive confirmation dialogs
  const openDeleteDialog = (id: number) => {
    setSelectedArticleId(id);
    setDeleteConfirmationText("");
    setShowAdvancedDelete(false);
    setDeleteDialogOpen(true);
  };

  const openArchiveDialog = (id: number) => {
    setSelectedArticleId(id);
    setArchiveDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedArticleId && deleteConfirmationText === "DELETE") {
      deleteArticleMutation.mutate(selectedArticleId);
    }
  };

  const confirmArchive = () => {
    if (selectedArticleId) {
      archiveArticleMutation.mutate(selectedArticleId);
    }
  };

  const openNewArticleDialog = () => {
    setEditingArticle(null);
    form.reset({
      title: "",
      excerpt: "",
      content: "",
      categoryId: selectedCategory || undefined,
      status: "draft",
      featured: false,
      tags: "",
    });
    setIsArticleDialogOpen(true);
  };

  const handleAIArticleGenerated = (article: {
    title: string;
    content: string;
    categoryId: number;
    excerpt?: string;
    tags?: string[];
  }) => {
    // Pre-populate the regular form with AI-generated content
    setEditingArticle(null);
    form.reset({
      title: article.title,
      excerpt: article.excerpt || "",
      content: article.content,
      categoryId: article.categoryId,
      status: "draft",
      featured: false,
      tags: article.tags ? article.tags.join(", ") : "",
    });
    setIsArticleDialogOpen(true);
    setIsAIGeneratorOpen(false);
  };

  // Show loading state while authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

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
              onClick={() => setLocation("/admin")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Admin Dashboard
            </Button>
          </div>

          <div className="absolute top-0 right-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20"
              onClick={() => setLocation("/knowledge-base")}
            >
              <BookOpen className="h-4 w-4 mr-1" />
              View Knowledge Base
            </Button>
          </div>

          <div className="flex justify-center">
            <img src={logoSrc} alt="Seed Financial Logo" className="h-16" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "Open Sans, sans-serif" }}
          >
            Knowledge Base Admin
          </h1>
          <p className="text-white/80 text-lg">
            Manage articles, categories, and content for SEEDKB
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Categories Card */}
            <Card className="bg-white/15 backdrop-blur-md border-white/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-white hover:text-white hover:bg-white/20 ${
                    selectedCategory === null
                      ? "bg-orange-500/80 hover:bg-orange-500 text-white font-semibold"
                      : ""
                  }`}
                  onClick={() => setSelectedCategory(null)}
                >
                  All Articles
                </Button>
                {(categories as KbCategory[]).map((category: KbCategory) => (
                  <Button
                    key={category.id}
                    variant="ghost"
                    className={`w-full justify-start text-white hover:text-white hover:bg-white/20 ${
                      selectedCategory === category.id
                        ? "bg-orange-500/80 hover:bg-orange-500 text-white font-semibold"
                        : ""
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="bg-white/15 backdrop-blur-md border-white/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">
                    {selectedCategory
                      ? (categories as KbCategory[]).find(
                          (c: KbCategory) => c.id === selectedCategory,
                        )?.name
                      : "All Articles"}
                  </CardTitle>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setIsAIGeneratorOpen(true)}
                      className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-semibold shadow-md"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Article
                    </Button>
                    <Dialog
                      open={isArticleDialogOpen}
                      onOpenChange={setIsArticleDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                          onClick={openNewArticleDialog}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New Article
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {editingArticle
                              ? "Edit Article"
                              : "Create New Article"}
                          </DialogTitle>
                        </DialogHeader>

                        <Form {...form}>
                          <form
                            onSubmit={form.handleSubmit(
                              editingArticle
                                ? handleUpdateArticle
                                : handleCreateArticle,
                            )}
                            className="space-y-6"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Article title"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select
                                      value={field.value?.toString()}
                                      onValueChange={(value) =>
                                        field.onChange(parseInt(value))
                                      }
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {(categories as KbCategory[]).map(
                                          (category: KbCategory) => (
                                            <SelectItem
                                              key={category.id}
                                              value={category.id.toString()}
                                            >
                                              {category.name}
                                            </SelectItem>
                                          ),
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name="excerpt"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center justify-between">
                                    Excerpt
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={handleGenerateExcerpt}
                                      disabled={
                                        generateMetadataMutation.isPending ||
                                        !form.getValues("content") ||
                                        !form.getValues("title")
                                      }
                                      className="text-xs"
                                    >
                                      {generateMetadataMutation.isPending ? (
                                        <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                      ) : (
                                        <Sparkles className="h-3 w-3 mr-1" />
                                      )}
                                      Auto Generate
                                    </Button>
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Brief summary of the article"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="content"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Content</FormLabel>
                                  <FormControl>
                                    <RichTextEditor
                                      content={field.value}
                                      onChange={field.onChange}
                                      placeholder="Start writing your article content..."
                                      height={600}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select
                                      value={field.value}
                                      onValueChange={field.onChange}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="draft">
                                          Draft
                                        </SelectItem>
                                        <SelectItem value="published">
                                          Published
                                        </SelectItem>
                                        <SelectItem value="archived">
                                          Archived
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="tags"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center justify-between">
                                      Tags
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleGenerateExcerpt}
                                        disabled={
                                          generateMetadataMutation.isPending ||
                                          !form.getValues("content") ||
                                          !form.getValues("title")
                                        }
                                        className="text-xs"
                                      >
                                        {generateMetadataMutation.isPending ? (
                                          <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                        ) : (
                                          <Sparkles className="h-3 w-3 mr-1" />
                                        )}
                                        Auto Generate
                                      </Button>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="tag1, tag2, tag3"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="flex items-end">
                                <FormField
                                  control={form.control}
                                  name="featured"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2">
                                      <FormControl>
                                        <input
                                          type="checkbox"
                                          checked={field.value}
                                          onChange={field.onChange}
                                          className="rounded border border-gray-300"
                                        />
                                      </FormControl>
                                      <FormLabel className="!mt-0">
                                        Featured Article
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsArticleDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                className="bg-orange-500 hover:bg-orange-600"
                                disabled={
                                  createArticleMutation.isPending ||
                                  updateArticleMutation.isPending
                                }
                              >
                                {editingArticle
                                  ? "Update Article"
                                  : "Create Article"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {articlesLoading ? (
                  <div className="text-white text-center py-8">
                    Loading articles...
                  </div>
                ) : articles.length === 0 ? (
                  <div className="text-white/70 text-center py-8">
                    No articles found. Create your first article to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {articles.map((article: KbArticle) => (
                      <Card
                        key={article.id}
                        className="bg-white border-gray-200 shadow-sm"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {article.title}
                              </h3>
                              {article.excerpt && (
                                <p className="text-gray-600 text-sm mb-3">
                                  {article.excerpt}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <Badge
                                  variant={
                                    article.status === "published"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className={
                                    article.status === "published"
                                      ? "bg-green-500"
                                      : ""
                                  }
                                >
                                  {article.status}
                                </Badge>
                                {article.featured && (
                                  <Badge
                                    variant="outline"
                                    className="border-orange-500 text-orange-600"
                                  >
                                    Featured
                                  </Badge>
                                )}
                                <span>{article.viewCount} views</span>
                                <span>
                                  {new Date(
                                    article.createdAt,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              {article.tags && article.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {article.tags
                                    .slice(0, 4)
                                    .map((tag, index) => (
                                      <Badge
                                        key={index}
                                        variant="outline"
                                        className="text-xs border-gray-300 text-gray-600 px-2 py-0.5"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  {article.tags.length > 4 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs border-gray-300 text-gray-500 px-2 py-0.5"
                                    >
                                      +{article.tags.length - 4} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-600 hover:text-gray-900"
                                onClick={() => handleEditArticle(article)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-gray-600 hover:text-gray-900"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      togglePublishMutation.mutate({
                                        id: article.id,
                                        status: article.status,
                                      })
                                    }
                                    disabled={togglePublishMutation.isPending}
                                    className={
                                      article.status === "published"
                                        ? "text-orange-600 focus:text-orange-700"
                                        : "text-green-600 focus:text-green-700"
                                    }
                                  >
                                    {article.status === "published" ? (
                                      <>
                                        <EyeOff className="h-4 w-4 mr-2" />
                                        Unpublish Article
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Publish Article
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingArticle(article);
                                      setIsAIGeneratorOpen(true);
                                    }}
                                    className="text-purple-600 focus:text-purple-700"
                                  >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Create Versions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openArchiveDialog(article.id)
                                    }
                                    className="text-orange-600 focus:text-orange-700"
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive Article (Recommended)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openDeleteDialog(article.id)}
                                    className="text-red-600 focus:text-red-700 focus:bg-red-50 border-t border-gray-200"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    ⚠️ Delete Permanently
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Article Generator Component */}
        <AIArticleGenerator
          categories={categories as KbCategory[]}
          onArticleGenerated={handleAIArticleGenerated}
          isOpen={isAIGeneratorOpen}
          onClose={() => {
            setIsAIGeneratorOpen(false);
            setEditingArticle(null);
          }}
          existingArticle={editingArticle}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600 flex items-center gap-2 text-lg font-bold">
                <Trash2 className="h-5 w-5" />
                ⚠️ DANGER: Permanent Deletion
              </AlertDialogTitle>
            </AlertDialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-semibold text-center">
                  This will permanently destroy the article and cannot be
                  undone!
                </p>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-800">
                  <strong>Recommended:</strong> Use "Archive Article" instead to
                  safely hide the article while preserving the content.
                </p>
              </div>

              {!showAdvancedDelete ? (
                <div className="text-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAdvancedDelete(true)}
                    className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                  >
                    I understand the risks - Show deletion options
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="text-center">
                    <p className="text-sm text-gray-700 mb-3">
                      To confirm permanent deletion, type{" "}
                      <strong className="text-red-600">DELETE</strong> below:
                    </p>
                    <Input
                      value={deleteConfirmationText}
                      onChange={(e) =>
                        setDeleteConfirmationText(e.target.value)
                      }
                      placeholder="Type DELETE to confirm"
                      className="border-red-300 focus:border-red-500 focus:ring-red-200 text-center font-mono"
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}
            </div>

            <AlertDialogFooter className="flex gap-2 pt-6">
              <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  if (selectedArticleId) openArchiveDialog(selectedArticleId);
                }}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
              >
                Archive Instead (Safe)
              </Button>
              {showAdvancedDelete && (
                <AlertDialogAction
                  onClick={confirmDelete}
                  disabled={
                    deleteConfirmationText !== "DELETE" ||
                    deleteArticleMutation.isPending
                  }
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteArticleMutation.isPending
                    ? "Deleting..."
                    : "Delete Permanently"}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Archive Confirmation Dialog */}
        <AlertDialog
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive Article</AlertDialogTitle>
              <AlertDialogDescription>
                This will archive the article and hide it from users. The
                article will remain in the database and can be restored later by
                changing its status back to published or draft.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmArchive}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {archiveArticleMutation.isPending
                  ? "Archiving..."
                  : "Archive Article"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Wand2,
  FileText,
  Users,
  Eye,
  CheckCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  Lightbulb,
  Target,
  Zap,
  BookOpen,
  Settings,
  Save,
  Download,
  Edit3,
  Sparkles,
  RotateCcw,
  History,
  Edit,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { RichTextEditor } from "./RichTextEditor";

// Types and interfaces
interface Template {
  id: string;
  name: string;
  structure: string[];
  variables: string[];
  description?: string;
  seedStyle?: boolean;
  preview?: string;
}

interface GenerationStep {
  step: "outline" | "draft" | "polish";
  content: string;
  suggestions?: string[];
  nextSteps?: string[];
}

interface ContentAnalysis {
  brandFitScore: number;
  readabilityLevel: string;
  complianceChecks: string[];
  suggestions: string[];
  missingElements: string[];
}

interface SavedSession {
  formData: GeneratorFormData;
  generatedContent: {
    outline: string;
    draft: string;
    polished: string;
  };
  audienceVersions: {
    internal: string;
    client: string;
    sales: string;
  };
  selectedTemplate: Template | null;
  timestamp: number;
}

// Form schema - dynamic schema for template variables will be handled at runtime
const generatorSchema = z
  .object({
    templateType: z.string().min(1, "Template type is required"),
    title: z.string().min(1, "Title is required"),
    categoryId: z.number().min(1, "Category is required"),
    audience: z.enum(["internal", "client", "sales"]),
    tone: z.enum(["professional", "friendly", "technical"]).default("professional"),
    length: z.enum(["brief", "standard", "comprehensive"]).default("standard"),
    includeCompliance: z.boolean().default(true),
    customRequirements: z.string().optional(),
    variables: z.string().optional(), // JSON string of variables
  })
  .passthrough(); // Allow additional fields for template variables

type GeneratorFormData = z.infer<typeof generatorSchema>;

interface AIArticleGeneratorProps {
  categories: Array<{ id: number; name: string }>;
  onArticleGenerated: (article: {
    title: string;
    content: string;
    categoryId: number;
    excerpt?: string;
    tags?: string[];
  }) => void;
  isOpen: boolean;
  onClose: () => void;
  existingArticle?: {
    id: number;
    title: string;
    content: string;
    categoryId: number;
    excerpt: string | null;
    tags: string[] | null;
  } | null;
}

export function AIArticleGenerator({
  categories,
  onArticleGenerated,
  isOpen,
  onClose,
  existingArticle,
}: AIArticleGeneratorProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<
    "setup" | "outline" | "draft" | "polish" | "versions"
  >(existingArticle ? "versions" : "setup");
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null);
  const [selectedImprovements, setSelectedImprovements] = useState<number[]>([]);
  const [audienceVersions, setAudienceVersions] = useState<Record<string, string>>({});
  const [autoExcerpt, setAutoExcerpt] = useState("");
  const [autoTags, setAutoTags] = useState<string[]>([]);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [showSessionHistory, setShowSessionHistory] = useState(false);

  // Enhanced versions state
  const [previewingVersion, setPreviewingVersion] = useState<{
    audience: string;
    content: string;
  } | null>(null);
  const [editingVersion, setEditingVersion] = useState<{
    audience: string;
    content: string;
  } | null>(null);

  // Fetch available templates with enhanced Seed-styled previews
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/kb/ai/templates"],
    enabled: isOpen,
  });

  // Function to generate versions from existing article
  const handleGenerateVersionsFromExisting = async () => {
    if (!existingArticle) return;

    try {
      const response = await apiRequest("/api/kb/ai/generate-versions", {
        method: "POST",
        body: JSON.stringify({
          title: existingArticle.title,
          categoryId: existingArticle.categoryId,
          audience: "internal",
          tone: "professional",
          length: "standard",
          includeCompliance: true,
          baseContent: existingArticle.content,
        }),
      });

      setAudienceVersions(response);
      toast({
        title: "Versions Generated",
        description: "AI-generated versions for different audiences are ready",
      });
    } catch (error) {
      console.error("Error generating versions:", error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate versions. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Form setup
  const form = useForm<GeneratorFormData>({
    resolver: zodResolver(generatorSchema),
    defaultValues: {
      templateType: "",
      title: "",
      categoryId: 0,
      audience: "internal",
      tone: "professional",
      length: "standard",
      includeCompliance: true,
      customRequirements: "",
      variables: "",
    },
  });

  // Initialize template variable fields when templates load
  useEffect(() => {
    if (templates && Array.isArray(templates)) {
      const allVariables: Record<string, string> = {};
      (templates as Template[]).forEach((template) => {
        if (template.variables) {
          template.variables.forEach((variable) => {
            const fieldName = variable.replace(/[{}]/g, "");
            allVariables[`templateVar_${fieldName}`] = "";
          });
        }
      });

      // Set default values for all template variables
      Object.keys(allVariables).forEach((key) => {
        if (!form.getValues(key as any)) {
          form.setValue(key as any, "");
        }
      });
    }
  }, [templates, form]);

  // Initialize form with existing article data when provided
  useEffect(() => {
    if (existingArticle && isOpen) {
      // Pre-populate form with existing article data
      form.reset({
        title: existingArticle.title,
        categoryId: existingArticle.categoryId,
        templateType: "existing-article",
        audience: "internal",
        tone: "professional",
        length: "standard",
        includeCompliance: true,
        customRequirements: `Generate audience-specific versions of this existing article: "${existingArticle.title}"`,
        variables: "",
      });

      // Set polished content to existing article content
      setGeneratedContent({
        polished: existingArticle.content,
      });

      // Auto-generate versions from existing content
      handleGenerateVersionsFromExisting();

      // Show loading message
      toast({
        title: "Creating Versions",
        description: "Generating audience-specific versions of your article...",
      });
    }
  }, [existingArticle, isOpen, form]);

  // Session persistence functions (moved after form initialization)
  const saveSession = () => {
    const sessionData: SavedSession = {
      formData: form.getValues(),
      generatedContent: {
        outline: generatedContent.outline || "",
        draft: generatedContent.draft || "",
        polished: generatedContent.polished || "",
      },
      audienceVersions: {
        internal: audienceVersions.internal || "",
        client: audienceVersions.client || "",
        sales: audienceVersions.sales || "",
      },
      selectedTemplate,
      timestamp: Date.now(),
    };

    const existing = JSON.parse(localStorage.getItem("ai-article-sessions") || "[]");
    const updated = [sessionData, ...existing.slice(0, 9)]; // Keep last 10 sessions
    localStorage.setItem("ai-article-sessions", JSON.stringify(updated));
    setSavedSessions(updated);

    toast({
      title: "Session Saved",
      description: "Your progress has been saved and can be restored later.",
    });
  };

  const loadSession = (session: SavedSession) => {
    form.reset(session.formData);
    setGeneratedContent(session.generatedContent);
    setAudienceVersions(session.audienceVersions);
    setSelectedTemplate(session.selectedTemplate);

    // Determine current step based on available content
    if (session.audienceVersions.internal) setCurrentStep("versions");
    else if (session.generatedContent.polished) setCurrentStep("polish");
    else if (session.generatedContent.draft) setCurrentStep("draft");
    else if (session.generatedContent.outline) setCurrentStep("outline");
    else setCurrentStep("setup");

    setShowSessionHistory(false);
    toast({
      title: "Session Restored",
      description: "Your previous work has been loaded.",
    });
  };

  // Auto-generate excerpt and tags function
  const generateExcerptAndTags = async (content: string) => {
    try {
      const response = await apiRequest("/api/kb/ai/generate-metadata", {
        method: "POST",
        body: JSON.stringify({ content, title: form.getValues("title") }),
      });
      setAutoExcerpt(response.excerpt);
      setAutoTags(response.tags);
    } catch (error) {
      console.error("Failed to generate metadata:", error);
    }
  };

  // Auto-save current work every 30s
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const hasContent =
        generatedContent.outline || generatedContent.draft || generatedContent.polished;
      if (hasContent) {
        const autoSave: SavedSession = {
          formData: form.getValues(),
          generatedContent: {
            outline: generatedContent.outline || "",
            draft: generatedContent.draft || "",
            polished: generatedContent.polished || "",
          },
          audienceVersions: {
            internal: audienceVersions.internal || "",
            client: audienceVersions.client || "",
            sales: audienceVersions.sales || "",
          },
          selectedTemplate,
          timestamp: Date.now(),
        };
        localStorage.setItem("ai-article-autosave", JSON.stringify(autoSave));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, generatedContent, audienceVersions, selectedTemplate, form]);

  // Load sessions on mount
  useEffect(() => {
    if (isOpen) {
      const saved = JSON.parse(localStorage.getItem("ai-article-sessions") || "[]");
      setSavedSessions(saved);
    }
  }, [isOpen]);

  // Mutations for different generation steps
  const generateOutlineMutation = useMutation({
    mutationFn: async (data: GeneratorFormData & Record<string, any>) => {
      // Collect template variables from individual form fields
      const templateVariables: Record<string, string> = {};
      if (selectedTemplate?.variables) {
        selectedTemplate.variables.forEach((variable) => {
          const fieldName = variable.replace(/[{}]/g, "");
          const fieldValue = data[`templateVar_${fieldName}`];
          if (fieldValue && fieldValue.trim()) {
            templateVariables[fieldName] = fieldValue.trim();
          }
        });
      }

      const payload = {
        ...data,
        variables: Object.keys(templateVariables).length > 0 ? templateVariables : {},
      };
      return apiRequest("/api/kb/ai/generate-outline", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (result: GenerationStep) => {
      setGeneratedContent((prev) => ({ ...prev, outline: result.content }));
      setCurrentStep("outline");
      toast({
        title: "Outline Generated",
        description: "Your article outline is ready for review",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate outline",
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
    onSuccess: (data) => {
      setAutoExcerpt(data.excerpt);
      setAutoTags(data.tags);
    },
  });

  const generateDraftMutation = useMutation({
    mutationFn: async ({
      outline,
      ...data
    }: GeneratorFormData & { outline?: string } & Record<string, any>) => {
      // Collect template variables from individual form fields
      const templateVariables: Record<string, string> = {};
      if (selectedTemplate?.variables) {
        selectedTemplate.variables.forEach((variable) => {
          const fieldName = variable.replace(/[{}]/g, "");
          const fieldValue = data[`templateVar_${fieldName}`];
          if (fieldValue && fieldValue.trim()) {
            templateVariables[fieldName] = fieldValue.trim();
          }
        });
      }

      const payload = {
        ...data,
        variables: Object.keys(templateVariables).length > 0 ? templateVariables : {},
        outline,
      };
      return apiRequest("/api/kb/ai/generate-draft", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (result: GenerationStep, variables) => {
      setGeneratedContent((prev) => ({ ...prev, draft: result.content }));
      setCurrentStep("draft");

      // Auto-generate metadata after draft creation
      generateMetadataMutation.mutate({
        content: result.content,
        title: variables.title,
      });

      toast({
        title: "Draft Generated",
        description: "Article draft created with auto-generated metadata",
      });
    },
  });

  const polishMutation = useMutation({
    mutationFn: async ({
      draft,
      ...data
    }: GeneratorFormData & { draft: string } & Record<string, any>) => {
      // Collect template variables from individual form fields
      const templateVariables: Record<string, string> = {};
      if (selectedTemplate?.variables) {
        selectedTemplate.variables.forEach((variable) => {
          const fieldName = variable.replace(/[{}]/g, "");
          const fieldValue = data[`templateVar_${fieldName}`];
          if (fieldValue && fieldValue.trim()) {
            templateVariables[fieldName] = fieldValue.trim();
          }
        });
      }

      const payload = {
        ...data,
        variables: Object.keys(templateVariables).length > 0 ? templateVariables : {},
        draft,
      };
      return apiRequest("/api/kb/ai/polish", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (result: GenerationStep) => {
      // Use setTimeout to ensure proper state update order
      setTimeout(() => {
        setGeneratedContent((prev) => ({ ...prev, polished: result.content }));
        setCurrentStep("polish");
        toast({
          title: "Article Polished",
          description: "Your article has been refined and is ready for publication",
        });
      }, 100);
    },
    onError: (error: any) => {
      console.error("Polish mutation error:", error);
      toast({
        title: "Polish Failed",
        description: error.message || "Failed to polish article",
        variant: "destructive",
      });
    },
  });

  // Re-draft with selected improvements mutation
  const redraftMutation = useMutation({
    mutationFn: async () => {
      const formData = form.getValues();
      const selectedSuggestions = selectedImprovements.map(
        (index) => contentAnalysis!.suggestions[index]
      );

      return apiRequest("/api/kb/ai/redraft-with-improvements", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          currentContent: generatedContent.draft,
          selectedImprovements: selectedSuggestions,
        }),
      });
    },
    onSuccess: (data: any) => {
      setGeneratedContent((prev) => ({ ...prev, draft: data.content }));
      setSelectedImprovements([]); // Clear selections
      setContentAnalysis(null); // Clear old analysis
      toast({
        title: "Article Re-drafted",
        description: "Your draft has been updated with the selected improvements",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Re-draft Failed",
        description: error.message || "Failed to re-draft with improvements",
        variant: "destructive",
      });
    },
  });

  const analyzeContentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("/api/kb/ai/analyze", {
        method: "POST",
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: (result: ContentAnalysis) => {
      setContentAnalysis(result);
    },
  });

  const generateVersionsMutation = useMutation({
    mutationFn: async ({ baseContent, ...data }: GeneratorFormData & { baseContent: string }) => {
      const variables = data.variables ? JSON.parse(data.variables) : {};
      const payload = { ...data, variables, baseContent };
      return apiRequest("/api/kb/ai/generate-versions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (result: Record<string, string>) => {
      setAudienceVersions(result);
      setCurrentStep("versions");
      toast({
        title: "Versions Generated",
        description: "Multiple audience versions have been created",
      });
    },
  });

  // Handlers
  const handleTemplateSelect = (templateId: string) => {
    const template = (templates as Template[]).find((t: Template) => t.id === templateId);
    setSelectedTemplate(template || null);
    form.setValue("templateType", templateId);
  };

  const handleGenerateOutline = (data: GeneratorFormData) => {
    generateOutlineMutation.mutate(data);
  };

  const handleGenerateDraft = () => {
    const formData = form.getValues();
    generateDraftMutation.mutate({
      ...formData,
      outline: generatedContent.outline,
    });
  };

  const handlePolishArticle = () => {
    const formData = form.getValues();
    polishMutation.mutate({
      ...formData,
      draft: generatedContent.draft || "",
    });
  };

  const handleAnalyzeContent = (content: string) => {
    analyzeContentMutation.mutate(content);
  };

  const handleGenerateVersions = () => {
    const formData = form.getValues();
    const content = generatedContent.polished || generatedContent.draft;
    if (content) {
      generateVersionsMutation.mutate({
        ...formData,
        baseContent: content || "",
      });
    }
  };

  const handleRedraftWithImprovements = () => {
    redraftMutation.mutate();
  };

  // Save draft data and open Create New Article modal - don't create DB record yet
  const handleSaveArticle = (content: string) => {
    const formData = form.getValues();

    // Just trigger the callback with the article data - modal will handle actual creation
    onArticleGenerated({
      title: formData.title,
      content,
      categoryId: formData.categoryId,
      excerpt: autoExcerpt || "AI-generated article with advanced content analysis",
      tags: autoTags.length > 0 ? autoTags : ["ai-generated", "knowledge-base"],
    });

    // Clear the current session after saving draft
    localStorage.removeItem("ai-article-autosave");
    onClose();
    resetGenerator();
  };

  const resetGenerator = () => {
    setCurrentStep("setup");
    setGeneratedContent({});
    setSelectedTemplate(null);
    setContentAnalysis(null);
    setAudienceVersions({});
    form.reset();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  // Server now returns properly formatted HTML, so no conversion needed
  const ensureCleanHtml = (content: string): string => {
    if (!content) return "";
    return content.trim();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-orange-500" />
              AI Knowledge Base Article Generator
            </div>
            <div className="flex items-center gap-2">
              {/* Session Management */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSessionHistory(true)}
                disabled={savedSessions.length === 0}
              >
                <History className="h-4 w-4 mr-1" />
                Sessions ({savedSessions.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={saveSession}
                disabled={
                  !generatedContent.outline && !generatedContent.draft && !generatedContent.polished
                }
              >
                <Save className="h-4 w-4 mr-1" />
                Save Progress
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="setup" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Setup
            </TabsTrigger>
            <TabsTrigger
              value="outline"
              disabled={!generatedContent.outline}
              className="flex items-center gap-1"
            >
              <FileText className="h-4 w-4" />
              Outline
            </TabsTrigger>
            <TabsTrigger
              value="draft"
              disabled={!generatedContent.draft}
              className="flex items-center gap-1"
            >
              <BookOpen className="h-4 w-4" />
              Draft
            </TabsTrigger>
            <TabsTrigger
              value="polish"
              disabled={!generatedContent.polished}
              className="flex items-center gap-1"
            >
              <Zap className="h-4 w-4" />
              Polish
            </TabsTrigger>
            <TabsTrigger
              value="versions"
              disabled={!audienceVersions.internal}
              className="flex items-center gap-1"
            >
              <Users className="h-4 w-4" />
              Versions
            </TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleGenerateOutline)} className="space-y-6">
                {/* Template Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Choose Template
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {templatesLoading ? (
                      <div className="text-center py-4">Loading templates...</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(templates as Template[]).map((template: Template) => (
                          <Card
                            key={template.id}
                            className={`cursor-pointer transition-all hover:shadow-lg ${
                              selectedTemplate?.id === template.id
                                ? "ring-2 ring-orange-500 shadow-lg"
                                : ""
                            }`}
                            onClick={() => handleTemplateSelect(template.id)}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-center gap-2 mb-3">
                                <h4 className="font-semibold">{template.name}</h4>
                                {template.seedStyle && (
                                  <Badge className="bg-orange-100 text-orange-800 text-xs">
                                    Seed Style
                                  </Badge>
                                )}
                              </div>

                              {/* Simplified Template Information */}
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold text-sm text-gray-800 mb-2">
                                    Main Sections:
                                  </h4>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    {template.structure.map((section, index) => (
                                      <div key={index} className="flex items-start gap-2">
                                        <div className="w-1 h-1 bg-orange-500 rounded-full mt-1.5 flex-shrink-0" />
                                        <span className="leading-relaxed">{section}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold text-sm text-gray-800 mb-2">
                                    Best For:
                                  </h4>
                                  <div className="text-xs text-gray-600 leading-relaxed">
                                    {template.id === "sop" &&
                                      'Creating detailed instructions for any business process - like "How to onboard new clients," "Monthly bookkeeping checklist," or "Tax season preparation steps." Perfect when you need clear, repeatable procedures that anyone can follow.'}
                                    {template.id === "playbook" &&
                                      'Building sales and service resources like "How to pitch Seed services," "Objection handling scripts," "Service delivery workflows," or "Client follow-up sequences." Great for training team members and standardizing your approach to prospects and clients.'}
                                    {template.id === "faq" &&
                                      'Answering common client questions like "What documents do I need for bookkeeping?" or "How does tax planning work?" Ideal for creating quick reference guides that save time on repeated explanations.'}
                                    {template.id === "client_guide" &&
                                      'Teaching clients how to use your services - like "Getting started with Seed Financial," "How to prepare for your CFO call," or "Understanding your financial reports." Perfect for client onboarding and education materials.'}
                                    {template.id === "product_docs" &&
                                      'Documenting software features and technical capabilities like "Seed Portal user guide," "API integration setup," or "System configuration instructions." Great for technical documentation, user manuals, and developer resources.'}
                                    {![
                                      "sop",
                                      "playbook",
                                      "faq",
                                      "client_guide",
                                      "product_docs",
                                    ].includes(template.id) &&
                                      "General business articles, announcements, policy updates, or educational content that doesn't fit other specific templates."}
                                  </div>
                                </div>

                                {/* Template Variables Preview */}
                                {template.variables && template.variables.length > 0 && (
                                  <div className="pt-3 border-t border-gray-200">
                                    <h4 className="font-semibold text-sm text-gray-800 mb-2">
                                      Can Be Customized:
                                    </h4>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {template.variables.map((variable, index) => {
                                        // Convert variable names to readable format
                                        const readableName = variable
                                          .replace(/[{}]/g, "")
                                          .replace(/_/g, " ")
                                          .replace(/\b\w/g, (l) => l.toUpperCase());
                                        return (
                                          <Badge
                                            key={index}
                                            variant="outline"
                                            className="text-xs py-0.5 px-2"
                                          >
                                            {readableName}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                    <div className="text-xs text-gray-400 italic leading-relaxed">
                                      These will appear as simple form fields below for easy
                                      customization
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Article Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Article Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Article Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., How to Handle Year-End Bookkeeping"
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
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="audience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Audience</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="internal">Internal Team</SelectItem>
                                <SelectItem value="client">Client-Facing</SelectItem>
                                <SelectItem value="sales">Sales Material</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tone</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="friendly">Friendly</SelectItem>
                                <SelectItem value="technical">Technical</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="length"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Length</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="brief">Brief</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="comprehensive">Comprehensive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="customRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Requirements (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any specific requirements, examples to include, or special instructions..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Template Customization Fields - Simple Individual Inputs */}
                    {selectedTemplate &&
                      selectedTemplate.variables &&
                      selectedTemplate.variables.length > 0 && (
                        <Card className="border-blue-200 bg-blue-50/30">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-800">
                              <Settings className="h-4 w-4" />
                              Customize Template (Optional)
                            </CardTitle>
                            <p className="text-sm text-gray-600 mt-1">
                              Fill in any fields you want to customize. Leave blank for AI to
                              generate automatically.
                            </p>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedTemplate.variables.map((variable, index) => {
                                const fieldName = variable.replace(/[{}]/g, "");
                                const readableName = fieldName
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase());

                                return (
                                  <FormField
                                    key={index}
                                    control={form.control}
                                    name={`templateVar_${fieldName}`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>{readableName}</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder={`e.g., ${
                                              fieldName.includes("name")
                                                ? "Client Onboarding Process"
                                                : fieldName.includes("department")
                                                  ? "Sales Department"
                                                  : fieldName.includes("tools")
                                                    ? "HubSpot, QuickBooks"
                                                    : fieldName.includes("industry")
                                                      ? "Professional Services"
                                                      : fieldName.includes("state")
                                                        ? "California"
                                                        : fieldName.includes("entity")
                                                          ? "LLC"
                                                          : fieldName.includes("level")
                                                            ? "Beginner"
                                                            : "Your custom value"
                                            }`}
                                            value={(field.value as string) || ""}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                    <FormField
                      control={form.control}
                      name="includeCompliance"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0">
                            Include compliance disclaimers and legal notices
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600"
                    disabled={generateOutlineMutation.isPending || !selectedTemplate}
                  >
                    {generateOutlineMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Generate Outline
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Outline Tab */}
          <TabsContent value="outline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated Outline</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCurrentStep("setup");
                        setGeneratedContent({});
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to Setup
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedContent.outline || "")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleGenerateDraft}
                      disabled={generateDraftMutation.isPending}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {generateDraftMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "Generate Draft"
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generatedContent.outline ? (
                  <RichTextEditor
                    content={ensureCleanHtml(generatedContent.outline)}
                    onChange={(content) =>
                      setGeneratedContent((prev) => ({
                        ...prev,
                        outline: content,
                      }))
                    }
                    placeholder="Your article outline will appear here. Edit with full rich text formatting..."
                    height={400}
                  />
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
                    Generate an outline to start editing
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Draft Tab */}
          <TabsContent value="draft" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated Draft</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCurrentStep("setup");
                        setGeneratedContent({});
                        setContentAnalysis(null);
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to Setup
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCurrentStep("outline")}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Outline
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAnalyzeContent(generatedContent.draft || "")}
                      disabled={analyzeContentMutation.isPending}
                    >
                      {analyzeContentMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Analyze
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedContent.draft || "")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handlePolishArticle}
                      disabled={polishMutation.isPending}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {polishMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "Polish Article"
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contentAnalysis && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Content Analysis
                      </h4>

                      {/* Score Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {contentAnalysis.brandFitScore}/5
                          </div>
                          <div className="text-gray-600">Brand Fit</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-700">
                            {contentAnalysis.readabilityLevel}
                          </div>
                          <div className="text-gray-600">Reading Level</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">
                            {contentAnalysis.complianceChecks.length}
                          </div>
                          <div className="text-gray-600">Compliance</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-orange-600">
                            {contentAnalysis.suggestions.length}
                          </div>
                          <div className="text-gray-600">Suggestions</div>
                        </div>
                      </div>

                      {/* Suggestions Section */}
                      {contentAnalysis.suggestions && contentAnalysis.suggestions.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-semibold text-orange-700 mb-2 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Improvement Suggestions
                          </h5>
                          <div className="space-y-2">
                            {contentAnalysis.suggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="bg-orange-50 border border-orange-200 rounded-md p-3"
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    id={`suggestion-${index}`}
                                    checked={selectedImprovements.includes(index)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedImprovements((prev) => [...prev, index]);
                                      } else {
                                        setSelectedImprovements((prev) =>
                                          prev.filter((i) => i !== index)
                                        );
                                      }
                                    }}
                                    className="mt-0.5"
                                  />
                                  <label
                                    htmlFor={`suggestion-${index}`}
                                    className="flex-1 cursor-pointer"
                                  >
                                    <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center font-semibold mr-2">
                                      {index + 1}
                                    </span>
                                    <span className="text-sm text-gray-700">{suggestion}</span>
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Re-draft Button */}
                          {selectedImprovements.length > 0 && (
                            <div className="mt-4 flex justify-center">
                              <Button
                                onClick={handleRedraftWithImprovements}
                                disabled={redraftMutation.isPending}
                                className="bg-blue-500 hover:bg-blue-600"
                              >
                                {redraftMutation.isPending ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Re-drafting...
                                  </>
                                ) : (
                                  <>
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    Re-draft with Selected Improvements (
                                    {selectedImprovements.length})
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Compliance Checks */}
                      {contentAnalysis.complianceChecks &&
                        contentAnalysis.complianceChecks.length > 0 && (
                          <div className="mt-4">
                            <h5 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Compliance Status
                            </h5>
                            <div className="grid grid-cols-1 gap-2">
                              {contentAnalysis.complianceChecks.map((check, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-gray-700">{check}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                )}

                {generatedContent.draft ? (
                  <RichTextEditor
                    content={ensureCleanHtml(generatedContent.draft)}
                    onChange={(content) =>
                      setGeneratedContent((prev) => ({
                        ...prev,
                        draft: content,
                      }))
                    }
                    placeholder="Your article draft will appear here. Edit with full rich text formatting..."
                    height={400}
                  />
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
                    Generate a draft to start editing
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Polish Tab with WYSIWYG Editor */}
          <TabsContent value="polish" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    <span>Polished Article - WYSIWYG Editor</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCurrentStep("setup");
                        setGeneratedContent({});
                        setContentAnalysis(null);
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to Setup
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCurrentStep("draft")}>
                      <FileText className="h-4 w-4 mr-1" />
                      Edit Draft
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedContent.polished || "")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleGenerateVersions}
                      disabled={generateVersionsMutation.isPending}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      {generateVersionsMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "Create Versions"
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generatedContent.polished ? (
                  <RichTextEditor
                    content={ensureCleanHtml(generatedContent.polished)}
                    onChange={(content) =>
                      setGeneratedContent((prev) => ({
                        ...prev,
                        polished: content,
                      }))
                    }
                    onSave={(content) => handleSaveArticle(content)}
                    placeholder="Your polished article content will appear here. Edit with full rich text formatting..."
                    height={500}
                  />
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
                    Polish your draft to start final editing
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Versions Tab */}
          <TabsContent value="versions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    AI-Generated Versions
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setCurrentStep("setup")}>
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to Setup
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCurrentStep("polish")}>
                      <Edit className="h-4 w-4 mr-1" />
                      Back to Polish
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.entries(audienceVersions).map(([audience, content]) => (
                <Card
                  key={audience}
                  className={`${
                    audience === "client"
                      ? "border-blue-200 bg-blue-50/50"
                      : audience === "sales"
                        ? "border-orange-200 bg-orange-50/50"
                        : "border-green-200 bg-green-50/50"
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="capitalize font-semibold">{audience} Version</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewingVersion({ audience, content })}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingVersion({ audience, content })}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(content)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            // Just save version content locally - don't create article
                            toast({
                              title: "Version Saved",
                              description: `${audience.charAt(0).toUpperCase() + audience.slice(1)} version content saved locally`,
                            });
                          }}
                          className="bg-green-500 hover:bg-green-600 h-8 w-8 p-0"
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`p-4 rounded-lg text-sm max-h-48 overflow-y-auto ${
                        audience === "client"
                          ? "bg-white border border-blue-100"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div
                        className={`prose prose-sm max-w-none ${
                          audience === "client" ? "prose-blue" : "prose-gray"
                        }`}
                        dangerouslySetInnerHTML={{ __html: content }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Preview Modal */}
            {previewingVersion && (
              <Dialog open={!!previewingVersion} onOpenChange={() => setPreviewingVersion(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      {previewingVersion.audience.charAt(0).toUpperCase() +
                        previewingVersion.audience.slice(1)}{" "}
                      Version Preview
                    </DialogTitle>
                  </DialogHeader>
                  <div
                    className={`${
                      previewingVersion.audience === "client"
                        ? "client-article"
                        : "p-6 rounded-lg bg-white border border-gray-200"
                    }`}
                  >
                    <div
                      className={`prose max-w-none ${
                        previewingVersion.audience === "client"
                          ? "prose-lg prose-blue"
                          : "prose-lg prose-gray"
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: previewingVersion.content,
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setPreviewingVersion(null)}>
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingVersion(previewingVersion);
                        setPreviewingVersion(null);
                      }}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Version
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Edit Modal */}
            {editingVersion && (
              <Dialog open={!!editingVersion} onOpenChange={() => setEditingVersion(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Edit3 className="h-5 w-5" />
                      Edit{" "}
                      {editingVersion.audience.charAt(0).toUpperCase() +
                        editingVersion.audience.slice(1)}{" "}
                      Version
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <RichTextEditor
                      content={editingVersion.content}
                      onChange={(content) =>
                        setEditingVersion((prev) => (prev ? { ...prev, content } : null))
                      }
                      placeholder={`Edit your ${editingVersion.audience} version content...`}
                      height={400}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditingVersion(null)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (editingVersion) {
                            // Update the version content
                            setAudienceVersions((prev) => ({
                              ...prev,
                              [editingVersion.audience]: editingVersion.content,
                            }));
                            setEditingVersion(null);
                            toast({
                              title: "Version Updated",
                              description: `${editingVersion.audience.charAt(0).toUpperCase() + editingVersion.audience.slice(1)} version has been updated`,
                            });
                          }
                        }}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>
        </Tabs>

        {/* Session History Dialog */}
        {showSessionHistory && (
          <Dialog open={showSessionHistory} onOpenChange={setShowSessionHistory}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Session History
                  <Badge variant="secondary">{savedSessions.length} saved</Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {savedSessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No saved sessions yet</p>
                    <p className="text-sm">
                      Your progress will be saved automatically every 30 seconds
                    </p>
                  </div>
                ) : (
                  savedSessions.map((session, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">
                              {session.formData.title || "Untitled Article"}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              Template: {session.selectedTemplate?.name || "None"} • Category:{" "}
                              {categories.find((c) => c.id === session.formData.categoryId)?.name ||
                                "Unknown"}
                            </p>
                            <div className="flex gap-2 text-xs">
                              {session.generatedContent.outline && (
                                <Badge variant="outline" className="text-green-600">
                                  Outline ✓
                                </Badge>
                              )}
                              {session.generatedContent.draft && (
                                <Badge variant="outline" className="text-blue-600">
                                  Draft ✓
                                </Badge>
                              )}
                              {session.generatedContent.polished && (
                                <Badge variant="outline" className="text-orange-600">
                                  Polished ✓
                                </Badge>
                              )}
                              {session.audienceVersions.internal && (
                                <Badge variant="outline" className="text-purple-600">
                                  Versions ✓
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Saved: {new Date(session.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => loadSession(session)}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Load
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const updated = savedSessions.filter((_, i) => i !== index);
                                setSavedSessions(updated);
                                localStorage.setItem(
                                  "ai-article-sessions",
                                  JSON.stringify(updated)
                                );
                                if (updated.length === 0) setShowSessionHistory(false);
                              }}
                            >
                              <AlertCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}

                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      localStorage.removeItem("ai-article-sessions");
                      setSavedSessions([]);
                      setShowSessionHistory(false);
                      toast({ title: "All sessions cleared" });
                    }}
                    disabled={savedSessions.length === 0}
                  >
                    Clear All Sessions
                  </Button>
                  <Button onClick={() => setShowSessionHistory(false)}>Close</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

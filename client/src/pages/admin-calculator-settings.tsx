import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PERMISSIONS } from "@shared/permissions";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { seedqcKeys, pricingKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Save,
  RefreshCw,
  FileText,
  Link as LinkIcon,
  Eye,
  Sliders,
  DollarSign,
} from "lucide-react";

interface ServiceContentItem {
  id?: number;
  service: string;
  sowTitle?: string | null;
  sowTemplate?: string | null;
  agreementLink?: string | null;
  includedFieldsJson?: string | null;
  updatedBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

interface PricingBase {
  id: number;
  service: string;
  baseFee: string;
  description: string;
  updatedAt: string;
}
interface PricingTier {
  id: number;
  service: string;
  tier: string;
  volumeBand: string;
  baseFee: string;
  tierMultiplier: string;
  updatedAt: string;
}

const SERVICES: { key: string; label: string }[] = [
  { key: "bookkeeping", label: "Bookkeeping" },
  { key: "taas", label: "TaaS" },
  { key: "payroll", label: "Payroll" },
  { key: "ap", label: "AP" },
  { key: "ar", label: "AR" },
  { key: "agent_of_service", label: "Agent of Service" },
  { key: "cfo_advisory", label: "CFO Advisory" },
];

function defaultSowTitle(serviceKey: string): string {
  const svc = SERVICES.find((s) => s.key === serviceKey)?.label || "Service";
  return `${svc} Services`;
}

function defaultSowTemplate(serviceKey: string): string {
  const svc = SERVICES.find((s) => s.key === serviceKey)?.label || "Service";
  const header = `# Statement of Work - ${svc}\n\n`;
  const body = `This Statement of Work ("SOW") outlines the scope of ${svc} services to be provided by Seed Financial ("Seed") to the Client.\n\n`;
  const tokens = `Key Terms:\n- Client: {{companyName}}\n- Monthly Fee: \${{monthlyFee}}\n- Setup Fee: \${{setupFee}}\n- Cleanup Months (if applicable): {{cleanupMonths}}\n- Industry: {{industry}}\n`;
  return (
    header +
    body +
    tokens +
    "\nDeliverables:\n- Outline of deliverables here...\n"
  );
}

function parseIncluded(json?: string | null): any {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function renderTemplate(template: string, tokens: Record<string, any>): string {
  return (template || "").replace(
    /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g,
    (_: string, key: string) => {
      const value = key
        .split(".")
        .reduce<any>(
          (acc: any, k: string) =>
            acc && acc[k] !== undefined ? acc[k] : undefined,
          tokens,
        );
      return value !== undefined && value !== null ? String(value) : "";
    },
  );
}

export default function AdminCalculatorSettings() {
  const { toast } = useToast();
  // HubSpot pipeline/stage configuration state
  const [hsPipelineId, setHsPipelineId] = useState<string>("");
  const [hsStageId, setHsStageId] = useState<string>("");
  const [activeService, setActiveService] = useState<string>(
    SERVICES[0]?.key ?? "bookkeeping",
  );
  const [serviceFilter, setServiceFilter] = useState("");
  const templateRef = useRef<HTMLTextAreaElement | null>(null);

  // Calculator content (admin and public fallback)
  const { data: adminCalc, refetch: refetchAdminCalc } = useQuery<{
    items: ServiceContentItem[];
    msaLink?: string;
  }>({
    queryKey: seedqcKeys.adminContent(),
    queryFn: async () =>
      await apiRequest("GET", "/api/admin/apps/seedqc/content"),
  });
  const { data: publicCalc, refetch: refetchPublicCalc } = useQuery<{
    items: ServiceContentItem[];
    msaLink?: string;
  }>({
    queryKey: seedqcKeys.content(),
    queryFn: async () => await apiRequest("GET", "/api/apps/seedqc/content"),
  });

  // HubSpot pipelines + current configuration
  const { data: hsPipelines, refetch: refetchHsPipelines } = useQuery<{
    pipelines: Array<{
      id: string;
      label: string;
      stages: Array<{ id: string; label: string }>;
    }>;
  }>({
    queryKey: ["admin", "hubspot", "pipelines"],
    queryFn: async () => await apiRequest("GET", "/api/admin/hubspot/pipelines"),
  });
  const { data: hsConfig, refetch: refetchHsConfig } = useQuery<{
    pipelineId?: string | null;
    qualifiedStageId?: string | null;
    valid?: boolean;
  }>({
    queryKey: ["admin", "hubspot", "pipeline-config"],
    queryFn: async () => await apiRequest("GET", "/api/admin/hubspot/pipeline-config"),
  });

  useEffect(() => {
    if (hsConfig) {
      setHsPipelineId(hsConfig.pipelineId || "");
      setHsStageId(hsConfig.qualifiedStageId || "");
    }
  }, [hsConfig]);

  const selectedPipeline = (hsPipelines?.pipelines || []).find(
    (p) => p.id === hsPipelineId,
  );
  useEffect(() => {
    // Clear stage if not in selected pipeline
    if (
      hsStageId &&
      selectedPipeline &&
      !selectedPipeline.stages.find((s) => s.id === hsStageId)
    ) {
      setHsStageId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hsPipelineId]);

  const saveHsConfig = useMutation({
    mutationFn: async () =>
      await apiRequest("PUT", "/api/admin/hubspot/pipeline-config", {
        pipelineId: hsPipelineId,
        qualifiedStageId: hsStageId,
      }),
    onSuccess: async () => {
      toast({ title: "HubSpot pipeline saved" });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "hubspot", "pipeline-config"],
      });
      refetchHsConfig();
    },
    onError: (err: any) =>
      toast({
        title: "Save failed",
        description: err?.message,
        variant: "destructive",
      }),
  });

  // Pricing data (admin)
  const { data: baseFees } = useQuery<PricingBase[]>({
    queryKey: pricingKeys.admin.base(),
    queryFn: async () =>
      await apiRequest<PricingBase[]>("GET", "/api/admin/pricing/base"),
  });
  const { data: pricingTiers } = useQuery<PricingTier[]>({
    queryKey: pricingKeys.admin.tiers(),
    queryFn: async () =>
      await apiRequest<PricingTier[]>("GET", "/api/admin/pricing/tiers"),
  });

  // Local editing state per service - initialize with synchronous defaults
  const [local, setLocal] = useState<Record<string, ServiceContentItem>>(() => {
    const initial: Record<string, ServiceContentItem> = {};
    for (const svc of SERVICES) {
      initial[svc.key] = {
        service: svc.key,
        sowTitle: defaultSowTitle(svc.key),
        sowTemplate: defaultSowTemplate(svc.key),
        agreementLink: "",
      };
    }
    return initial;
  });
  const [included, setIncluded] = useState<Record<string, any>>({});

  // Hydrate local from API
  useEffect(() => {
    const src = adminCalc?.items?.length ? adminCalc : publicCalc;
    const sourceItems = src?.items || [];
    const nextLocal: Record<string, ServiceContentItem> = {};
    const nextIncluded: Record<string, any> = {};
    for (const svc of SERVICES) {
      const found = sourceItems.find((i) => i.service === svc.key);
      const base: ServiceContentItem = found || { service: svc.key };
      if (!base.sowTitle) base.sowTitle = defaultSowTitle(svc.key);
      if (!base.sowTemplate) base.sowTemplate = defaultSowTemplate(svc.key);
      nextLocal[svc.key] = base;
      nextIncluded[svc.key] = parseIncluded(found?.includedFieldsJson);
    }
    setLocal(nextLocal);
    setIncluded(nextIncluded);
  }, [adminCalc, publicCalc]);

  const msaLink = useMemo(
    () => adminCalc?.msaLink || publicCalc?.msaLink || "",
    [adminCalc, publicCalc],
  );

  // Update mutation (SOW + link + includedFields)
  const updateMutation = useMutation({
    mutationFn: async (payload: {
      service: string;
      sowTitle?: string | null;
      sowTemplate?: string | null;
      agreementLink?: string | null;
      includedFieldsJson?: string;
    }) => {
      return await apiRequest(
        `/api/admin/apps/seedqc/content/${payload.service}`,
        {
          method: "PUT",
          body: payload,
        },
      );
    },
    onSuccess: async () => {
      toast({ title: "Saved successfully" });
      await Promise.all([
        // Centralized keys
        queryClient.invalidateQueries({ queryKey: seedqcKeys.adminContent() }),
        queryClient.invalidateQueries({ queryKey: seedqcKeys.content() }),
        // Legacy fallbacks (in case any component still uses path keys)
        queryClient.invalidateQueries({
          queryKey: ["/api/admin/apps/seedqc/content"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["/api/apps/seedqc/content"],
        }),
      ]);
      refetchAdminCalc();
      refetchPublicCalc();
    },
    onError: (err: any) =>
      toast({
        title: "Save failed",
        description: err?.message,
        variant: "destructive",
      }),
  });

  const onSave = () => {
    const item = (local[activeService] ?? {
      service: activeService,
    }) as ServiceContentItem;
    updateMutation.mutate({
      service: item.service,
      sowTitle: item.sowTitle || null,
      sowTemplate: item.sowTemplate || null,
      agreementLink: item.agreementLink || null,
      includedFieldsJson: JSON.stringify(included[activeService] || {}),
    });
  };

  const setField = (key: keyof ServiceContentItem, value: string) => {
    setLocal((prev) => {
      const current = (prev[activeService] ?? {
        service: activeService,
      }) as ServiceContentItem;
      return {
        ...prev,
        [activeService]: { ...current, [key]: value },
      };
    });
  };

  const TOKENS: string[] = useMemo(
    () => [
      "{{companyName}}",
      "{{monthlyFee}}",
      "{{setupFee}}",
      "{{cleanupMonths}}",
      "{{industry}}",
      "{{ap.serviceTier}}",
      "{{ap.vendorBillsBand}}",
      "{{ap.vendorCount}}",
      "{{ar.serviceTier}}",
      "{{ar.customerInvoicesBand}}",
      "{{ar.customerCount}}",
      "{{payrollEmployeeCount}}",
      "{{payrollStateCount}}",
      "{{numEntities}}",
      "{{statesFiled}}",
      "{{internationalFiling}}",
      "{{numBusinessOwners}}",
      "{{agentOfService.additionalStates}}",
      "{{agentOfService.complexCase}}",
    ],
    [],
  );

  const insertToken = (token: string) => {
    const currentText = local[activeService]?.sowTemplate || "";
    const textarea = templateRef.current;
    if (!textarea) {
      setField("sowTemplate", currentText + (currentText ? "\n" : "") + token);
      return;
    }
    const start = textarea.selectionStart ?? currentText.length;
    const end = textarea.selectionEnd ?? currentText.length;
    const next = currentText.slice(0, start) + token + currentText.slice(end);
    setField("sowTemplate", next);
    setTimeout(() => {
      try {
        textarea.focus();
        const pos = start + token.length;
        textarea.setSelectionRange(pos, pos);
      } catch {}
    }, 0);
  };

  const filteredServices = useMemo(() => {
    const f = serviceFilter.trim().toLowerCase();
    if (!f) return SERVICES;
    return SERVICES.filter(
      (s) =>
        s.label.toLowerCase().includes(f) || s.key.toLowerCase().includes(f),
    );
  }, [serviceFilter]);

  const selectedServiceLabel = useMemo(
    () =>
      SERVICES.find((s) => s.key === activeService)?.label ||
      "Select a service",
    [activeService],
  );

  const selectedBaseFee = useMemo(
    () => baseFees?.find((b) => b.service === activeService),
    [baseFees, activeService],
  );
  const selectedTiers = useMemo(
    () => (pricingTiers || []).filter((t) => t.service === activeService),
    [pricingTiers, activeService],
  );

  return (
    <PermissionGuard
      permissions={PERMISSIONS.MANAGE_PRICING}
      fallback={<div>Access denied</div>}
    >
      <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
        <UniversalNavbar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Sliders className="w-8 h-8 text-white" />
                  Calculator Settings
                </h1>
                <p className="mt-2 text-white/80">
                  Unified Pricing + SOW configuration
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    refetchAdminCalc();
                    refetchPublicCalc();
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
                <Button
                  onClick={onSave}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save
                    className={`w-4 h-4 ${updateMutation.isPending ? "animate-pulse" : ""}`}
                  />{" "}
                  Save
                </Button>
              </div>
            </div>

            {/* HubSpot Pipeline Settings */}
            <Card>
              <CardHeader>
                <CardTitle>HubSpot Pipeline</CardTitle>
                <CardDescription>
                  Select the HubSpot pipeline and default stage used for creating deals.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="flex flex-col gap-2">
                  <Label>Pipeline</Label>
                  <Select value={hsPipelineId} onValueChange={setHsPipelineId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {(hsPipelines?.pipelines || []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label} ({p.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Stage</Label>
                  <Select
                    value={hsStageId}
                    onValueChange={setHsStageId}
                    disabled={!hsPipelineId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          hsPipelineId ? "Select a stage" : "Select a pipeline first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedPipeline?.stages || []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label} ({s.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => refetchHsPipelines()}
                    className="w-full md:w-auto"
                  >
                    <RefreshCw className="w-4 h-4" /> Refresh from HubSpot
                  </Button>
                  <Button
                    onClick={() => saveHsConfig.mutate()}
                    disabled={!hsPipelineId || !hsStageId || saveHsConfig.isPending}
                    className="w-full md:w-auto"
                  >
                    <Save
                      className={`w-4 h-4 ${saveHsConfig.isPending ? "animate-pulse" : ""}`}
                    />
                    Save
                  </Button>
                </div>
                <div className="md:col-span-3 text-sm text-muted-foreground">
                  Status: {hsConfig?.valid ? (
                    <span className="text-green-700">Configured</span>
                  ) : (
                    <span className="text-yellow-800">
                      Not configured or invalid; fallback logic will be used until saved.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Service Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Service</CardTitle>
                <CardDescription>
                  Select a service to edit its SOW and view pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 w-full md:w-1/2">
                  <Label className="min-w-[70px]">Search</Label>
                  <Input
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    placeholder="Type to filter services..."
                  />
                </div>
                <div className="flex items-center gap-3 w-full md:w-1/2">
                  <Label className="min-w-[70px]">Service</Label>
                  <Select
                    value={activeService}
                    onValueChange={setActiveService}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a service">
                        {selectedServiceLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {filteredServices.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {msaLink && (
                  <div className="text-sm text-muted-foreground">
                    MSA Link:{" "}
                    <a
                      href={msaLink}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {msaLink}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SOW Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>SOW</CardTitle>
                  <CardDescription>
                    Agreement link and SOW template for {selectedServiceLabel}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sowTitle">SOW Title</Label>
                    <Input
                      id="sowTitle"
                      value={local[activeService]?.sowTitle || ""}
                      onChange={(e) => setField("sowTitle", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="agreementLink"
                      className="flex items-center gap-2"
                    >
                      <LinkIcon className="w-4 h-4" /> Agreement Link
                    </Label>
                    <Input
                      id="agreementLink"
                      value={local[activeService]?.agreementLink || ""}
                      onChange={(e) =>
                        setField("agreementLink", e.target.value)
                      }
                      placeholder="https://..."
                    />
                    {msaLink && (
                      <p className="text-xs text-muted-foreground">
                        MSA Link:{" "}
                        <a
                          href={msaLink}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          {msaLink}
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="sowTemplate"
                      className="flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> SOW Template (Markdown)
                    </Label>
                    <Textarea
                      id="sowTemplate"
                      ref={templateRef}
                      value={local[activeService]?.sowTemplate || ""}
                      onChange={(e) => setField("sowTemplate", e.target.value)}
                      rows={16}
                    />
                    <div className="flex flex-wrap gap-2">
                      {TOKENS.map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => insertToken(t)}
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use tokens like <code>{"{{companyName}}"}</code>,{" "}
                      <code>{"{{monthlyFee}}"}</code>,{" "}
                      <code>{"{{setupFee}}"}</code>,{" "}
                      <code>{"{{cleanupMonths}}"}</code>.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Snapshot</CardTitle>
                  <CardDescription>
                    Read-only view of pricing for {selectedServiceLabel}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Base Fee
                      </div>
                      <div className="text-lg font-semibold text-foreground">
                        {selectedBaseFee
                          ? `$${Number(selectedBaseFee.baseFee).toLocaleString()}`
                          : "—"}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Tiers</div>
                    <div className="space-y-2">
                      {selectedTiers.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                          No tiers for this service.
                        </div>
                      )}
                      {selectedTiers.map((t) => (
                        <div
                          key={t.id}
                          className="border rounded-md p-3 bg-background/50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">
                              {t.tier} • {t.volumeBand}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Updated{" "}
                              {new Date(t.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Base: ${Number(t.baseFee).toLocaleString()} •
                            Multiplier: {t.tierMultiplier}x
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    For full editing, use the Pricing page. Changes there
                    reflect here after refresh.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </PermissionGuard>
  );
}

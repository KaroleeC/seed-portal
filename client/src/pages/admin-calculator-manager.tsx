import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PERMISSIONS } from "@shared/permissions";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { seedqcKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, RefreshCw, FileText, Link as LinkIcon, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

function defaultAgreementLink(serviceKey: string): string {
  // Client fallback; server also supplies env-configurable defaults
  return `https://agreements.example.com/${serviceKey}`;
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
  const svc = SERVICES.find((s) => s.key === serviceKey);
  return `Statement of Work - ${svc?.label || serviceKey}`;
}

function defaultSowTemplate(serviceKey: string): string {
  const title = defaultSowTitle(serviceKey);
  const common =
    "\nClient: {{companyName}}\n" +
    "Monthly Fee: $" +
    "{{monthlyFee}}" +
    "\n" +
    "Setup Fee: $" +
    "{{setupFee}}" +
    "\n";
  const details: Record<string, string> = {
    bookkeeping: `Cleanup Months: {{cleanupMonths}}\nIndustry: {{industry}}\n`,
    taas: `Entities: {{numEntities}}\nStates Filed: {{statesFiled}}\nInternational Filing: {{internationalFiling}}\nOwners: {{numBusinessOwners}}\n`,
    payroll: `Employees: {{payrollEmployeeCount}}\nStates: {{payrollStateCount}}\n`,
    ap: `Tier: {{ap.serviceTier}}\nVolume Band: {{ap.vendorBillsBand}}\nVendor Count: {{ap.vendorCount}}\n`,
    ar: `Tier: {{ar.serviceTier}}\nInvoices Band: {{ar.customerInvoicesBand}}\nCustomer Count: {{ar.customerCount}}\n`,
    agent_of_service: `Additional States: {{agentOfService.additionalStates}}\nComplex Case: {{agentOfService.complexCase}}\n`,
    cfo_advisory: `Hours Bundle: {{cfo.bundleHours}}\n`,
  };
  return `# ${title}\n${common}${details[serviceKey] || ""}`;
}

// Provide sensible defaults for Included Fields so the UI shows expected items even without prior data
function defaultIncluded(): any {
  return {
    bookkeeping: {
      includeIndustry: true,
      includeTransactions: true,
      includeCleanupMonths: true,
    },
    taas: {
      includeEntities: true,
      includeStatesFiled: true,
      includeInternational: false,
      includeOwners: true,
    },
    ap: {
      includeTier: true,
      includeVolumeBand: true,
      includeVendorCount: true,
    },
    ar: {
      includeTier: true,
      includeInvoicesBand: true,
      includeCustomerCount: true,
    },
    payroll: {
      includeEmployeeCount: true,
      includeStateCount: true,
    },
    agentOfService: {
      includeAdditionalStates: false,
      includeComplexCase: false,
    },
  };
}

function deepMergeIncluded(base: any, override: any): any {
  if (!override || typeof override !== "object") return base;
  const result: any = { ...base };
  for (const key of Object.keys(override)) {
    const o = override[key];
    if (o && typeof o === "object" && !Array.isArray(o)) {
      result[key] = deepMergeIncluded(base[key] || {}, o);
    } else {
      result[key] = o;
    }
  }
  return result;
}

function parseIncluded(json?: string | null): any {
  const base = defaultIncluded();
  if (!json) return base;
  try {
    const parsed = JSON.parse(json);
    return deepMergeIncluded(base, parsed);
  } catch {
    return base;
  }
}

function stringifyIncluded(obj: any): string {
  try {
    return JSON.stringify(obj || {});
  } catch {
    return "{}";
  }
}

function tokenReplace(template: string, tokens: Record<string, any>): string {
  // Very safe, minimal token replacement: {{token}}
  return (template || "").replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_: string, key: string) => {
    const value = key
      .split(".")
      .reduce<any>(
        (acc: any, k: string) => (acc && acc[k] !== undefined ? acc[k] : undefined),
        tokens
      );
    return value !== undefined && value !== null ? String(value) : "";
  });
}

export default function AdminCalculatorManager() {
  const { toast } = useToast();
  const [activeService, setActiveService] = useState<string>(SERVICES[0]?.key ?? "bookkeeping");
  const templateRef = useRef<HTMLTextAreaElement | null>(null);

  // Load admin content (authoritative for editing)
  const {
    data: adminData,
    isLoading,
    refetch: refetchAdmin,
  } = useQuery<{ items: ServiceContentItem[]; msaLink?: string }>({
    queryKey: seedqcKeys.adminContent(),
    queryFn: async () => await apiRequest("GET", "/api/admin/apps/seedqc/content"),
  });

  // Fallback: load public calculator content (no admin requirement)
  const { data: publicData, refetch: refetchPublic } = useQuery<{
    items: ServiceContentItem[];
    msaLink?: string;
  }>({
    queryKey: seedqcKeys.content(),
    queryFn: async () => await apiRequest("GET", "/api/apps/seedqc/content"),
  });

  // Local editing state per service - initialize with synchronous defaults
  const [local, setLocal] = useState<Record<string, ServiceContentItem>>(() => {
    const initial: Record<string, ServiceContentItem> = {};
    for (const svc of SERVICES) {
      initial[svc.key] = {
        service: svc.key,
        sowTitle: defaultSowTitle(svc.key),
        sowTemplate: defaultSowTemplate(svc.key),
        agreementLink: null,
        includedFieldsJson: JSON.stringify(defaultIncluded()),
      };
    }
    return initial;
  });
  const [included, setIncluded] = useState<Record<string, any>>(() => {
    const base = defaultIncluded();
    const initial: Record<string, any> = {};
    for (const svc of SERVICES) initial[svc.key] = base;
    return initial;
  });

  useEffect(() => {
    const sourceItems =
      adminData?.items && adminData.items.length > 0 ? adminData.items : publicData?.items || [];
    const nextLocal: Record<string, ServiceContentItem> = {};
    const nextIncluded: Record<string, any> = {};
    for (const svc of SERVICES) {
      const found = sourceItems.find((i) => i.service === svc.key);
      const base: ServiceContentItem = found || { service: svc.key };
      // Fallback defaults for title/template if missing from server (keeps UI usable without DB rows)
      if (!base.sowTitle) base.sowTitle = defaultSowTitle(svc.key);
      if (!base.sowTemplate) base.sowTemplate = defaultSowTemplate(svc.key);
      if (!base.agreementLink) base.agreementLink = defaultAgreementLink(svc.key);
      nextLocal[svc.key] = base;
      nextIncluded[svc.key] = parseIncluded(found?.includedFieldsJson);
    }
    setLocal(nextLocal);
    setIncluded(nextIncluded);
  }, [adminData, publicData]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      service: string;
      sowTitle?: string | null;
      sowTemplate?: string | null;
      agreementLink?: string | null;
      includedFieldsJson?: string;
    }) => {
      return await apiRequest(`/api/admin/calculator/content/${payload.service}`, {
        method: "PUT",
        body: payload,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: seedqcKeys.adminContent() }),
        queryClient.invalidateQueries({ queryKey: seedqcKeys.content() }),
      ]);
      toast({ title: "Saved", description: "Calculator content updated" });
    },
    onError: (err: any) => {
      toast({
        title: "Save failed",
        description: err?.message || "Unable to save content",
        variant: "destructive",
      });
    },
  });

  const current = local[activeService] || { service: activeService };
  const currentIncluded = included[activeService] || {};

  const exampleTokens = useMemo(
    () => ({
      companyName: "Acme Co",
      monthlyFee: 500,
      setupFee: 1200,
      cleanupMonths: 6,
      industry: "Software/SaaS",
      monthlyRevenueRange: "25K-75K",
      ap: { serviceTier: "advanced", vendorBillsBand: "26-100" },
      ar: { serviceTier: "lite", customerInvoicesBand: "0-25" },
    }),
    []
  );

  const renderedPreview = useMemo(
    () => tokenReplace(current.sowTemplate || "", exampleTokens),
    [current.sowTemplate, exampleTokens]
  );

  const onSave = () => {
    updateMutation.mutate({
      service: activeService,
      sowTitle: current.sowTitle ?? null,
      sowTemplate: current.sowTemplate ?? null,
      agreementLink: current.agreementLink ?? null,
      includedFieldsJson: stringifyIncluded(currentIncluded),
    });
  };

  const toggleIncluded = (path: string) => (checked: boolean | string) => {
    const val = !!checked;
    const parts = path.split("."); // e.g. ["ap","includeVendorCount"]
    const obj = { ...(included[activeService] || {}) };
    let ref: any = obj;
    // Safely walk all but the last segment
    for (const seg of parts.slice(0, -1)) {
      if (!seg) continue;
      ref[seg] = ref[seg] || {};
      ref = ref[seg];
    }
    const last = parts[parts.length - 1];
    if (!last) return;
    ref[last] = val;
    setIncluded((prev) => ({ ...prev, [activeService]: obj }));
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

  const msaLink = useMemo(
    () => adminData?.msaLink || publicData?.msaLink || "",
    [adminData, publicData]
  );

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
    []
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
    // restore caret after state update
    setTimeout(() => {
      try {
        textarea.focus();
        const pos = start + token.length;
        textarea.setSelectionRange(pos, pos);
      } catch {}
    }, 0);
  };

  return (
    <PermissionGuard permissions={PERMISSIONS.MANAGE_PRICING} fallback={<div>Access denied</div>}>
      <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
        <UniversalNavbar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <FileText className="w-8 h-8 text-foreground" />
                  Calculator Manager
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Manage service agreement links and SOW templates for each service.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    refetchAdmin();
                    refetchPublic();
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  onClick={onSave}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className={`w-4 h-4 ${updateMutation.isPending ? "animate-pulse" : ""}`} />
                  Save
                </Button>
              </div>
            </div>

            <Tabs value={activeService} onValueChange={setActiveService} className="space-y-6">
              <TabsList className="flex w-full overflow-x-auto gap-2 no-scrollbar">
                {SERVICES.map((s) => (
                  <TabsTrigger key={s.key} value={s.key} className="shrink-0">
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {SERVICES.map((svc) => (
                <TabsContent value={svc.key} key={svc.key}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Content</CardTitle>
                        <CardDescription>
                          Agreement link and SOW template for {svc.label}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="sowTitle">SOW Title</Label>
                          <Input
                            id="sowTitle"
                            value={local[svc.key]?.sowTitle || ""}
                            onChange={(e) => setField("sowTitle", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="agreementLink" className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" /> Agreement Link
                          </Label>
                          <Input
                            id="agreementLink"
                            value={local[svc.key]?.agreementLink || ""}
                            onChange={(e) => setField("agreementLink", e.target.value)}
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
                          <Label htmlFor="sowTemplate" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" /> SOW Template (Markdown)
                          </Label>
                          <Textarea
                            id="sowTemplate"
                            ref={svc.key === activeService ? templateRef : undefined}
                            value={local[svc.key]?.sowTemplate || ""}
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
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    insertToken(t);
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Use tokens like <code>{"{{companyName}}"}</code>,{" "}
                            <code>{"{{monthlyFee}}"}</code>, <code>{"{{setupFee}}"}</code>,{" "}
                            <code>{"{{cleanupMonths}}"}</code>. Tokens are safely replaced when
                            rendering.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Included Fields</CardTitle>
                          <CardDescription>Choose which data appears in the SOW</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                          {/* Bookkeeping group */}
                          <div>
                            <div className="font-medium mb-2">Bookkeeping</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.bookkeeping?.includeIndustry}
                                  onCheckedChange={toggleIncluded("bookkeeping.includeIndustry")}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Industry
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.bookkeeping?.includeTransactions}
                                  onCheckedChange={toggleIncluded(
                                    "bookkeeping.includeTransactions"
                                  )}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Transactions
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.bookkeeping?.includeCleanupMonths}
                                  onCheckedChange={toggleIncluded(
                                    "bookkeeping.includeCleanupMonths"
                                  )}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Cleanup Months
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* TaaS group */}
                          <div>
                            <div className="font-medium mb-2">TaaS</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.taas?.includeEntities}
                                  onCheckedChange={toggleIncluded("taas.includeEntities")}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Entities
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.taas?.includeStatesFiled}
                                  onCheckedChange={toggleIncluded("taas.includeStatesFiled")}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  States Filed
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.taas?.includeInternational}
                                  onCheckedChange={toggleIncluded("taas.includeInternational")}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  International Filing
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.taas?.includeOwners}
                                  onCheckedChange={toggleIncluded("taas.includeOwners")}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Business Owners
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* AP group */}
                          <div>
                            <div className="font-medium mb-2">AP</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.ap?.includeTier}
                                  onCheckedChange={toggleIncluded("ap.includeTier")}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Tier
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.ap?.includeVolumeBand}
                                  onCheckedChange={toggleIncluded("ap.includeVolumeBand")}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Volume Band
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.ap?.includeVendorCount}
                                  onCheckedChange={toggleIncluded("ap.includeVendorCount")}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Vendor Count
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* AR group */}
                          <div>
                            <div className="font-medium mb-2">AR</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.ar?.includeTier}
                                  onCheckedChange={toggleIncluded("ar.includeTier")}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Tier
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.ar?.includeInvoicesBand}
                                  onCheckedChange={toggleIncluded("ar.includeInvoicesBand")}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Invoices Band
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.ar?.includeCustomerCount}
                                  onCheckedChange={toggleIncluded("ar.includeCustomerCount")}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Customer Count
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Payroll group */}
                          <div>
                            <div className="font-medium mb-2">Payroll</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.payroll?.includeEmployeeCount}
                                  onCheckedChange={toggleIncluded("payroll.includeEmployeeCount")}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Employee Count
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.payroll?.includeStateCount}
                                  onCheckedChange={toggleIncluded("payroll.includeStateCount")}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  State Count
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Agent of Service group */}
                          <div>
                            <div className="font-medium mb-2">Agent of Service</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={
                                    !!currentIncluded.agentOfService?.includeAdditionalStates
                                  }
                                  onCheckedChange={toggleIncluded(
                                    "agentOfService.includeAdditionalStates"
                                  )}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Additional States
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentIncluded.agentOfService?.includeComplexCase}
                                  onCheckedChange={toggleIncluded(
                                    "agentOfService.includeComplexCase"
                                  )}
                                />
                                <span className="text-sm font-medium cursor-pointer select-none">
                                  Complex Case
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Eye className="w-4 h-4" /> Live Preview
                          </CardTitle>
                          <CardDescription>Simple token preview with example data</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <pre className="whitespace-pre-wrap text-sm bg-muted rounded-md p-4 border min-h-[200px]">
                            {renderedPreview || "Type in the template to preview..."}
                          </pre>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </main>
      </div>
    </PermissionGuard>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Settings } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

// Local storage key used by CommandDock
const RBAC_KEY = "commandDock.rbac";

type Permission = string;

type RBACConfig = {
  byCommand?: Record<string, { required?: Permission[] | null; hide?: boolean }>;
  byRole?: Partial<Record<string, { hide?: string[] }>>;
};

function loadConfig(): RBACConfig {
  try {
    const raw = localStorage.getItem(RBAC_KEY);
    return raw ? (JSON.parse(raw) as RBACConfig) : {};
  } catch {
    return {};
  }
}

function saveConfig(cfg: RBACConfig) {
  try {
    localStorage.setItem(RBAC_KEY, JSON.stringify(cfg, null, 2));
  } catch {}
}

export default function CommandDockRBACPanel() {
  const { isAdmin } = usePermissions();

  const [cfg, setCfg] = useState<RBACConfig>(() => loadConfig());
  const [roleName, setRoleName] = useState<string>("");
  const [roleHideCSV, setRoleHideCSV] = useState<string>("");

  const [cmdId, setCmdId] = useState<string>("");
  const [cmdHide, setCmdHide] = useState<boolean>(false);
  const [cmdReqCSV, setCmdReqCSV] = useState<string>("");

  // Derived pretty JSON for inspection/editing
  const json = useMemo(() => JSON.stringify(cfg, null, 2), [cfg]);
  const [jsonDraft, setJsonDraft] = useState(json);
  useEffect(() => setJsonDraft(json), [json]);

  const applyRoleHide = () => {
    if (!roleName.trim()) return;
    const hides = roleHideCSV
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    setCfg((prev) => {
      const next: RBACConfig = { ...prev, byRole: { ...(prev.byRole || {}) } };
      next.byRole![roleName.trim()] = { hide: hides };
      return next;
    });
  };

  const applyCommandOverride = () => {
    if (!cmdId.trim()) return;
    const req = cmdReqCSV
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    setCfg((prev) => {
      const next: RBACConfig = { ...prev, byCommand: { ...(prev.byCommand || {}) } };
      next.byCommand![cmdId.trim()] = {
        hide: cmdHide || undefined,
        required: cmdReqCSV.trim() === "" ? undefined : (req as Permission[]),
      };
      return next;
    });
  };

  const handleSave = () => {
    saveConfig(cfg);
  };

  const handleReset = () => {
    setCfg({});
    try {
      localStorage.removeItem(RBAC_KEY);
    } catch {}
  };

  const tryApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as RBACConfig;
      setCfg(parsed);
    } catch {
      // ignore invalid JSON until corrected
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4" /> Command Dock – RBAC Overrides
        </h3>
        {isAdmin && (
          <div className="inline-flex items-center text-xs gap-2">
            <Shield className="h-3.5 w-3.5" /> Admin Access
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Card className="border shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">By Role: Hide Commands</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label htmlFor="roleName" className="text-xs text-muted-foreground">
                  Role
                </label>
                <Input
                  id="roleName"
                  className="h-8"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g. admin, employee"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="hideCsv" className="text-xs text-muted-foreground">
                  Hide command IDs (comma or newline separated)
                </label>
                <Textarea
                  id="hideCsv"
                  rows={3}
                  className="min-h-[88px]"
                  value={roleHideCSV}
                  onChange={(e) => setRoleHideCSV(e.target.value)}
                  placeholder="apps.admin, apps.userManagement, apps.rbac"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 px-3" onClick={applyRoleHide}>
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">By Command: Override</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
              <div className="sm:col-span-2">
                <label htmlFor="cmdIdInput" className="text-xs text-muted-foreground">
                  Command ID
                </label>
                <Input
                  id="cmdIdInput"
                  className="h-8"
                  value={cmdId}
                  onChange={(e) => setCmdId(e.target.value)}
                  placeholder="e.g. settings.seedpay"
                />
              </div>
              <div>
                <label htmlFor="cmdReqInput" className="text-xs text-muted-foreground">
                  Required permissions (CSV)
                </label>
                <Input
                  id="cmdReqInput"
                  className="h-8"
                  value={cmdReqCSV}
                  onChange={(e) => setCmdReqCSV(e.target.value)}
                  placeholder="manage_commissions,manage_pricing"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="cmdHide"
                  type="checkbox"
                  checked={cmdHide}
                  onChange={(e) => setCmdHide(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="cmdHide" className="text-xs">
                  Hide
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 px-3" onClick={applyCommandOverride}>
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Raw JSON</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              rows={10}
              className="min-h-[160px]"
              value={jsonDraft}
              onChange={(e) => setJsonDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-8 px-3" onClick={tryApplyJson}>
                Apply JSON
              </Button>
              <Button size="sm" variant="secondary" className="h-8 px-3" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="outline" className="h-8 px-3" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

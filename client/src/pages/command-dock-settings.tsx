import React, { useEffect, useMemo, useState } from "react";
import { UniversalNavbar } from "@/components/UniversalNavbar";
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

export default function CommandDockSettings() {
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
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <div className="max-w-5xl mx-auto p-6">
        <UniversalNavbar showBackButton={true} />

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Settings className="h-7 w-7" /> Command Dock – RBAC Overrides
            </h1>
            {isAdmin && (
              <div className="inline-flex items-center text-white/90 text-sm gap-2">
                <Shield className="h-4 w-4" /> Admin Access
              </div>
            )}
          </div>
          <p className="text-white/80 mt-1">
            Edit overrides stored in <code>localStorage["{RBAC_KEY}"]</code>. This does not create a
            runtime registry and follows conventions-over-configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card className="border shadow-md">
            <CardHeader>
              <CardTitle>By Role: Hide Commands</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="role-name" className="text-sm text-white/90">
                    Role
                  </label>
                  <Input
                    id="role-name"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. admin, employee"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="role-hide-csv" className="text-sm text-white/90">
                    Hide command IDs (comma or newline separated)
                  </label>
                  <Textarea
                    id="role-hide-csv"
                    rows={3}
                    value={roleHideCSV}
                    onChange={(e) => setRoleHideCSV(e.target.value)}
                    placeholder="apps.admin, apps.userManagement, apps.rbac"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={applyRoleHide}>Apply</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-md">
            <CardHeader>
              <CardTitle>By Command: Override</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label htmlFor="cmd-id" className="text-sm text-white/90">
                    Command ID
                  </label>
                  <Input
                    id="cmd-id"
                    value={cmdId}
                    onChange={(e) => setCmdId(e.target.value)}
                    placeholder="e.g. settings.seedpay"
                  />
                </div>
                <div>
                  <label htmlFor="cmd-req-csv" className="text-sm text-white/90">
                    Required permissions (CSV)
                  </label>
                  <Input
                    id="cmd-req-csv"
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
                  />
                  <label htmlFor="cmdHide" className="text-sm text-white/90">
                    Hide
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={applyCommandOverride}>Apply</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-md">
            <CardHeader>
              <CardTitle>Raw JSON</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={12}
                value={jsonDraft}
                onChange={(e) => setJsonDraft(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={tryApplyJson}>Apply JSON</Button>
                <Button variant="secondary" onClick={handleSave}>
                  Save
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

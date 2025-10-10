import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Settings, Wrench } from "lucide-react";
import HubspotDiagnosticsPanel from "@/components/settings/system/HubspotDiagnosticsPanel";
import CommandDockRBACPanel from "@/components/settings/system/CommandDockRBACPanel";
import UserManagementInlinePanel from "@/components/settings/system/UserManagementInlinePanel";
import PricingBaseInlinePanel from "@/components/settings/system/PricingBaseInlinePanel";

export default function SystemTabs() {
  const [tab, setTab] = useState<string>("hubspot");
  return (
    <div className="settings-dense space-y-3">
      <Tabs value={tab} onValueChange={setTab} className="space-y-3">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="hubspot" className="flex items-center gap-2 h-9 px-3 text-xs">
            <Wrench className="w-4 h-4" /> HubSpot
          </TabsTrigger>
          <TabsTrigger value="command-dock" className="flex items-center gap-2 h-9 px-3 text-xs">
            <Settings className="w-4 h-4" /> Command Dock RBAC
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 h-9 px-3 text-xs">
            <Users className="w-4 h-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2 h-9 px-3 text-xs">
            <Shield className="w-4 h-4" /> Pricing (Base)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hubspot">
          <HubspotDiagnosticsPanel />
        </TabsContent>
        <TabsContent value="command-dock">
          <CommandDockRBACPanel />
        </TabsContent>
        <TabsContent value="users">
          <UserManagementInlinePanel />
        </TabsContent>
        <TabsContent value="pricing">
          <PricingBaseInlinePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

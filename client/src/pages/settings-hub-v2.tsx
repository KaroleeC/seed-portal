import React, { useMemo } from "react";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { SettingsLayout, type SettingsNavItem } from "@/components/settings/SettingsLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@shared/permissions";
import SeedQCSettingsPanel from "@/components/settings/seedqc/SeedQCSettingsPanel";
import SeedPaySettingsPanel from "@/components/settings/seedpay/SeedPaySettingsPanel";
import SystemTabs from "@/components/settings/system/SystemTabs";
import ProfileSettingsFullPanel from "@/components/settings/general/ProfileSettingsFullPanel";
import CalendarSettingsPanel from "@/components/settings/calendar/CalendarSettingsPanel";

export default function SettingsHubV2() {
  const { hasPermission, isAdmin } = usePermissions();

  const canSeedQC = hasPermission(PERMISSIONS.MANAGE_PRICING) || isAdmin;
  const canSeedPay = hasPermission(PERMISSIONS.MANAGE_COMMISSIONS) || isAdmin;
  // Adjust visibility rules as needed for your org
  const canClientProfiles = isAdmin;
  const canLeadsInbox = isAdmin;

  const nav: SettingsNavItem[] = useMemo(
    () => [
      { id: "general", label: "General" },
      { id: "seedqc", label: "Calculator (SeedQC)", visible: canSeedQC },
      { id: "seedpay", label: "Commission Tracker (SeedPay)", visible: canSeedPay },
      { id: "seedkb", label: "Knowledge Base" },
      { id: "calendar", label: "Calendar" },
      { id: "client-profiles", label: "Client Profiles", visible: canClientProfiles },
      { id: "leads-inbox", label: "Leads Inbox", visible: canLeadsInbox },
      { id: "system", label: "System (Admin)", visible: isAdmin },
    ],
    [canSeedQC, canSeedPay, canClientProfiles, canLeadsInbox, isAdmin]
  );

  return (
    <SettingsLayout
      title="Settings"
      nav={nav}
      header={<UniversalNavbar showBackButton />}
      subtitle={
        <span>
          Configure SeedOS with role-based access to each section. Select a group on the left to
          edit its settings.
        </span>
      }
    >
      {/* General */}
      <section id="general" className="scroll-mt-20 space-y-4">
        <ProfileSettingsFullPanel />
      </section>

      {/* Calendar */}
      <section id="calendar" className="scroll-mt-20 space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Calendar Settings</CardTitle>
            <CardDescription>
              Set your universal availability and overrides for scheduling.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <CalendarSettingsPanel />
          </CardContent>
        </Card>
      </section>

      {/* SeedQC */}
      <section id="seedqc" className="scroll-mt-20 space-y-4">
        <SeedQCSettingsPanel />
      </section>

      {/* SeedPay */}
      <section id="seedpay" className="scroll-mt-20 space-y-4">
        <SeedPaySettingsPanel />
      </section>

      {/* SeedKB */}
      <section id="seedkb" className="scroll-mt-20 space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>Manage knowledge base configuration and content.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground">
              SeedKB settings will be added here. For admin tools, use KB Admin.
            </div>
            <div className="pt-3">
              <Button variant="outline" onClick={() => (window.location.href = "/kb-admin")}>
                Open KB Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Client Profiles */}
      <section id="client-profiles" className="scroll-mt-20 space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Client Profiles</CardTitle>
            <CardDescription>Controls for client profile settings.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground">
              Client Profiles settings coming soon.
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Leads Inbox */}
      <section id="leads-inbox" className="scroll-mt-20 space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Leads Inbox</CardTitle>
            <CardDescription>Controls for managing inbound leads.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground">Leads Inbox settings coming soon.</div>
          </CardContent>
        </Card>
      </section>

      {/* System */}
      <section id="system" className="scroll-mt-20 space-y-4">
        {isAdmin ? (
          <SystemTabs />
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>System</CardTitle>
              <CardDescription>Admin-only settings</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">Access denied</CardContent>
          </Card>
        )}
      </section>
    </SettingsLayout>
  );
}

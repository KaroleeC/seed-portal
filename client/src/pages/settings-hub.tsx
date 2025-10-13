import React, { useMemo } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Calculator, DollarSign, BookOpen, Users, Wrench, type LucideIcon } from "lucide-react";
import { SettingsLayout, type SettingsNavItem } from "@/components/settings/SettingsLayout";
export default function SettingsHub() {
  const { isAdmin } = usePermissions();
  const [, setLocation] = useLocation();

  const nav: SettingsNavItem[] = useMemo(
    () => [
      { id: "general", label: "General" },
      { id: "seedqc", label: "Calculator (SeedQC)", visible: !!isAdmin },
      { id: "seedpay", label: "Commission Tracker (SeedPay)", visible: !!isAdmin },
      { id: "seedkb", label: "Knowledge Base" },
      { id: "client-profiles", label: "Client Profiles", visible: !!isAdmin },
      { id: "leads-inbox", label: "Leads Inbox", visible: !!isAdmin },
      { id: "system", label: "System (Admin)", visible: !!isAdmin },
    ],
    [isAdmin]
  );

  const Section = ({
    title,
    description,
    actions,
    icon: Icon,
    id,
  }: {
    title: string;
    description: string;
    actions: Array<{
      label: string;
      to: string;
      variant?: "default" | "outline" | "ghost" | "secondary";
    }>;
    icon: LucideIcon;
    id: string;
  }) => (
    <div id={id} className="scroll-mt-20">
      <Card className="border shadow-md">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-orange-600" />
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex gap-2">
            {actions.map((a) => (
              <Button key={a.to} variant={a.variant ?? "default"} onClick={() => setLocation(a.to)}>
                {a.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <SettingsLayout title="Settings" nav={nav} header={<UniversalNavbar showBackButton={true} />}>
      <div className="grid grid-cols-1 gap-4">
        <Section
          id="general"
          title="General"
          description="Update your profile and preferences."
          actions={[{ label: "Profile", to: "/profile", variant: "outline" }]}
          icon={Wrench}
        />

        {isAdmin && (
          <Section
            id="seedqc"
            title="Calculator (SeedQC)"
            description="Manage SOW templates, agreement links, and pricing settings for the calculator."
            actions={[{ label: "Open", to: "/settings#seedqc" }]}
            icon={Calculator}
          />
        )}

        {isAdmin && (
          <Section
            id="seedpay"
            title="Commission Tracker (SeedPay)"
            description="View commission diagnostics and settings (read-only for now)."
            actions={[{ label: "Open", to: "/settings#seedpay" }]}
            icon={DollarSign}
          />
        )}

        <Section
          id="seedkb"
          title="Knowledge Base"
          description="Manage knowledge base content and settings."
          actions={[{ label: "KB Admin", to: "/kb-admin", variant: "outline" }]}
          icon={BookOpen}
        />

        {isAdmin && (
          <Section
            id="client-profiles"
            title="Client Profiles"
            description="Manage client profiles settings."
            actions={[{ label: "Open", to: "/settings#client-profiles" }]}
            icon={Users}
          />
        )}

        {isAdmin && (
          <Section
            id="leads-inbox"
            title="Leads Inbox"
            description="Manage leads inbox settings."
            actions={[{ label: "Open", to: "/settings#leads-inbox" }]}
            icon={Users}
          />
        )}

        {isAdmin && (
          <Section
            id="system"
            title="System (Admin)"
            description="Manage users, integrations, and diagnostics."
            actions={[
              { label: "User Management", to: "/user-management", variant: "outline" },
              { label: "Pricing Management", to: "/admin/pricing", variant: "outline" },
              { label: "HubSpot Diagnostics", to: "/admin/hubspot", variant: "outline" },
              { label: "Command Dock RBAC", to: "/settings/command-dock", variant: "outline" },
            ]}
            icon={Users}
          />
        )}
      </div>
    </SettingsLayout>
  );
}

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Shield,
  Calculator,
  DollarSign,
  BookOpen,
  Users,
  Wrench,
  Settings,
} from "lucide-react";

export default function SettingsHub() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";

  const Section = ({
    title,
    description,
    actions,
    icon: Icon,
  }: {
    title: string;
    description: string;
    actions: Array<{
      label: string;
      to: string;
      variant?: "default" | "outline" | "ghost" | "secondary";
    }>;
    icon: any;
  }) => (
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
            <Button
              key={a.to}
              variant={a.variant ?? "default"}
              onClick={() => setLocation(a.to)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <div className="max-w-5xl mx-auto p-6">
        <UniversalNavbar showBackButton={true} />

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Settings className="h-7 w-7" /> Settings
            </h1>
            {isAdmin && (
              <div className="inline-flex items-center text-white/90 text-sm gap-2">
                <Shield className="h-4 w-4" /> Admin Access
              </div>
            )}
          </div>
          <p className="text-white/80 mt-1">
            Configure the SeedOS apps and system based on your access.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Section
            title="General"
            description="Update your profile and preferences."
            actions={[{ label: "Profile", to: "/profile", variant: "outline" }]}
            icon={Wrench}
          />

          {isAdmin && (
            <Section
              title="Calculator (SeedQC)"
              description="Manage SOW templates, agreement links, and pricing settings for the calculator."
              actions={[
                { label: "Open Settings", to: "/apps/seedqc/settings" },
              ]}
              icon={Calculator}
            />
          )}

          {isAdmin && (
            <Section
              title="Commission Tracker (SeedPay)"
              description="View commission diagnostics and settings (read-only for now)."
              actions={[
                { label: "Open Settings", to: "/apps/seedpay/settings" },
              ]}
              icon={DollarSign}
            />
          )}

          {/* Knowledge Base - keep available to employees/admins */}
          <Section
            title="Knowledge Base"
            description="Manage knowledge base content and settings."
            actions={[
              { label: "KB Admin", to: "/kb-admin", variant: "outline" },
            ]}
            icon={BookOpen}
          />

          {isAdmin && (
            <Section
              title="System (Admin)"
              description="Manage users, integrations, and diagnostics."
              actions={[
                {
                  label: "User Management",
                  to: "/user-management",
                  variant: "outline",
                },
                {
                  label: "Pricing Management",
                  to: "/admin/pricing",
                  variant: "outline",
                },
                {
                  label: "HubSpot Diagnostics",
                  to: "/admin/hubspot",
                  variant: "outline",
                },
              ]}
              icon={Users}
            />
          )}
        </div>
      </div>
    </div>
  );
}

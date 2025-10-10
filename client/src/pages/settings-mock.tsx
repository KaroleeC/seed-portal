import React from "react";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { SettingsLayout, type SettingsNavItem } from "@/components/settings/SettingsLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function SettingsMock() {
  const nav: SettingsNavItem[] = [
    { id: "account", label: "Account" },
    { id: "billing", label: "Billing" },
    { id: "notifications", label: "Notifications" },
    { id: "integrations", label: "Integrations" },
    { id: "api", label: "API" },
  ];

  return (
    <SettingsLayout
      title="Settings"
      nav={nav}
      header={<UniversalNavbar showBackButton />}
      subtitle={
        <span>Manage your account, billing, notifications, integrations, and API preferences.</span>
      }
    >
      {/* Account */}
      <section id="account" className="scroll-mt-20 space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your photo and personal details here.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="untitledui.com/" defaultValue="olivia" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="www.untitledui.com"
                  defaultValue="www.untitledui.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Your photo</Label>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 border border-white/30" />
                  <Button variant="outline">Update</Button>
                  <Button variant="ghost">Delete</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will be displayed on your profile.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Your bio</Label>
              <Textarea
                id="bio"
                rows={6}
                placeholder="Write a short introduction."
                defaultValue={`I'm a Product Designer based in Melbourne, Australia. I specialize in UX/UI design, brand strategy, and Webflow development.`}
              />
              <p className="text-xs text-muted-foreground">276 characters left</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job title</Label>
                <Input id="jobTitle" defaultValue="Product Designer" />
              </div>
              <div className="flex items-center gap-3 pt-6 md:pt-8">
                <Switch id="showTitle" defaultChecked />
                <Label htmlFor="showTitle">Show my job title in my profile</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline">Cancel</Button>
              <Button>Save changes</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Billing */}
      <section id="billing" className="scroll-mt-20">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Billing</CardTitle>
            <CardDescription>Manage your billing details and payment method.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground">Billing content coming soon.</div>
          </CardContent>
        </Card>
      </section>

      {/* Notifications */}
      <section id="notifications" className="scroll-mt-20">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Choose which notifications you want to receive.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground">Notifications content coming soon.</div>
          </CardContent>
        </Card>
      </section>

      {/* Integrations */}
      <section id="integrations" className="scroll-mt-20">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Connect third-party apps to SeedOS.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground">Integrations content coming soon.</div>
          </CardContent>
        </Card>
      </section>

      {/* API */}
      <section id="api" className="scroll-mt-20">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>API</CardTitle>
            <CardDescription>Manage API keys and webhooks.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground">API content coming soon.</div>
          </CardContent>
        </Card>
      </section>
    </SettingsLayout>
  );
}

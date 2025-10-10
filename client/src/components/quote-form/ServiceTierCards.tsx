import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Star, Users } from "lucide-react";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import type { UseFormReturn } from "react-hook-form";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import { SurfaceCard } from "@/components/ds/SurfaceCard";

interface ServiceTierCardsProps {
  form: UseFormReturn<QuoteFormFields>;
}

export function ServiceTierCards({ form }: ServiceTierCardsProps) {
  const selectedTier = form.watch("serviceTier") || "Automated";

  const handleTierSelect = (tier: string) => {
    form.setValue("serviceTier", tier);
  };

  return (
    <SurfaceCard className="mb-8 p-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-foreground mb-2">Select Service Tier</h3>
        <p className="text-muted-foreground">
          Select level of support and guidance based on client goals and needs
        </p>
      </div>

      <FormField
        control={form.control}
        name="serviceTier"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Automated Tier */}
                <Card
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                    selectedTier === "Automated"
                      ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/10"
                      : "border-muted hover:border-blue-400"
                  }`}
                  onClick={() => handleTierSelect("Automated")}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg text-foreground mb-2">Automated</h4>
                    <p className="text-2xl font-bold text-blue-500 mb-3">Included</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Base level of service with standard support
                    </p>
                    <ul className="text-xs text-muted-foreground text-left space-y-1">
                      <li>• Email support</li>
                      <li>• End-of-period summaries</li>
                      <li>• Automated monitoring & reminders</li>
                      <li>• Quarterly reports, estimates & insights</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Guided Tier */}
                <Card
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                    selectedTier === "Guided"
                      ? "border-orange-500 ring-2 ring-orange-500/20 bg-orange-500/10"
                      : "border-muted hover:border-orange-400"
                  }`}
                  onClick={() => handleTierSelect("Guided")}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg text-foreground mb-2">Guided</h4>
                    <p className="text-2xl font-bold text-orange-500 mb-3">
                      +$79<span className="text-sm">/mo</span>
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enhanced support and guidance
                    </p>
                    <ul className="text-xs text-muted-foreground text-left space-y-1">
                      <li>• Kickoff call & quarterly checkins</li>
                      <li>• Dedicated Slack channel support</li>
                      <li>• Personalized insights</li>
                      <li>• Quarterly strategy calls, payment assistance & deadline prep</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Concierge Tier */}
                <Card
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                    selectedTier === "Concierge"
                      ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/10"
                      : "border-muted hover:border-purple-400"
                  }`}
                  onClick={() => handleTierSelect("Concierge")}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg text-foreground mb-2">Concierge</h4>
                    <p className="text-2xl font-bold text-purple-500 mb-3">
                      +$249<span className="text-sm">/mo</span>
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Premium white-glove service
                    </p>
                    <ul className="text-xs text-muted-foreground text-left space-y-1">
                      <li>• Zoom kickoff with dedicated controller</li>
                      <li>• Custom deliverables & hands-on planning</li>
                      <li>• Monthly strategy calls</li>
                      <li>• Priority support via Slack & Zoom</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </FormControl>
          </FormItem>
        )}
      />
    </SurfaceCard>
  );
}

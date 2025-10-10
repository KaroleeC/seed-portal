import React from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  Calculator,
  Settings,
  Bot,
  BookOpen,
  ChevronRight,
  TrendingUp,
  Target,
  Compass,
  BrainCircuit,
  Wrench,
  Shield,
  Heart,
  Folder,
  FileText,
  BarChart3,
  Calendar,
  Mail,
  Users,
  CreditCard,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  Zap,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import { Badge } from "@/components/ui/badge";
import { NewsAggregator } from "@/components/NewsAggregator";
import { SurfaceCard } from "@/components/ds/SurfaceCard";
import { QuickAction } from "@/components/QuickAction";
import { useState, useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useDealsByOwner } from "@/hooks/useDeals";
import { apps } from "@/assets";

// Weather icon component (matches Sales look)
const getWeatherIcon = (condition: string) => {
  const iconProps = { className: "h-4 w-4 text-white/70" };

  switch (condition.toLowerCase()) {
    case "clear":
    case "sunny":
      return <Sun {...iconProps} />;
    case "partly cloudy":
      return <Cloud {...iconProps} />;
    case "cloudy":
      return <Cloud {...iconProps} />;
    case "rainy":
      return <CloudRain {...iconProps} />;
    case "showers":
      return <CloudDrizzle {...iconProps} />;
    case "snowy":
      return <CloudSnow {...iconProps} />;
    case "stormy":
      return <Zap {...iconProps} />;
    default:
      return <Cloud {...iconProps} />;
  }
};

interface WeatherData {
  temperature: number | null;
  condition: string;
  location: string;
  isLoading: boolean;
}

interface KbCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Icon mapping for categories
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  compass: Compass,
  calculator: Calculator,
  "book-open": BookOpen,
  "trending-up": TrendingUp,
  "brain-circuit": BrainCircuit,
  target: Target,
  shield: Shield,
  wrench: Wrench,
  heart: Heart,
  folder: Folder,
  settings: Settings,
};

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch knowledge base categories for the SEEDKB card
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<KbCategory[]>({
    queryKey: ["/api/kb/categories"],
    queryFn: async () => await apiRequest<KbCategory[]>("GET", "/api/kb/categories"),
    enabled: !!user,
  });

  // Prefetch centralized deals for the current sales owner (no UI changes)
  const ownerId = user?.hubspotUserId || undefined;
  useDealsByOwner(ownerId, {
    enabled: !!ownerId,
    limit: 50,
  });

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Folder;
    return IconComponent;
  };

  const [weather, setWeather] = useState<WeatherData>({
    temperature: null,
    condition: "",
    location: "",
    isLoading: true,
  });

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Fetch live weather data based on user's location
  const latitude = user?.latitude;
  const longitude = user?.longitude;
  const city = user?.city;
  const state = user?.state;
  useEffect(() => {
    if (!latitude || !longitude) {
      setWeather({
        temperature: null,
        condition: "",
        location: "Set address in profile for weather",
        isLoading: false,
      });
      return;
    }

    const timeoutId = setTimeout(() => {
      const fetchWeather = async () => {
        try {
          const lat = parseFloat(latitude.toString());
          const lon = parseFloat(longitude.toString());
          const locationName = city && state ? `${city}, ${state}` : "Your Location";

          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`
          );
          if (!response.ok) throw new Error("Weather fetch failed");
          const data = await response.json();
          const currentWeather = data.current_weather;

          const getCondition = (code: number) => {
            if (code === 0) return "clear";
            if (code <= 3) return "partly cloudy";
            if (code <= 48) return "cloudy";
            if (code <= 67) return "rainy";
            if (code <= 77) return "snowy";
            if (code <= 82) return "showers";
            return "stormy";
          };

          setWeather({
            temperature: Math.round(currentWeather.temperature),
            condition: getCondition(currentWeather.weathercode),
            location: locationName,
            isLoading: false,
          });
        } catch (error) {
          setWeather({
            temperature: null,
            condition: "clear",
            location: city && state ? `${city}, ${state}` : "Weather unavailable",
            isLoading: false,
          });
        }
      };

      fetchWeather();
      const interval = setInterval(fetchWeather, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [latitude, longitude, city, state]);

  return (
    <DashboardLayout maxWidthClassName="max-w-7xl">
      {/* Welcome Section (Sales baseline) */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-light text-foreground mb-2">
          {getGreeting()},{" "}
          {user?.email?.split("@")[0]
            ? user.email.split("@")[0].charAt(0).toUpperCase() + user.email.split("@")[0].slice(1)
            : "User"}
          !
        </h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          {weather.isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-pulse">Loading weather...</div>
            </div>
          ) : (
            <>
              {getWeatherIcon(weather.condition)}
              <span>
                {weather.temperature}°F and {weather.condition} in {weather.location}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions (standardized) */}
      <div className="mb-12">
        <div className="grid gap-8 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 justify-items-center">
          <QuickAction
            label="Leads Inbox"
            logoLightSrc={apps.leadiq.light}
            logoDarkSrc={apps.leadiq.dark}
            gradient="from-indigo-500 to-indigo-600"
            hoverGradient="from-indigo-400 to-indigo-500"
            delay={1}
            href="/leads-inbox"
            useRim
            accentClass="text-[#e91e63]"
            watermarkIcon={<Mail />}
          />
          <QuickAction
            label="SeedQC"
            logoLightSrc={apps.seedqc.light}
            logoDarkSrc={apps.seedqc.dark}
            gradient="from-orange-500 to-orange-600"
            hoverGradient="from-orange-400 to-orange-500"
            delay={2}
            href="/apps/seedqc"
            useRim
            accentClass="text-[#963ccd]"
            watermarkIcon={<Calculator />}
          />
          <QuickAction
            label="Client Profiles"
            logoLightSrc={apps.clientiq.light}
            logoDarkSrc={apps.clientiq.dark}
            gradient="from-blue-500 to-blue-600"
            hoverGradient="from-blue-400 to-blue-500"
            delay={3}
            href="/client-profiles"
            useRim
            accentClass="text-[#0096e2]"
            watermarkIcon={<Users />}
          />
          <QuickAction
            label="AI Workspace"
            logoLightSrc={apps.seedai.light}
            logoDarkSrc={apps.seedai.dark}
            gradient="from-purple-500 to-purple-600"
            hoverGradient="from-purple-400 to-purple-500"
            delay={4}
            href="/assistant"
            useRim
            accentClass="text-[#6a1b9a]"
            watermarkIcon={<Bot />}
          />
          <QuickAction
            label="SeedPay"
            logoLightSrc={apps.seedpay.light}
            logoDarkSrc={apps.seedpay.dark}
            gradient="from-emerald-500 to-emerald-600"
            hoverGradient="from-emerald-400 to-emerald-500"
            delay={5}
            href="/apps/seedpay"
            useRim
            accentClass="text-[#118c4f]"
            watermarkIcon={<CreditCard />}
          />
        </div>
      </div>

      {/* Knowledge Base Access */}
      <div className="mb-12">
        <SurfaceCard>
          <CardHeader className="pb-4 surface-band">
            <CardTitle
              className="flex items-center gap-3 text-2xl font-bold"
              style={{ fontFamily: "League Spartan, sans-serif" }}
            >
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-white">
                SEED<span style={{ color: "#e24c00" }}>KB</span>
              </span>
            </CardTitle>
            <CardDescription className="text-slate-300 text-base">
              Your comprehensive knowledge hub for sales success
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setLocation("/knowledge-base")}
                  className="text-lg h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <BookOpen className="h-5 w-5 mr-3" />
                  Open Knowledge Base
                </Button>

                {categoriesLoading ? (
                  <div className="text-slate-400">Loading categories...</div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-white/70 text-sm">
                      {categories.length} categories available
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {categories.map((category: KbCategory) => {
                        const IconComponent = getIconComponent(category.icon);
                        return (
                          <TooltipProvider key={category.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}
                                >
                                  <IconComponent className="h-4 w-4 text-white" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-popover border text-foreground">
                                {category.name}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="bg-orange-500/20 text-orange-300 border-orange-500/30"
                >
                  <Bot className="h-3 w-3 mr-1" />
                  AI Powered
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-slate-600/50 text-slate-300 border-slate-500/30"
                >
                  Recently Updated
                </Badge>
              </div>
            </div>
          </CardContent>
        </SurfaceCard>
      </div>

      {/* Sales Enablement Dashboard */}
      <div className="grid grid-cols-3 gap-8 mb-16">
        {/* Left Column - Sales Resources */}
        <div className="col-span-2 space-y-6">
          {/* Sales Playbook */}
          <SurfaceCard>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <FileText className="h-5 w-5 text-indigo-300" />
                </div>
                Sales Playbook
              </CardTitle>
              <CardDescription className="text-white/70">
                Your complete guide to sales success
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted border rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
                  <h4 className="text-sm font-semibold text-white mb-2">Objection Handling</h4>
                  <p className="text-xs text-white/70">Common objections and proven responses</p>
                </div>
                <div className="p-4 bg-muted border rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
                  <h4 className="text-sm font-semibold text-white mb-2">Discovery Questions</h4>
                  <p className="text-xs text-white/70">Questions to uncover client needs</p>
                </div>
                <div className="p-4 bg-muted border rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
                  <h4 className="text-sm font-semibold text-white mb-2">Closing Techniques</h4>
                  <p className="text-xs text-white/70">Proven methods to close deals</p>
                </div>
                <div className="p-4 bg-muted border rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
                  <h4 className="text-sm font-semibold text-white mb-2">Follow-up Templates</h4>
                  <p className="text-xs text-white/70">Email templates for every scenario</p>
                </div>
              </div>
            </CardContent>
          </SurfaceCard>

          {/* Competitive Intelligence */}
          <SurfaceCard className="rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-amber-300" />
                </div>
                Competitive Intelligence
              </CardTitle>
              <CardDescription className="text-white/70">
                Know your competition inside and out
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-muted border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">TaxGuard Pro</h4>
                    <p className="text-xs text-white/70">Main competitor analysis</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 bg-muted border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">BookKeeper Elite</h4>
                    <p className="text-xs text-white/70">Pricing comparison available</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 bg-muted border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">AccuFinance</h4>
                    <p className="text-xs text-white/70">Feature comparison matrix</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </SurfaceCard>
        </div>

        {/* Right Column - News Aggregator */}
        <div>
          <NewsAggregator />
        </div>
      </div>

      {/* Additional Sales Tools */}
      <div className="grid grid-cols-2 gap-8 mb-12">
        {/* Quick Contact Templates */}
        <SurfaceCard>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-pink-500/20 rounded-lg">
                <Mail className="h-5 w-5 text-pink-300" />
              </div>
              Quick Contact Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-muted border rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
              <h4 className="text-sm font-semibold text-white">Cold Outreach</h4>
              <p className="text-xs text-white/70">Initial contact templates</p>
            </div>
            <div className="p-3 bg-muted border rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
              <h4 className="text-sm font-semibold text-white">Meeting Follow-up</h4>
              <p className="text-xs text-white/70">Post-meeting templates</p>
            </div>
            <div className="p-3 bg-muted border rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
              <h4 className="text-sm font-semibold text-white">Proposal Delivery</h4>
              <p className="text-xs text-white/70">Quote delivery templates</p>
            </div>
          </CardContent>
        </SurfaceCard>

        {/* Call Scheduling */}
        <SurfaceCard className="rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Calendar className="h-5 w-5 text-cyan-300" />
              </div>
              Smart Scheduling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-muted border rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
              <h4 className="text-sm font-semibold text-white">Discovery Call</h4>
              <p className="text-xs text-white/70">30 min initial meeting</p>
            </div>
            <div className="p-3 bg-muted border rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
              <h4 className="text-sm font-semibold text-white">Demo Session</h4>
              <p className="text-xs text-white/70">45 min product demo</p>
            </div>
            <div className="p-3 bg-muted border rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
              <h4 className="text-sm font-semibold text-white">Closing Call</h4>
              <p className="text-xs text-white/70">Final decision meeting</p>
            </div>
          </CardContent>
        </SurfaceCard>
      </div>
    </DashboardLayout>
  );
}

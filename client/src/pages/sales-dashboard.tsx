import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  Calculator, 
  LogOut, 
  User, 
  Settings, 
  Bell, 
  Search,
  DollarSign,
  Video,
  Bot,
  GraduationCap,
  BookOpen,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Target,
  Activity,
  Compass,
  BrainCircuit,
  Wrench,
  Shield,
  Heart,
  Folder,
  MessageSquare,
  FileText,
  BarChart3,
  Calendar,
  Phone,
  Mail
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import navLogoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NewsAggregator } from "@/components/NewsAggregator";
import { KbCard } from "@/components/seedkb/KbCard";
import { useState, useEffect } from "react";
import { Cloud, CloudRain, CloudSnow, Sun, CloudDrizzle, Zap } from "lucide-react";

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from "@/lib/queryClient";
import { useDealsByOwner } from "@/hooks/useDeals";

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
const iconMap: Record<string, any> = {
  'compass': Compass,
  'calculator': Calculator,
  'book-open': BookOpen,
  'trending-up': TrendingUp,
  'brain-circuit': BrainCircuit,
  'target': Target,
  'shield': Shield,
  'wrench': Wrench,
  'heart': Heart,
  'folder': Folder,
  'settings': Settings
};

// Weather icon component
const getWeatherIcon = (condition: string) => {
  const iconProps = { className: "h-4 w-4 text-white/70" };
  
  switch (condition.toLowerCase()) {
    case 'clear':
    case 'sunny':
      return <Sun {...iconProps} />;
    case 'partly cloudy':
      return <Cloud {...iconProps} />;
    case 'cloudy':
      return <Cloud {...iconProps} />;
    case 'rainy':
      return <CloudRain {...iconProps} />;
    case 'showers':
      return <CloudDrizzle {...iconProps} />;
    case 'snowy':
      return <CloudSnow {...iconProps} />;
    case 'stormy':
      return <Zap {...iconProps} />;
    default:
      return <Cloud {...iconProps} />;
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch knowledge base categories for the SEEDKB card
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<KbCategory[]>({
    queryKey: ["/api/kb/categories"],
  });

  // Prefetch centralized deals for the current sales owner (no UI changes)
  const ownerId = user?.hubspotUserId || undefined;
  const { data: dealsResult, isLoading: dealsLoading } = useDealsByOwner(ownerId, {
    enabled: !!ownerId,
    limit: 50,
  });

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Folder;
    return IconComponent;
  };

  const [weather, setWeather] = useState<WeatherData>({
    temperature: null,
    condition: '',
    location: '',
    isLoading: true
  });



  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Fetch live weather data based on user's location - defer until after initial load
  useEffect(() => {
    if (!user) return;

    // Defer weather fetch by 500ms to prioritize core UI loading
    const timeoutId = setTimeout(() => {
      const fetchWeather = async () => {
        try {
          // Only fetch weather if user has coordinates set
          if (!user?.latitude || !user?.longitude) {
            setWeather({
              temperature: null,
              condition: '',
              location: 'Set address in profile for weather',
              isLoading: false
            });
            return;
          }
        
        const lat = parseFloat(user.latitude.toString());
        const lon = parseFloat(user.longitude.toString());
        const locationName = user.city && user.state ? `${user.city}, ${user.state}` : 'Your Location';
        
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`
        );
        
        if (!response.ok) {
          throw new Error('Weather fetch failed');
        }
        
        const data = await response.json();
        const currentWeather = data.current_weather;
        
        // Map weather codes to readable conditions
        const getCondition = (code: number) => {
          if (code === 0) return 'clear';
          if (code <= 3) return 'partly cloudy';
          if (code <= 48) return 'cloudy';
          if (code <= 67) return 'rainy';
          if (code <= 77) return 'snowy';
          if (code <= 82) return 'showers';
          return 'stormy';
        };
        
        setWeather({
          temperature: Math.round(currentWeather.temperature),
          condition: getCondition(currentWeather.weathercode),
          location: locationName,
          isLoading: false
        });
      } catch (error) {
        // Only log actual network errors, not expected timeouts
        if (error instanceof Error && !error.message.includes('abort')) {
          console.error('Weather API error:', error.message);
        }
        setWeather({
          temperature: null,
          condition: 'clear',
          location: user?.city && user?.state ? `${user.city}, ${user.state}` : 'Weather unavailable',
          isLoading: false
        });
      }
    };

      // Fetch weather immediately then set up interval
      fetchWeather();
      // Refresh weather every 30 minutes
      const interval = setInterval(fetchWeather, 30 * 60 * 1000);
      
      return () => {
        clearInterval(interval);
      };
    }, 500); // 500ms delay for initial load performance

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user?.latitude, user?.longitude, user?.city, user?.state]); // Removed user.id to prevent unnecessary re-runs

  return (
    <div className="theme-seedkb dark min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <UniversalNavbar />

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-light text-white mb-2">
            {getGreeting()}, {user?.email?.split('@')[0] ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'User'}!
          </h1>
          <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
            {weather.isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-pulse">Loading weather...</div>
              </div>
            ) : (
              <>
                {getWeatherIcon(weather.condition)}
                <span>{weather.temperature}°F and {weather.condition} in {weather.location}</span>
              </>
            )}
          </div>
        </div>

        {/* Sales Enablement Tools - Moved Quick Actions Here */}
        <div className="mb-12">
          <div className={`grid gap-8 justify-items-center ${(user?.email === 'jon@seedfinancial.io' || user?.email === 'anthony@seedfinancial.io' || user?.role === 'admin') ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <Link href="/calculator">
              <div className="group w-32 h-32 rounded-full hover:scale-110 transition-all duration-300 cursor-pointer action-card-bounce action-card kb-quick-action" style={{"--delay": 1} as React.CSSProperties}>
                <div className="action-card-content">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full mb-3 group-hover:from-orange-400 group-hover:to-orange-500 transition-all duration-300">
                    <Calculator className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-center text-white leading-tight px-1">Quote Calculator</h3>
                </div>
              </div>
            </Link>

            <Link href="/sales-commission-tracker">
              <div className="group w-32 h-32 rounded-full hover:scale-110 transition-all duration-300 cursor-pointer action-card-bounce action-card kb-quick-action" style={{"--delay": 2} as React.CSSProperties}>
                <div className="action-card-content">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-3 group-hover:from-green-400 group-hover:to-green-500 transition-all duration-300">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-center text-white leading-tight px-1">Commission Tracker</h3>
                </div>
              </div>
            </Link>

            <Link href="/client-intel">
              <div className="group w-32 h-32 rounded-full hover:scale-110 transition-all duration-300 cursor-pointer action-card-bounce action-card kb-quick-action" style={{"--delay": 3} as React.CSSProperties}>
                <div className="action-card-content">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-3 group-hover:from-blue-400 group-hover:to-blue-500 transition-all duration-300">
                    <UserCheck className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-center text-white leading-tight px-1">Client Intel</h3>
                </div>
              </div>
            </Link>

            <div className="group w-32 h-32 rounded-full hover:scale-110 transition-all duration-300 cursor-pointer action-card-bounce action-card kb-quick-action" style={{"--delay": 4} as React.CSSProperties}>
              <div className="action-card-content">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mb-3 group-hover:from-purple-400 group-hover:to-purple-500 transition-all duration-300">
                  <Video className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-center text-white leading-tight px-1">Meeting Vault</h3>
              </div>
            </div>

            <div className="group w-32 h-32 rounded-full hover:scale-110 transition-all duration-300 cursor-pointer action-card-bounce action-card kb-quick-action" style={{"--delay": 5} as React.CSSProperties}>
              <div className="action-card-content">
                <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full mb-3 group-hover:from-teal-400 group-hover:to-teal-500 transition-all duration-300">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-center text-white leading-tight px-1">Sales Scripts</h3>
              </div>
            </div>

            {/* Sales Trainer - Only visible to admins */}
            {(user?.email === 'jon@seedfinancial.io' || user?.email === 'anthony@seedfinancial.io' || user?.role === 'admin') && (
              <div className="group w-32 h-32 rounded-full hover:scale-110 transition-all duration-300 cursor-pointer action-card-bounce action-card kb-quick-action" style={{"--delay": 6} as React.CSSProperties}>
                <div className="action-card-content">
                  <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-full mb-3 group-hover:from-red-400 group-hover:to-red-500 transition-all duration-300">
                    <GraduationCap className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-center text-white leading-tight px-1">Sales Trainer</h3>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Knowledge Base Access */}
        <div className="mb-12">
          <KbCard>
            <CardHeader className="pb-4 seedkb-band">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <span className="text-white">SEED<span style={{ color: '#e24c00' }}>KB</span></span>
              </CardTitle>
              <CardDescription className="text-slate-300 text-base">
                Your comprehensive knowledge hub for sales success
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={() => setLocation('/knowledge-base')}
                    className="text-lg h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <BookOpen className="h-5 w-5 mr-3" />
                    Open Knowledge Base
                  </Button>
                  
                  {categoriesLoading ? (
                    <div className="text-slate-400">Loading categories...</div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-white/70 text-sm">{categories.length} categories available</span>
                      <div className="flex gap-2">
                        {categories.slice(0, 4).map((category: KbCategory) => {
                          const IconComponent = getIconComponent(category.icon);
                          return (
                            <TooltipProvider key={category.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
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
                        {categories.length > 4 && (
                          <div className="w-8 h-8 rounded-lg bg-muted border flex items-center justify-center">
                            <span className="text-foreground text-xs font-bold">+{categories.length - 4}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                    <Bot className="h-3 w-3 mr-1" />
                    AI Powered
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-600/50 text-slate-300 border-slate-500/30">
                    Recently Updated
                  </Badge>
                </div>
              </div>
            </CardContent>
          </KbCard>
        </div>

        {/* Sales Enablement Dashboard */}
        <div className="grid grid-cols-3 gap-8 mb-16">
          {/* Left Column - Sales Resources */}
          <div className="col-span-2 space-y-6">
            {/* Sales Playbook */}
            <KbCard>
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
            </KbCard>

            {/* Competitive Intelligence */}
            <Card className="kb-surface rounded-2xl">
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
                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
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
                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
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
                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - News Aggregator */}
          <div>
            <NewsAggregator />
          </div>
        </div>

        {/* Additional Sales Tools */}
        <div className="grid grid-cols-2 gap-8 mb-12">
          {/* Quick Contact Templates */}
          <KbCard>
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
          </KbCard>

          {/* Call Scheduling */}
          <Card className="kb-surface rounded-2xl">
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
          </Card>
        </div>

      </main>
    </div>
  );
}


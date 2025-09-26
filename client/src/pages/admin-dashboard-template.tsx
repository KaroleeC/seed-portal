import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import {
  Calculator,
  TrendingUp,
  Calendar,
  CreditCard,
  Globe,
  Shield,
  Zap,
  Database,
  Clock,
  Target,
  PieChart,
  Activity,
  DollarSign,
  Video,
  Bot,
  GraduationCap,
  Megaphone,
  Slack,
  Inbox,
  UserCheck,
  Menu,
  ChevronRight,
  Filter,
  Cloud,
  Sun,
  CloudRain,
  ChevronDown,
  Search,
  Bell,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SalesInbox } from "@/components/SalesInbox";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { useState, useEffect } from "react";

// TEMPLATE: Saved for potential future admin dashboard implementation
// This is the original dashboard design before dashboard-new.tsx became the main dashboard
export default function AdminDashboardTemplate() {
  const { user } = useAuth();
  const [weather, setWeather] = useState({
    temp: 72,
    condition: "sunny",
    location: "Marina Del Rey, CA",
  });

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Mock weather data - in production this would come from weather API based on user profile location
  useEffect(() => {
    // Simulate weather fetch based on user location from profile
    const fetchWeather = () => {
      const conditions = ["sunny", "cloudy", "rainy"] as const;
      const temps = [68, 72, 75, 78];
      const randomCondition =
        conditions[Math.floor(Math.random() * conditions.length)] || "sunny";
      const randomTemp = temps[Math.floor(Math.random() * temps.length)] || 72;

      setWeather({
        temp: randomTemp,
        condition: randomCondition,
        location: "Marina Del Rey, CA", // From user profile
      });
    };

    fetchWeather();
  }, []);

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case "sunny":
        return <Sun className="h-4 w-4 text-yellow-500" />;
      case "cloudy":
        return <Cloud className="h-4 w-4 text-gray-500" />;
      case "rainy":
        return <CloudRain className="h-4 w-4 text-blue-500" />;
      default:
        return <Sun className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-emerald-100">
      <UniversalNavbar showBackButton={false} />

      {/* Executive Summary Bar */}
      <div className="bg-gradient-to-r from-[#253e31] via-[#2d4937] to-[#3a5d47] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Welcome back, {user?.email?.split("@")[0]}
                </h1>
                <p className="text-sm text-green-100">{currentDate}</p>
              </div>
              <div className="flex items-center space-x-3 bg-white/10 rounded-lg px-3 py-2">
                {getWeatherIcon(weather.condition)}
                <div>
                  <span className="text-sm font-medium">{weather.temp}°F</span>
                  <p className="text-xs text-green-100 capitalize">
                    {weather.condition} in {weather.location}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">$127.3K</p>
                <p className="text-xs text-green-200 uppercase tracking-wide">
                  Pipeline
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">18</p>
                <p className="text-xs text-green-200 uppercase tracking-wide">
                  Active Leads
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">$89.2K</p>
                <p className="text-xs text-green-200 uppercase tracking-wide">
                  MTD Revenue
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Primary Content - Sales Inbox */}
          <div className="flex-1">
            {/* Quick Tools - Round Cards */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Quick Tools
                </h2>
              </div>
              <div className="grid grid-cols-4 gap-8">
                <Link href="/calculator">
                  <div className="flex flex-col items-center justify-center w-40 h-40 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer">
                    <div className="p-3 bg-slate-100 rounded-full mb-2">
                      <Calculator className="h-6 w-6 text-slate-600" />
                    </div>
                    <h3 className="text-xs font-semibold text-center text-gray-900">
                      Quote Calculator
                    </h3>
                    <p className="text-xs text-gray-500 text-center mt-1">
                      Generate pricing
                    </p>
                  </div>
                </Link>

                <div className="flex flex-col items-center justify-center w-40 h-40 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer">
                  <div className="p-3 bg-slate-100 rounded-full mb-2">
                    <DollarSign className="h-6 w-6 text-slate-600" />
                  </div>
                  <h3 className="text-xs font-semibold text-center text-gray-900">
                    Commission Tracker
                  </h3>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    Track earnings
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center w-40 h-40 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer">
                  <div className="p-3 bg-slate-100 rounded-full mb-2">
                    <UserCheck className="h-6 w-6 text-slate-600" />
                  </div>
                  <h3 className="text-xs font-semibold text-center text-gray-900">
                    Client Intel
                  </h3>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    AI snapshots
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center w-40 h-40 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer">
                  <div className="p-3 bg-slate-100 rounded-full mb-2">
                    <Video className="h-6 w-6 text-slate-600" />
                  </div>
                  <h3 className="text-xs font-semibold text-center text-gray-900">
                    Meeting Vault
                  </h3>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    View recordings
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Sales Inbox
              </h2>
              <p className="text-gray-600">
                Your central command center for lead management and sales
                operations
              </p>
            </div>

            {/* Dynamic Sales Inbox */}
            <SalesInbox limit={20} />
          </div>

          {/* Compact Sidebar - Secondary Tools */}
          <div className="w-80 space-y-4">
            {/* Knowledge Base */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="h-4 w-4 text-slate-600" />
                  Knowledge Base
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Ask anything..."
                      className="pl-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          S-Corp Election Process
                        </p>
                        <p className="text-xs text-gray-500">
                          Updated 2 days ago
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-xs bg-slate-100 text-slate-600"
                      >
                        New
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Tax Planning 2024
                        </p>
                        <p className="text-xs text-gray-500">Complete guide</p>
                      </div>
                      <span className="text-xs text-gray-400">Guide</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Client Onboarding SOP
                        </p>
                        <p className="text-xs text-gray-500">
                          Step-by-step process
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">SOP</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seed Academy */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-4 w-4 text-slate-600" />
                  Seed Academy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        XP: 2,450
                      </p>
                      <p className="text-xs text-slate-600">
                        Level 7 • Advanced
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-slate-100 text-slate-700"
                    >
                      Level 7
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2 bg-slate-50 border-l-4 border-slate-400 rounded">
                      <p className="text-sm font-medium text-slate-900">
                        Tax Planning 201
                      </p>
                      <p className="text-xs text-slate-600">
                        In Progress • 75% Complete
                      </p>
                    </div>

                    <div className="p-2 bg-gray-50 border-l-4 border-gray-400 rounded">
                      <p className="text-sm font-medium text-gray-900">
                        Advanced QuickBooks
                      </p>
                      <p className="text-xs text-gray-600">Next: Due Jan 30</p>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="w-full">
                    View All Courses
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4 text-slate-600" />
                  Recent Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-3 h-3 bg-slate-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        New lead: TechFlow Solutions
                      </p>
                      <p className="text-xs text-slate-600">
                        Software Startup • $45K potential
                      </p>
                      <p className="text-xs text-gray-500">5 min ago</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-3 h-3 bg-gray-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Commission: +$450
                      </p>
                      <p className="text-xs text-gray-600">
                        Wellness Hub Inc closed
                      </p>
                      <p className="text-xs text-gray-500">2h ago</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-3 h-3 bg-slate-400 rounded-full mt-1 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        Document uploaded
                      </p>
                      <p className="text-xs text-slate-600">
                        Tax Planning Guide 2024
                      </p>
                      <p className="text-xs text-gray-500">4h ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

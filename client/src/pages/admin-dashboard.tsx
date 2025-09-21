import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PERMISSIONS } from "@shared/permissions";
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { useNavigationHistory } from "@/hooks/use-navigation-history";
import { 
  BarChart3,
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
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  FileText,
  Briefcase,
  Settings,
  RefreshCw,
  Search,
  Bell,
  Monitor,
  Server,
  HardDrive,
  Home,
  Building2,
  Calculator,
  Banknote,
  BookOpen,
  Phone,
  FolderOpen,
  CloudCog,
  Headphones,
  User,
  LogOut,
  ArrowLeft,
  Mail,
  MessageSquare,
  BarChart,
  Receipt,
  Coins,
  CreditCard as CreditCardIcon,
  Laptop,
  Smartphone,
  Wifi,
  Archive,
  ExternalLink,
  Layers
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import logoLight from "@assets/Seed Financial Logo - Light Mode.png";
import logoDark from "@assets/Seed Financial Logo - Dark Mode.png";
import { useTheme } from "@/theme";

interface SystemHealth {
  crm: 'healthy' | 'unhealthy' | 'error';
  storage: 'healthy' | 'unhealthy' | 'error';
  ai: 'healthy' | 'unhealthy' | 'error';
  weather: 'healthy' | 'unhealthy' | 'error';
  geocoding: 'healthy' | 'unhealthy' | 'error';
}

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  services: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      message?: string;
    };
  };
}

interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalLeads: number;
  conversionRate: number;
  averageDealSize: number;
  pendingApprovals: number;
}

interface KbAdminStats {
  totalArticles: number;
  totalCategories: number;
  monthlyViews: number;
  topSearches: string[];
}

interface CommissionApproval {
  id: string;
  userName: string;
  dealName: string;
  amount: number;
  requestDate: string;
  type: 'override' | 'adjustment' | 'bonus';
  status: 'pending' | 'approved' | 'rejected';
}

interface ClickUpTask {
  id: string;
  name: string;
  status: string;
  assignee: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueDate: string;
  project: string;
}

interface ClientHealthScore {
  clientName: string;
  email: string;
  healthScore: number;
  lastContact: string;
  riskLevel: 'low' | 'medium' | 'high';
  issues: string[];
  revenue: number;
}

// Navigation items for SEEDOS - Updated with CDN Monitoring
const navigationItems = [
  {
    category: 'Core',
    items: [
      { name: 'Dashboard', icon: Home, path: '/admin', active: true },
      { name: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
      { name: 'Revenue', icon: TrendingUp, path: '/admin/revenue' }
    ]
  },
  {
    category: 'Business Operations',
    items: [
      { name: 'Sales Pipeline', icon: Target, path: '/admin/sales' },
      { name: 'Client Management', icon: Users, path: '/admin/clients' },
      { name: 'Commission Tracking', icon: DollarSign, path: '/admin/commission-tracker' },
      { name: 'Quote Calculator', icon: Calculator, path: '/calculator' }
    ]
  },
  {
    category: 'Financial Integration',
    items: [
      { name: 'Stripe Dashboard', icon: CreditCardIcon, path: '/admin/stripe' },
      { name: 'Mercury Banking', icon: Banknote, path: '/admin/mercury' },
      { name: 'QuickBooks Sync', icon: Receipt, path: '/admin/quickbooks' },
      { name: 'Tax Planning', icon: FileText, path: '/admin/tax' }
    ]
  },
  {
    category: 'Productivity & Content',
    items: [
      { name: 'SeedKB Management', icon: BookOpen, path: '/kb-admin' },
      { name: 'Box File Storage', icon: Archive, path: '/admin/box' },
      { name: 'Google Drive', icon: FolderOpen, path: '/admin/drive' },
      { name: 'Email Analytics', icon: Mail, path: '/admin/email' }
    ]
  },
  {
    category: 'Communication & Tools',
    items: [
      { name: 'Zoom Meetings', icon: Video, path: '/admin/zoom' },
      { name: 'Slack Integration', icon: MessageSquare, path: '/admin/slack' },
      { name: 'ClickUp Projects', icon: Briefcase, path: '/admin/clickup' }
    ]
  },
  {
    category: 'System & Security',
    items: [
      { name: 'System Health', icon: Monitor, path: '/admin/system' },
      { name: 'User Management', icon: UserCheck, path: '/user-management' },
      { name: 'Pricing Management', icon: Calculator, path: '/admin/pricing' },
      { name: 'Calculator Manager', icon: FileText, path: '/admin/calculator-manager' },
      { name: 'CDN Monitoring', icon: Server, path: '/cdn-monitoring' },
      { name: 'API Integrations', icon: CloudCog, path: '/admin/apis' },
      { name: 'HubSpot Diagnostics', icon: Shield, path: '/admin/hubspot' },
      { name: 'Security Center', icon: Shield, path: '/admin/security' }
    ]
  }
];

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const { hasPermission, getAvailableDashboards } = usePermissions();
  const [, setLocation] = useLocation();
  const { navigateTo } = useNavigationHistory();
  const [selectedSection, setSelectedSection] = useState('dashboard');
  const availableDashboards = getAvailableDashboards();
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? logoDark : logoLight;

  // Check if user has admin permission
  const isAdmin = hasPermission(PERMISSIONS.VIEW_ADMIN_DASHBOARD);

  // Real-time system health monitoring
  const { data: healthData, isLoading: healthLoading } = useQuery<HealthCheckResponse>({
    queryKey: ['/api/health'],
    refetchInterval: 60000, // Refresh every 60 seconds
    refetchIntervalInBackground: true,
  });

  const systemHealth: SystemHealth = {
    crm: healthData?.services.crm?.status || 'error',
    storage: healthData?.services.storage?.status || 'error',
    ai: healthData?.services.ai?.status || 'error',
    weather: healthData?.services.weather?.status || 'error',
    geocoding: healthData?.services.geocoding?.status || 'error',
  };

  const [adminMetrics] = useState<AdminMetrics>({
    totalUsers: 12,
    activeUsers: 8,
    totalRevenue: 425000,
    monthlyRevenue: 89200,
    totalLeads: 156,
    conversionRate: 23.5,
    averageDealSize: 4200,
    pendingApprovals: 3
  });

  const [kbStats] = useState<KbAdminStats>({
    totalArticles: 89,
    totalCategories: 9,
    monthlyViews: 342,
    topSearches: ['tax planning', 's-corp election', 'quickbooks setup', 'client onboarding']
  });

  const [commissionApprovals] = useState<CommissionApproval[]>([
    {
      id: '1',
      userName: 'Amanda Rodriguez',
      dealName: 'TechFlow Solutions - Bookkeeping',
      amount: 450,
      requestDate: '2025-01-29',
      type: 'override',
      status: 'pending'
    },
    {
      id: '2', 
      userName: 'Jon Walls',
      dealName: 'Wellness Hub Inc - TaaS',
      amount: 275,
      requestDate: '2025-01-28',
      type: 'adjustment',
      status: 'pending'
    },
    {
      id: '3',
      userName: 'Amanda Rodriguez',
      dealName: 'Monthly Bonus - January',
      amount: 1200,
      requestDate: '2025-01-27',
      type: 'bonus',
      status: 'approved'
    }
  ]);

  const [clickupTasks] = useState<ClickUpTask[]>([
    {
      id: '1',
      name: 'Client Onboarding - TechFlow Solutions',
      status: 'in-progress',
      assignee: 'Amanda Rodriguez',
      priority: 'high',
      dueDate: '2025-01-31',
      project: 'Client Onboarding'
    },
    {
      id: '2',
      name: 'Tax Filing - Q4 2024 - Wellness Hub',
      status: 'review',
      assignee: 'Jon Walls',
      priority: 'urgent',
      dueDate: '2025-02-15',
      project: 'Tax Services'
    },
    {
      id: '3',
      name: 'QuickBooks Setup - Marina Cafe',
      status: 'open',
      assignee: 'Amanda Rodriguez',
      priority: 'normal',
      dueDate: '2025-02-05',
      project: 'Bookkeeping Services'
    }
  ]);

  const [clientHealth] = useState<ClientHealthScore[]>([
    {
      clientName: 'TechFlow Solutions',
      email: 'ceo@techflow.com',
      healthScore: 95,
      lastContact: '2025-01-28',
      riskLevel: 'low',
      issues: [],
      revenue: 12000
    },
    {
      clientName: 'Wellness Hub Inc',
      email: 'admin@wellnesshub.com',
      healthScore: 78,
      lastContact: '2025-01-20',
      riskLevel: 'medium',
      issues: ['Late payment', 'Missed last call'],
      revenue: 8400
    },
    {
      clientName: 'Marina Cafe',
      email: 'owner@marinacafe.com',
      healthScore: 45,
      lastContact: '2024-12-15',
      riskLevel: 'high',
      issues: ['No contact in 45 days', 'Overdue invoices', 'Unresponsive'],
      revenue: 3600
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getServiceDisplayName = (service: string) => {
    switch (service) {
      case 'crm':
        return 'HubSpot CRM';
      case 'storage':
        return 'Box Storage';
      case 'ai':
        return 'OpenAI';
      case 'weather':
        return 'Weather Service';
      case 'geocoding':
        return 'Geocoding';
      default:
        return service.charAt(0).toUpperCase() + service.slice(1);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  // Debug logging for admin check
  console.log('Admin Dashboard Debug:', {
    currentUser: user?.email,
    currentUserRole: user?.role,
    isAdmin
  });

  // Use PermissionGuard for proper admin access control
  return (
    <PermissionGuard 
      permissions={PERMISSIONS.VIEW_ADMIN_DASHBOARD}
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] flex items-center justify-center">
          <Card className="border shadow-xl max-w-md">
            <CardContent className="p-12 text-center">
              <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
              <p className="text-muted-foreground mb-4">You need admin privileges to access SEEDOS.</p>
              <Button onClick={() => navigateTo('/')} className="bg-orange-500 hover:bg-orange-600">
                Back to Portal
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-sidebar backdrop-blur-md border-r border-sidebar-border shadow-xl fixed h-full overflow-y-auto">
        {/* SEEDOS Header */}
        <div className="p-6 border-b border-sidebar-border h-[88px] flex items-center justify-center">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Seed Financial" className="h-12" />
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-sidebar-border bg-sidebar">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
                {user?.profilePhoto ? (
                  <img 
                    src={user.profilePhoto} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setLocation('/profile')}>
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation('/sales-dashboard')}>
                <BarChart className="mr-2 h-4 w-4" />
                Sales Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/service-dashboard')}>
                <Headphones className="mr-2 h-4 w-4" />
                Service Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation Menu */}
        <div className="p-4 space-y-6">
          {navigationItems.map((category) => (
            <div key={category.category}>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">
                {category.category}
              </h3>
              <div className="space-y-1">
                {category.items.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      // Navigate to specific routes instead of setting sections
                      if (item.path === '/admin') {
                        setSelectedSection('dashboard');
                      } else {
                        navigateTo(item.path);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      (item.active || selectedSection === item.name.toLowerCase()) 
                        ? 'bg-orange-500/20 text-orange-300 border-r-2 border-orange-500' 
                        : 'text-foreground/80 hover:bg-accent'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                    {!item.path.startsWith('/admin') && (
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-64">
        {/* Top Header */}
        <div className="bg-popover backdrop-blur-sm border-b border-border px-6 py-6 h-[88px]">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                SEED<span className="text-orange-500">OS</span>
              </h1>
              <p className="text-muted-foreground text-lg">Executive Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync All
              </Button>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
              <div className="relative">
                <Bell className="h-5 w-5 text-white/70" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6">

          {/* Executive Summary Cards */}
          <div className="grid grid-cols-4 gap-6">
            <Card className="col-span-1 border shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-foreground">$425K</p>
                    <p className="text-muted-foreground text-sm">+12% from last month</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1 border shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Active Clients</p>
                    <p className="text-3xl font-bold text-foreground">89</p>
                    <p className="text-muted-foreground text-sm">+5 new this month</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1 border shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Pipeline Value</p>
                    <p className="text-3xl font-bold text-foreground">$127K</p>
                    <p className="text-muted-foreground text-sm">18 active deals</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Target className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1 border shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">System Health</p>
                    <p className="text-3xl font-bold text-foreground">98%</p>
                    <p className="text-muted-foreground text-sm">All systems operational</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Shield className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Content */}
          <div className="grid grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <Card className="col-span-2 border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-foreground">
                  <span>Revenue Analytics</span>
                  <Badge variant="secondary" className="bg-orange-500 text-white">Current Week</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4" />
                    <p className="font-medium">Revenue Chart Integration</p>
                    <p className="text-sm">Connect to Stripe/Mercury for live data</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-foreground">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    System Status
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Updates every 60s</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="h-6 w-6 p-0"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {healthLoading ? (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                      <span className="font-medium text-muted-foreground">Loading system status...</span>
                    </div>
                  ) : (
                    Object.entries(systemHealth).map(([service, status]) => (
                      <div key={service} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(status)}
                          <span className="font-medium text-foreground">{getServiceDisplayName(service)}</span>
                        </div>
                        <Badge 
                          variant={status === 'healthy' ? 'default' : 'destructive'} 
                          className={status === 'healthy' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
                        >
                          {status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Integration Status Grid */}
          <div className="grid grid-cols-4 gap-6">
            <Card className="border shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => { console.log('Stripe card clicked'); setLocation('/stripe-dashboard'); }}>
              <CardContent className="p-6 text-center">
                <CreditCardIcon className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2 text-foreground">Stripe</h3>
                <p className="text-sm text-muted-foreground mb-3">Payment processing</p>
                <Badge className="bg-green-500 text-white">Connected</Badge>
              </CardContent>
            </Card>

            <Card className="border shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <Banknote className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2 text-foreground">Mercury</h3>
                <p className="text-sm text-muted-foreground mb-3">Business banking</p>
                <Badge variant="secondary">Setup Required</Badge>
              </CardContent>
            </Card>

            <Card className="border shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <Receipt className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2 text-foreground">QuickBooks</h3>
                <p className="text-sm text-muted-foreground mb-3">Accounting sync</p>
                <Badge variant="secondary">Setup Required</Badge>
              </CardContent>
            </Card>

            <Card className="border shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <Video className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2 text-foreground">Zoom</h3>
                <p className="text-sm text-muted-foreground mb-3">Meeting analytics</p>
                <Badge variant="secondary">Setup Required</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Alerts */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-foreground">New client onboarded</p>
                      <p className="text-sm text-muted-foreground">TechFlow Solutions - $12,000 ARR</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-foreground">Commission approved</p>
                      <p className="text-sm text-muted-foreground">Amanda Rodriguez - $450</p>
                      <p className="text-xs text-muted-foreground">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-foreground">System backup completed</p>
                      <p className="text-sm text-muted-foreground">All data synchronized</p>
                      <p className="text-xs text-muted-foreground">6 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Bell className="h-5 w-5" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-muted border rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">ClickUp Integration Warning</p>
                      <p className="text-sm text-muted-foreground">API rate limit approaching</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted border rounded-lg">
                    <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Scheduled Maintenance</p>
                      <p className="text-sm text-muted-foreground">Database backup in 2 hours</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Security Scan Complete</p>
                      <p className="text-sm text-muted-foreground">No vulnerabilities detected</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
    </PermissionGuard>
  );
}
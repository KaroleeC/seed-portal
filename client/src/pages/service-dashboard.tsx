import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PERMISSIONS } from "@shared/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, Clock, CheckCircle, AlertTriangle, Users, FileText, Headphones, Settings,
  TrendingUp, DollarSign, MessageSquare, Bot, Search, Filter, Plus, Bell,
  ExternalLink, RefreshCw, FileDown, Upload, Folder, ChevronRight,
  Activity, Target, Zap, Brain, Calculator, BarChart3, PieChart,
  Mail, Phone, Calendar, Video, Slack, Box, HubSpot,
  ArrowUp, ArrowDown, Star, Clock3, AlertCircle, Info,
  MonitorSpeaker, Database, Cloud, Wifi, Shield, Building2,
  Edit, Share, Download, Sparkles, Building, Wand2, Eye,
  Lightbulb, GraduationCap
} from "lucide-react";
import navLogoPath from "@assets/Nav Logo_1753431362883.png";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { useNavigationHistory } from "@/hooks/use-navigation-history";
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

// Interfaces for service dashboard data
interface HubSpotDeal {
  id: string;
  name: string;
  stage: string;
  amount: number;
  closeDate: string;
  probability: number;
  priority: 'high' | 'medium' | 'low';
  entityComplexity: 'simple' | 'complex' | 'very-complex';
}

interface SlackChannel {
  id: string;
  name: string;
  clientName: string;
  unreadCount: number;
  lastActivity: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
}

interface DocumentRequest {
  id: string;
  clientName: string;
  type: string;
  status: 'pending' | 'received' | 'processing' | 'completed';
  dueDate: string;
  priority: 'urgent' | 'high' | 'normal';
}

interface AITask {
  id: string;
  type: 'coa_analysis' | 'period_report' | 'entity_optimization' | 'deduction_scan';
  clientName: string;
  progress: number;
  status: 'running' | 'completed' | 'failed' | 'queued';
  estimatedCompletion: string;
}

interface ServiceMetrics {
  openTickets: number;
  activeClients: number;
  avgResponseTime: string;
  satisfactionRate: number;
  todaysTasks: number;
  urgentItems: number;
}

export default function ServiceDashboard() {
  const { hasPermission, getAvailableDashboards } = usePermissions();
  const { user: currentUser, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const { navigateTo } = useNavigationHistory();
  const availableDashboards = getAvailableDashboards();
  const [activeModule, setActiveModule] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - in production this would come from APIs
  const [serviceMetrics] = useState<ServiceMetrics>({
    openTickets: 12,
    activeClients: 89,
    avgResponseTime: '2.4h',
    satisfactionRate: 94,
    todaysTasks: 18,
    urgentItems: 4
  });

  // Current self-created tasks for controllers/accountants
  const [currentTasks] = useState([
    { id: '1', title: 'Review TechFlow Q4 Financials', client: 'TechFlow Solutions', priority: 'urgent', dueTime: '2:00 PM', progress: 75, type: 'review' },
    { id: '2', title: 'Prepare Wellness Hub Tax Documents', client: 'Wellness Hub Inc', priority: 'high', dueTime: '4:30 PM', progress: 30, type: 'tax-prep' },
    { id: '3', title: 'Client Onboarding Call - Marina Cafe', client: 'Marina Cafe', priority: 'normal', dueTime: '11:00 AM', progress: 0, type: 'meeting' },
    { id: '4', title: 'Monthly Bookkeeping - RetailCorp', client: 'RetailCorp', priority: 'normal', dueTime: 'Tomorrow', progress: 90, type: 'bookkeeping' },
    { id: '5', title: 'Entity Structure Analysis', client: 'StartupXYZ', priority: 'high', dueTime: 'Jan 15', progress: 45, type: 'analysis' }
  ]);

  // ClickUp tasks monitoring
  const [clickupTasks] = useState([
    { id: '1', name: 'Monthly Bookkeeping - TechFlow', assignee: 'Sarah Chen', status: 'In Progress', dueDate: '2025-01-10', project: 'Bookkeeping', priority: 'High' },
    { id: '2', name: 'Tax Preparation - Wellness Hub', assignee: 'Michael Torres', status: 'Review', dueDate: '2025-01-12', project: 'Tax Services', priority: 'Urgent' },
    { id: '3', name: 'Cleanup Project - Marina Cafe', assignee: 'Sarah Chen', status: 'Planning', dueDate: '2025-01-15', project: 'Cleanup', priority: 'Normal' },
    { id: '4', name: 'QBO Setup - RetailCorp', assignee: 'Michael Torres', status: 'Completed', dueDate: '2025-01-08', project: 'Setup', priority: 'Normal' }
  ]);

  const [slackChannels] = useState<SlackChannel[]>([
    { id: '1', name: '#techflow-solutions', clientName: 'TechFlow Solutions', unreadCount: 5, lastActivity: '15 min ago', priority: 'urgent' },
    { id: '2', name: '#wellness-hub-support', clientName: 'Wellness Hub Inc', unreadCount: 2, lastActivity: '1 hour ago', priority: 'high' },
    { id: '3', name: '#marina-cafe-general', clientName: 'Marina Cafe', unreadCount: 0, lastActivity: '3 hours ago', priority: 'normal' }
  ]);

  const [documentRequests] = useState<DocumentRequest[]>([
    { id: '1', clientName: 'TechFlow Solutions', type: 'Bank Statements (Q4)', status: 'pending', dueDate: '2025-01-10', priority: 'urgent' },
    { id: '2', clientName: 'Wellness Hub Inc', type: 'Entity Formation Docs', status: 'received', dueDate: '2025-01-12', priority: 'high' },
    { id: '3', clientName: 'Marina Cafe', type: 'Receipt Organization', status: 'processing', dueDate: '2025-01-15', priority: 'normal' }
  ]);

  const [aiTasks] = useState<AITask[]>([
    { id: '1', type: 'coa_analysis', clientName: 'TechFlow Solutions', progress: 75, status: 'running', estimatedCompletion: '10 min' },
    { id: '2', type: 'period_report', clientName: 'Wellness Hub Inc', progress: 100, status: 'completed', estimatedCompletion: 'Complete' },
    { id: '3', type: 'deduction_scan', clientName: 'Marina Cafe', progress: 30, status: 'running', estimatedCompletion: '25 min' }
  ]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'normal': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'low': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'running': return 'text-blue-400';
      case 'pending': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!hasPermission(PERMISSIONS.VIEW_SERVICE_DASHBOARD)) {
    return (
      <PermissionGuard permissions={PERMISSIONS.VIEW_SERVICE_DASHBOARD}>
        <div />
      </PermissionGuard>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] flex">
      {/* Sidebar Navigation */}
      <div className="w-72 bg-white/10 backdrop-blur-md border-r border-white/20 shadow-xl fixed h-full overflow-y-auto">
        {/* SEEDOS Header */}
        <div className="p-6 border-b border-white/20 h-[88px] flex items-center justify-center">
          <div className="flex items-center gap-3">
            <img src={navLogoPath} alt="Seed Financial" className="h-12" />
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-white/20 bg-white">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentUser?.profilePhoto || ''} />
                  <AvatarFallback className="bg-orange-500 text-white">
                    {currentUser?.firstName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-600 truncate">Service Team</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {availableDashboards.length > 1 && (
                <>
                  {availableDashboards.map(dashboard => (
                    <DropdownMenuItem key={dashboard.route} onClick={() => navigateTo(dashboard.route)}>
                      {dashboard.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem className="border-t mt-2 pt-2" onClick={() => logoutMutation.mutate()}>
                    Sign out
                  </DropdownMenuItem>
                </>
              )}
              {availableDashboards.length === 1 && (
                <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                  Sign out
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Enhanced Navigation Menu */}
        <div className="p-4 space-y-6">
          <div>
            <p className="text-white/60 text-xs font-semibold mb-3 uppercase tracking-wider">Service Command Center</p>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={`w-full justify-start text-white hover:bg-white/10 ${activeModule === 'overview' ? 'bg-orange-500/20 text-orange-300 border-r-2 border-orange-500' : ''}`}
                onClick={() => setActiveModule('overview')}
              >
                <Activity className="mr-3 h-4 w-4" />
                Dashboard Overview
              </Button>
              <Button
                variant="ghost"
                className={`w-full justify-start text-white hover:bg-white/10 ${activeModule === 'sales-intelligence' ? 'bg-orange-500/20 text-orange-300 border-r-2 border-orange-500' : ''}`}
                onClick={() => setActiveModule('sales-intelligence')}
              >
                <TrendingUp className="mr-3 h-4 w-4" />
                Sales Intelligence
              </Button>
              <Button
                variant="ghost"
                className={`w-full justify-start text-white hover:bg-white/10 ${activeModule === 'communications' ? 'bg-orange-500/20 text-orange-300 border-r-2 border-orange-500' : ''}`}
                onClick={() => setActiveModule('communications')}
              >
                <MessageSquare className="mr-3 h-4 w-4" />
                Client Communications
              </Button>
              <Button
                variant="ghost"
                className={`w-full justify-start text-white hover:bg-white/10 ${activeModule === 'documents' ? 'bg-orange-500/20 text-orange-300 border-r-2 border-orange-500' : ''}`}
                onClick={() => setActiveModule('documents')}
              >
                <Folder className="mr-3 h-4 w-4" />
                Document Center
              </Button>
              <Button
                variant="ghost"
                className={`w-full justify-start text-white hover:bg-white/10 ${activeModule === 'ai-tools' ? 'bg-orange-500/20 text-orange-300 border-r-2 border-orange-500' : ''}`}
                onClick={() => setActiveModule('ai-tools')}
              >
                <Bot className="mr-3 h-4 w-4" />
                AI Service Tools
              </Button>
            </div>
          </div>

          <div>
            <p className="text-white/60 text-xs font-semibold mb-3 uppercase tracking-wider">Quick Access</p>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
                onClick={() => navigateTo('/calculator')}
              >
                <Calculator className="mr-3 h-4 w-4" />
                Quote Calculator
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
                onClick={() => navigateTo('/client-intel')}
              >
                <Users className="mr-3 h-4 w-4" />
                Client Intelligence
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
                onClick={() => navigateTo('/knowledge-base')}
              >
                <FileText className="mr-3 h-4 w-4" />
                Knowledge Base
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-72">
        {/* Top Header */}
        <div className="bg-white/10 backdrop-blur-md border-b border-white/20 px-6 py-6 h-[88px]">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                SEED<span className="text-orange-500">OS</span>
              </h1>
              <p className="text-white/70 text-lg">Service Command Center</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-2">
                <Search className="h-4 w-4 text-white/70" />
                <Input 
                  placeholder="Search clients, deals..." 
                  className="bg-transparent border-0 text-white placeholder:text-white/50 focus:ring-0 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                <Bell className="mr-2 h-4 w-4" />
                <span className="bg-red-500 text-xs px-1.5 py-0.5 rounded-full ml-1">{serviceMetrics.urgentItems}</span>
              </Button>
              <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6">
          {activeModule === 'overview' && (
            <>
              {/* Task-Focused Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Today's Focus</h2>
                    <p className="text-white/70">Your personal task workspace for client service excellence</p>
                  </div>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg">
                    <Plus className="mr-2 h-4 w-4" />
                    New Task
                  </Button>
                </div>

                {/* Quick Stats Bar */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{currentTasks.length}</p>
                    <p className="text-white/70 text-sm">Active Tasks</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{currentTasks.filter(t => t.priority === 'urgent').length}</p>
                    <p className="text-white/70 text-sm">Urgent</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{Math.round(currentTasks.reduce((acc, t) => acc + t.progress, 0) / currentTasks.length)}%</p>
                    <p className="text-white/70 text-sm">Avg Progress</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{serviceMetrics.activeClients}</p>
                    <p className="text-white/70 text-sm">Active Clients</p>
                  </div>
                </div>
              </div>

              {/* Main Task Workspace - Central Focus */}
              <div className="grid grid-cols-12 gap-6 mb-8">
                {/* Current Tasks - Main Real Estate */}
                <div className="col-span-8">
                  <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl h-full">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-6 w-6" />
                        My Current Tasks
                      </CardTitle>
                      <CardDescription className="text-blue-100">
                        Your personal task management center
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {currentTasks.map((task) => (
                          <div key={task.id} className="group relative">
                            <div className={`p-4 rounded-xl border-l-4 transition-all duration-200 hover:shadow-lg ${
                              task.priority === 'urgent' ? 'border-l-red-500 bg-red-50/80 hover:bg-red-50' :
                              task.priority === 'high' ? 'border-l-orange-500 bg-orange-50/80 hover:bg-orange-50' :
                              'border-l-blue-500 bg-blue-50/80 hover:bg-blue-50'
                            }`}>
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                                  <p className="text-sm text-gray-600 mb-2">{task.client}</p>
                                  <div className="flex items-center gap-3">
                                    <Badge className={getPriorityColor(task.priority)} variant="outline">
                                      {task.priority}
                                    </Badge>
                                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                                      {task.type.replace('-', ' ')}
                                    </Badge>
                                    <span className="text-sm text-gray-500 flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {task.dueTime}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900 mb-1">{task.progress}%</div>
                                  <div className="w-16">
                                    <Progress value={task.progress} className="h-2" />
                                  </div>
                                </div>
                              </div>
                              
                              {/* Action Buttons - Appear on Hover */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                                <Button size="sm" variant="outline" className="text-xs">
                                  <Activity className="h-3 w-3 mr-1" />
                                  Update
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Message Client
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Complete
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Client Communication Hub */}
                <div className="col-span-4">
                  <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl h-full">
                    <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-6 w-6" />
                        Client Communications
                      </CardTitle>
                      <CardDescription className="text-green-100">
                        Active Slack channels & messages
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        {slackChannels.map((channel) => (
                          <div key={channel.id} className="group">
                            <div className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
                              channel.unreadCount > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    channel.priority === 'urgent' ? 'bg-red-500' :
                                    channel.priority === 'high' ? 'bg-orange-500' : 'bg-green-500'
                                  }`}></div>
                                  <span className="font-medium text-gray-900 text-sm">{channel.clientName}</span>
                                </div>
                                {channel.unreadCount > 0 && (
                                  <Badge className="bg-red-500 text-white text-xs">
                                    {channel.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mb-2">{channel.name}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">{channel.lastActivity}</span>
                                <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* ClickUp Integration & AI Tools */}
              <div className="grid grid-cols-2 gap-6">
                {/* ClickUp Task Monitor */}
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      ClickUp Task Monitor
                    </CardTitle>
                    <CardDescription className="text-purple-100">
                      Live project management integration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {clickupTasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm">{task.name}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-600">{task.assignee}</span>
                              <Badge variant="outline" className={
                                task.status === 'Completed' ? 'border-green-500 text-green-700' :
                                task.status === 'In Progress' ? 'border-blue-500 text-blue-700' :
                                task.status === 'Review' ? 'border-orange-500 text-orange-700' :
                                'border-gray-500 text-gray-700'
                              }>
                                {task.status}
                              </Badge>
                              <span className="text-xs text-gray-500">{task.dueDate}</span>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Assistant Panel */}
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      AI Assistant
                    </CardTitle>
                    <CardDescription className="text-indigo-100">
                      Intelligent automation status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {aiTasks.map((task) => (
                        <div key={task.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {task.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            <span className={`text-xs ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={task.progress} className="flex-1" />
                            <span className="text-xs text-gray-500">{task.progress}%</span>
                          </div>
                          <p className="text-xs text-gray-600">{task.clientName} • ETA: {task.estimatedCompletion}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeModule === 'sales-intelligence' && (
            <div className="space-y-8">
              {/* Intelligence Command Header */}
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-4">Sales Intelligence Command</h2>
                <p className="text-white/70 text-lg mb-6">Prepare for incoming complexity before it arrives</p>
                <div className="flex items-center justify-center gap-4">
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Live Pipeline
                  </Button>
                  <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open HubSpot
                  </Button>
                </div>
              </div>

              {/* Preparation Urgency Matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Critical Preparation */}
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-6 w-6" />
                      Critical Prep Needed
                    </CardTitle>
                    <CardDescription className="text-red-100">
                      Immediate action required
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="group border-l-4 border-l-red-500 bg-red-50/80 p-4 rounded-r-lg hover:bg-red-50 transition-all duration-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-red-900">TechFlow Multi-Entity</h4>
                            <p className="text-sm text-red-700">Complex structure, multiple states</p>
                          </div>
                          <Badge className="bg-red-500 text-white">$75K</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-red-600">Closes: Jan 15</span>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            Prep Now
                          </Button>
                        </div>
                      </div>

                      <div className="group border-l-4 border-l-orange-500 bg-orange-50/80 p-4 rounded-r-lg hover:bg-orange-50 transition-all duration-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-orange-900">Volume Surge Alert</h4>
                            <p className="text-sm text-orange-700">5 clients closing this week</p>
                          </div>
                          <Badge className="bg-orange-500 text-white">Capacity</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-orange-600">This Week</span>
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            Plan Resources
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Standard Preparation */}
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Clock3 className="h-6 w-6" />
                      Standard Prep Queue
                    </CardTitle>
                    <CardDescription className="text-yellow-100">
                      Normal complexity pipeline
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="group border-l-4 border-l-blue-500 bg-blue-50/80 p-4 rounded-r-lg hover:bg-blue-50 transition-all duration-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-blue-900">Wellness Hub Package</h4>
                            <p className="text-sm text-blue-700">Full service integration</p>
                          </div>
                          <Badge className="bg-blue-500 text-white">$45K</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-600">Closes: Jan 20</span>
                          <Button size="sm" variant="outline" className="border-blue-500 text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            Queue Setup
                          </Button>
                        </div>
                      </div>

                      <div className="group border-l-4 border-l-green-500 bg-green-50/80 p-4 rounded-r-lg hover:bg-green-50 transition-all duration-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-green-900">Marina Cafe Standard</h4>
                            <p className="text-sm text-green-700">Basic bookkeeping setup</p>
                          </div>
                          <Badge className="bg-green-500 text-white">$18K</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-green-600">Closes: Jan 25</span>
                          <Button size="sm" variant="outline" className="border-green-500 text-green-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            Standard Prep
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Intelligence Insights */}
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-6 w-6" />
                      AI Insights
                    </CardTitle>
                    <CardDescription className="text-purple-100">
                      Predictive preparation guidance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-purple-600" />
                          <span className="font-semibold text-purple-900">Pattern Alert</span>
                        </div>
                        <p className="text-sm text-purple-800 mb-3">TechFlow deal type is 40% more likely to require additional compliance documentation</p>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                          Review Requirements
                        </Button>
                      </div>

                      <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-blue-900">Resource Prediction</span>
                        </div>
                        <p className="text-sm text-blue-800 mb-3">Based on current pipeline, expect 30% capacity increase in Q1</p>
                        <Button size="sm" variant="outline" className="border-blue-600 text-blue-700">
                          Capacity Planning
                        </Button>
                      </div>

                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-900">Success Pattern</span>
                        </div>
                        <p className="text-sm text-green-800 mb-3">Similar wellness industry setups have 95% success rate with current team</p>
                        <Button size="sm" variant="outline" className="border-green-600 text-green-700">
                          Use Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Preparation Timeline */}
              <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-6 w-6" />
                    Service Preparation Timeline
                  </CardTitle>
                  <CardDescription className="text-indigo-100">
                    Strategic preparation schedule for optimal readiness
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">3</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Critical (3 days)</h4>
                      <p className="text-sm text-gray-600">Immediate preparation required for complex entities</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">7</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Standard (1 week)</h4>
                      <p className="text-sm text-gray-600">Normal preparation timeline for standard setups</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">14</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Optimal (2 weeks)</h4>
                      <p className="text-sm text-gray-600">Ideal preparation window for perfect execution</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeModule === 'communications' && (
            <div className="space-y-8">
              {/* Communication Command Center */}
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-4">Client Communication Central</h2>
                <p className="text-white/70 text-lg mb-6">Real-time client relationship management</p>
                <div className="flex items-center justify-center gap-4">
                  <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Active Conversations
                  </Button>
                  <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                    <Slack className="mr-2 h-4 w-4" />
                    Open Slack
                  </Button>
                </div>
              </div>

              {/* Communication Status Board */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
                    <CardTitle className="text-center">
                      <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                      Urgent
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600 mb-2">2</div>
                      <p className="text-sm text-gray-600">Needs immediate response</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
                    <CardTitle className="text-center">
                      <Clock className="h-6 w-6 mx-auto mb-2" />
                      Priority
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-2">5</div>
                      <p className="text-sm text-gray-600">High priority responses</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
                    <CardTitle className="text-center">
                      <CheckCircle className="h-6 w-6 mx-auto mb-2" />
                      Active
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">12</div>
                      <p className="text-sm text-gray-600">Ongoing conversations</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                    <CardTitle className="text-center">
                      <Users className="h-6 w-6 mx-auto mb-2" />
                      Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">19</div>
                      <p className="text-sm text-gray-600">Connected clients</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Live Communication Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Conversations */}
                <Card className="lg:col-span-2 bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-6 w-6" />
                      Live Conversation Feed
                    </CardTitle>
                    <CardDescription className="text-green-100">
                      Real-time client communications requiring attention
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {slackChannels.map((channel) => (
                        <div key={channel.id} className="group">
                          <div className={`p-4 rounded-xl border-l-4 transition-all duration-200 hover:shadow-lg cursor-pointer ${
                            channel.priority === 'urgent' ? 'border-l-red-500 bg-red-50/80 hover:bg-red-50' :
                            channel.priority === 'high' ? 'border-l-orange-500 bg-orange-50/80 hover:bg-orange-50' :
                            'border-l-green-500 bg-green-50/80 hover:bg-green-50'
                          }`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  channel.priority === 'urgent' ? 'bg-red-500 animate-pulse' :
                                  channel.priority === 'high' ? 'bg-orange-500' : 'bg-green-500'
                                }`}></div>
                                <div>
                                  <h4 className="font-bold text-gray-900">{channel.clientName}</h4>
                                  <p className="text-sm text-gray-600">{channel.name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {channel.unreadCount > 0 && (
                                  <Badge className="bg-red-500 text-white animate-pulse">
                                    {channel.unreadCount} new
                                  </Badge>
                                )}
                                <Badge className={getPriorityColor(channel.priority)} variant="outline">
                                  {channel.priority}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Last activity: {channel.lastActivity}</span>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Open Chat
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Video className="h-3 w-3 mr-1" />
                                  Call
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Action Panel */}
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-6 w-6" />
                      Quick Actions
                    </CardTitle>
                    <CardDescription className="text-blue-100">
                      Instant communication tools
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <Button className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg">
                      <MessageSquare className="mr-2 h-5 w-5" />
                      New Client Message
                    </Button>
                    
                    <Button className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg">
                      <Video className="mr-2 h-5 w-5" />
                      Start Video Call
                    </Button>
                    
                    <Button className="w-full h-12 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg">
                      <Calendar className="mr-2 h-5 w-5" />
                      Schedule Meeting
                    </Button>
                    
                    <Button className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg">
                      <Mail className="mr-2 h-5 w-5" />
                      Send Email Update
                    </Button>

                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">Smart Templates</h4>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start text-sm">
                          <FileText className="mr-2 h-3 w-3" />
                          Weekly Status Update
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-sm">
                          <AlertTriangle className="mr-2 h-3 w-3" />
                          Issue Resolution
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-sm">
                          <CheckCircle className="mr-2 h-3 w-3" />
                          Task Completion
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Communication Analytics */}
              <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-6 w-6" />
                    Communication Performance
                  </CardTitle>
                  <CardDescription className="text-indigo-100">
                    Real-time response metrics and client satisfaction tracking
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">2.4h</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Avg Response Time</h4>
                      <p className="text-sm text-gray-600">15% faster than target</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">94%</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Satisfaction Rate</h4>
                      <p className="text-sm text-gray-600">+2% this month</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">156</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Messages Today</h4>
                      <p className="text-sm text-gray-600">12% above average</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">8</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Video Calls</h4>
                      <p className="text-sm text-gray-600">Scheduled this week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeModule === 'documents' && (
            <div className="space-y-8">
              {/* Document Command Center */}
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-4">Document Command Center</h2>
                <p className="text-white/70 text-lg mb-6">Intelligent document workflows for seamless client service</p>
                <div className="flex items-center justify-center gap-4">
                  <Button className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg">
                    <FileText className="mr-2 h-4 w-4" />
                    Smart Documents
                  </Button>
                  <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload File
                  </Button>
                </div>
              </div>

              {/* Document Status Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                    <CardTitle className="text-center text-sm">
                      <FileText className="h-5 w-5 mx-auto mb-1" />
                      Active
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">24</div>
                      <p className="text-xs text-gray-600">Documents in progress</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
                    <CardTitle className="text-center text-sm">
                      <Clock className="h-5 w-5 mx-auto mb-1" />
                      Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 mb-1">8</div>
                      <p className="text-xs text-gray-600">Awaiting review</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-t-lg">
                    <CardTitle className="text-center text-sm">
                      <Edit className="h-5 w-5 mx-auto mb-1" />
                      Draft
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600 mb-1">6</div>
                      <p className="text-xs text-gray-600">In draft mode</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
                    <CardTitle className="text-center text-sm">
                      <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                      Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 mb-1">156</div>
                      <p className="text-xs text-gray-600">Completed documents</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
                    <CardTitle className="text-center text-sm">
                      <Zap className="h-5 w-5 mx-auto mb-1" />
                      AI-Gen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 mb-1">12</div>
                      <p className="text-xs text-gray-600">AI-generated today</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Document Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent & Active Documents */}
                <Card className="lg:col-span-2 bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-6 w-6" />
                      Active Document Flow
                    </CardTitle>
                    <CardDescription className="text-indigo-100">
                      Current documents requiring attention
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {documentRequests.map((request) => (
                        <div key={request.id} className="group">
                          <div className={`p-4 rounded-xl border-l-4 transition-all duration-200 hover:shadow-lg cursor-pointer ${
                            request.priority === 'urgent' ? 'border-l-red-500 bg-red-50/80 hover:bg-red-50' :
                            request.priority === 'high' ? 'border-l-orange-500 bg-orange-50/80 hover:bg-orange-50' :
                            'border-l-blue-500 bg-blue-50/80 hover:bg-blue-50'
                          }`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900 mb-1">{request.clientName}</h4>
                                <p className="text-sm text-gray-600 mb-2">{request.type}</p>
                                <div className="flex items-center gap-3">
                                  <Badge className={
                                    request.status === 'completed' ? 'bg-green-500/20 text-green-700' :
                                    request.status === 'in-progress' ? 'bg-blue-500/20 text-blue-700' :
                                    request.status === 'review' ? 'bg-orange-500/20 text-orange-700' :
                                    'bg-yellow-500/20 text-yellow-700'
                                  }>
                                    {request.status.replace('-', ' ')}
                                  </Badge>
                                  <Badge className={getPriorityColor(request.priority)} variant="outline">
                                    {request.priority}
                                  </Badge>
                                  <span className="text-sm text-gray-500">Due: {request.dueDate}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button size="sm" variant="outline">
                                <Share className="h-3 w-3 mr-1" />
                                Share
                              </Button>
                              <Button size="sm" variant="outline">
                                <Download className="h-3 w-3 mr-1" />
                                Export
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Smart Templates & Tools */}
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-6 w-6" />
                      Smart Templates
                    </CardTitle>
                    <CardDescription className="text-emerald-100">
                      AI-powered document generation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        <Button className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg justify-start">
                          <FileText className="mr-3 h-5 w-5" />
                          <div className="text-left">
                            <div className="font-semibold">Client Onboarding</div>
                            <div className="text-xs text-blue-100">Auto-generate welcome docs</div>
                          </div>
                        </Button>
                        
                        <Button className="w-full h-12 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg justify-start">
                          <Calculator className="mr-3 h-5 w-5" />
                          <div className="text-left">
                            <div className="font-semibold">Tax Prep Package</div>
                            <div className="text-xs text-purple-100">Complete tax documentation</div>
                          </div>
                        </Button>
                        
                        <Button className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg justify-start">
                          <Settings className="mr-3 h-5 w-5" />
                          <div className="text-left">
                            <div className="font-semibold">QBO Setup Guide</div>
                            <div className="text-xs text-green-100">Step-by-step configuration</div>
                          </div>
                        </Button>

                        <Button className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg justify-start">
                          <Building className="mr-3 h-5 w-5" />
                          <div className="text-left">
                            <div className="font-semibold">Entity Formation</div>
                            <div className="text-xs text-orange-100">Legal structure documents</div>
                          </div>
                        </Button>
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3">AI Document Tools</h4>
                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start">
                            <Brain className="mr-2 h-4 w-4 text-purple-600" />
                            Generate from Context
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            <Wand2 className="mr-2 h-4 w-4 text-blue-600" />
                            Smart Form Builder
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            <Zap className="mr-2 h-4 w-4 text-orange-600" />
                            Auto-Complete Draft
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Document Analytics & Insights */}
              <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-6 w-6" />
                    Document Performance Analytics
                  </CardTitle>
                  <CardDescription className="text-cyan-100">
                    Intelligent insights on document workflows and efficiency metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">85%</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Completion Rate</h4>
                      <p className="text-sm text-gray-600">Documents completed on time</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">3.2d</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Avg Cycle Time</h4>
                      <p className="text-sm text-gray-600">From draft to completion</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">92%</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">AI Accuracy</h4>
                      <p className="text-sm text-gray-600">Generated content quality</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">34h</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Time Saved</h4>
                      <p className="text-sm text-gray-600">This month via automation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeModule === 'ai-tools' && (
            <div className="space-y-8">
              {/* AI Command Center */}
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-4">AI Service Intelligence</h2>
                <p className="text-white/70 text-lg mb-6">Advanced automation transforming accounting workflows</p>
                <div className="flex items-center justify-center gap-4">
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg">
                    <Brain className="mr-2 h-4 w-4" />
                    Launch AI Assistant
                  </Button>
                  <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30 text-lg px-4 py-2">
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI Powered
                  </Badge>
                </div>
              </div>

              {/* AI Tool Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Financial Analysis */}
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl group hover:scale-105 transition-transform duration-200">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-t-lg">
                    <CardTitle className="text-center">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                      Financial Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <Button className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg">
                        <PieChart className="mr-2 h-5 w-5" />
                        COA Analysis
                      </Button>
                      <Button className="w-full h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg">
                        <TrendingUp className="mr-2 h-5 w-5" />
                        Trend Analysis
                      </Button>
                      <Button className="w-full h-12 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg">
                        <Calculator className="mr-2 h-5 w-5" />
                        Ratio Reports
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Tax Optimization */}
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl group hover:scale-105 transition-transform duration-200">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
                    <CardTitle className="text-center">
                      <DollarSign className="h-8 w-8 mx-auto mb-2" />
                      Tax Optimization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <Button className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg">
                        <Search className="mr-2 h-5 w-5" />
                        Deduction Scan
                      </Button>
                      <Button className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg">
                        <Target className="mr-2 h-5 w-5" />
                        Tax Planning
                      </Button>
                      <Button className="w-full h-12 bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white shadow-lg">
                        <Zap className="mr-2 h-5 w-5" />
                        Quick Optimize
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Entity Management */}
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl group hover:scale-105 transition-transform duration-200">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-t-lg">
                    <CardTitle className="text-center">
                      <Building2 className="h-8 w-8 mx-auto mb-2" />
                      Entity Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <Button className="w-full h-12 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg">
                        <Building className="mr-2 h-5 w-5" />
                        Structure Analysis
                      </Button>
                      <Button className="w-full h-12 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white shadow-lg">
                        <Settings className="mr-2 h-5 w-5" />
                        Optimization
                      </Button>
                      <Button className="w-full h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg">
                        <FileText className="mr-2 h-5 w-5" />
                        Compliance Check
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Smart Automation */}
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl group hover:scale-105 transition-transform duration-200">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-t-lg">
                    <CardTitle className="text-center">
                      <Wand2 className="h-8 w-8 mx-auto mb-2" />
                      Smart Automation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <Button className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg">
                        <Bot className="mr-2 h-5 w-5" />
                        Auto-Categorize
                      </Button>
                      <Button className="w-full h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg">
                        <Sparkles className="mr-2 h-5 w-5" />
                        Smart Reconcile
                      </Button>
                      <Button className="w-full h-12 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg">
                        <Zap className="mr-2 h-5 w-5" />
                        Workflow AI
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Processing Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active AI Tasks */}
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-6 w-6" />
                      AI Processing Queue
                    </CardTitle>
                    <CardDescription className="text-indigo-100">
                      Real-time intelligent task execution
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {aiTasks.map((task) => (
                        <div key={task.id} className="group">
                          <div className={`p-4 rounded-xl border-l-4 transition-all duration-200 hover:shadow-lg ${
                            task.status === 'completed' ? 'border-l-green-500 bg-green-50/80 hover:bg-green-50' :
                            task.status === 'processing' ? 'border-l-blue-500 bg-blue-50/80 hover:bg-blue-50' :
                            task.status === 'pending' ? 'border-l-yellow-500 bg-yellow-50/80 hover:bg-yellow-50' :
                            'border-l-red-500 bg-red-50/80 hover:bg-red-50'
                          }`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900 mb-1">
                                  {task.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </h4>
                                <p className="text-sm text-gray-600 mb-2">{task.clientName}</p>
                                <div className="flex items-center gap-3">
                                  <Badge className={
                                    task.status === 'completed' ? 'bg-green-500/20 text-green-700' :
                                    task.status === 'processing' ? 'bg-blue-500/20 text-blue-700' :
                                    task.status === 'pending' ? 'bg-yellow-500/20 text-yellow-700' :
                                    'bg-red-500/20 text-red-700'
                                  }>
                                    {task.status}
                                  </Badge>
                                  <span className="text-sm text-gray-500">ETA: {task.estimatedCompletion}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900 mb-1">{task.progress}%</div>
                                <div className="w-16">
                                  <Progress value={task.progress} className="h-2" />
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                                <Eye className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                              <Button size="sm" variant="outline">
                                <Download className="h-3 w-3 mr-1" />
                                Export Results
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Insights & Performance */}
                <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-6 w-6" />
                      AI Performance Insights
                    </CardTitle>
                    <CardDescription className="text-pink-100">
                      Intelligence metrics and optimization suggestions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Performance Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-white font-bold text-sm">94%</span>
                          </div>
                          <h4 className="font-semibold text-gray-900 text-sm">Accuracy Rate</h4>
                          <p className="text-xs text-gray-600">AI prediction accuracy</p>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-white font-bold text-sm">127h</span>
                          </div>
                          <h4 className="font-semibold text-gray-900 text-sm">Time Saved</h4>
                          <p className="text-xs text-gray-600">This month via AI</p>
                        </div>
                      </div>

                      {/* Smart Recommendations */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900">Smart Recommendations</h4>
                        
                        <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-blue-900 text-sm">Process Optimization</span>
                          </div>
                          <p className="text-xs text-blue-800 mb-2">Consider automating TechFlow's recurring journal entries - 85% confidence improvement</p>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                            Implement
                          </Button>
                        </div>

                        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-900 text-sm">Deduction Discovery</span>
                          </div>
                          <p className="text-xs text-green-800 mb-2">Wellness Hub: $2,400 in unclaimed home office deductions detected</p>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                            Review
                          </Button>
                        </div>

                        <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-purple-600" />
                            <span className="font-semibold text-purple-900 text-sm">Risk Alert</span>
                          </div>
                          <p className="text-xs text-purple-800 mb-2">Marina Cafe: Unusual expense patterns suggest review needed</p>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                            Investigate
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Learning & Training Center */}
              <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-gradient-500 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-6 w-6" />
                    AI Learning & Training Center
                  </CardTitle>
                  <CardDescription className="text-gradient-100">
                    Continuous learning and model improvement for enhanced performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">1.2k</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Training Data Points</h4>
                      <p className="text-sm text-gray-600">Added this month for improved accuracy</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">v2.4</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Model Version</h4>
                      <p className="text-sm text-gray-600">Latest AI model with enhanced capabilities</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">3</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">New Features</h4>
                      <p className="text-sm text-gray-600">Advanced capabilities released this week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
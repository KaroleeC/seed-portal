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
  MonitorSpeaker, Database, Cloud, Wifi, Shield, Building2
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">HubSpot Sales Intelligence</h2>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open HubSpot
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Deal Pipeline Monitor</CardTitle>
                    <CardDescription>Track high-value deals for service preparation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Sample high-value deals that need service preparation */}
                      {[
                        { id: '1', name: 'TechFlow Solutions - Multi-Entity Setup', stage: 'Contract Sent', amount: 75000, probability: 85, priority: 'high', entityComplexity: 'very-complex', closeDate: '2025-01-15' },
                        { id: '2', name: 'Wellness Hub Inc - Full Service Package', stage: 'Proposal Review', amount: 45000, probability: 70, priority: 'high', entityComplexity: 'complex', closeDate: '2025-01-20' }
                      ].map((deal) => (
                        <div key={deal.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{deal.name}</h4>
                              <p className="text-sm text-gray-600">{deal.stage}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">${deal.amount.toLocaleString()}</p>
                              <p className="text-sm text-gray-600">{deal.probability}% prob</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(deal.priority)}>
                              {deal.priority}
                            </Badge>
                            <Badge variant="outline" className={
                              deal.entityComplexity === 'very-complex' ? 'border-red-500 text-red-700' :
                              deal.entityComplexity === 'complex' ? 'border-orange-500 text-orange-700' : 
                              'border-green-500 text-green-700'
                            }>
                              {deal.entityComplexity.replace('-', ' ')}
                            </Badge>
                            <span className="text-sm text-gray-500 ml-auto">Due: {deal.closeDate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Service Preparation Alerts</CardTitle>
                    <CardDescription>Complex cases requiring early preparation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="font-semibold text-red-900">Very Complex Entity Setup</span>
                        </div>
                        <p className="text-sm text-red-800">TechFlow Solutions requires multi-state entity structure review</p>
                        <Button size="sm" className="mt-2 bg-red-600 hover:bg-red-700">Review Now</Button>
                      </div>
                      
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock3 className="h-4 w-4 text-orange-600" />
                          <span className="font-semibold text-orange-900">High Volume Month</span>
                        </div>
                        <p className="text-sm text-orange-800">5 new clients closing this week - prepare capacity</p>
                        <Button size="sm" variant="outline" className="mt-2 border-orange-600 text-orange-700">
                          Schedule Planning
                        </Button>
                      </div>

                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-blue-900">Integration Requirements</span>
                        </div>
                        <p className="text-sm text-blue-800">Wellness Hub needs QBO & Stripe integration setup</p>
                        <Button size="sm" variant="outline" className="mt-2 border-blue-600 text-blue-700">
                          Prepare Setup
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeModule === 'communications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Client Communication Hub</h2>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Slack className="mr-2 h-4 w-4" />
                  Open Slack
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Active Client Channels</CardTitle>
                    <CardDescription>Direct access to client Slack channels</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {slackChannels.map((channel) => (
                        <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <div>
                              <p className="font-semibold text-gray-900">{channel.name}</p>
                              <p className="text-sm text-gray-600">{channel.clientName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">{channel.lastActivity}</span>
                            {channel.unreadCount > 0 && (
                              <Badge className="bg-red-500 text-white">
                                {channel.unreadCount}
                              </Badge>
                            )}
                            <Badge className={getPriorityColor(channel.priority)}>
                              {channel.priority}
                            </Badge>
                            <Button size="sm" variant="outline">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Communication Tools</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="w-full justify-start" variant="outline">
                      <Mail className="mr-2 h-4 w-4" />
                      Send Client Update
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule Meeting
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Phone className="mr-2 h-4 w-4" />
                      Quick Call
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Video className="mr-2 h-4 w-4" />
                      Start Video Call
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeModule === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Smart Document Center</h2>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Box className="mr-2 h-4 w-4" />
                  Open Box
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Document Requests</CardTitle>
                    <CardDescription>Track client document submissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {documentRequests.map((request) => (
                        <div key={request.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{request.clientName}</h4>
                              <p className="text-sm text-gray-600">{request.type}</p>
                            </div>
                            <Badge className={getPriorityColor(request.priority)}>
                              {request.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${getStatusColor(request.status)}`}>
                              {request.status.replace('-', ' ')}
                            </span>
                            <span className="text-sm text-gray-500">Due: {request.dueDate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Quick Actions</CardTitle>
                    <CardDescription>Streamline document workflows</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="w-full justify-start" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Create File Request
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Upload className="mr-2 h-4 w-4" />
                      Bulk Upload
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <FileDown className="mr-2 h-4 w-4" />
                      Generate Report
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Folder className="mr-2 h-4 w-4" />
                      Create Client Folder
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeModule === 'ai-tools' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">AI-Powered Service Tools</h2>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  <Brain className="mr-1 h-3 w-3" />
                  AI Powered
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-gray-900">AI Assistant Tools</CardTitle>
                    <CardDescription>Intelligent automation for accounting tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button className="h-20 flex-col bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                        <BarChart3 className="h-6 w-6 mb-2" />
                        <span className="text-sm">COA Analysis</span>
                      </Button>
                      <Button className="h-20 flex-col bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
                        <PieChart className="h-6 w-6 mb-2" />
                        <span className="text-sm">Period Reports</span>
                      </Button>
                      <Button className="h-20 flex-col bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">
                        <Building2 className="h-6 w-6 mb-2" />
                        <span className="text-sm">Entity Optimization</span>
                      </Button>
                      <Button className="h-20 flex-col bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                        <DollarSign className="h-6 w-6 mb-2" />
                        <span className="text-sm">Deduction Scan</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Active AI Tasks</CardTitle>
                    <CardDescription>Monitor AI processing progress</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {aiTasks.map((task) => (
                        <div key={task.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {task.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </h4>
                              <p className="text-sm text-gray-600">{task.clientName}</p>
                            </div>
                            <span className={`text-sm font-medium ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Progress value={task.progress} className="flex-1 mr-3" />
                              <span className="text-sm text-gray-500">{task.progress}%</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              ETA: {task.estimatedCompletion}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// Updated to fix mutation undefined error
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Copy, Save, Check, Search, ArrowUpDown, Edit, AlertCircle, Archive, CheckCircle, XCircle, Loader2, Upload, User, LogOut, Calculator, FileText, Sparkles, DollarSign, X, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, HelpCircle, Bell, Settings, Lock, Unlock, Building, Users, CreditCard, Receipt } from "lucide-react";
import { useLocation } from "wouter";
import { insertQuoteSchema, type Quote } from "@shared/schema";
import { calculateCombinedFees } from "@shared/pricing";
import { mapQuoteToFormServices, getServiceKeys, getAllServices } from "@shared/services";

import { apiRequest, queryClient } from "@/lib/queryClient";

// Import the error handling function

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { ServiceTierCards } from "@/components/quote-form/ServiceTierCards";
import { ServiceCards } from "@/components/quote-form/ServiceCards";
import { TaasSection } from "@/components/quote-form/TaasSection";
import { PriorYearFilingsSection } from "@/components/quote-form/PriorYearFilingsSection";
import { BookkeepingCleanupSection } from "@/components/quote-form/BookkeepingCleanupSection";
import { CfoAdvisorySection } from "@/components/quote-form/CfoAdvisorySection";
import PayrollSection from "@/components/quote-form/PayrollSection";
import APSection from "@/components/quote-form/APSection";
import ARSection from "@/components/quote-form/ARSection";
import AgentOfServiceSection from "@/components/quote-form/AgentOfServiceSection";

// 🎯 PLACEHOLDER: This file will be refactored using COPY-PASTE method
// Keep the EXACT same UI and functionality, just split into manageable pieces

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <UniversalNavbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quote Calculator</h1>
          <p className="text-gray-600">
            Currently being refactored for better maintainability. Original UI will be preserved!
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <Calculator className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Refactoring in Progress
            </h2>
            <p className="text-gray-600 mb-6">
              The original 4,379-line component is being broken down into maintainable pieces<br />
              using the COPY-PASTE method to preserve exact functionality.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ✅ Directory structure created<br />
                ✅ TypeScript interfaces defined<br />
                ✅ Constants extracted<br />
                🔄 Copy-pasting original UI components...<br />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
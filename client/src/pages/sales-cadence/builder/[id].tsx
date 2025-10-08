import { useEffect, useMemo, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Plus, CheckCircle2, Loader2 } from "lucide-react";
import { Canvas } from "@/components/cadence/Canvas";
import { CadenceSettings } from "@/components/cadence/CadenceSettings";
import { AddDayModal } from "@/components/cadence/modals/AddDayModal";
import type { CadenceDay, CadenceModel } from "@/pages/sales-cadence/types";
import { ensureCadence, upsertCadence } from "@/pages/sales-cadence/store";
import { upsertCadenceApi } from "@/pages/sales-cadence/api";
import { apps } from "@/assets";

export default function SalesCadenceBuilderPage() {
  const [, params] = useRoute("/apps/sales-cadence/builder/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const id = params?.id || "";
  const [model, setModel] = useState<CadenceModel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  
  // Force re-render every minute to update relative time
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Initialize from in-memory store (Phase A.1)
  useEffect(() => {
    if (!id) return;
    const m = ensureCadence(id, user?.id);
    setModel({ ...m });
    isInitialLoadRef.current = true;
  }, [id, user?.id]);

  // Auto-save effect with debounce
  useEffect(() => {
    // Skip auto-save on initial load
    if (!model || isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set status to indicate changes pending
    setAutoSaveStatus("idle");

    // Debounce auto-save by 2 seconds
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      try {
        const saved = await upsertCadenceApi(model);
        upsertCadence(saved);
        setLastAutoSave(new Date());
        setAutoSaveStatus("saved");
        
        // Reset to idle after 2 seconds
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } catch (e) {
        upsertCadence(model);
        setAutoSaveStatus("idle");
        // Silent fail for auto-save, user can still manually save
      }
    }, 2000);

    // Cleanup
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [model]);

  const title = useMemo(() => model?.name || "New Cadence", [model?.name]);

  function onUpdateModel(updates: Partial<CadenceModel>) {
    if (!model) return;
    setModel({ ...model, ...updates });
  }

  function onAddDay(dayNumber: number) {
    if (!model) return;
    const nextDay: CadenceDay = { dayNumber, actions: [] };
    // Insert in correct position based on dayNumber
    const newDays = [...model.days, nextDay].sort((a, b) => a.dayNumber - b.dayNumber);
    setModel({ ...model, days: newDays });
  }

  const minDayNumber = useMemo(() => {
    if (!model || model.days.length === 0) return 1;
    return Math.max(...model.days.map(d => d.dayNumber)) + 1;
  }, [model]);

  const existingDayNumbers = useMemo(() => {
    return model?.days.map(d => d.dayNumber) || [];
  }, [model]);

  function onChangeDay(idx: number, day: CadenceDay) {
    if (!model) return;
    const next = [...model.days];
    next[idx] = day;
    setModel({ ...model, days: next });
  }

  function onMoveAction(fromDay: number, fromIndex: number, toDay: number, toIndex: number) {
    if (!model) return;
    const days = model.days.map((d) => ({ ...d, actions: [...d.actions] }));
    const from = days[fromDay];
    const to = days[toDay];
    if (!from || !to) return;
    const [moved] = from.actions.splice(fromIndex, 1);
    if (!moved) return;
    const insertAtRaw = Math.max(0, Math.min(toIndex, to.actions.length));
    const insertAt = fromDay === toDay && fromIndex < insertAtRaw ? insertAtRaw - 1 : insertAtRaw;
    to.actions.splice(insertAt, 0, moved);
    setModel({ ...model, days });
  }

  async function onSave() {
    if (!model) return;
    
    // Clear auto-save timer if manual save triggered
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    setIsSaving(true);
    setAutoSaveStatus("saving");
    try {
      const saved = await upsertCadenceApi(model);
      setModel(saved);
      upsertCadence(saved);
      setLastAutoSave(new Date()); // Update auto-save time on manual save too
      setAutoSaveStatus("saved");
      toast({ title: "Saved", description: "Cadence saved successfully" });
      
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    } catch (e) {
      upsertCadence(model);
      setAutoSaveStatus("idle");
      toast({ title: "Saved (local)", description: "Server save failed. Saved in memory only.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }
  
  // Helper to format relative time
  function getRelativeTime(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds} sec ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  if (!model) {
    return (
      <DashboardLayout maxWidthClassName="max-w-7xl" header={<div className="text-xl font-semibold">Sales Cadence</div>}>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout maxWidthClassName="max-w-7xl" header={<></>}>
      {/* Logo */}
      <div className="mb-6 flex items-center justify-center">
        <img src={apps.seedcadence.light} alt="Sales Cadence" className="h-32 block dark:hidden" />
        <img src={apps.seedcadence.dark} alt="Sales Cadence" className="h-32 hidden dark:block" />
      </div>

      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/apps/sales-cadence")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground">Design your sales outreach sequence</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-save status */}
            <div className="flex items-center gap-3">
              {autoSaveStatus === "saving" && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
              {autoSaveStatus === "saved" && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Saved</span>
                </div>
              )}
              {autoSaveStatus === "idle" && (
                <div className="text-sm text-gray-400">
                  {lastAutoSave ? `Last AutoSave ${getRelativeTime(lastAutoSave)}` : "AutoSave enabled"}
                </div>
              )}
            </div>
            
            <Button variant="outline" onClick={onSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Settings */}
        <CadenceSettings
          model={model}
          onUpdate={onUpdateModel}
          currentUser={user}
          isAdmin={user?.role?.toLowerCase() === "admin"}
        />
      </div>

      <Separator className="my-6" />

      {/* Cadence Builder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Cadence Timeline</h2>
            <p className="text-sm text-muted-foreground">Add and sequence your outreach actions</p>
          </div>
          <Button onClick={() => setIsAddDayModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Day
          </Button>
        </div>
        <Canvas cadence={model} onChangeDay={onChangeDay} onMoveAction={onMoveAction} />
      </div>

      {/* Add Day Modal */}
      <AddDayModal
        isOpen={isAddDayModalOpen}
        onClose={() => setIsAddDayModalOpen(false)}
        onAdd={onAddDay}
        minDayNumber={minDayNumber}
        existingDays={existingDayNumbers}
      />
    </DashboardLayout>
  );
}

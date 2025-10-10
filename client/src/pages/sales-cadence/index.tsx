import { useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Plus, Clock, Calendar, MessageSquare } from "lucide-react";
import { listCadences, upsertCadence } from "./store";
import { createEmptyCadence } from "./types";
import { apps } from "@/assets";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SalesCadenceListPage() {
  const [, setLocation] = useLocation();
  const cadences = useMemo(() => listCadences(), []);

  function createNew() {
    const id = uid();
    const model = createEmptyCadence(id);
    upsertCadence(model);
    setLocation(`/apps/sales-cadence/builder/${id}`);
  }

  return (
    <DashboardLayout maxWidthClassName="max-w-6xl" header={<></>}>
      {/* Centered Logo */}
      <div className="mb-8 flex items-center justify-center">
        <img src={apps.seedcadence.light} alt="Sales Cadence" className="h-40 block dark:hidden" />
        <img src={apps.seedcadence.dark} alt="Sales Cadence" className="h-40 hidden dark:block" />
      </div>

      {/* Action Button */}
      <div className="mb-8 flex justify-center">
        <Button onClick={createNew} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          New Cadence
        </Button>
      </div>

      {/* Cadences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cadences.length === 0 ? (
          <div className="col-span-full">
            <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 backdrop-blur-xl border-2 rounded-2xl p-12">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <MessageSquare className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No cadences yet</h3>
                <p className="text-gray-300 mb-6">
                  Create your first sales cadence to automate your outreach sequence
                </p>
                <Button onClick={createNew} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Cadence
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          cadences.map((c) => (
            <Card
              key={c.id}
              className="group cursor-pointer transition-all duration-500 hover:scale-[1.05] hover:shadow-2xl hover:shadow-black/40 bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 hover:from-slate-700/90 hover:to-slate-800/90 hover:border-orange-400/70 backdrop-blur-xl border-2 rounded-2xl overflow-hidden relative transform hover:-translate-y-2"
              onClick={() => setLocation(`/apps/sales-cadence/builder/${c.id}`)}
            >
              {/* Background overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Glow effect */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-2xl" />

              <div className="relative p-6 space-y-4">
                {/* Header with Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-2 truncate group-hover:text-orange-200 transition-colors">
                      {c.name || "Untitled Cadence"}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={c.isActive ? "default" : "secondary"}
                        className={c.isActive ? "bg-green-500/90 hover:bg-green-500" : ""}
                      >
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-400" />
                    <span>
                      {c.days?.length || 0} {c.days?.length === 1 ? "day" : "days"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-400" />
                    <span>{c.timezone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-orange-400" />
                    <span>
                      {c.days?.reduce((acc, day) => acc + (day.actions?.length || 0), 0) || 0}{" "}
                      actions
                    </span>
                  </div>
                </div>

                {/* Bottom accent */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-400/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}

import React, { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { AgentPanel } from "./AgentPanel";
import { X } from "lucide-react";
import botPng from "../../assets/assistant-bot.png";

export function AssistantWidget() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  // Hide on auth-like routes
  if (location.startsWith("/auth") || location.startsWith("/request-access")) {
    return null;
  }

  const persona = useMemo(() => {
    const pref = (user?.defaultDashboard || "").toLowerCase();
    if (user?.role === "admin") return "admin" as const;
    if (pref.includes("admin")) return "admin" as const;
    if (pref.includes("service")) return "service" as const;
    if (pref.includes("sales")) return "sales" as const;
    return user?.role === "admin" ? ("admin" as const) : ("sales" as const);
  }, [user?.defaultDashboard, user?.role]);

  const allowBox = persona === "service" || persona === "admin";

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50">
      {/* Floating button */}
      {!open && (
        <button
          aria-label="Open Seed Assistant"
          onClick={() => setOpen(true)}
          className="pointer-events-auto shadow-lg rounded-full w-20 h-20 flex items-center justify-center bg-orange-600 hover:bg-orange-700 transition text-white border border-orange-500/60"
        >
          {/* Avatar image */}
          <img
            src={botPng}
            alt="Seed Assistant"
            className="w-16 h-16 rounded-full object-cover"
          />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="pointer-events-auto w-[440px] max-w-[92vw] h-[72vh] max-h-[80vh]">
          <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white">
              <span className="text-sm font-semibold tracking-wide uppercase text-white/80">
                Seed Assistant
              </span>
              <div className="flex items-center gap-3">
                <button
                  className="text-xs font-medium text-orange-300 hover:text-orange-200"
                  onClick={() => navigate("/assistant")}
                >
                  Open workspace
                </button>
                <button
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/10 p-1 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-4 py-4">
              <AgentPanel
                initialMode={
                  persona === "service" || persona === "admin"
                    ? "support"
                    : "sell"
                }
                allowBox={allowBox}
                compact
                onOpenWorkspace={() => navigate("/assistant")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

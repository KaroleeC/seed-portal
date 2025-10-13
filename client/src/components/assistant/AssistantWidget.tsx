import React, { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { AgentPanel } from "./AgentPanel";
import { X } from "lucide-react";
import { misc } from "@/assets";

export function AssistantWidget() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  // Global toggle via keyboard (Cmd/Ctrl+L)
  useEffect(() => {
    const handler = (_e: Event) => {
      setOpen((prev) => {
        if (prev) {
          setClosing(true);
          return false;
        }
        return true;
      });
    };
    window.addEventListener("seed-toggle-assistant", handler as EventListener);
    return () => window.removeEventListener("seed-toggle-assistant", handler as EventListener);
  }, []);
  const handlePanelTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    // Only act on the outer container's own transition end
    if (!closing) return;
    if (e.target !== e.currentTarget) return;
    if (e.propertyName === "opacity" || e.propertyName === "transform") {
      setClosing(false);
    }
  };

  const persona = useMemo(() => {
    const pref = (user?.defaultDashboard || "").toLowerCase();
    // Determine persona based on default dashboard
    if (pref.includes("admin")) return "admin" as const;
    if (pref.includes("service")) return "service" as const;
    if (pref.includes("sales")) return "sales" as const;
    // Default to sales for any other dashboard
    return "sales" as const;
  }, [user?.defaultDashboard]);

  const allowBox = persona === "service" || persona === "admin";

  // Hide on auth-like routes
  if (location.startsWith("/auth") || location.startsWith("/request-access")) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50">
      {/* Floating button */}
      {!open && !closing && (
        <button
          aria-label="Open Seed Assistant"
          onClick={() => setOpen(true)}
          className="group pointer-events-auto shadow-lg rounded-full w-20 h-20 flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white border border-orange-500/60 transition-[colors,transform] duration-200 transform-gpu will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent hover:shadow-2xl hover:scale-110 active:scale-95"
        >
          {/* Avatar image */}
          <img
            src={misc.assistantAvatar}
            alt="Seed Assistant"
            className="w-16 h-16 rounded-full object-cover transition-transform duration-200 ease-out group-hover:scale-105"
          />
        </button>
      )}

      {/* Panel */}
      {(open || closing) && (
        <div
          className={`pointer-events-auto w-[440px] max-w-[92vw] h-[72vh] max-h-[80vh] origin-bottom-right transform-gpu will-change-transform transition-[opacity,transform] duration-200 ${
            closing
              ? "ease-in opacity-0 translate-y-4 scale-95"
              : "ease-out opacity-100 translate-y-0 scale-100"
          }`}
          onTransitionEnd={handlePanelTransitionEnd}
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
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
                  onClick={() => {
                    setOpen(false);
                    setClosing(true);
                  }}
                  className="rounded-full border border-white/10 p-1 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 px-4 py-4">
              <AgentPanel
                initialMode={persona === "service" || persona === "admin" ? "support" : "sell"}
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

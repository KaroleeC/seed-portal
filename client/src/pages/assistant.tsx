import React, { useMemo } from "react";
import { AgentPanel } from "@/components/assistant/AgentPanel";
import { useAuth } from "@/hooks/use-auth";
import { UniversalNavbar } from "@/components/UniversalNavbar";

export default function AssistantPage() {
  const { user } = useAuth();

  /* eslint-disable rbac/no-direct-role-checks -- Using role to personalize assistant persona, not for authorization */
  const persona = useMemo(() => {
    const pref = (user?.defaultDashboard || "").toLowerCase();
    if (user?.role === "admin") return "admin" as const;
    if (pref.includes("admin")) return "admin" as const;
    if (pref.includes("service")) return "service" as const;
    if (pref.includes("sales")) return "sales" as const;
    return user?.role === "admin" ? ("admin" as const) : ("sales" as const);
  }, [user?.defaultDashboard, user?.role]);
  /* eslint-enable rbac/no-direct-role-checks */

  const initialMode = persona === "service" || persona === "admin" ? "support" : ("sell" as const);
  const allowBox = persona === "service" || persona === "admin";

  return (
    <div className="min-h-screen theme-seed-dark bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <UniversalNavbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1
            className="text-3xl font-bold text-white"
            style={{ fontFamily: "League Spartan, sans-serif" }}
          >
            Seed Assistant Workspace
          </h1>
          <p className="text-white/70 mt-1">
            A focused area for longer sessions. The floating widget links here.
          </p>
        </div>
        <AgentPanel initialMode={initialMode} allowBox={allowBox} />
      </main>
    </div>
  );
}

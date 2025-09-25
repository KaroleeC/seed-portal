import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Send, Paperclip, ExternalLink } from "lucide-react";
import {
  BoxPickerModal,
  type BoxAttachment,
} from "@/components/assistant/BoxPickerModal";

export type AgentMode = "sell" | "support";

interface Attachment {
  type: "box_file" | "box_folder";
  id: string;
  name?: string;
}

interface AgentPanelProps {
  initialMode?: AgentMode;
  allowBox?: boolean; // UI gate for Box
  compact?: boolean; // smaller paddings for widget mode
  onOpenWorkspace?: () => void;
}

export function AgentPanel({
  initialMode = "sell",
  allowBox = false,
  compact = false,
  onOpenWorkspace,
}: AgentPanelProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<AgentMode>(initialMode);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showBox, setShowBox] = useState(false);
  const [citations, setCitations] = useState<Array<{ name: string }>>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Compute persona by defaultDashboard
  const persona = useMemo(() => {
    const pref = (user?.defaultDashboard || "").toLowerCase();
    if (user?.role === "admin") return "admin" as const;
    if (pref.includes("admin")) return "admin" as const;
    if (pref.includes("service")) return "service" as const;
    if (pref.includes("sales")) return "sales" as const;
    return user?.role === "admin" ? ("admin" as const) : ("sales" as const);
  }, [user?.defaultDashboard, user?.role]);

  const canUseBox = allowBox && (persona === "service" || persona === "admin");

  const onAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");
    setCitations([]);
    setErrorMsg("");
    try {
      // Streaming first
      const response = await fetch("/api/ai/query/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        credentials: "include",
        body: JSON.stringify({
          mode,
          question,
          attachments: canUseBox ? attachments : [],
        }),
      });

      if (response.status === 403) {
        // surface permission error inline
        const text = await response.text();
        setErrorMsg(text || "Access denied. Attachments are not permitted for your role.");
        setLoading(false);
        return;
      }

      if (response.ok && response.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            const line = part.trim();
            if (!line) continue;
            const dataLine = line.startsWith("data:") ? line.slice(5).trim() : line;
            if (dataLine === "[DONE]") continue;
            try {
              const payload = JSON.parse(dataLine);
              if (payload.meta?.citations) setCitations(payload.meta.citations);
              if (payload.delta) setAnswer((prev) => prev + payload.delta);
            } catch {
              // ignore malformed chunk
            }
          }
        }
      } else {
        // Fallback to non-streaming JSON endpoint
        try {
          const res = await apiRequest("POST", "/api/ai/query", {
            mode,
            question,
            attachments: canUseBox ? attachments : []
          });
          setAnswer(res?.answer || "");
          if (Array.isArray(res?.citations)) setCitations(res.citations);
        } catch (e: any) {
          const msg = e?.message || "Request failed";
          if (typeof msg === 'string' && msg.startsWith("403:")) {
            setErrorMsg("Access denied. Attachments are not permitted for your role.");
          } else {
            setErrorMsg(msg);
          }
        }
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to get response";
      setErrorMsg(typeof msg === 'string' ? msg : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  // Layout helpers and render
  const showTitle = !compact;
  const showWorkspaceBtn = !!onOpenWorkspace && !compact;
  const containerSpacing = compact ? "p-4 space-y-4" : "p-6 space-y-6";

  const modeButtonClass = (target: AgentMode) =>
    `h-8 px-4 rounded-full text-xs font-medium transition shadow-none ${
      mode === target
        ? target === "sell"
          ? "bg-orange-500 text-white hover:bg-orange-600"
          : "bg-slate-600 text-white hover:bg-slate-600"
        : "text-white/70 hover:text-white/90"
    }`;

  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-950/90 text-white shadow-2xl backdrop-blur-sm ${containerSpacing}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {showTitle ? (
          <div className="flex items-center gap-3 text-base font-semibold tracking-tight">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-orange-500/20 text-orange-300">
              <Bot className="h-4 w-4" />
            </div>
            <span>Seed Assistant</span>
          </div>
        ) : (
          <div className="h-7" />
        )}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
            <Button size="sm" variant="ghost" className={modeButtonClass("sell")} onClick={() => setMode("sell")}>
              Sell
            </Button>
            <Button size="sm" variant="ghost" className={modeButtonClass("support")} onClick={() => setMode("support")}>
              Support
            </Button>
          </div>
          {showWorkspaceBtn && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-white/20 text-white/80 hover:text-white hover:bg-white/10"
              onClick={onOpenWorkspace}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Workspace
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {canUseBox && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg bg-white/10 text-white/90 hover:bg-white/20"
                onClick={() => setShowBox(true)}
              >
                <Paperclip className="h-4 w-4 mr-1" />
                Attach from Box
              </Button>
              <div className="flex flex-wrap gap-1">
                {attachments.map((a) => (
                  <Badge key={`${a.type}:${a.id}`} variant="secondary" className="bg-white/15 text-white/80">
                    {a.name || `${a.type}:${a.id}`}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {!!errorMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {errorMsg}
            </div>
          )}
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={mode === "sell" ? "Ask for sales help…" : "Ask for service support…"}
            className="min-h-[120px] rounded-xl border-white/15 bg-white/5 text-sm text-white placeholder:text-white/60 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/30"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-white/60">Persona: {persona}</span>
            <Button onClick={onAsk} disabled={loading} className="rounded-full bg-orange-500 px-5 text-white hover:bg-orange-600 disabled:opacity-60">
              <Send className="h-4 w-4 mr-1" />
              {loading ? "Thinking…" : "Ask"}
            </Button>
          </div>
        </div>

        {answer && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white whitespace-pre-wrap">
            {answer}
          </div>
        )}

        {!!citations.length && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
            <div className="font-semibold uppercase tracking-wide text-white/60">Sources</div>
            <ul className="mt-2 space-y-1">
              {citations.map((c, idx) => (
                <li key={idx}>{c.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <BoxPickerModal
        open={showBox}
        onOpenChange={setShowBox}
        onConfirm={(atts: BoxAttachment[]) => {
          setAttachments((prev) => {
            const map = new Map<string, Attachment>();
            [...prev, ...atts].forEach((a) => {
              const key = `${a.type}:${a.id}`;
              map.set(key, { type: a.type, id: a.id, name: a.name });
            });
            return Array.from(map.values());
          });
        }}
      />
    </div>
  );
}

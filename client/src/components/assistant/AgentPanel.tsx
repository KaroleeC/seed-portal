import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Send, Paperclip, ExternalLink } from "lucide-react";
import { misc } from "@/assets";
import {
  BoxPickerModal,
  type BoxAttachment,
} from "@/components/assistant/BoxPickerModal";

// Normalize any citation-like value to displayable text without nested ternaries
function toCitationText(value: unknown): string {
  if (typeof value === "string") return value;
  const v = value as { name?: unknown } | null | undefined;
  if (v && typeof v.name === "string") return v.name as string;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export type AgentMode = "sell" | "support";

interface Attachment {
  type: "box_file" | "box_folder";
  id: string;
  name?: string;
}

interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  ts: number;
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
  useAuth(); // Ensure auth context is available
  const [mode, setMode] = useState<AgentMode>(initialMode);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showBox, setShowBox] = useState(false);
  const [citations, setCitations] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const storageKeyForMode = (m: AgentMode) => `ai:conv:${m}`;
  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const canUseBox = allowBox && mode === "support";

  // If switching to sell, clear any pending attachments since Box is support-only
  useEffect(() => {
    // Cancel any in-flight streaming request on mode switch
    abortRef.current?.abort();
    abortRef.current = null;
    if (mode === "sell" && attachments.length) {
      setAttachments([]);
    }
  }, [mode, attachments.length]);

  // Cleanup any in-flight request when component unmounts
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Hydrate per-mode conversation from sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKeyForMode(mode));
      if (raw) {
        const parsed = JSON.parse(raw);
        setConversationId(parsed?.conversationId || null);
        setMessages(Array.isArray(parsed?.messages) ? parsed.messages : []);
        // Clear stale citations from old format (they'll be refreshed on next query)
        setCitations([]);
      } else {
        setConversationId(null);
        setMessages([]);
      }
    } catch {
      setConversationId(null);
      setMessages([]);
    }
  }, [mode]);

  // Persist to sessionStorage when messages or conversationId change for current mode
  useEffect(() => {
    try {
      sessionStorage.setItem(
        storageKeyForMode(mode),
        JSON.stringify({ mode, conversationId, messages })
      );
    } catch {}
  }, [mode, conversationId, messages]);

  // Auto-scroll to bottom on new messages (scroll the main content container)
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length]);

  const onAsk = async () => {
    const q = question.trim();
    if (!q) return;
    // Abort any previous in-flight request
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(true);
    setCitations([]);
    setErrorMsg("");
    try {
      // Append user message and a placeholder assistant message
      const userMsg: AgentMessage = {
        id: genId(),
        role: "user",
        content: q,
        attachments: mode === "support" && canUseBox ? attachments : undefined,
        ts: Date.now(),
      };
      const assistantMsg: AgentMessage = {
        id: genId(),
        role: "assistant",
        content: "",
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setQuestion("");
      // Streaming first
      // Resolve Box attachments client-side so the server doesn't re-walk folders
      let resolvedAttachments: Attachment[] = attachments;
      if (mode === "support" && canUseBox && attachments.length) {
        try {
          const rs = await apiRequest("POST", "/api/ai/box/resolve", {
            attachments,
            question: q,
            client: compact ? "widget" : "assistant",
          });
          const files = Array.isArray(rs?.files) ? rs.files : [];
          resolvedAttachments = files.map((f: { id: string; name: string }) => ({
            type: "box_file" as const,
            id: f.id,
            name: f.name,
          }));
        } catch {}
      }

      // Get Supabase auth token for streaming request
      const { supabase } = await import("@/lib/supabaseClient");
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const controller = new AbortController();
      abortRef.current = controller;
      const response = await fetch("/api/ai/query/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          mode,
          question: q,
          conversationId: conversationId || undefined,
          attachments: mode === "support" && canUseBox ? resolvedAttachments : [],
          client: compact ? "widget" : "assistant",
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
        // eslint-disable-next-line no-constant-condition
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
              if (payload.meta?.citations) {
                const raw = payload.meta.citations as unknown;
                const normalized: string[] = Array.isArray(raw)
                  ? (raw as unknown[]).map((x) => toCitationText(x))
                  : [];
                setCitations(normalized);
              }
              if (payload.meta?.conversationId && !conversationId) {
                setConversationId(payload.meta.conversationId);
              }
              if (payload.delta) {
                setMessages((prev) => {
                  if (!prev.length) return prev;
                  const copy = [...prev];
                  // Last message is the placeholder assistant
                  const last = copy[copy.length - 1] as AgentMessage | undefined;
                  if (!last) return prev;
                  if (last.role === "assistant") {
                    const updated: AgentMessage = { ...last, content: (last.content || "") + payload.delta };
                    copy[copy.length - 1] = updated;
                  }
                  return copy;
                });
              }
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
            question: q,
            conversationId: conversationId || undefined,
            attachments: mode === "support" && canUseBox ? resolvedAttachments : []
          });
          const answerText = res?.answer || "";
          setMessages((prev) => {
            if (!prev.length) return prev;
            const copy = [...prev];
            const last = copy[copy.length - 1] as AgentMessage | undefined;
            if (last && last.role === "assistant") {
              const updated: AgentMessage = { ...last, content: answerText };
              copy[copy.length - 1] = updated;
            }
            return copy;
          });
          if (!conversationId && res?.conversationId) setConversationId(res.conversationId);
          if (Array.isArray(res?.citations)) {
            const normalized: string[] = (res.citations as unknown[]).map((x) => toCitationText(x));
            setCitations(normalized);
          }
        } catch (e: unknown) {
          const msg = (e as Error)?.message || "Request failed";
          if (typeof msg === 'string' && msg.startsWith("403:")) {
            setErrorMsg("Access denied. Attachments are not permitted for your role.");
          } else {
            setErrorMsg(msg);
          }
        }
      }
    } catch (e: unknown) {
      const msg = (e as Error)?.message || "Failed to get response";
      setErrorMsg(typeof msg === 'string' ? msg : "Request failed");
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  // Layout helpers and render
  const showTitle = !compact;
  const showWorkspaceBtn = !!onOpenWorkspace && !compact;
  // For widget (compact), we avoid the extra card container; non-compact keeps the card look
  const containerBaseClass = compact
    ? "text-white h-full flex flex-col"
    : "rounded-2xl border border-white/10 bg-slate-950/90 text-white shadow-2xl backdrop-blur-sm p-6 space-y-6";

  const modeButtonClass = (target: AgentMode) => {
    const base = "h-8 px-4 rounded-full text-xs font-medium transition shadow-none";
    if (mode !== target) {
      return `${base} text-white/70 hover:text-white/90`;
    }
    if (target === "sell") {
      return `${base} bg-orange-500 text-white hover:bg-orange-600`;
    }
    return `${base} bg-slate-600 text-white hover:bg-slate-600`;
  };

  return (
    <div className={containerBaseClass}>
      {/* Header area */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {showTitle ? (
          <div className="flex items-center gap-3 text-base font-semibold tracking-tight">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-orange-500/20 text-orange-300">
              <Bot className="h-4 w-4" />
            </div>
            <span>Seed Assistant</span>
          </div>
        ) : (
          // Compact widget: center Gary avatar
          <div className="w-full flex items-center justify-center py-2">
            <img src={misc.assistantAvatar} alt="Assistant" className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10" />
          </div>
        )}
        {!compact && (
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
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-white/80 hover:text-white hover:bg-white/10"
                onClick={async () => {
                  try {
                    if (conversationId) {
                      await apiRequest("POST", "/api/ai/conversations/end", { conversationId });
                    }
                  } catch {}
                  abortRef.current?.abort();
                  abortRef.current = null;
                  setConversationId(null);
                  setMessages([]);
                  setCitations([]);
                  setAttachments([]);
                  setErrorMsg("");
                  try {
                    sessionStorage.removeItem(storageKeyForMode(mode));
                  } catch {}
                }}
              >
                Start new
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content area (scroll container) */}
      <div ref={feedRef} className="flex-1 overflow-auto pr-1 pb-4">
        <div className="flex flex-col gap-3">
          {/* Message feed */}
          <div className="flex flex-col gap-2">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "user" ? (
                  <div className="bg-orange-500 text-white max-w-[85%] rounded-2xl px-3 py-2 whitespace-pre-wrap text-sm">
                    {m.content}
                  </div>
                ) : (
                  <div className="bg-white/5 text-white max-w-[85%] rounded-2xl px-3 py-2 text-sm">
                    {m.content ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 py-0.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-white/70 animate-pulse" />
                        <span className="inline-block h-2 w-2 rounded-full bg-white/70 animate-pulse" style={{ animationDelay: "150ms" }} />
                        <span className="inline-block h-2 w-2 rounded-full bg-white/70 animate-pulse" style={{ animationDelay: "300ms" }} />
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Citations (latest turn) */}
          {!!citations.length && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
              <div className="font-semibold uppercase tracking-wide text-white/60">Sources</div>
              <ul className="mt-2 space-y-1">
                {citations.map((c, idx) => (
                  <li key={idx}>{toCitationText(c)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Attachments section: only shown in non-compact layout here */}
        {canUseBox && mode === "support" && !compact && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                disabled={loading}
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

        {/* Error notice */}
        {!!errorMsg && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Compact: footer anchored outside the scroll area */}
      {compact && (
        <div className="shrink-0 pt-3 pb-3 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 px-4">
          {canUseBox && mode === "support" && (
            <div className="mb-3">
              <Button
                variant="ghost"
                size="sm"
                disabled={loading}
                className="rounded-full bg-white/10 text-white/90 hover:bg-white/20"
                onClick={() => setShowBox(true)}
              >
                <Paperclip className="h-4 w-4 mr-1" />
                Attach from Box
              </Button>
            </div>
          )}
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={mode === "sell" ? "Ask for sales help…" : "Ask for service support…"}
            className="min-h-[100px] rounded-xl border-white/15 bg-white/5 text-sm text-white placeholder:text-white/60 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/30"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
              <Button size="sm" variant="ghost" className={modeButtonClass("sell")} onClick={() => setMode("sell")}>
                Sell
              </Button>
              <Button size="sm" variant="ghost" className={modeButtonClass("support")} onClick={() => setMode("support")}>
                Support
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-white/80 hover:text-white hover:bg-white/10"
                  onClick={async () => {
                    try {
                      if (conversationId) {
                        await apiRequest("POST", "/api/ai/conversations/end", { conversationId });
                      }
                    } catch {}
                    abortRef.current?.abort();
                    abortRef.current = null;
                    setConversationId(null);
                    setMessages([]);
                    setCitations([]);
                    setAttachments([]);
                    setErrorMsg("");
                    try {
                      sessionStorage.removeItem(storageKeyForMode(mode));
                    } catch {}
                  }}
                >
                  Start new
                </Button>
              )}
              <Button onClick={onAsk} disabled={loading || !question.trim()} className="rounded-full bg-orange-500 px-5 text-white hover:bg-orange-600 disabled:opacity-60">
                <Send className="h-4 w-4 mr-1" />
                {loading ? "Thinking…" : "Ask"}
              </Button>
            </div>
          </div>
          {!!attachments.length && (
            <div className="mt-2 flex flex-wrap gap-1">
              {attachments.map((a) => (
                <Badge key={`${a.type}:${a.id}`} variant="secondary" className="bg-white/15 text-white/80">
                  {a.name || `${a.type}:${a.id}`}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

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

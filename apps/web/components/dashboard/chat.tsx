"use client";

import {
  Check,
  Copy,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Square,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AgntosMark } from "@/components/brand";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; messages: Msg[]; updatedAt: number };

const EXAMPLES = [
  "What can you help me with?",
  "Draft a quick email for me",
  "Summarize some text for me",
];

const lsKey = (agentId: string) => `agntos.chat.${agentId}`;
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

function titleFrom(messages: Msg[]): string {
  const first = messages
    .find((m) => m.role === "user")
    ?.content.trim()
    .replace(/\s+/g, " ");
  if (!first) return "New chat";
  return first.length > 38 ? `${first.slice(0, 38)}…` : first;
}

export function Chat({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const active = threads.find((t) => t.id === activeId);
  const messages = active?.messages ?? [];
  const ordered = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);

  // Load saved threads on mount.
  useEffect(() => {
    let saved: { threads: Thread[]; activeId: string } | null = null;
    try {
      const raw = localStorage.getItem(lsKey(agentId));
      if (raw) saved = JSON.parse(raw) as { threads: Thread[]; activeId: string };
    } catch {
      /* corrupt / disabled */
    }
    if (saved?.threads?.length) {
      const list = saved.threads;
      const wantId = saved.activeId;
      setThreads(list);
      setActiveId(list.find((t) => t.id === wantId)?.id ?? list[0]?.id ?? "");
    } else {
      const fresh: Thread = { id: uid(), title: "New chat", messages: [], updatedAt: Date.now() };
      setThreads([fresh]);
      setActiveId(fresh.id);
    }
    setLoaded(true);
  }, [agentId]);

  // Persist (debounced so streaming doesn't thrash localStorage).
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(lsKey(agentId), JSON.stringify({ threads, activeId }));
      } catch {
        /* quota */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [threads, activeId, loaded, agentId]);

  // Keep the latest content in view as it streams.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function autoGrow() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }

  function updateThread(threadId: string, updater: (msgs: Msg[]) => Msg[]) {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        const msgs = updater(t.messages);
        const title = t.title && t.title !== "New chat" ? t.title : titleFrom(msgs);
        return { ...t, messages: msgs, title, updatedAt: Date.now() };
      }),
    );
  }

  // base must end with a user message; streams an assistant reply into `threadId`.
  async function runTurn(threadId: string, base: Msg[]) {
    setError(null);
    updateThread(threadId, () => [...base, { role: "assistant", content: "" }]);
    setBusy(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch(`/api/agents/${agentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: base }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Chat failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        for (const line of parts) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
            const delta = json.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              acc += delta;
              updateThread(threadId, (msgs) => {
                const c = msgs.slice();
                c[c.length - 1] = { role: "assistant", content: acc };
                return c;
              });
            }
          } catch {
            /* keep-alive / partial line */
          }
        }
      }
      if (!acc.trim()) {
        updateThread(threadId, (msgs) => {
          const c = msgs.slice();
          c[c.length - 1] = { role: "assistant", content: "_(no response)_" };
          return c;
        });
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      updateThread(threadId, (msgs) => (msgs[msgs.length - 1]?.content ? msgs : msgs.slice(0, -1)));
      if (!aborted) setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function sendText(raw: string) {
    const text = raw.trim();
    if (!text || busy || !active) return;
    setInput("");
    requestAnimationFrame(autoGrow);
    void runTurn(active.id, [...messages, { role: "user", content: text }]);
  }

  function regenerate() {
    if (busy || !active) return;
    const lastUser = messages.map((m) => m.role).lastIndexOf("user");
    if (lastUser < 0) return;
    void runTurn(active.id, messages.slice(0, lastUser + 1));
  }

  function saveEdit() {
    const text = editText.trim();
    if (editIdx === null || !text || !active) return;
    const base: Msg[] = [...messages.slice(0, editIdx), { role: "user", content: text }];
    setEditIdx(null);
    setEditText("");
    void runTurn(active.id, base);
  }

  function newChat() {
    const fresh: Thread = { id: uid(), title: "New chat", messages: [], updatedAt: Date.now() };
    setThreads((p) => [fresh, ...p]);
    setActiveId(fresh.id);
    setSidebarOpen(false);
    setError(null);
    setEditIdx(null);
  }

  function selectThread(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
    setError(null);
    setEditIdx(null);
  }

  function deleteThread(id: string) {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const fresh: Thread = { id: uid(), title: "New chat", messages: [], updatedAt: Date.now() };
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) {
        const top = [...next].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        if (top) setActiveId(top.id);
      }
      return next;
    });
  }

  async function copy(text: string, i: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied((c) => (c === i ? null : c)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendText(input);
    }
  }

  return (
    <div className="relative flex h-[78vh] overflow-hidden border-2 border-line bg-paper">
      {/* Conversations sidebar */}
      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-20 flex w-60 flex-col border-r-2 border-line bg-cloud transition-transform duration-200 sm:static sm:z-auto sm:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b-2 border-line p-2">
          <button
            type="button"
            onClick={newChat}
            className="flex w-full items-center justify-center gap-1.5 border-2 border-ink bg-lime px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-lime-deep"
          >
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>
        </div>
        <ul className="flex-1 space-y-1 overflow-y-auto p-2">
          {ordered.map((t) => (
            <li key={t.id} className="group/th flex items-center gap-1">
              <button
                type="button"
                onClick={() => selectThread(t.id)}
                className={cn(
                  "flex-1 truncate border-2 px-2 py-1.5 text-left text-xs transition-colors",
                  t.id === activeId
                    ? "border-line bg-paper font-semibold text-ink"
                    : "border-transparent text-muted hover:text-ink",
                )}
                title={t.title}
              >
                {t.title || "New chat"}
              </button>
              <button
                type="button"
                onClick={() => deleteThread(t.id)}
                className="shrink-0 p-1 text-faint opacity-0 transition hover:text-coral group-hover/th:opacity-100"
                title="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </aside>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close conversations"
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 z-10 bg-ink/30 sm:hidden"
        />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b-2 border-line bg-ink px-3 py-2.5">
          <button
            type="button"
            onClick={() => setSidebarOpen((s) => !s)}
            className="text-lime sm:hidden"
            title="Conversations"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="h-2.5 w-2.5 bg-lime" />
          <span className="truncate font-mono text-xs font-semibold text-lime">
            {active?.title && active.title !== "New chat" ? active.title : `${agentName} · web chat`}
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex gap-3">
                <AgntosMark className="mt-0.5 h-7 w-7 shrink-0" />
                <div className="max-w-[88%] border-2 border-line bg-cloud px-3.5 py-2.5 text-sm text-ink">
                  Hi! I&apos;m {agentName} 👋 — your AI assistant. I remember our conversations and
                  can help with everyday work: drafting messages, summarizing, research, and keeping
                  track of tasks. What can I help you with?
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pl-10">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => sendText(ex)}
                    disabled={busy}
                    className="border-2 border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-cloud disabled:opacity-50"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              editIdx === i ? (
                <div key={i} className="flex justify-end">
                  <div className="w-full max-w-[88%]">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="field min-h-[64px] w-full resize-y text-sm"
                      autoFocus
                    />
                    <div className="mt-1.5 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditIdx(null);
                          setEditText("");
                        }}
                        className="border-2 border-line bg-paper px-3 py-1 text-xs font-semibold text-ink hover:bg-cloud"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="border-2 border-ink bg-lime px-3 py-1 text-xs font-semibold text-ink hover:bg-lime-deep"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={i} className="group flex justify-end">
                  <div className="flex max-w-[88%] items-start gap-1.5">
                    {!busy && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditIdx(i);
                          setEditText(m.content);
                        }}
                        className="mt-1.5 shrink-0 text-faint opacity-0 transition hover:text-ink group-hover:opacity-100"
                        title="Edit & resend"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="whitespace-pre-wrap border-2 border-ink bg-ink px-3.5 py-2.5 text-sm text-paper">
                      {m.content}
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div key={i} className="group flex gap-3">
                <AgntosMark className="mt-0.5 h-7 w-7 shrink-0" />
                <div className="min-w-0 max-w-[88%]">
                  <div className="border-2 border-line bg-paper px-3.5 py-2.5">
                    {m.content ? (
                      <div className="chat-md">
                        <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
                      </div>
                    ) : (
                      <Dots />
                    )}
                  </div>
                  {m.content && !(busy && i === messages.length - 1) && (
                    <div className="mt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void copy(m.content, i)}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-faint opacity-0 transition hover:text-ink group-hover:opacity-100"
                      >
                        {copied === i ? (
                          <>
                            <Check className="h-3 w-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                      {i === messages.length - 1 && !busy && (
                        <button
                          type="button"
                          onClick={regenerate}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-faint opacity-0 transition hover:text-ink group-hover:opacity-100"
                        >
                          <RefreshCw className="h-3 w-3" /> Regenerate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
        </div>

        {error && (
          <p className="border-t-2 border-coral bg-coral/20 px-4 py-2 font-mono text-xs text-ink">
            {error}
          </p>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="flex items-end gap-2 border-t-2 border-line p-3">
          <textarea
            ref={taRef}
            rows={1}
            className="field max-h-40 flex-1 resize-none py-2.5"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow();
            }}
            onKeyDown={onKeyDown}
            placeholder={`Message ${agentName}…`}
          />
          {busy ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 border-2 border-ink bg-paper px-4 text-sm font-semibold text-ink hover:bg-cloud"
            >
              <Square className="h-3.5 w-3.5 fill-current" /> Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => sendText(input)}
              disabled={!input.trim()}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 border-2 border-ink bg-lime px-4 text-sm font-semibold text-ink hover:bg-lime-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

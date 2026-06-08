"use client";

import {
  Check,
  Copy,
  FileText,
  Menu,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AgntosMark } from "@/components/brand";
import { cn } from "@/lib/utils";

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type Content = string | Part[];
type Msg = { role: "user" | "assistant"; content: Content };
type Thread = { id: string; title: string; messages: Msg[]; updatedAt: number };
type Attach = {
  id: string;
  name: string;
  kind: "image" | "text";
  status: "loading" | "ready" | "error";
  dataUrl?: string;
  text?: string;
};

const EXAMPLES = [
  "What can you help me with?",
  "Draft a quick email for me",
  "Summarize some text for me",
];
const TEXT_RE = /\.(md|markdown|csv|tsv|json|ya?ml|txt|log|xml|html?|css|js|ts|tsx|jsx|py|rb|go|rs|java|c|cpp|sh|sql)$/i;
const MAX_FILE = 8 * 1024 * 1024;

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

function asText(c: Content): string {
  if (typeof c === "string") return c;
  return c
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}
function asImages(c: Content): string[] {
  if (typeof c === "string") return [];
  return c
    .filter((p): p is { type: "image_url"; image_url: { url: string } } => p.type === "image_url")
    .map((p) => p.image_url.url);
}
function titleFrom(messages: Msg[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  const t = asText(first.content).trim().replace(/\s+/g, " ");
  if (!t) return "Attachment";
  return t.length > 38 ? `${t.slice(0, 38)}…` : t;
}
// Drop heavy image data before writing to localStorage (quota), keep a marker.
function stripImages(content: Content): Content {
  if (typeof content === "string") return content;
  return content.map((p) => (p.type === "image_url" ? { type: "image_url", image_url: { url: "" } } : p));
}

export function Chat({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [attaches, setAttaches] = useState<Attach[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const active = threads.find((t) => t.id === activeId);
  const messages = active?.messages ?? [];
  const ordered = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let list: Thread[] = [];
      try {
        const res = await fetch(`/api/agents/${agentId}/threads`, { cache: "no-store" });
        if (res.ok) list = ((await res.json()) as { threads?: Thread[] }).threads ?? [];
      } catch {
        /* offline — start fresh */
      }
      if (cancelled) return;
      const first = list[0];
      if (first) {
        setThreads(list);
        setActiveId(first.id);
      } else {
        const fresh: Thread = { id: uid(), title: "New chat", messages: [], updatedAt: Date.now() };
        setThreads([fresh]);
        setActiveId(fresh.id);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  useEffect(() => {
    if (!loaded || !active || active.messages.length === 0) return;
    const body = JSON.stringify({
      id: active.id,
      title: active.title,
      messages: active.messages.map((m) => ({ ...m, content: stripImages(m.content) })),
    });
    const t = setTimeout(() => {
      void fetch(`/api/agents/${agentId}/threads`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [active, loaded, agentId]);

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
      updateThread(threadId, (msgs) =>
        asText(msgs[msgs.length - 1]?.content ?? "") ? msgs : msgs.slice(0, -1),
      );
      if (!aborted) setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function buildContent(text: string, atts: Attach[]): Content {
    const docs = atts.filter((a) => a.kind === "text" && a.text);
    const imgs = atts.filter((a) => a.kind === "image" && a.dataUrl);
    let full = text;
    for (const d of docs) full += `${full ? "\n\n" : ""}--- ${d.name} ---\n${d.text}`;
    if (imgs.length === 0) return full;
    const parts: Part[] = [{ type: "text", text: full || "(see attached image)" }];
    for (const img of imgs) parts.push({ type: "image_url", image_url: { url: img.dataUrl! } });
    return parts;
  }

  function send() {
    const text = input.trim();
    const ready = attaches.filter((a) => a.status === "ready");
    if ((!text && ready.length === 0) || busy || !active) return;
    const content = buildContent(text, ready);
    setInput("");
    setAttaches([]);
    requestAnimationFrame(autoGrow);
    void runTurn(active.id, [...messages, { role: "user", content }]);
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isText = file.type.startsWith("text/") || file.type === "application/json" || TEXT_RE.test(file.name);
      if (!isImage && !isText) {
        setError(`${file.name}: PDFs & Word are coming next — for now attach images or text/CSV/code files.`);
        continue;
      }
      if (file.size > MAX_FILE) {
        setError(`${file.name} is too large (max 8 MB).`);
        continue;
      }
      const id = uid();
      setAttaches((a) => [...a, { id, name: file.name, kind: isImage ? "image" : "text", status: "loading" }]);
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? "");
        setAttaches((a) =>
          a.map((x) =>
            x.id === id
              ? { ...x, status: "ready", ...(isImage ? { dataUrl: result } : { text: result }) }
              : x,
          ),
        );
      };
      reader.onerror = () => setAttaches((a) => a.map((x) => (x.id === id ? { ...x, status: "error" } : x)));
      if (isImage) reader.readAsDataURL(file);
      else reader.readAsText(file);
    }
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
    setAttaches([]);
  }

  function selectThread(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
    setError(null);
    setEditIdx(null);
  }

  function deleteThread(id: string) {
    void fetch(`/api/agents/${agentId}/threads?threadId=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
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
      send();
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
                  Hi! I&apos;m {agentName} 👋 — your AI assistant. I remember our conversations, can
                  read images and files you attach, and help with everyday work: drafting,
                  summarizing, research, and tracking tasks. What can I help you with?
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pl-10">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setInput(ex);
                      requestAnimationFrame(() => {
                        autoGrow();
                        taRef.current?.focus();
                      });
                    }}
                    disabled={busy}
                    className="border-2 border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-cloud disabled:opacity-50"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            if (m.role === "user") {
              const text = asText(m.content);
              const imgs = asImages(m.content);
              if (editIdx === i) {
                return (
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
                );
              }
              return (
                <div key={i} className="group flex justify-end">
                  <div className="flex max-w-[88%] items-start gap-1.5">
                    {!busy && typeof m.content === "string" && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditIdx(i);
                          setEditText(text);
                        }}
                        className="mt-1.5 shrink-0 text-faint opacity-0 transition hover:text-ink group-hover:opacity-100"
                        title="Edit & resend"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="border-2 border-ink bg-ink px-3.5 py-2.5 text-sm text-paper">
                      {imgs.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {imgs.map((src, k) =>
                            src ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={k}
                                src={src}
                                alt="attachment"
                                className="max-h-40 max-w-[12rem] border border-paper/30 object-cover"
                              />
                            ) : (
                              <span
                                key={k}
                                className="inline-flex items-center gap-1 border border-paper/30 px-2 py-1 text-xs text-paper/70"
                              >
                                <FileText className="h-3 w-3" /> image
                              </span>
                            ),
                          )}
                        </div>
                      )}
                      {text && <div className="whitespace-pre-wrap">{text}</div>}
                    </div>
                  </div>
                </div>
              );
            }
            const text = asText(m.content);
            return (
              <div key={i} className="group flex gap-3">
                <AgntosMark className="mt-0.5 h-7 w-7 shrink-0" />
                <div className="min-w-0 max-w-[88%]">
                  <div className="border-2 border-line bg-paper px-3.5 py-2.5">
                    {text ? (
                      <div className="chat-md">
                        <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
                      </div>
                    ) : (
                      <Dots />
                    )}
                  </div>
                  {text && !(busy && i === messages.length - 1) && (
                    <div className="mt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void copy(text, i)}
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
            );
          })}
        </div>

        {error && (
          <p className="border-t-2 border-coral bg-coral/20 px-4 py-2 font-mono text-xs text-ink">
            {error}
          </p>
        )}

        {/* attachment tray */}
        {attaches.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t-2 border-hair px-3 pt-2.5">
            {attaches.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 border-2 border-line bg-cloud py-1 pl-2 pr-1 text-xs text-ink"
              >
                {a.kind === "image" && a.dataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.dataUrl} alt="" className="h-5 w-5 border border-line object-cover" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-faint" />
                )}
                <span className="max-w-[10rem] truncate">{a.name}</span>
                {a.status === "loading" && <span className="text-faint">…</span>}
                {a.status === "error" && <span className="text-coral">!</span>}
                <button
                  type="button"
                  onClick={() => setAttaches((p) => p.filter((x) => x.id !== a.id))}
                  className="text-faint hover:text-coral"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="flex items-end gap-2 border-t-2 border-line p-3">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,text/*,.md,.csv,.tsv,.json,.yaml,.yml,.log,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.rb,.go,.rs,.java,.c,.cpp,.sh,.sql"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            title="Attach images or files"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center border-2 border-line bg-paper text-ink transition-colors hover:bg-cloud disabled:opacity-40"
          >
            <Paperclip className="h-4 w-4" />
          </button>
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
              onClick={send}
              disabled={!input.trim() && attaches.filter((a) => a.status === "ready").length === 0}
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

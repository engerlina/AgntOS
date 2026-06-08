"use client";

import { Check, Copy, Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AgntosMark } from "@/components/brand";

type Msg = { role: "user" | "assistant"; content: string };

const EXAMPLES = [
  "What can you help me with?",
  "Draft a quick email for me",
  "Summarize some text for me",
];

export function Chat({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep the latest content in view as it streams in.
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

  async function sendText(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    setError(null);
    const base: Msg[] = [...messages, { role: "user", content: text }];
    // Placeholder assistant message we stream tokens into.
    setMessages([...base, { role: "assistant", content: "" }]);
    setInput("");
    requestAnimationFrame(autoGrow);
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
            const json = JSON.parse(payload) as {
              choices?: { delta?: { content?: string } }[];
            };
            const delta = json.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              acc += delta;
              setMessages((m) => {
                const copy = m.slice();
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            /* ignore keep-alives / partial lines */
          }
        }
      }
      if (!acc.trim()) {
        setMessages((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = { role: "assistant", content: "_(no response)_" };
          return copy;
        });
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      // Keep a partial reply; otherwise drop the empty placeholder.
      setMessages((m) => (m[m.length - 1]?.content ? m : m.slice(0, -1)));
      if (!aborted) setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    void sendText(input);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void sendText(input);
    }
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

  return (
    <div className="flex h-[75vh] flex-col border-2 border-line bg-paper">
      {/* header */}
      <div className="flex items-center gap-2 border-b-2 border-line bg-ink px-4 py-2.5">
        <span className="h-2.5 w-2.5 bg-lime" />
        <span className="font-mono text-xs font-semibold text-lime">{agentName} · web chat</span>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex gap-3">
              <AgntosMark className="mt-0.5 h-7 w-7 shrink-0" />
              <div className="max-w-[88%] border-2 border-line bg-cloud px-3.5 py-2.5 text-sm text-ink">
                Hi! I&apos;m {agentName} 👋 — your AI assistant. I remember our conversations and can
                help with everyday work: drafting messages, summarizing, research, and keeping track
                of tasks. What can I help you with?
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-10">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => void sendText(ex)}
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
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap border-2 border-ink bg-ink px-3.5 py-2.5 text-sm text-paper">
                {m.content}
              </div>
            </div>
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
                  <button
                    type="button"
                    onClick={() => void copy(m.content, i)}
                    className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-faint opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
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

      {/* composer */}
      <form onSubmit={send} className="flex items-end gap-2 border-t-2 border-line p-3">
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
            type="submit"
            disabled={!input.trim()}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 border-2 border-ink bg-lime px-4 text-sm font-semibold text-ink hover:bg-lime-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" /> Send
          </button>
        )}
      </form>
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

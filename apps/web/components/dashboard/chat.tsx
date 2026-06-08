"use client";

import { useState } from "react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

export function Chat({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendText(raw: string) {
    const text = raw.trim();
    if (!text || pending) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Chat failed");
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "(no response)" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setPending(false);
    }
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    void sendText(input);
  }

  const examples = [
    "What can you help me with?",
    "Draft a quick email for me",
    "Summarize some text for me",
  ];

  return (
    <div className="flex h-[70vh] flex-col border-2 border-line bg-paper">
      <div className="flex items-center gap-2 border-b-2 border-line bg-ink px-4 py-2.5">
        <span className="h-2.5 w-2.5 bg-lime" />
        <span className="font-mono text-xs font-semibold text-lime">{agentName} · web chat</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex justify-start">
              <span className="max-w-[85%] whitespace-pre-wrap border-2 border-line bg-lime px-3 py-2 text-sm text-ink">
                Hi! I&apos;m {agentName} 👋 — your AI assistant. I remember our conversations and can
                help with everyday work: drafting messages, summarizing, research, and keeping track
                of tasks. What can I help you with?
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => void sendText(ex)}
                  disabled={pending}
                  className="border-2 border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-cloud disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <span
              className={cn(
                "max-w-[80%] whitespace-pre-wrap border-2 border-line px-3 py-2 text-sm text-ink",
                m.role === "user" ? "bg-paper" : "bg-lime",
              )}
            >
              {m.content}
            </span>
          </div>
        ))}
        {pending && (
          <p className="text-center font-mono text-xs text-faint">{agentName} is thinking…</p>
        )}
      </div>

      {error && (
        <p className="border-t-2 border-coral bg-coral/20 px-4 py-2 font-mono text-xs text-ink">
          {error}
        </p>
      )}

      <form onSubmit={send} className="flex gap-2 border-t-2 border-line p-3">
        <input
          className="field flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${agentName}…`}
          disabled={pending}
        />
        <Button type="submit" variant="dark" disabled={pending || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}

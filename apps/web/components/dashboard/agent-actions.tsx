"use client";

import { ExternalLink, Pause, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AgentStatus } from "@agntos/db";

export function AgentActions({
  id,
  status,
  telegramRef,
}: {
  id: string;
  status: AgentStatus;
  telegramRef: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(path: string, method: "POST" | "DELETE") {
    setBusy(path);
    try {
      const res = await fetch(`/api/agents/${id}${path}`, { method });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Action failed");
      if (method === "DELETE") {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const isRunning = status === "running";
  const isPaused = status === "paused" || status === "stopped";
  const chatUrl = telegramRef ? `https://t.me/${telegramRef.replace(/^@/, "")}` : null;
  const disabled = !!busy || pending;

  return (
    <div className="flex flex-wrap gap-2">
      {chatUrl && (
        <a href={chatUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
          Open chat <ExternalLink className="h-4 w-4" />
        </a>
      )}
      {isRunning && (
        <button className="btn btn-ghost" disabled={disabled} onClick={() => act("/pause", "POST")}>
          <Pause className="h-4 w-4" /> Pause
        </button>
      )}
      {isPaused && (
        <button className="btn btn-ghost" disabled={disabled} onClick={() => act("/resume", "POST")}>
          <Play className="h-4 w-4" /> Resume
        </button>
      )}
      <button
        className="btn btn-danger ml-auto"
        disabled={disabled}
        onClick={() => {
          if (confirm("Delete this agent? This wipes its memory and skills permanently.")) {
            act("", "DELETE");
          }
        }}
      >
        <Trash2 className="h-4 w-4" /> Delete
      </button>
    </div>
  );
}

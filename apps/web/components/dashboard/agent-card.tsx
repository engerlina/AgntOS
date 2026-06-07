"use client";

import { ExternalLink, Loader2, Pause, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AgentStatus } from "@agntos/db";

import { Card, StatusChip } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface AgentView {
  id: string;
  name: string;
  tier: "starter" | "pro";
  model: "standard" | "smart";
  status: AgentStatus;
  statusDetail: string | null;
  region: string | null;
  telegramRef: string | null;
  createdAt: string;
}

export function AgentCard({ agent }: { agent: AgentView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  // Poll while the agent is still coming up so the UI reflects readiness.
  useEffect(() => {
    if (agent.status !== "provisioning") return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [agent.status, router]);

  async function act(path: string, method: "POST" | "DELETE") {
    setBusy(path);
    try {
      const res = await fetch(`/api/agents/${agent.id}${path}`, { method });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Action failed");
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const isRunning = agent.status === "running";
  const isPaused = agent.status === "paused" || agent.status === "stopped";
  const chatUrl = agent.telegramRef ? `https://t.me/${agent.telegramRef.replace(/^@/, "")}` : null;

  return (
    <Card large className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl">
            <Link href={`/dashboard/agents/${agent.id}`} className="no-underline hover:underline">
              {agent.name}
            </Link>
          </h3>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-faint">
            {agent.tier} · {agent.model} model{agent.region ? ` · ${agent.region}` : ""}
          </p>
        </div>
        <StatusChip status={agent.status} />
      </div>

      {agent.status === "provisioning" && (
        <p className="mt-4 flex items-center gap-2 border-2 border-line bg-cloud px-3 py-2 font-mono text-xs text-ink">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {agent.statusDetail ?? "Spinning up your micro-VM and booting Hermes…"}
        </p>
      )}
      {agent.status === "error" && (
        <p className="mt-4 border-2 border-coral bg-coral/20 px-3 py-2 font-mono text-xs text-ink">
          {agent.statusDetail ?? "Provisioning failed. We'll retry automatically."}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {chatUrl && (
          <a
            href={chatUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            Open chat <ExternalLink className="h-4 w-4" />
          </a>
        )}
        {isRunning && (
          <button
            className="btn btn-ghost"
            disabled={!!busy || pending}
            onClick={() => act("/pause", "POST")}
          >
            <Pause className="h-4 w-4" /> Pause
          </button>
        )}
        {isPaused && (
          <button
            className="btn btn-ghost"
            disabled={!!busy || pending}
            onClick={() => act("/resume", "POST")}
          >
            <Play className="h-4 w-4" /> Resume
          </button>
        )}
        <button
          className={cn("btn btn-danger ml-auto")}
          disabled={!!busy || pending}
          onClick={() => {
            if (confirm(`Delete ${agent.name}? This wipes its memory and skills permanently.`)) {
              act("", "DELETE");
            }
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </Card>
  );
}

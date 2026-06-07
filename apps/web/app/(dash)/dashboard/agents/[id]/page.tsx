import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatUsd } from "@agntos/core";
import { db, desc, eq, sql, usageEvent } from "@agntos/db";

import { AgentActions } from "@/components/dashboard/agent-actions";
import { Card, Eyebrow, StatusChip } from "@/components/ui";
import { channelsForAgents, getAgentForUser } from "@/lib/agents";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Agent" };

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const agent = await getAgentForUser(user.id, id);
  if (!agent) notFound();

  const [channels, spend, recent] = await Promise.all([
    channelsForAgents([id]),
    db
      .select({ total: sql<number>`coalesce(sum(${usageEvent.costMc}), 0)` })
      .from(usageEvent)
      .where(eq(usageEvent.agentId, id)),
    db
      .select()
      .from(usageEvent)
      .where(eq(usageEvent.agentId, id))
      .orderBy(desc(usageEvent.occurredAt))
      .limit(8),
  ]);

  const telegram = channels.find((c) => c.type === "telegram");
  const telegramRef = telegram?.externalRef ?? null;
  const totalSpentMc = Number(spend[0]?.total ?? 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Agents
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl">{agent.name}</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-faint">
            {agent.tier} · {agent.model} model{agent.region ? ` · ${agent.region}` : ""}
          </p>
        </div>
        <StatusChip status={agent.status} />
      </div>

      <div className="mt-6">
        <AgentActions id={agent.id} status={agent.status} telegramRef={telegramRef} />
      </div>

      {agent.status === "error" && agent.statusDetail && (
        <p className="mt-6 border-2 border-coral bg-coral/20 px-3 py-2 font-mono text-xs text-ink">
          {agent.statusDetail}
        </p>
      )}

      {/* Overview */}
      <Card className="mt-6">
        <Eyebrow>Overview</Eyebrow>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Stat label="Tier" value={agent.tier} />
          <Stat label="Model" value={`${agent.model} (${agent.model === "smart" ? "Smart" : "Standard"})`} />
          <Stat label="Memory" value={`${agent.ramMb / 1024} GB`} />
          <Stat label="Region" value={agent.region ?? "—"} />
          <Stat label="Created" value={agent.createdAt.toLocaleDateString()} />
          <Stat label="Spent (this agent)" value={formatUsd(totalSpentMc)} />
        </dl>
      </Card>

      {/* Access */}
      <Card className="mt-6">
        <Eyebrow>Access</Eyebrow>
        <div className="mt-3 space-y-3 text-sm">
          {telegramRef ? (
            <div className="flex items-center justify-between border-2 border-line bg-cloud px-3 py-2">
              <span>
                Telegram —{" "}
                <span className="font-mono text-ink">@{telegramRef.replace(/^@/, "")}</span>
              </span>
              <a
                href={`https://t.me/${telegramRef.replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-ink hover:underline"
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <p className="text-muted">
              No channel connected yet. Connect Telegram from onboarding, or use web chat once it&apos;s
              enabled for your agent.
            </p>
          )}
          {agent.status === "running" && agent.publicUrl ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-line bg-cloud px-3 py-2">
              <span>
                Web chat{agent.slug ? <> — <span className="font-mono text-ink">{agent.slug}.agntos.net</span></> : null}
              </span>
              <Link href={`/dashboard/agents/${agent.id}/chat`} className="btn btn-primary">
                Open web chat
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between border-2 border-dashed border-hair px-3 py-2 text-faint">
              <span>Web chat{agent.slug ? ` — ${agent.slug}.agntos.net` : ""}</span>
              <span className="font-mono text-xs uppercase tracking-wide">when running</span>
            </div>
          )}
        </div>
      </Card>

      {/* Usage */}
      <Card className="mt-6">
        <Eyebrow>Recent usage</Eyebrow>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-faint">No metered usage yet.</p>
        ) : (
          <ul className="mt-3 divide-y-2 divide-hair">
            {recent.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-mono text-xs text-faint">{u.occurredAt.toLocaleString()}</span>
                <span className="font-mono font-semibold text-coral">−{formatUsd(u.costMc)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Technical / operator */}
      <details className="mt-6 border-2 border-line bg-paper">
        <summary className="cursor-pointer px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wide text-muted">
          Technical details
        </summary>
        <dl className="space-y-2 px-4 pb-4 font-mono text-xs">
          <Tech label="Agent ID" value={agent.id} />
          <Tech label="Fly app" value={agent.flyAppId ?? "—"} />
          <Tech label="Fly machine" value={agent.flyMachineId ?? "—"} />
          <Tech label="Fly volume" value={agent.flyVolumeId ?? "—"} />
          <Tech label="OpenRouter key" value={agent.openrouterKeyHash ?? "—"} />
        </dl>
      </details>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-faint">{label}</dt>
      <dd className="mt-0.5 capitalize text-ink">{value}</dd>
    </div>
  );
}

function Tech({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-faint">{label}</dt>
      <dd className="truncate text-ink">{value}</dd>
    </div>
  );
}

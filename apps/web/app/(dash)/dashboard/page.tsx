import { Plus } from "lucide-react";
import Link from "next/link";

import { formatUsd } from "@agntos/core";
import { getBalance } from "@agntos/core/billing";

import { AgentCard, type AgentView } from "@/components/dashboard/agent-card";
import { ButtonLink, Card, Eyebrow } from "@/components/ui";
import { channelsForAgents, listAgents } from "@/lib/agents";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requireUser();
  const [agents, balanceMc] = await Promise.all([listAgents(user.id), getBalance(user.id)]);
  const channels = await channelsForAgents(agents.map((a) => a.id));

  const telegramByAgent = new Map<string, string>();
  for (const c of channels) {
    if (c.type === "telegram" && c.externalRef) telegramByAgent.set(c.agentId, c.externalRef);
  }

  const views: AgentView[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    tier: a.tier,
    model: a.model,
    status: a.status,
    statusDetail: a.statusDetail,
    region: a.region,
    telegramRef: telegramByAgent.get(a.id) ?? null,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div>
      {/* Wallet strip */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 border-2 border-line bg-paper px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <Eyebrow>Wallet balance</Eyebrow>
          <p className="mt-1 font-mono text-3xl font-bold text-ink">{formatUsd(balanceMc)}</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/dashboard/wallet" variant="ghost">
            Manage wallet
          </ButtonLink>
          <ButtonLink href="/onboarding" variant="dark">
            <Plus className="h-4 w-4" /> New agent
          </ButtonLink>
        </div>
      </div>

      <div className="mb-6 flex items-end justify-between">
        <div>
          <Eyebrow>Your agents</Eyebrow>
          <h1 className="mt-2 text-3xl">
            {agents.length === 0 ? "No agents yet" : `${agents.length} agent${agents.length > 1 ? "s" : ""}`}
          </h1>
        </div>
      </div>

      {agents.length === 0 ? (
        <Card large className="text-center">
          <h2 className="text-2xl">Launch your first agent</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Give it a name and personality, connect Telegram, and it&apos;ll be live in under two
            minutes — ready for your first message.
          </p>
          <ButtonLink href="/onboarding" variant="primary" className="mt-6">
            <Plus className="h-4 w-4" /> Create an agent
          </ButtonLink>
          <p className="mt-4 font-mono text-xs text-faint">
            No active plan yet?{" "}
            <Link href="/dashboard/billing" className="font-semibold text-ink">
              Choose Starter or Pro →
            </Link>
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {views.map((v) => (
            <AgentCard key={v.id} agent={v} />
          ))}
        </div>
      )}
    </div>
  );
}

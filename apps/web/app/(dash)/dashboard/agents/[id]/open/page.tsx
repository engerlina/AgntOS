import { createHash } from "node:crypto";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { decryptSecret } from "@agntos/core/crypto";

import { DashboardLauncher } from "@/components/dashboard/dashboard-launcher";
import { getAgentForUser } from "@/lib/agents";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Opening dashboard…" };

export default async function OpenDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const agent = await getAgentForUser(user.id, id);
  if (!agent || !agent.slug) notFound();

  // Derive the one-time login token (matches the agent's Caddy `dash_ok` value =
  // first 32 hex of sha256(password)). Passed in the query string — NOT as URL
  // credentials, which is what breaks the dashboard's relative fetches.
  let cookieKey = "";
  if (agent.dashboardPasswordCipher) {
    try {
      const password = await decryptSecret(agent.dashboardPasswordCipher);
      cookieKey = createHash("sha256").update(password).digest("hex").slice(0, 32);
    } catch {
      /* cert/password not ready — launcher will still poll + show progress */
    }
  }

  return (
    <DashboardLauncher
      agentId={agent.id}
      agentName={agent.name}
      slug={agent.slug}
      cookieKey={cookieKey}
    />
  );
}

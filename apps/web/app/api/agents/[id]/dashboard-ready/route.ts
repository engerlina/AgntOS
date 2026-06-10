import { NextResponse } from "next/server";

import { AGENT_DOMAIN } from "@agntos/core/cloudflare";
import { decryptSecret } from "@agntos/core/crypto";

import { getAgentForUser } from "@/lib/agents";
import { getSession } from "@/lib/session";

export const maxDuration = 15;

/**
 * Is the agent's Hermes dashboard actually reachable yet? The launch interstitial
 * polls this so we only redirect once the dashboard responds (boot + cert + Caddy
 * can lag the DB "running" by a bit).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ ready: false }, { status: 401 });

  const { id } = await params;
  const agent = await getAgentForUser(session.user.id, id);
  if (!agent || !agent.slug) return NextResponse.json({ ready: false, status: "unknown" });
  if (agent.status !== "running") {
    return NextResponse.json({ ready: false, status: agent.status });
  }

  try {
    const pw = agent.dashboardPasswordCipher ? await decryptSecret(agent.dashboardPasswordCipher) : "";
    const auth = "Basic " + Buffer.from(`agent:${pw}`).toString("base64");
    const res = await fetch(`https://${agent.slug}.${AGENT_DOMAIN}/`, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return NextResponse.json({ ready: res.ok, status: "running" });
  } catch {
    return NextResponse.json({ ready: false, status: "running" });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { decryptSecret } from "@agntos/core/crypto";

import { getAgentForUser } from "@/lib/agents";
import { getSession } from "@/lib/session";

// Agent responses can take a while; allow up to 60s (Vercel Pro). On Hobby this
// is capped at ~10s — switch to streaming if you hit that.
export const maxDuration = 60;

const Schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() }))
    .min(1),
});

/**
 * Proxy a chat turn to the agent's Hermes API server. The per-agent key is
 * decrypted server-side and never reaches the browser; the user is authorized by
 * their AgntOS session owning the agent.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const agent = await getAgentForUser(session.user.id, id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (agent.status !== "running") {
    return NextResponse.json({ error: `Agent is ${agent.status}.` }, { status: 409 });
  }
  if (!agent.publicUrl || !agent.webPasswordCipher) {
    return NextResponse.json({ error: "Web chat isn't ready for this agent yet." }, { status: 409 });
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const apiKey = await decryptSecret(agent.webPasswordCipher);

  let res: Response;
  try {
    res = await fetch(`${agent.publicUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "hermes-agent",
        messages: parsed.data.messages,
        stream: false,
      }),
      signal: AbortSignal.timeout(55_000),
    });
  } catch (e) {
    return NextResponse.json({ error: "Couldn't reach the agent.", detail: String(e) }, { status: 504 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json({ error: "Agent returned an error.", detail }, { status: 502 });
  }

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
  };
  const reply = data.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ reply });
}

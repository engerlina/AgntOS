import { NextResponse } from "next/server";
import { z } from "zod";

import { decryptSecret } from "@agntos/core/crypto";

import { getAgentForUser } from "@/lib/agents";
import { getSession } from "@/lib/session";

// Streaming responses; allow up to 60s for the model to finish.
export const maxDuration = 60;

const Schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() }))
    .min(1),
});

/**
 * Proxy a chat turn to the agent's Hermes API server and STREAM the reply back
 * (OpenAI-style SSE) so the browser can render tokens as they arrive. The
 * per-agent key is decrypted server-side and never reaches the browser; the user
 * is authorized by their AgntOS session owning the agent.
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

  let upstream: Response;
  try {
    upstream = await fetch(`${agent.publicUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "hermes-agent",
        messages: parsed.data.messages,
        stream: true,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Couldn't reach the agent.", detail: String(e) },
      { status: 504 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json({ error: "Agent returned an error.", detail }, { status: 502 });
  }

  // Pipe the upstream SSE straight through to the browser.
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

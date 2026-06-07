import { NextResponse } from "next/server";
import { z } from "zod";

import { createAndProvisionAgent, getActiveTier, listAgents } from "@/lib/agents";
import { getSession } from "@/lib/session";

const CreateSchema = z.object({
  name: z.string().min(1).max(60),
  personality: z.string().max(2000).optional(),
  telegramBotToken: z.string().min(20).optional(),
  telegramRef: z.string().max(120).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const agents = await listAgents(session.user.id);
  return NextResponse.json({ agents });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const tier = await getActiveTier(session.user.id);
  if (!tier) {
    return NextResponse.json(
      { error: "No active subscription. Choose a plan first." },
      { status: 402 },
    );
  }

  const agent = await createAndProvisionAgent(session.user.id, {
    name: parsed.data.name,
    personality: parsed.data.personality,
    tier,
    telegram: parsed.data.telegramBotToken
      ? { botToken: parsed.data.telegramBotToken, ref: parsed.data.telegramRef }
      : undefined,
  });

  return NextResponse.json({ agent }, { status: 201 });
}

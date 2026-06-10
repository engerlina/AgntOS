import { NextResponse } from "next/server";

import { destroyAgent, getAgentForUser, toPublicAgent } from "@/lib/agents";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const agent = await getAgentForUser(session.user.id, id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ agent: toPublicAgent(agent) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const agent = await destroyAgent(session.user.id, id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

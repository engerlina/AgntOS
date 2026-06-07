import { NextResponse } from "next/server";

import { connectTelegram, disconnectTelegram } from "@/lib/agents";
import { getSession } from "@/lib/session";

/** Connect a Telegram bot to the agent. Body: { botToken, ref? }. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { botToken?: string; ref?: string };
  const botToken = (body.botToken ?? "").trim();
  const ref = body.ref?.trim().replace(/^@/, "") || undefined;

  // Telegram tokens look like `123456789:AA...` — validate shape before we act.
  if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(botToken)) {
    return NextResponse.json(
      { error: "That doesn't look like a Telegram bot token. Get one from @BotFather." },
      { status: 400 },
    );
  }

  const row = await connectTelegram(session.user.id, id, { botToken, ref });
  if (!row) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** Disconnect Telegram from the agent. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await disconnectTelegram(session.user.id, id);
  if (!row) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

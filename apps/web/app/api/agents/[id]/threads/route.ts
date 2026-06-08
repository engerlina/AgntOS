import { NextResponse } from "next/server";
import { z } from "zod";

import { and, chatThread, db, desc, eq } from "@agntos/db";

import { getAgentForUser } from "@/lib/agents";
import { getSession } from "@/lib/session";

const ThreadSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().max(200).default("New chat"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.union([z.string(), z.array(z.unknown())]),
      }),
    )
    .max(500),
});

async function authorize(id: string) {
  const session = await getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const agent = await getAgentForUser(session.user.id, id);
  if (!agent) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { ok: true as const };
}

/** List this agent's saved conversations (newest first). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if ("error" in auth) return auth.error;

  const rows = await db
    .select({
      id: chatThread.id,
      title: chatThread.title,
      messages: chatThread.messages,
      updatedAt: chatThread.updatedAt,
    })
    .from(chatThread)
    .where(eq(chatThread.agentId, id))
    .orderBy(desc(chatThread.updatedAt))
    .limit(100);

  return NextResponse.json({
    threads: rows.map((r) => ({
      id: r.id,
      title: r.title,
      messages: r.messages,
      updatedAt: r.updatedAt.getTime(),
    })),
  });
}

/** Create or update a conversation. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if ("error" in auth) return auth.error;

  const parsed = ThreadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { id: threadId, title, messages } = parsed.data;

  await db
    .insert(chatThread)
    .values({ id: threadId, agentId: id, title, messages, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: chatThread.id,
      set: { title, messages, updatedAt: new Date() },
      where: eq(chatThread.agentId, id), // never touch another agent's thread
    });

  return NextResponse.json({ ok: true });
}

/** Delete a conversation. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if ("error" in auth) return auth.error;

  const threadId = new URL(req.url).searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });

  await db.delete(chatThread).where(and(eq(chatThread.id, threadId), eq(chatThread.agentId, id)));
  return NextResponse.json({ ok: true });
}

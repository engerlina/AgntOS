import { NextResponse } from "next/server";

import { resumeAgent } from "@/lib/agents";
import { getSession } from "@/lib/session";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const res = await resumeAgent(session.user.id, id);
  if (!res.ok) {
    if (res.reason === "not_found") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(
      { error: "An active plan is required to resume your agent." },
      { status: 402 },
    );
  }
  return NextResponse.json({ ok: true });
}

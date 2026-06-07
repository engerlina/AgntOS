import { NextResponse } from "next/server";

import { sql } from "drizzle-orm";

import { db } from "@agntos/db";

/** Liveness + DB connectivity probe (used by uptime monitoring). */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: "up" });
  } catch (err) {
    return NextResponse.json({ ok: false, db: "down", error: String(err) }, { status: 503 });
  }
}

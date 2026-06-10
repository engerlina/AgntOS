import { NextResponse } from "next/server";

// Import `sql` from @agntos/db (not drizzle-orm directly) so it shares the same
// drizzle instance as `db` — otherwise peer-variant duplication breaks the types.
import { db, sql } from "@agntos/db";

/** Liveness + DB connectivity probe (used by uptime monitoring). */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: "up" });
  } catch (err) {
    return NextResponse.json({ ok: false, db: "down", error: String(err) }, { status: 503 });
  }
}

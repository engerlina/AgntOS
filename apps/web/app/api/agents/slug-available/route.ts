import { NextResponse } from "next/server";

import { slugAvailable } from "@/lib/agents";
import { getSession } from "@/lib/session";
import { slugError } from "@/lib/slug";

/** Live availability check for the onboarding handle field. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = (new URL(req.url).searchParams.get("slug") ?? "").toLowerCase();
  const err = slugError(slug);
  if (err) return NextResponse.json({ available: false, reason: err });

  const available = await slugAvailable(slug);
  return NextResponse.json({ available, reason: available ? null : "Already taken." });
}

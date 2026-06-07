import { NextResponse } from "next/server";

import { env, hasEnv } from "@agntos/core";
import { createPortalSession } from "@agntos/core/stripe";
import { db, eq, user } from "@agntos/db";

import { getSession } from "@/lib/session";

export async function POST() {
  if (!hasEnv("STRIPE_SECRET_KEY")) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [row] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!row?.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer yet." }, { status: 409 });
  }

  const url = await createPortalSession({
    stripeCustomerId: row.stripeCustomerId,
    returnUrl: `${env().BETTER_AUTH_URL}/dashboard/billing`,
  });
  return NextResponse.json({ url });
}

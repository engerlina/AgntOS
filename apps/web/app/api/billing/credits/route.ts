import { NextResponse } from "next/server";
import { z } from "zod";

import { env, hasEnv } from "@agntos/core";
import { createCreditCheckout } from "@agntos/core/stripe";
import { db, eq, user } from "@agntos/db";

import { getSession } from "@/lib/session";

const Schema = z.object({
  amountUsd: z.number().int().min(Number(env().CREDIT_PACK_MIN_USD)).max(1000),
});

export async function POST(req: Request) {
  if (!hasEnv("STRIPE_SECRET_KEY")) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const [row] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!row?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer. Subscribe to a plan first." },
      { status: 409 },
    );
  }

  const base = env().BETTER_AUTH_URL;
  const url = await createCreditCheckout({
    userId: session.user.id,
    stripeCustomerId: row.stripeCustomerId,
    amountUsd: parsed.data.amountUsd,
    successUrl: `${base}/dashboard/wallet?topup=success`,
    cancelUrl: `${base}/dashboard/wallet?topup=cancelled`,
  });

  return NextResponse.json({ url });
}

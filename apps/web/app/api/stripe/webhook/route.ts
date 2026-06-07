import { NextResponse } from "next/server";

import { env, hasEnv, log } from "@agntos/core";
import { stripe } from "@agntos/core/stripe";

import { handleStripeEvent } from "@/lib/stripe-events";

/**
 * Standalone Stripe webhook. OPTIONAL — the Better Auth Stripe plugin already
 * receives events at /api/auth/stripe/webhook and forwards them to the same
 * handler. Use THIS route only if you prefer a dedicated endpoint (configure a
 * second Stripe webhook + put its signing secret in STRIPE_WEBHOOK_SECRET).
 * Fulfilment is idempotent, so even if both fire, the wallet is credited once.
 */
export async function POST(req: Request): Promise<Response> {
  if (!hasEnv("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET")) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const payload = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, env().STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    log.warn("stripe webhook signature verification failed", { error: String(err) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    log.error("stripe webhook handler failed", { type: event.type, error: String(err) });
    // 500 → Stripe retries; our handlers are idempotent so retries are safe.
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

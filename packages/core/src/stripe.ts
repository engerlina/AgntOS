/**
 * Shared Stripe client. The @better-auth/stripe plugin handles subscriptions and
 * owns the single webhook endpoint; this client is used for (a) one-time credit
 * pack Checkout sessions and (b) the customer portal. Credit-pack fulfilment is
 * handled in the plugin's `onEvent` hook (see apps/web/lib/auth.ts) so there is
 * exactly one webhook + one signing secret.
 *
 * We intentionally do NOT pin `apiVersion` here — the installed SDK ships a
 * sensible default. Pin it (matching your SDK's `LatestApiVersion`) before going
 * live if you want version stability across SDK upgrades.
 */
import Stripe from "stripe";

import { env, requireEnv } from "./env";

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  cached = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    appInfo: { name: "AgntOS", url: "https://agntos.io" },
    typescript: true,
  });
  return cached;
}

export interface CreditCheckoutInput {
  userId: string;
  stripeCustomerId: string;
  amountUsd: number;
  successUrl: string;
  cancelUrl: string;
}

/**
 * One-time Checkout session for a wallet top-up. Metadata carries everything the
 * webhook needs to credit the right wallet. Stripe Tax is enabled so GST/VAT/US
 * sales tax is applied at checkout (also enable it in the Stripe dashboard).
 */
export async function createCreditCheckout(input: CreditCheckoutInput): Promise<string> {
  const s = stripe();
  const amountCents = Math.round(input.amountUsd * 100);

  const session = await s.checkout.sessions.create({
    mode: "payment",
    customer: input.stripeCustomerId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    automatic_tax: { enabled: true },
    customer_update: { address: "auto" },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `AgntOS credits — $${input.amountUsd.toFixed(2)}`,
            description: "Prepaid model credits for your agent's dollar wallet.",
          },
          tax_behavior: "exclusive",
        },
      },
    ],
    metadata: {
      userId: input.userId,
      kind: "credit_topup",
      amountUsd: String(input.amountUsd),
    },
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  return session.url;
}

/** Customer portal (manage plan, payment method, invoices). */
export async function createPortalSession(args: {
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<string> {
  const session = await stripe().billingPortal.sessions.create({
    customer: args.stripeCustomerId,
    return_url: args.returnUrl,
  });
  return session.url;
}

/** Whether Stripe is configured at all (for graceful UI degradation). */
export function stripeConfigured(): boolean {
  return Boolean(env().STRIPE_SECRET_KEY);
}

import { stripe as stripePlugin } from "@better-auth/stripe";
import { betterAuth, type BetterAuthOptions, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { env, hasEnv, log, stripePlanConfig } from "@agntos/core";
import {
  applyMovement,
  COMP_CREDITS_MC,
  ensureWallet,
  grantCredits,
  isCompEmail,
  PLANS,
} from "@agntos/core/billing";
import { sendEmail } from "@agntos/core/email";
import { stripe as stripeClient } from "@agntos/core/stripe";
import { account, db, session, subscription, user, verification } from "@agntos/db";

import { handleStripeEvent } from "./stripe-events";

const e = env();

// Build plugins conditionally so the app boots before Stripe/OAuth creds exist.
// nextCookies() MUST stay last (it flushes Set-Cookie from Server Actions).
const plugins: BetterAuthPlugin[] = [];

if (hasEnv("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET")) {
  if (stripePlanConfig().length === 0) {
    log.warn(
      "Stripe is configured but no plan price IDs resolved — subscription checkout " +
        "will fail. Set STRIPE_PRICE_STARTER / STRIPE_PRICE_PRO.",
    );
  }
  plugins.push(
    stripePlugin({
      stripeClient: stripeClient(),
      stripeWebhookSecret: e.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      // One webhook to rule them all: the plugin syncs the `subscription` table
      // and forwards every event to our handler for credit packs + lifecycle.
      onEvent: handleStripeEvent,
      subscription: {
        enabled: true,
        plans: stripePlanConfig(),
        // Apply Stripe Tax (GST/VAT/US sales tax) and let customers enter a promo
        // code (e.g. the first-month-free coupon) at subscription checkout.
        getCheckoutSessionParams: () => ({
          params: {
            automatic_tax: { enabled: true },
            allow_promotion_codes: true,
          },
        }),
        onSubscriptionComplete: async ({ subscription: sub }) => {
          log.info("subscription complete", { referenceId: sub.referenceId, plan: sub.plan });
          await grantPlanCredits(sub.referenceId, sub.plan, sub.stripeSubscriptionId);
        },
      },
    }) as unknown as BetterAuthPlugin,
  );
} else {
  log.warn("Stripe not configured — subscriptions/credit packs disabled until env is set.");
}

const socialProviders: BetterAuthOptions["socialProviders"] = hasEnv("GOOGLE_ID", "GOOGLE_SECRET")
  ? { google: { clientId: e.GOOGLE_ID!, clientSecret: e.GOOGLE_SECRET! } }
  : undefined;

plugins.push(nextCookies() as BetterAuthPlugin);

export const auth = betterAuth({
  appName: "AgntOS",
  baseURL: e.BETTER_AUTH_URL,
  secret: e.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, subscription },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user: u, url }) => {
      await sendEmail.passwordReset(u.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user: u, url }) => {
      await sendEmail.verify(u.email, url);
    },
  },
  socialProviders,
  databaseHooks: {
    user: {
      create: {
        after: async (u) => {
          // Provision a wallet + welcome the user as soon as the account exists.
          try {
            await ensureWallet(u.id);
            // Comped accounts get free credits so AgntOS covers their model spend.
            if (isCompEmail(u.email)) {
              await grantCredits({
                userId: u.id,
                amountMc: COMP_CREDITS_MC,
                meta: { reason: "comp_signup" },
              });
              log.info("comp credits granted", { userId: u.id });
            }
            await sendEmail.welcome(u.email, u.name ?? undefined);
          } catch (err) {
            log.error("post-signup hook failed", { userId: u.id, error: String(err) });
          }
        },
      },
    },
  },
  plugins,
});

export type Auth = typeof auth;

/**
 * Grant a plan's advertised "included credits" to the wallet on first activation.
 * Without this a new subscriber's wallet is $0, the agent's OpenRouter key is
 * minted with a $0 cap, and it can't produce a single reply until they top up.
 * Idempotent on the Stripe subscription id so webhook redeliveries can't
 * double-grant (the `sub_grant:` prefix keeps it clear of top-up payment ids).
 */
async function grantPlanCredits(
  userId: string,
  plan: string,
  stripeSubscriptionId: string | undefined,
): Promise<void> {
  const tier = plan === "pro" ? "pro" : plan === "starter" ? "starter" : null;
  if (!tier) {
    log.warn("subscription complete: unknown plan, no credits granted", { userId, plan });
    return;
  }
  const includedMc = PLANS[tier].includedCreditsMc;
  if (includedMc <= 0 || !stripeSubscriptionId) return;
  try {
    const res = await applyMovement({
      userId,
      amountMc: includedMc,
      type: "grant",
      stripePaymentId: `sub_grant:${stripeSubscriptionId}`,
      meta: { reason: "plan_included_credits", plan: tier },
    });
    if (res.applied) {
      log.info("plan credits granted", { userId, plan: tier, includedMc });
    }
  } catch (err) {
    log.error("plan credit grant failed", { userId, plan: tier, error: String(err) });
  }
}

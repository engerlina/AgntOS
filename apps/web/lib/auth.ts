import { stripe as stripePlugin } from "@better-auth/stripe";
import { betterAuth, type BetterAuthOptions, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { env, hasEnv, log, stripePlanConfig } from "@agntos/core";
import { COMP_CREDITS_MC, ensureWallet, grantCredits, isCompEmail } from "@agntos/core/billing";
import { sendEmail } from "@agntos/core/email";
import { stripe as stripeClient } from "@agntos/core/stripe";
import { account, db, session, subscription, user, verification } from "@agntos/db";

import { handleStripeEvent } from "./stripe-events";

const e = env();

// Build plugins conditionally so the app boots before Stripe/OAuth creds exist.
// nextCookies() MUST stay last (it flushes Set-Cookie from Server Actions).
const plugins: BetterAuthPlugin[] = [];

if (hasEnv("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET")) {
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
        // Apply Stripe Tax (GST/VAT/US sales tax) at subscription checkout.
        getCheckoutSessionParams: () => ({
          params: {
            automatic_tax: { enabled: true },
          },
        }),
        onSubscriptionComplete: async ({ subscription: sub }) => {
          log.info("subscription complete", { referenceId: sub.referenceId, plan: sub.plan });
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

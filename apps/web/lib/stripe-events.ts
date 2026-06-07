import type Stripe from "stripe";

import { log, QUEUE, usdToMc } from "@agntos/core";
import { recordTopup } from "@agntos/core/billing";
import { sendEmail } from "@agntos/core/email";
import { agent, db, eq, user } from "@agntos/db";

import { enqueue } from "./boss";

/**
 * Single source of truth for Stripe side effects. Called by the Better Auth
 * Stripe plugin's `onEvent` (one webhook, one secret) AND by the standalone
 * /api/stripe/webhook route — both safe because credit fulfilment is idempotent
 * (unique index on credit_txn.stripePaymentId).
 *
 * The plugin already syncs the `subscription` table; here we handle:
 *  - credit-pack top-ups (checkout.session.completed, kind=credit_topup)
 *  - dunning emails (invoice.payment_failed)
 *  - subscription end → pause the user's agents (cron later destroys past grace)
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.metadata?.kind !== "credit_topup") return;
      const userId = s.metadata.userId;
      const amountUsd = Number(s.metadata.amountUsd ?? "0");
      if (!userId || !Number.isFinite(amountUsd) || amountUsd <= 0) {
        log.warn("credit_topup with bad metadata", { sessionId: s.id });
        return;
      }
      const paymentId = (s.payment_intent as string | null) ?? s.id;
      const res = await recordTopup({
        userId,
        amountMc: usdToMc(amountUsd),
        stripePaymentId: paymentId,
        meta: { sessionId: s.id },
      });
      if (res.applied) {
        const email = await emailForUser(userId);
        if (email) {
          await sendEmail.receipt(email, {
            description: `Wallet top-up`,
            amountUsd,
          });
        }
        log.info("wallet topped up", { userId, amountUsd, balanceMc: res.balanceMc });
      }
      return;
    }

    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const email = inv.customer_email ?? (await emailForCustomer(inv.customer as string));
      if (email) await sendEmail.paymentFailed(email);
      log.warn("invoice payment failed", { customer: inv.customer });
      return;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await userIdForCustomer(sub.customer as string);
      if (!userId) return;
      const email = await emailForUser(userId);
      if (email) await sendEmail.subscriptionCancelled(email, { retentionDays: 14 });
      // Pause the user's agents now; the worker's reconcile cron destroys them
      // after the retention window if the subscription isn't reinstated.
      const rows = await db.select({ id: agent.id }).from(agent).where(eq(agent.userId, userId));
      for (const r of rows) {
        await enqueue(
          QUEUE.pauseAgent,
          { agentId: r.id, reason: "non_payment" },
          { singletonKey: r.id },
        );
      }
      return;
    }

    default:
      return;
  }
}

async function emailForUser(userId: string): Promise<string | null> {
  const [row] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  return row?.email ?? null;
}

async function userIdForCustomer(customerId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.stripeCustomerId, customerId))
    .limit(1);
  return row?.id ?? null;
}

async function emailForCustomer(customerId: string): Promise<string | null> {
  const id = await userIdForCustomer(customerId);
  return id ? emailForUser(id) : null;
}

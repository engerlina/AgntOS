import type Stripe from "stripe";

import { log, QUEUE, usdToMc } from "@agntos/core";
import { applyMovement, getBalance, recordTopup } from "@agntos/core/billing";
import { sendEmail } from "@agntos/core/email";
import { agent, creditTxn, db, eq, user } from "@agntos/db";

import { enqueue } from "./boss";

/**
 * Single source of truth for Stripe side effects. Called by the Better Auth
 * Stripe plugin's `onEvent` (one webhook, one secret) AND by the standalone
 * /api/stripe/webhook route — both safe because credit fulfilment is idempotent
 * (unique index on credit_txn.stripePaymentId).
 *
 * The plugin already syncs the `subscription` table; here we handle:
 *  - credit-pack top-ups (checkout.session.completed / async_payment_succeeded)
 *  - refunds + chargebacks (charge.refunded / charge.dispute.created)
 *  - dunning emails (invoice.payment_failed)
 *  - subscription end → pause the user's agents (cron later destroys past grace)
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    // Card top-ups settle synchronously and arrive here as `paid`. Async methods
    // (if ever enabled in the dashboard) arrive `unpaid` and settle later via
    // `async_payment_succeeded`, so only credit once payment_status is "paid".
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.metadata?.kind !== "credit_topup") return;
      if (s.payment_status !== "paid") {
        log.info("credit_topup not yet paid — deferring", {
          sessionId: s.id,
          paymentStatus: s.payment_status,
        });
        return;
      }
      await creditTopup(s);
      return;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      await reverseCredits({
        customerId: typeof charge.customer === "string" ? charge.customer : null,
        paymentIntentId: typeof charge.payment_intent === "string" ? charge.payment_intent : null,
        amountUsd: charge.amount_refunded / 100,
        idKey: `refund:${charge.id}`,
        kind: "refund",
      });
      return;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      await reverseCredits({
        customerId: null,
        paymentIntentId:
          typeof dispute.payment_intent === "string" ? dispute.payment_intent : null,
        amountUsd: dispute.amount / 100,
        idKey: `dispute:${dispute.id}`,
        kind: "dispute",
      });
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

/** Credit a settled top-up Checkout session to the user's wallet (idempotent). */
async function creditTopup(s: Stripe.Checkout.Session): Promise<void> {
  const userId = s.metadata?.userId;
  const amountUsd = Number(s.metadata?.amountUsd ?? "0");
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
    if (email) await sendEmail.receipt(email, { description: "Wallet top-up", amountUsd });
    log.info("wallet topped up", { userId, amountUsd, balanceMc: res.balanceMc });
  }
}

/**
 * Reverse credits for a refund or chargeback: debit the wallet by the reversed
 * amount (idempotent on a dedicated `refund:`/`dispute:` key so it never collides
 * with the original top-up's payment-intent id), then immediately pause the
 * user's agents if the balance hit zero. The usage-sync cron re-points each key's
 * spend cap to the new balance within ~2 min for the partial-refund case.
 */
async function reverseCredits(opts: {
  customerId: string | null;
  paymentIntentId: string | null;
  amountUsd: number;
  idKey: string;
  kind: "refund" | "dispute";
}): Promise<void> {
  if (!Number.isFinite(opts.amountUsd) || opts.amountUsd <= 0) return;

  // Resolve the owner: prefer the charge's customer, else the original top-up row
  // keyed on the payment intent.
  let userId: string | null = opts.customerId ? await userIdForCustomer(opts.customerId) : null;
  if (!userId && opts.paymentIntentId) {
    const [row] = await db
      .select({ userId: creditTxn.userId })
      .from(creditTxn)
      .where(eq(creditTxn.stripePaymentId, opts.paymentIntentId))
      .limit(1);
    userId = row?.userId ?? null;
  }
  if (!userId) {
    log.warn("reverseCredits: could not resolve user", { idKey: opts.idKey });
    return;
  }

  const res = await applyMovement({
    userId,
    amountMc: -usdToMc(opts.amountUsd),
    type: "refund",
    stripePaymentId: opts.idKey,
    meta: { kind: opts.kind, paymentIntentId: opts.paymentIntentId },
  });
  if (!res.applied) return; // already reversed
  log.warn("credits reversed", {
    userId,
    kind: opts.kind,
    amountUsd: opts.amountUsd,
    balanceMc: res.balanceMc,
  });

  // If the wallet is now empty, pause the user's agents immediately rather than
  // waiting for the cron — a chargeback shouldn't keep buying compute.
  const balanceMc = await getBalance(userId);
  if (balanceMc <= 0) {
    const rows = await db.select({ id: agent.id }).from(agent).where(eq(agent.userId, userId));
    for (const r of rows) {
      await enqueue(QUEUE.pauseAgent, { agentId: r.id, reason: "non_payment" }, { singletonKey: r.id });
    }
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

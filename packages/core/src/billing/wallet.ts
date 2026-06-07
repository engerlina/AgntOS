/**
 * Wallet ledger. Every balance movement is a row in `credit_txn`; `wallet.balanceMc`
 * is the running total. All mutations take a row lock (`FOR UPDATE`) inside a
 * transaction so concurrent top-ups and usage syncs can't race.
 *
 * Top-ups are idempotent on `stripePaymentId` (DB unique index + a pre-check),
 * so a Stripe webhook redelivery never double-credits.
 */
import { and, eq, sql } from "drizzle-orm";

import { creditTxn, db as defaultDb, wallet, type CreditTxnType } from "@agntos/db";
import { nonNegative } from "../money";

type Db = typeof defaultDb;
// A drizzle transaction has the same query surface as the db for our purposes.
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Executor = Db | Tx;

export interface MovementInput {
  userId: string;
  /** Signed micro-dollars: positive credits, negative debits. */
  amountMc: number;
  type: CreditTxnType;
  /** Idempotency key for Stripe-driven top-ups. */
  stripePaymentId?: string;
  meta?: Record<string, unknown>;
}

export interface MovementResult {
  balanceMc: number;
  /** False when an idempotent top-up was skipped (already applied). */
  applied: boolean;
}

/** Ensure a wallet row exists for the user (idempotent). */
export async function ensureWallet(userId: string, exec: Executor = defaultDb): Promise<void> {
  await exec
    .insert(wallet)
    .values({ userId, balanceMc: 0 })
    .onConflictDoNothing({ target: wallet.userId });
}

/** Current balance in micro-dollars (0 if no wallet yet). */
export async function getBalance(userId: string, exec: Executor = defaultDb): Promise<number> {
  const [row] = await exec
    .select({ balanceMc: wallet.balanceMc })
    .from(wallet)
    .where(eq(wallet.userId, userId))
    .limit(1);
  return row?.balanceMc ?? 0;
}

/**
 * Apply a signed balance movement atomically and append a ledger row.
 * Runs in its own transaction unless you pass an existing one.
 */
export async function applyMovement(
  input: MovementInput,
  exec: Executor = defaultDb,
): Promise<MovementResult> {
  const run = async (tx: Executor): Promise<MovementResult> => {
    // Idempotency: a top-up with a known Stripe id is applied at most once.
    if (input.stripePaymentId) {
      const [existing] = await tx
        .select({ id: creditTxn.id })
        .from(creditTxn)
        .where(
          and(
            eq(creditTxn.type, input.type),
            eq(creditTxn.stripePaymentId, input.stripePaymentId),
          ),
        )
        .limit(1);
      if (existing) {
        return { balanceMc: await getBalance(input.userId, tx), applied: false };
      }
    }

    // Lock (or create) the wallet row.
    await ensureWallet(input.userId, tx);
    const [locked] = await tx
      .select({ balanceMc: wallet.balanceMc })
      .from(wallet)
      .where(eq(wallet.userId, input.userId))
      .for("update")
      .limit(1);

    const current = locked?.balanceMc ?? 0;
    const next = nonNegative(current + input.amountMc);

    await tx
      .update(wallet)
      .set({ balanceMc: next, updatedAt: new Date() })
      .where(eq(wallet.userId, input.userId));

    await tx.insert(creditTxn).values({
      userId: input.userId,
      type: input.type,
      amountMc: input.amountMc,
      balanceAfterMc: next,
      stripePaymentId: input.stripePaymentId,
      meta: input.meta,
    });

    return { balanceMc: next, applied: true };
  };

  // If we were handed a transaction, reuse it; otherwise open one.
  if ("transaction" in exec && typeof exec.transaction === "function") {
    return (exec as Db).transaction((tx) => run(tx));
  }
  return run(exec);
}

/** Credit a Stripe-paid top-up (idempotent). */
export function recordTopup(
  args: { userId: string; amountMc: number; stripePaymentId: string; meta?: Record<string, unknown> },
  exec: Executor = defaultDb,
): Promise<MovementResult> {
  return applyMovement(
    { ...args, type: "topup", amountMc: Math.abs(args.amountMc) },
    exec,
  );
}

/** Grant promotional/included credits (e.g. on plan activation). */
export function grantCredits(
  args: { userId: string; amountMc: number; meta?: Record<string, unknown> },
  exec: Executor = defaultDb,
): Promise<MovementResult> {
  return applyMovement({ ...args, type: "grant", amountMc: Math.abs(args.amountMc) }, exec);
}

/** Record metered usage as a debit (amount passed as a positive number). */
export function recordUsage(
  args: { userId: string; amountMc: number; meta?: Record<string, unknown> },
  exec: Executor = defaultDb,
): Promise<MovementResult> {
  return applyMovement({ ...args, type: "usage", amountMc: -Math.abs(args.amountMc) }, exec);
}

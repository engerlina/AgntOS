import { log, mcToUsd, usdToMc } from "@agntos/core";
import { recordUsage } from "@agntos/core/billing";
import { getRuntimeKey } from "@agntos/core/openrouter";
import { and, db, eq, like, sql, usageEvent } from "@agntos/db";

/**
 * Read the key's cumulative spend, compute the per-key delta against what we've
 * already recorded, and — atomically — insert the `usage_event` and debit the
 * wallet in ONE transaction. Atomicity matters two ways:
 *  - a crash between the two writes can't commit the event without the debit
 *    (which would lose that spend forever, since the next run's delta = 0), and
 *  - a swallowed idempotency conflict no longer debits a second time, so two
 *    runs reading the same cumulative can't double-charge.
 * Per-key scoping (externalId `${hash}:%`) keeps a rotated key from billing
 * negative against the agent's all-time spend. Returns the cumulative reading so
 * callers can re-point the spend cap.
 *
 * Lives in its own module so both the usage-sync cron and the destroy handler
 * (final bill before key deletion) can share it without a circular import.
 */
export async function meterKeyUsage(
  agentId: string,
  userId: string,
  hash: string,
): Promise<{ cumulativeMc: number; deltaMc: number }> {
  const key = await getRuntimeKey(hash);
  const cumulativeMc = usdToMc(key.usage);

  const [agg] = await db
    .select({ total: sql<number>`coalesce(sum(${usageEvent.costMc}), 0)` })
    .from(usageEvent)
    .where(and(eq(usageEvent.agentId, agentId), like(usageEvent.externalId, `${hash}:%`)));
  const recordedMc = Number(agg?.total ?? 0);
  const deltaMc = cumulativeMc - recordedMc;
  if (deltaMc <= 0) return { cumulativeMc, deltaMc: 0 };

  let debited = false;
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(usageEvent)
      .values({
        agentId,
        userId,
        model: null,
        costMc: deltaMc,
        externalId: `${hash}:${cumulativeMc}`,
        occurredAt: new Date(),
      })
      .onConflictDoNothing({ target: usageEvent.externalId })
      .returning({ id: usageEvent.id });
    if (inserted.length > 0) {
      await recordUsage({ userId, amountMc: deltaMc, meta: { agentId } }, tx);
      debited = true;
    }
  });
  if (debited) log.info("usage recorded", { agentId, deltaUsd: mcToUsd(deltaMc) });
  return { cumulativeMc, deltaMc: debited ? deltaMc : 0 };
}

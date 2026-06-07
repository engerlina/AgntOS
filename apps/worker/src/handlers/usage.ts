import { log, mcToUsd, usdToMc } from "@agntos/core";
import { getBalance, recordUsage } from "@agntos/core/billing";
import { getRuntimeKey, updateRuntimeKeyLimit } from "@agntos/core/openrouter";
import { sendEmail } from "@agntos/core/email";
import { agent, db, eq, sql, usageEvent, user, wallet } from "@agntos/db";

import { handlePause } from "./lifecycle";

// Low-balance email fires when the wallet drops below this absolute floor.
// (A percentage threshold needs a baseline — e.g. last top-up — which you can
// layer on later; this absolute default is predictable and avoids spam.)
const LOW_BALANCE_FLOOR_MC = usdToMc(2);

/**
 * Poll each agent's OpenRouter key, record the spend delta into the dollar
 * wallet, and re-point the key's credit limit at the remaining balance (so
 * top-ups raise the cap and the agent hard-stops at $0). Runs every ~2 min.
 */
export async function handleSyncUsage(): Promise<void> {
  const rows = await db
    .select()
    .from(agent)
    .where(sql`${agent.openrouterKeyHash} is not null and ${agent.status} <> 'stopped'`);

  for (const row of rows) {
    try {
      await syncOne(row);
    } catch (err) {
      log.warn("usage sync failed for agent", { agentId: row.id, error: String(err) });
    }
  }
}

async function syncOne(row: typeof agent.$inferSelect): Promise<void> {
  if (!row.openrouterKeyHash) return;

  const key = await getRuntimeKey(row.openrouterKeyHash);
  const cumulativeMc = usdToMc(key.usage);

  const [agg] = await db
    .select({ total: sql<number>`coalesce(sum(${usageEvent.costMc}), 0)` })
    .from(usageEvent)
    .where(eq(usageEvent.agentId, row.id));
  const recordedMc = Number(agg?.total ?? 0);
  const deltaMc = cumulativeMc - recordedMc;

  if (deltaMc > 0) {
    // Idempotent: externalId encodes the cumulative reading.
    await db
      .insert(usageEvent)
      .values({
        agentId: row.id,
        userId: row.userId,
        model: null,
        costMc: deltaMc,
        externalId: `${row.openrouterKeyHash}:${cumulativeMc}`,
        occurredAt: new Date(),
      })
      .onConflictDoNothing({ target: usageEvent.externalId });
    await recordUsage({ userId: row.userId, amountMc: deltaMc, meta: { agentId: row.id } });
    log.info("usage recorded", { agentId: row.id, deltaUsd: mcToUsd(deltaMc) });
  }

  const balanceMc = await getBalance(row.userId);

  // Keep the OpenRouter cap == spent-so-far + remaining-balance, so the cap
  // tracks the wallet (top-ups raise it; depletion stops the agent).
  await updateRuntimeKeyLimit(row.openrouterKeyHash, cumulativeMc + Math.max(balanceMc, 0)).catch(
    (e) => log.warn("usage: limit update failed", { agentId: row.id, error: String(e) }),
  );

  await handleBalanceThresholds(row, balanceMc);
}

async function handleBalanceThresholds(
  row: typeof agent.$inferSelect,
  balanceMc: number,
): Promise<void> {
  const [w] = await db
    .select({ notified: wallet.lowBalanceNotifiedAt })
    .from(wallet)
    .where(eq(wallet.userId, row.userId))
    .limit(1);

  const email = await emailFor(row.userId);

  if (balanceMc <= 0) {
    if (row.status === "running") {
      log.info("wallet depleted — pausing agent", { agentId: row.id });
      await handlePause({ agentId: row.id, reason: "wallet_depleted" });
      if (email) await sendEmail.balanceDepleted(email, { agentName: row.name });
    }
    return;
  }

  if (balanceMc < LOW_BALANCE_FLOOR_MC && !w?.notified) {
    if (email) await sendEmail.lowBalance(email, { balanceMc });
    await db
      .update(wallet)
      .set({ lowBalanceNotifiedAt: new Date() })
      .where(eq(wallet.userId, row.userId));
  } else if (balanceMc >= LOW_BALANCE_FLOOR_MC && w?.notified) {
    // Recovered — reset so the next dip notifies again.
    await db
      .update(wallet)
      .set({ lowBalanceNotifiedAt: null })
      .where(eq(wallet.userId, row.userId));
  }
}

async function emailFor(userId: string): Promise<string | null> {
  const [u] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  return u?.email ?? null;
}

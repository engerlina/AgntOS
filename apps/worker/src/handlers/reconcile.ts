import { env, log } from "@agntos/core";
import { isCompEmail } from "@agntos/core/billing";
import { getProvider, type AgentRef } from "@agntos/core/provisioning";
import { agent, db, eq, inArray, subscription, user } from "@agntos/db";

import { handleDestroy, handlePause } from "./lifecycle";

type AgentRow = typeof agent.$inferSelect;

/** Retention window for non-payment-paused agents (matches the cancellation email). */
const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

function refOf(row: AgentRow): AgentRef | null {
  if (!row.flyAppId || !row.flyMachineId) return null;
  return { appId: row.flyAppId, machineId: row.flyMachineId, volumeId: row.flyVolumeId ?? undefined };
}

/**
 * Hourly backstop: reconcile DB status against the provider's reality and
 * suspend agents whose subscription lapsed (the webhook is the primary path;
 * this catches anything it missed). Wallet-depletion pausing is handled by the
 * faster usage-sync cron.
 */
export async function handleReconcile(): Promise<void> {
  const rows = await db.select().from(agent);
  if (rows.length === 0) return;

  // Users with a live subscription (skip the check entirely in non-prod).
  const activeUsers = new Set<string>();
  const isProd = env().NODE_ENV === "production";
  if (isProd) {
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const subs = await db
      .select({ referenceId: subscription.referenceId, status: subscription.status })
      .from(subscription)
      .where(inArray(subscription.referenceId, userIds));
    for (const s of subs) {
      if (s.status === "active" || s.status === "trialing") activeUsers.add(s.referenceId);
    }
    // Comped accounts are always "active" (no subscription required).
    const users = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(inArray(user.id, userIds));
    for (const u of users) if (isCompEmail(u.email)) activeUsers.add(u.id);
  }

  const provider = getProvider();
  const retentionCutoff = new Date(Date.now() - RETENTION_MS);
  let drift = 0;
  let suspended = 0;
  let destroyed = 0;

  for (const row of rows) {
    const ref = refOf(row);

    // 0) Retention: destroy agents paused for non-payment past the 14-day window
    //    (we promise deletion in the cancellation email; paused Fly volumes also
    //    keep costing). Skip anyone who has since resubscribed. Direct call — a
    //    failure just retries on the next hourly run since the row stays paused.
    if (
      isProd &&
      row.status === "paused" &&
      row.statusDetail === "non_payment" &&
      row.updatedAt < retentionCutoff &&
      !activeUsers.has(row.userId)
    ) {
      await handleDestroy({ agentId: row.id, reason: "subscription_ended" }).catch((e) =>
        log.warn("reconcile: retention destroy failed", { agentId: row.id, error: String(e) }),
      );
      destroyed++;
      continue;
    }

    // 1) Status drift vs provider reality.
    if (ref && (row.status === "running" || row.status === "provisioning")) {
      const health = await provider.health(ref).catch(() => "error" as const);
      if (row.status === "provisioning" && health === "ok") {
        await db
          .update(agent)
          .set({ status: "running", statusDetail: null, updatedAt: new Date() })
          .where(eq(agent.id, row.id));
        drift++;
      } else if (row.status === "running" && health === "error") {
        await db
          .update(agent)
          .set({ status: "error", statusDetail: "Provider reports unhealthy", updatedAt: new Date() })
          .where(eq(agent.id, row.id));
        drift++;
      }
    }

    // 2) Non-payment suspension (production only).
    if (isProd && row.status === "running" && !activeUsers.has(row.userId)) {
      await handlePause({ agentId: row.id, reason: "non_payment" });
      suspended++;
    }
  }

  log.info("reconcile complete", { agents: rows.length, drift, suspended, destroyed });
}

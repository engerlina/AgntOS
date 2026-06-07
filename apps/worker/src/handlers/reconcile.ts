import { env, log } from "@agntos/core";
import { isCompEmail } from "@agntos/core/billing";
import { getProvider, type AgentRef } from "@agntos/core/provisioning";
import { agent, db, eq, inArray, subscription, user } from "@agntos/db";

import { handlePause } from "./lifecycle";

type AgentRow = typeof agent.$inferSelect;

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
  let drift = 0;
  let suspended = 0;

  for (const row of rows) {
    const ref = refOf(row);

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

  log.info("reconcile complete", { agents: rows.length, drift, suspended });
}

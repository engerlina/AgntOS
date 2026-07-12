import { log, mcToUsd } from "@agntos/core";
import { PLANS } from "@agntos/core/billing";
import { sendEmail } from "@agntos/core/email";
import { db, sql, type AgentTier } from "@agntos/db";

/**
 * Weekly founder digest — the numbers from the growth audit, automated. Emails
 * the first COMP_EMAILS address a snapshot of the last 7 days (signups, funnel,
 * MRR, spend, acquisition sources) so the ladder is visible without opening a
 * dashboard. Best-effort: a failure just logs.
 */
export async function handleWeeklyDigest(): Promise<void> {
  const to = (process.env.COMP_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  if (!to) {
    log.warn("weekly digest: no COMP_EMAILS recipient set — skipping");
    return;
  }

  try {
    const counts = (
      await db.execute(sql`select
        (select count(*) from "user" where created_at > now() - interval '7 days')::int as signups,
        (select count(*) from audit_log where action = 'user.verified' and created_at > now() - interval '7 days')::int as verified,
        (select count(*) from audit_log where action = 'agent.provisioned' and created_at > now() - interval '7 days')::int as launched,
        (select count(*) from audit_log where action = 'subscription.active' and created_at > now() - interval '7 days')::int as new_subs,
        (select coalesce(sum(amount_mc), 0) from credit_txn where type = 'topup' and created_at > now() - interval '7 days')::bigint as topups_mc,
        (select coalesce(sum(cost_mc), 0) from usage_event where occurred_at > now() - interval '7 days')::bigint as spend_mc,
        (select count(*) from "user")::int as total_users,
        (select count(*) from agent where status = 'running')::int as running_agents`)
    ).rows as Array<Record<string, number | string>>;
    const c = counts[0] ?? {};
    const n = (k: string): number => Number(c[k] ?? 0);

    const activeSubs = (
      await db.execute(sql`select plan, count(*)::int as c from subscription
        where status in ('active', 'trialing') group by plan`)
    ).rows as Array<{ plan: string; c: number }>;

    const sources = (
      await db.execute(sql`select coalesce(meta->>'source', 'direct') as src, count(*)::int as c
        from audit_log where action = 'user.signup' and created_at > now() - interval '7 days'
        group by 1 order by 2 desc limit 5`)
    ).rows as Array<{ src: string; c: number }>;

    const mrrUsd = activeSubs.reduce(
      (sum, s) => sum + (PLANS[s.plan as AgentTier]?.monthlyUsd ?? 0) * s.c,
      0,
    );
    const usd = (mc: number) => `$${mcToUsd(mc).toFixed(2)}`;
    const srcLine = sources.length ? sources.map((s) => `${s.src} (${s.c})`).join(", ") : "—";

    const rows = [
      { label: "New signups", value: String(n("signups")) },
      { label: "Verified", value: String(n("verified")) },
      { label: "Agents launched", value: String(n("launched")) },
      { label: "New subscriptions", value: String(n("new_subs")) },
      { label: "Top-ups (7d)", value: usd(n("topups_mc")) },
      { label: "Model spend (7d)", value: usd(n("spend_mc")) },
      { label: "Acquisition sources", value: srcLine },
      { label: "— Totals —", value: "" },
      { label: "MRR", value: `$${mrrUsd}` },
      { label: "Total users", value: String(n("total_users")) },
      { label: "Running agents", value: String(n("running_agents")) },
    ];

    const period = new Date().toISOString().slice(0, 10) + " (last 7 days)";
    await sendEmail.weeklyDigest(to, { period, rows });
    log.info("weekly digest sent", { to, signups: n("signups"), mrrUsd });
  } catch (err) {
    log.error("weekly digest failed", { error: String(err) });
  }
}

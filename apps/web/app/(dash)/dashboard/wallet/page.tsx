import type { Metadata } from "next";

import { formatUsd } from "@agntos/core";
import { getBalance } from "@agntos/core/billing";
import { creditTxn, db, desc, eq, sql, usageEvent } from "@agntos/db";

import { AddCredits } from "@/components/dashboard/wallet-actions";
import { Card, Eyebrow } from "@/components/ui";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Wallet" };

export default async function WalletPage() {
  const user = await requireUser();

  const [balanceMc, txns, burn] = await Promise.all([
    getBalance(user.id),
    db
      .select()
      .from(creditTxn)
      .where(eq(creditTxn.userId, user.id))
      .orderBy(desc(creditTxn.createdAt))
      .limit(12),
    db
      .select({ total: sql<number>`coalesce(sum(${usageEvent.costMc}), 0)` })
      .from(usageEvent)
      .where(
        sql`${usageEvent.userId} = ${user.id} and ${usageEvent.occurredAt} > now() - interval '7 days'`,
      ),
  ]);

  const weekUsageMc = Number(burn[0]?.total ?? 0);
  const dailyBurnMc = Math.round(weekUsageMc / 7);

  return (
    <div>
      <Eyebrow>Wallet</Eyebrow>
      <h1 className="mt-2 mb-8 text-3xl">Credits & usage</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card large>
          <Eyebrow>Balance</Eyebrow>
          <p className="mt-2 font-mono text-4xl font-bold text-ink">{formatUsd(balanceMc)}</p>
          <p className="mt-1 text-xs text-faint">Hard spend cap — your agent can&apos;t exceed this.</p>
        </Card>
        <Card large>
          <Eyebrow>Burn rate</Eyebrow>
          <p className="mt-2 font-mono text-4xl font-bold text-ink">
            {formatUsd(dailyBurnMc)}
            <span className="text-base font-normal text-faint">/day</span>
          </p>
          <p className="mt-1 text-xs text-faint">Based on the last 7 days of usage.</p>
        </Card>
        <Card large>
          <Eyebrow>Runway</Eyebrow>
          <p className="mt-2 font-mono text-4xl font-bold text-ink">
            {dailyBurnMc > 0 ? `${Math.floor(balanceMc / dailyBurnMc)}d` : "∞"}
          </p>
          <p className="mt-1 text-xs text-faint">Days left at current burn.</p>
        </Card>
      </div>

      <div className="mt-8">
        <Eyebrow>Add credits</Eyebrow>
        <p className="mb-4 mt-2 text-sm text-muted">
          One-click top-up. Tax is calculated at checkout.
        </p>
        <AddCredits />
      </div>

      <div className="mt-10">
        <Eyebrow>Recent activity</Eyebrow>
        <div className="mt-3 border-2 border-line bg-paper">
          {txns.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-faint">No activity yet.</p>
          ) : (
            <ul className="divide-y-2 divide-hair">
              {txns.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-mono text-sm font-semibold uppercase tracking-wide text-ink">
                      {t.type}
                    </p>
                    <p className="text-xs text-faint">{t.createdAt.toLocaleString()}</p>
                  </div>
                  <p
                    className={
                      t.amountMc >= 0
                        ? "font-mono text-sm font-bold text-fern"
                        : "font-mono text-sm font-bold text-coral"
                    }
                  >
                    {t.amountMc >= 0 ? "+" : "−"}
                    {formatUsd(Math.abs(t.amountMc))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

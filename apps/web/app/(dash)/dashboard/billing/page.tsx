import type { Metadata } from "next";

import { hasEnv } from "@agntos/core";
import { PLAN_LIST } from "@agntos/core/billing";
import { db, desc, eq, subscription } from "@agntos/db";

import { SubscribeButton } from "@/components/dashboard/subscribe";
import { ManageBilling } from "@/components/dashboard/wallet-actions";
import { Card, Eyebrow } from "@/components/ui";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const user = await requireUser();
  const billingEnabled = hasEnv("STRIPE_SECRET_KEY");

  const [active] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.referenceId, user.id))
    .orderBy(desc(subscription.periodEnd))
    .limit(1);

  const currentPlan =
    active && (active.status === "active" || active.status === "trialing") ? active.plan : null;

  return (
    <div>
      <Eyebrow>Billing</Eyebrow>
      <h1 className="mt-2 mb-8 text-3xl">Plan & billing</h1>

      {!billingEnabled && (
        <Card className="mb-8 border-coral">
          <p className="font-mono text-sm text-ink">
            Stripe isn&apos;t configured yet. Add your Stripe keys + price IDs to the environment to
            enable subscriptions.
          </p>
        </Card>
      )}

      {currentPlan && (
        <Card large className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Eyebrow>Current plan</Eyebrow>
              <p className="mt-1 text-2xl capitalize">{currentPlan}</p>
              <p className="font-mono text-xs text-faint">
                Status: {active?.status}
                {active?.periodEnd ? ` · renews ${active.periodEnd.toLocaleDateString()}` : ""}
                {active?.cancelAtPeriodEnd ? " · cancels at period end" : ""}
              </p>
            </div>
            <ManageBilling label="Manage in Stripe" />
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {PLAN_LIST.map((plan, i) => {
          const isCurrent = currentPlan === plan.tier;
          return (
            <Card
              key={plan.tier}
              large
              className={`flex h-full flex-col${isCurrent ? " ring-2 ring-lime ring-offset-2" : ""}`}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-2xl">{plan.name}</h2>
                <p className="font-mono text-3xl font-bold text-ink">
                  ${plan.monthlyUsd}
                  <span className="text-sm font-normal text-faint">/mo</span>
                </p>
              </div>
              <ul className="my-5 flex-1 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-fern">▪</span>
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <p className="border-2 border-line bg-lime px-3 py-2 text-center font-mono text-xs font-semibold uppercase tracking-wide text-ink">
                  Current plan
                </p>
              ) : billingEnabled ? (
                <SubscribeButton
                  plan={plan.tier}
                  variant={i === 1 ? "dark" : "primary"}
                  label={currentPlan ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                />
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

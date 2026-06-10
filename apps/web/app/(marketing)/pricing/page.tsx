import type { Metadata } from "next";

import { CREDIT_PACK_USD_OPTIONS, PLAN_LIST } from "@agntos/core/billing";

import { ButtonLink, Card, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Two plans, prepaid model credits on top. No surprises — your agent has a hard spend cap.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <Eyebrow>Pricing</Eyebrow>
      <h1 className="mt-3 text-4xl sm:text-5xl">Two plans. Credits on top.</h1>
      <p className="mt-4 max-w-2xl text-lg">
        The plan keeps your agent online. Model usage is paid from a prepaid dollar wallet — with a
        hard spend cap, so there&apos;s never a surprise bill. GST/VAT/US sales tax is calculated at
        checkout.
      </p>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {PLAN_LIST.map((plan, i) => (
          <Card key={plan.tier} large className={i === 1 ? "ring-2 ring-lime ring-offset-2" : ""}>
            <div className="flex items-baseline justify-between">
              <div>
                <h2 className="text-3xl">{plan.name}</h2>
                <p className="mt-1 font-mono text-xs uppercase tracking-widest text-faint">
                  {plan.modelMode} model · {plan.ramMb / 1024} GB
                </p>
              </div>
              <p className="font-mono text-4xl font-bold text-ink">
                ${plan.monthlyUsd}
                <span className="text-base font-normal text-faint">/mo</span>
              </p>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-fern">▪</span>
                  {f}
                </li>
              ))}
              <li className="flex gap-2 text-muted">
                <span className="text-fern">▪</span>${(plan.includedCreditsMc / 1_000_000).toFixed(0)}{" "}
                included credits to start
              </li>
            </ul>
            <ButtonLink
              href="/signup"
              variant={i === 1 ? "dark" : "primary"}
              className="mt-7 w-full"
            >
              Start {plan.name}
            </ButtonLink>
          </Card>
        ))}
      </div>

      {/* Credit packs */}
      <div className="mt-16">
        <Eyebrow>Top-ups</Eyebrow>
        <h2 className="mt-3 text-2xl">Add credits any time</h2>
        <p className="mt-2 max-w-2xl text-sm">
          Buy prepaid credits in one click from your dashboard, any time your balance runs low. We
          email you before you run out so your agent never goes quiet unexpectedly.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {CREDIT_PACK_USD_OPTIONS.map((usd) => (
            <div
              key={usd}
              className="border-2 border-line bg-paper px-5 py-3 font-mono text-lg font-bold text-ink"
            >
              ${usd}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-16 grid gap-6 md:grid-cols-2">
        <Faq q="What is a Hermes agent?">
          Hermes is the self-hosted autonomous agent by Nous Research. It reasons, calls tools, keeps
          long-term memory, and writes its own reusable skills. AgntOS hosts and manages one for you.
        </Faq>
        <Faq q="Will it run up a huge bill?">
          No. Your wallet has a hard cap enforced upstream — when credits run out, the agent simply
          stops until you top up. You only ever spend what you&apos;ve loaded.
        </Faq>
        <Faq q="Do I need to know about models?">
          Never. Pick Standard or Smart and we handle the rest — including the eight background models
          Hermes uses for side tasks, tuned for cost.
        </Faq>
        <Faq q="Do I need my own API key?">
          No — every plan includes managed models with a hard spend cap, so there&apos;s nothing to
          configure. (Bring-your-own-key is on our roadmap.)
        </Faq>
      </div>

      <div className="mt-16 border-2 border-line bg-ink p-10 text-center">
        <h2 className="text-3xl text-paper">Ready in two minutes.</h2>
        <p className="mx-auto mt-3 max-w-lg text-cloud">
          Create an account, shape your agent, connect Telegram, hit launch.
        </p>
        <ButtonLink href="/signup" variant="primary" className="mt-6">
          Get your agent →
        </ButtonLink>
      </div>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="border-2 border-line bg-paper p-5">
      <h3 className="text-lg">{q}</h3>
      <p className="mt-2 text-sm">{children}</p>
    </div>
  );
}

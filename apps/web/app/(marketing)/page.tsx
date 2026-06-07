import { Bot, MessageSquare, Rocket, ShieldCheck, Wallet, Zap } from "lucide-react";
import Link from "next/link";

import { PLAN_LIST } from "@agntos/core/billing";

import { ButtonLink, Card, Eyebrow } from "@/components/ui";

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b-2 border-line bg-cloud">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:py-28">
          <div>
            <Eyebrow>One-click autonomous agents</Eyebrow>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl">
              Your own AI agent.
              <br />
              <span className="bg-lime px-2">Always on.</span> Hosted for you.
            </h1>
            <p className="mt-6 max-w-xl text-lg">
              AgntOS runs a personal{" "}
              <span className="font-mono font-semibold text-ink">Hermes</span> agent for you — with
              real memory, its own skills, and a dollar wallet. Message it on Telegram. No servers,
              no model wrangling, no DevOps. Just launch.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" variant="dark" className="text-base">
                Launch your agent →
              </ButtonLink>
              <ButtonLink href="/pricing" variant="ghost" className="text-base">
                See pricing
              </ButtonLink>
            </div>
            <p className="mt-4 font-mono text-xs text-faint">
              Isolated micro-VM per agent · Spend cap baked in · Cancel anytime
            </p>
          </div>

          {/* Faux chat card */}
          <Card large className="self-center p-0">
            <div className="flex items-center gap-2 border-b-2 border-line bg-ink px-4 py-2.5">
              <span className="h-3 w-3 border border-lime bg-lime" />
              <span className="font-mono text-xs font-semibold text-lime">telegram · @your_agent</span>
            </div>
            <div className="space-y-3 p-4 font-sans text-sm">
              <Bubble who="you">remind me to follow up with the supplier at 9am</Bubble>
              <Bubble who="agent">
                Done — I&apos;ll ping you at 9:00. Want me to draft the message too?
              </Bubble>
              <Bubble who="you">yes, and check if they replied overnight</Bubble>
              <Bubble who="agent">
                No reply yet. Drafted a nudge and saved a follow-up skill so I handle this
                automatically next time. ✅
              </Bubble>
            </div>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-3 text-3xl sm:text-4xl">Three steps to a live agent</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Step n="01" icon={<Bot />} title="Name & shape it">
            Give your agent a name and a personality. Pick Standard or Smart. That&apos;s the only
            model decision you&apos;ll ever make.
          </Step>
          <Step n="02" icon={<MessageSquare />} title="Connect Telegram">
            Paste a bot token. We wire it up and keep the token in an encrypted vault — never in a
            database.
          </Step>
          <Step n="03" icon={<Rocket />} title="Launch">
            We spin up an isolated micro-VM, boot Hermes, and your agent messages you first. Live in
            under two minutes.
          </Step>
        </div>
      </section>

      {/* Features */}
      <section className="border-y-2 border-line bg-cloud">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Eyebrow>Why AgntOS</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">Built for humans, not operators</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<Wallet />} title="A dollar wallet, not tokens">
              See balance and burn rate in plain dollars. Top up in one click. A hard spend cap
              means your agent can never run up a surprise bill.
            </Feature>
            <Feature icon={<ShieldCheck />} title="Isolated by design">
              Every agent runs in its own Firecracker micro-VM. Hermes writes and runs its own
              skills, so true isolation isn&apos;t optional — it&apos;s the default.
            </Feature>
            <Feature icon={<Zap />} title="Memory that sticks">
              Your agent accumulates memory and writes reusable skills to a persistent volume. It
              gets more useful every day — and survives every restart.
            </Feature>
            <Feature icon={<Bot />} title="No model homework">
              We curate the model stack behind the scenes and tune it for cost. You pick Standard or
              Smart; we handle the eight models underneath.
            </Feature>
            <Feature icon={<MessageSquare />} title="Lives where you do">
              Talk to your agent on Telegram today — WhatsApp and Slack next. No new app to learn.
            </Feature>
            <Feature icon={<Rocket />} title="Yours to pause or delete">
              Pause to drop to storage-only billing. Delete to wipe everything. You&apos;re always in
              control.
            </Feature>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <Eyebrow>Simple pricing</Eyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl">Two plans. Credits on top.</h2>
          </div>
          <Link href="/pricing" className="font-mono text-sm font-semibold text-ink">
            Full pricing →
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {PLAN_LIST.map((plan) => (
            <Card key={plan.tier} large>
              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl">{plan.name}</h3>
                <p className="font-mono text-2xl font-bold text-ink">
                  ${plan.monthlyUsd}
                  <span className="text-sm font-normal text-faint">/mo</span>
                </p>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-fern">▪</span>
                    {f}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/signup" variant="primary" className="mt-6 w-full">
                Start {plan.name}
              </ButtonLink>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

function Bubble({ who, children }: { who: "you" | "agent"; children: React.ReactNode }) {
  const isAgent = who === "agent";
  return (
    <div className={isAgent ? "flex justify-start" : "flex justify-end"}>
      <span
        className={
          isAgent
            ? "max-w-[85%] border-2 border-line bg-lime px-3 py-2 text-ink"
            : "max-w-[85%] border-2 border-line bg-paper px-3 py-2 text-ink"
        }
      >
        {children}
      </span>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  children,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center border-2 border-line bg-lime text-ink">
          {icon}
        </span>
        <span className="font-mono text-3xl font-bold text-hair">{n}</span>
      </div>
      <h3 className="mt-4 text-xl">{title}</h3>
      <p className="mt-2 text-sm">{children}</p>
    </Card>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-2 border-line bg-paper p-5">
      <span className="grid h-9 w-9 place-items-center border-2 border-line bg-paper text-ink">
        {icon}
      </span>
      <h3 className="mt-4 text-lg">{title}</h3>
      <p className="mt-2 text-sm">{children}</p>
    </div>
  );
}

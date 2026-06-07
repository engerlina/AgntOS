import {
  Bot,
  Brain,
  Check,
  Gauge,
  Globe,
  Lock,
  MessageSquare,
  Rocket,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { PLAN_LIST } from "@agntos/core/billing";

import { ButtonLink, Card, Eyebrow } from "@/components/ui";

export default function LandingPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b-2 border-line bg-cloud">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <Eyebrow>One agent · its own machine · live in minutes</Eyebrow>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
              Stop renting a chatbot.
              <br />
              <span className="bg-lime px-2">Own an agent.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg">
              AgntOS launches a private{" "}
              <span className="font-mono font-semibold text-ink">Hermes</span> agent on its own
              isolated machine — at your own{" "}
              <span className="font-mono font-semibold text-ink">name.agntos.net</span>. It
              remembers everything, writes its own skills, and works while you sleep. No servers, no
              model-wrangling, no surprise bills.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" variant="dark" className="text-base">
                Launch your agent →
              </ButtonLink>
              <ButtonLink href="#how" variant="ghost" className="text-base">
                See how it works
              </ButtonLink>
            </div>
            <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-faint">
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" /> Isolated micro-VM
              </span>
              <span className="inline-flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5" /> Hard spend cap
              </span>
              <span className="inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Live in ~2 minutes
              </span>
            </p>
          </div>

          {/* Tangible visual: the agent's own dashboard at its own URL */}
          <BrowserMock />
        </div>
      </section>

      {/* ── Problem / agitate ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-3xl">
          <Eyebrow>The gap</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            Everyone has a chatbot. Almost no one has an agent.
          </h2>
          <p className="mt-6 text-lg text-muted">
            Chatbots forget you the moment you close the tab. They can&apos;t run a task, keep a
            memory, or get better. A real autonomous agent can — but standing one up means a server,
            Docker, model APIs, secret management, and the constant fear of a runaway bill.
          </p>
          <p className="mt-4 text-lg text-muted">
            So you settle for a goldfish, or sink weekends into DevOps instead of getting work done.
          </p>
          <p className="mt-6 border-l-4 border-coral pl-4 text-xl font-semibold text-ink">
            AgntOS is the third option: a real agent, fully hosted, in one click.
          </p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="border-y-2 border-line bg-cloud scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">Three steps to a live agent</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Step n="01" icon={<Bot />} title="Name & shape it">
              Give your agent a name — that becomes its address,{" "}
              <span className="font-mono text-ink">name.agntos.net</span>. Add a personality. That&apos;s
              the only setup there is.
            </Step>
            <Step n="02" icon={<Rocket />} title="One click to launch">
              We spin up an isolated micro-VM, boot Hermes, provision a TLS cert, and mint a
              spend-capped key. No infra, no config files.
            </Step>
            <Step n="03" icon={<Globe />} title="Reach it anywhere">
              Open its private web dashboard at your URL, or message it on Telegram. It&apos;s already
              working — and it messages you first.
            </Step>
          </div>
        </div>
      </section>

      {/* ── What you get ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Eyebrow>What you get</Eyebrow>
        <h2 className="mt-3 text-3xl sm:text-4xl">An agent that&apos;s actually yours</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={<Globe />} title="Its own URL + dashboard">
            Every agent gets a private Hermes web dashboard at{" "}
            <span className="font-mono text-ink">name.agntos.net</span> — chat, live terminal,
            sessions, skills and memory, behind your password.
          </Feature>
          <Feature icon={<Brain />} title="Memory that sticks">
            It accumulates memory and writes reusable skills to a persistent volume. It gets more
            useful every day — and survives every restart.
          </Feature>
          <Feature icon={<Wallet />} title="Dollars, not tokens">
            See balance and burn rate in plain dollars. Top up in one click. A hard spend cap means
            your agent can never run up a surprise bill.
          </Feature>
          <Feature icon={<Lock />} title="Isolated by design">
            Every agent runs in its own Firecracker micro-VM. Hermes writes and runs its own code,
            so true isolation isn&apos;t optional — it&apos;s the default.
          </Feature>
          <Feature icon={<Sparkles />} title="No model homework">
            The auto-router picks a strong model for each request, tuned for cost. No API keys to
            juggle, no model decisions to second-guess.
          </Feature>
          <Feature icon={<MessageSquare />} title="Lives where you do">
            Talk to it on its web dashboard or on Telegram — connect and disconnect channels in a
            click. WhatsApp and Slack next.
          </Feature>
        </div>
      </section>

      {/* ── Dashboard showcase ───────────────────────────────────────────── */}
      <section className="border-y-2 border-line bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-lime">
              name.agntos.net
            </p>
            <h2 className="mt-3 text-3xl text-paper sm:text-4xl">
              A real dashboard, not a chat box
            </h2>
            <p className="mt-5 text-lg text-paper/70">
              Your agent ships with the full Hermes control panel — a live terminal, session
              history, the skills it&apos;s written, its memory, model usage in dollars, and channel
              settings. All at your own address, gated by your password.
            </p>
            <ul className="mt-6 space-y-2 font-mono text-sm text-paper/80">
              {["Live PTY terminal + chat", "Sessions, logs & skills", "Model usage in $", "Channels: connect / disconnect"].map(
                (f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-lime" /> {f}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="rounded-none border-2 border-paper/20 bg-paper/5 p-2">
            <DashboardMock />
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <Eyebrow>Simple pricing</Eyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl">Two plans. Credits on top.</h2>
            <p className="mt-3 text-muted">Pause to storage-only billing anytime. No lock-in.</p>
          </div>
          <Link href="/pricing" className="font-mono text-sm font-semibold text-ink hover:underline">
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
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-fern" />
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

      {/* ── FAQ (objection handling) ─────────────────────────────────────── */}
      <section className="border-t-2 border-line bg-cloud">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <Eyebrow>Before you ask</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">The honest answers</h2>
          <div className="mt-8 divide-y-2 divide-hair border-y-2 border-line">
            <Faq q="Will it run up a huge bill?">
              No. Each agent gets a spend-capped key and a dollar wallet — when the balance is gone,
              it stops. You see burn rate in plain dollars and top up only when you choose.
            </Faq>
            <Faq q="Is my data private?">
              Every agent runs alone in its own Firecracker micro-VM. Its memory and the skills it
              writes live on a private volume that only it can reach. Delete the agent and it&apos;s
              all wiped.
            </Faq>
            <Faq q="What exactly is a Hermes agent?">
              Hermes is Nous Research&apos;s open autonomous agent — persistent memory, a real
              terminal, browser control, and the ability to write and run its own skills. AgntOS
              hosts one for you, configured and isolated, with nothing to install.
            </Faq>
            <Faq q="How do I talk to it?">
              Two ways, both included: a private web dashboard at{" "}
              <span className="font-mono text-ink">name.agntos.net</span> (chat + live terminal), and
              Telegram. Connect or disconnect channels with one click.
            </Faq>
            <Faq q="Which model does it use?">
              By default the OpenRouter auto-router picks a strong model per request and keeps cost
              in check. You never touch an API key — and you can pin a specific model in the
              dashboard if you want.
            </Faq>
            <Faq q="Can I cancel?">
              Anytime. Pause to drop to storage-only billing and keep its memory, or delete to wipe
              everything. You&apos;re always in control.
            </Faq>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-lime">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center">
          <h2 className="text-4xl sm:text-5xl">Your agent is one click away.</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink/80">
            Launch it, name it, and it&apos;ll message you first — live at your own URL in about two
            minutes.
          </p>
          <div className="mt-8 flex justify-center">
            <ButtonLink href="/signup" variant="dark" className="text-base">
              Launch your agent →
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── Visuals ─────────────────────────────────────────────────────────────── */

function BrowserMock() {
  return (
    <div className="self-center border-2 border-ink bg-paper shadow-[8px_8px_0_0_var(--color-ink)]">
      <div className="flex items-center gap-2 border-b-2 border-line bg-ink px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-coral" />
        <span className="h-2.5 w-2.5 rounded-full bg-lime" />
        <span className="h-2.5 w-2.5 rounded-full bg-paper/40" />
        <span className="ml-2 flex-1 truncate border border-line bg-paper px-2 py-0.5 font-mono text-[11px] text-ink">
          🔒 nova.agntos.net
        </span>
      </div>
      <div className="grid grid-cols-[84px_1fr]">
        <nav className="space-y-1 border-r-2 border-line bg-cloud p-2 font-mono text-[10px] text-muted">
          {["Chat", "Sessions", "Models", "Skills", "Memory", "Channels"].map((i, idx) => (
            <div
              key={i}
              className={idx === 0 ? "bg-lime px-1.5 py-1 text-ink" : "px-1.5 py-1"}
            >
              {i}
            </div>
          ))}
        </nav>
        <div className="space-y-2 p-3 text-sm">
          <Bubble who="you">summarize my unread email and draft replies</Bubble>
          <Bubble who="agent">
            Done — 6 unread, 2 need you. Drafts ready in the thread. Saved a skill so I&apos;ll do
            this each morning. ✅
          </Bubble>
        </div>
      </div>
    </div>
  );
}

function DashboardMock() {
  return (
    <div className="border-2 border-paper/20 bg-ink">
      <div className="flex items-center gap-1.5 border-b border-paper/15 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-coral" />
        <span className="h-2 w-2 rounded-full bg-lime" />
        <span className="ml-2 font-mono text-[10px] text-paper/50">nova.agntos.net/chat</span>
      </div>
      <div className="p-3 font-mono text-[11px] leading-relaxed text-lime">
        <p className="text-paper/40"># live terminal</p>
        <p>$ hermes recall &quot;supplier follow-ups&quot;</p>
        <p className="text-paper/70">→ 3 open · drafting nudges…</p>
        <p>$ skill.save morning_inbox_triage</p>
        <p className="text-paper/70">→ saved · runs daily 09:00 ✓</p>
        <p className="mt-1 inline-block bg-lime px-1 text-ink">▌</p>
      </div>
    </div>
  );
}

function Bubble({ who, children }: { who: "you" | "agent"; children: React.ReactNode }) {
  const isAgent = who === "agent";
  return (
    <div className={isAgent ? "flex justify-start" : "flex justify-end"}>
      <span
        className={
          isAgent
            ? "max-w-[88%] border-2 border-line bg-lime px-3 py-2 text-ink"
            : "max-w-[88%] border-2 border-line bg-paper px-3 py-2 text-ink"
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
      <p className="mt-2 text-sm text-muted">{children}</p>
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
      <p className="mt-2 text-sm text-muted">{children}</p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group px-1 py-4">
      <summary className="flex cursor-pointer items-center justify-between gap-4 text-lg font-semibold text-ink marker:content-['']">
        {q}
        <span className="font-mono text-xl text-faint transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="mt-3 text-sm text-muted">{children}</p>
    </details>
  );
}

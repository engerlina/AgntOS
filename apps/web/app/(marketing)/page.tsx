import {
  Brain,
  Check,
  ListChecks,
  Lock,
  MessageSquare,
  Rocket,
  Sparkles,
  Wallet,
  Zap,
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
            <Eyebrow>Your personal AI assistant</Eyebrow>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
              Most AI forgets you.
              <br />
              <span className="bg-lime px-2">This one remembers.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg">
              AgntOS gives you a personal AI assistant that learns how you work, remembers every
              conversation, and quietly handles the busywork — on the web or right in your messages.
              It&apos;s private to you, ready in minutes, with nothing to install.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" variant="dark" className="text-base">
                Get your assistant →
              </ButtonLink>
              <ButtonLink href="#how" variant="ghost" className="text-base">
                See how it works
              </ButtonLink>
            </div>
            <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-faint">
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" /> Private to you
              </span>
              <span className="inline-flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5" /> You set the budget
              </span>
              <span className="inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Ready in minutes
              </span>
            </p>
          </div>

          <ChatMock />
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-3xl">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            Today&apos;s AI forgets you the moment you close the tab.
          </h2>
          <p className="mt-6 text-lg text-muted">
            You explain the same context over and over. It can hold a conversation, but it
            can&apos;t remember your preferences, follow through on a task, or get better at your
            work. So it stays a clever novelty instead of a real help.
          </p>
          <p className="mt-6 border-l-4 border-coral pl-4 text-xl font-semibold text-ink">
            AgntOS gives you an assistant that remembers, learns your routines, and actually does the
            work — with no setup.
          </p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="scroll-mt-20 border-y-2 border-line bg-cloud">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">Up and running in three steps</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Step n="01" icon={<Sparkles />} title="Name it & shape it">
              Give your assistant a name and tell it how you&apos;d like it to work. That&apos;s the
              whole setup — no apps, no settings.
            </Step>
            <Step n="02" icon={<Rocket />} title="It goes live">
              In a couple of minutes it&apos;s ready and private to you. It even sends you the first
              message.
            </Step>
            <Step n="03" icon={<MessageSquare />} title="Put it to work">
              Chat with it on the web, or message it on Telegram like a colleague. It remembers
              everything from then on.
            </Step>
          </div>
        </div>
      </section>

      {/* ── What you get ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Eyebrow>Why people love it</Eyebrow>
        <h2 className="mt-3 text-3xl sm:text-4xl">An assistant that&apos;s actually yours</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={<Brain />} title="Remembers everything">
            It keeps the context of every conversation and your preferences, so you never repeat
            yourself — and it gets more useful the more you use it.
          </Feature>
          <Feature icon={<ListChecks />} title="Handles the busywork">
            Summarize your inbox, draft replies, chase follow-ups, do research. It takes care of
            repetitive tasks and learns your routines so it gets faster over time.
          </Feature>
          <Feature icon={<Wallet />} title="You control the cost">
            See exactly what it costs in plain dollars and set your own limit. It can never run up a
            surprise bill — and you only top up when you want.
          </Feature>
          <Feature icon={<Lock />} title="Private to you">
            Your assistant and everything it knows is yours alone — never shared, never pooled with
            anyone else. Remove it and it&apos;s all gone.
          </Feature>
          <Feature icon={<Zap />} title="No tech required">
            Nothing to install, no settings to wrangle, no AI know-how. If you can send a message,
            you can use it.
          </Feature>
          <Feature icon={<MessageSquare />} title="Reach it anywhere">
            Use it on the web or message it on Telegram — connect it in a click. WhatsApp and Slack
            are coming next.
          </Feature>
        </div>
      </section>

      {/* ── Showcase ─────────────────────────────────────────────────────── */}
      <section className="border-y-2 border-line bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-lime">Your private space</p>
            <h2 className="mt-3 text-3xl text-paper sm:text-4xl">Simple to use. Always yours.</h2>
            <p className="mt-5 text-lg text-paper/70">
              A clean, private space to chat with your assistant, hand it tasks, see what it&apos;s
              done, and keep it on budget. No clutter, no jargon — just an assistant that gets things
              done.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-paper/80">
              {[
                "Chat and hand off tasks",
                "See everything it's done for you",
                "Track what it costs, in dollars",
                "Connect Telegram in a click",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-lime" /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-2 border-paper/20 bg-paper/5 p-2">
            <AssistantMock />
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <Eyebrow>Simple pricing</Eyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl">Pick a plan, then pay as you go.</h2>
            <p className="mt-3 text-muted">Pause anytime. No contracts, no lock-in.</p>
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

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="border-t-2 border-line bg-cloud">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <Eyebrow>Common questions</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">The honest answers</h2>
          <div className="mt-8 divide-y-2 divide-hair border-y-2 border-line">
            <Faq q="Will it cost a fortune?">
              No. You see the cost in plain dollars and set your own limit, so it can never run up a
              surprise bill. Top up only when you want, and pause anytime.
            </Faq>
            <Faq q="Is my information private?">
              Yes. Your assistant is yours alone, and everything it remembers stays private to you —
              never shared with other customers. Remove it and it&apos;s all permanently gone.
            </Faq>
            <Faq q="Do I need to be technical?">
              Not at all. There&apos;s nothing to install and nothing to configure. If you can send a
              message, you&apos;re ready to go.
            </Faq>
            <Faq q="What can it actually do for me?">
              Remember your context, draft and summarize, do research, track tasks and follow-ups,
              and take care of repetitive work — and it learns how you like things done over time.
            </Faq>
            <Faq q="How do I talk to it?">
              Two easy ways, both included: a simple private space on the web, and Telegram — message
              it just like you would a colleague.
            </Faq>
            <Faq q="Can I cancel?">
              Anytime. Pause to stop billing and keep its memory, or remove it to wipe everything.
              You&apos;re always in control.
            </Faq>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-lime">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center">
          <h2 className="text-4xl sm:text-5xl">Your assistant is one click away.</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink/80">
            Set it up, give it a name, and it&apos;ll be ready — and message you first — in a couple
            of minutes.
          </p>
          <div className="mt-8 flex justify-center">
            <ButtonLink href="/signup" variant="dark" className="text-base">
              Get your assistant →
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── Visuals ─────────────────────────────────────────────────────────────── */

function ChatMock() {
  return (
    <div className="self-center border-2 border-ink bg-paper shadow-[8px_8px_0_0_var(--color-ink)]">
      <div className="flex items-center gap-2 border-b-2 border-line bg-ink px-4 py-2.5">
        <span className="h-3 w-3 border border-lime bg-lime" />
        <span className="font-mono text-xs font-semibold text-lime">Your assistant</span>
      </div>
      <div className="space-y-3 p-4 text-sm">
        <Bubble who="you">summarize today&apos;s meetings and send me the action items</Bubble>
        <Bubble who="agent">
          Done — sent to your inbox. 4 action items, 2 are yours. Want me to do this automatically
          every evening? ✅
        </Bubble>
        <Bubble who="you">yes please</Bubble>
        <Bubble who="agent">
          Set. I&apos;ll handle it at 5pm daily and remember how you like the summary. 👍
        </Bubble>
      </div>
    </div>
  );
}

function AssistantMock() {
  return (
    <div className="border-2 border-paper/20 bg-ink">
      <div className="flex items-center gap-1.5 border-b border-paper/15 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-coral" />
        <span className="h-2 w-2 rounded-full bg-lime" />
        <span className="ml-2 font-mono text-[10px] text-paper/50">your assistant</span>
      </div>
      <div className="space-y-2 p-3 text-sm">
        <div className="flex justify-end">
          <span className="max-w-[85%] border border-paper/20 bg-paper/10 px-2.5 py-1.5 text-paper">
            draft a reply to the supplier and chase the overdue invoice
          </span>
        </div>
        <div className="flex justify-start">
          <span className="max-w-[88%] border-2 border-lime bg-lime px-2.5 py-1.5 text-ink">
            Reply drafted in your inbox, and I&apos;ve flagged the invoice — I&apos;ll nudge them
            again Friday if there&apos;s no answer. ✓
          </span>
        </div>
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

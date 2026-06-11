"use client";

import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Card, Field, TextArea } from "@/components/ui";
import { ARCHETYPES } from "@/lib/archetypes";
import { AGENT_DOMAIN, slugError, slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

const STEPS = ["Name", "Role", "Connect", "Launch"] as const;

export function LaunchWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [archetype, setArchetype] = useState<string | null>(null);
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The agent's name IS its subdomain. Derive the handle + check availability live.
  const slug = slugify(name);
  const [slugState, setSlugState] = useState<{
    checking: boolean;
    available: boolean | null;
    reason: string | null;
  }>({ checking: false, available: null, reason: null });

  useEffect(() => {
    const err = slugError(slug);
    if (err) {
      setSlugState({ checking: false, available: false, reason: err });
      return;
    }
    setSlugState((s) => ({ ...s, checking: true }));
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/agents/slug-available?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setSlugState({ checking: false, available: !!data.available, reason: data.reason ?? null });
      } catch {
        setSlugState({ checking: false, available: null, reason: null });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [slug]);

  const canNext =
    (step === 0 && name.trim().length > 0 && slugState.available === true) ||
    step === 1 ||
    step === 2 || // Telegram is optional — web chat works without it
    step === 3;

  async function launch() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          personality: personality.trim() || undefined,
          ...(botToken.trim().length > 20
            ? {
                telegramBotToken: botToken.trim(),
                telegramRef: botUsername.trim().replace(/^@/, "") || undefined,
              }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) {
        throw new Error("You need an active plan first. Head to Billing to choose Starter or Pro.");
      }
      if (!res.ok) throw new Error(data.error ?? "Launch failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
      setPending(false);
    }
  }

  return (
    <Card large>
      {/* Stepper */}
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid h-7 w-7 flex-none place-items-center border-2 border-line font-mono text-xs font-bold",
                i <= step ? "bg-lime text-ink" : "bg-paper text-faint",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "hidden font-mono text-xs font-semibold uppercase tracking-wide sm:inline",
                i === step ? "text-ink" : "text-faint",
              )}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && <span className="h-0.5 flex-1 bg-hair" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl">Name your agent</h2>
          <p className="text-sm text-muted">
            The name is also your agent&apos;s <strong>web address</strong>, where you&apos;ll chat
            with it in the browser.
          </p>
          <Field
            label="Agent name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jarvis"
            autoFocus
          />
          {name.trim() && (
            <div className="border-2 border-line bg-cloud px-3 py-2.5">
              <p className="font-mono text-sm">
                <span className="text-faint">Web address — </span>
                <span className="font-semibold text-ink">
                  {slug || "…"}.{AGENT_DOMAIN}
                </span>
              </p>
              <p className="mt-1 font-mono text-xs">
                {slugState.checking ? (
                  <span className="text-faint">checking availability…</span>
                ) : slugState.available === true ? (
                  <span className="text-fern">✓ available</span>
                ) : slugState.available === false ? (
                  <span className="text-coral">✗ {slugState.reason ?? "unavailable"}</span>
                ) : null}
              </p>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-2xl">What should it do for you?</h2>
          <p className="text-sm text-muted">
            Pick a starting point and we&apos;ll set it up with the right personality. You can fine-tune
            the wording below, and refine it any time just by talking to your agent.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ARCHETYPES.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setArchetype(a.id);
                  setPersonality(a.persona);
                }}
                className={cn(
                  "border-2 px-3.5 py-3 text-left transition-colors",
                  archetype === a.id
                    ? "border-ink bg-lime"
                    : "border-line bg-paper hover:border-ink",
                )}
              >
                <span className="block text-sm font-semibold text-ink">{a.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{a.blurb}</span>
              </button>
            ))}
          </div>
          {archetype && (
            <TextArea
              label="Fine-tune (optional)"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="You're a concise, proactive assistant who never uses corporate jargon."
              hint="This is your agent's personality. Edit freely — or leave it as is."
            />
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-2xl">
            Connect Telegram <span className="text-base font-normal text-faint">(optional)</span>
          </h2>
          <p className="text-sm text-muted">
            You can skip this and chat in the browser, or connect Telegram (and more) later from the
            agent page. To add it now:
          </p>
          <ol className="space-y-1 border-2 border-line bg-cloud p-4 font-mono text-xs text-ink">
            <li>1. Open Telegram, message @BotFather</li>
            <li>2. Send /newbot and follow the prompts</li>
            <li>3. Paste the token + your bot&apos;s @username below</li>
          </ol>
          <Field
            label="Bot token"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="123456:ABC-DEF…"
            hint="Stored encrypted, injected into your agent's vault — never saved in our database."
          />
          <Field
            label="Bot username"
            value={botUsername}
            onChange={(e) => setBotUsername(e.target.value)}
            placeholder="@my_agent_bot"
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-2xl">Ready to launch</h2>
          <dl className="divide-y-2 divide-hair border-2 border-line">
            <Row label="Name" value={name || "—"} />
            <Row label="Web address" value={`${slug}.${AGENT_DOMAIN}`} />
            <Row label="Personality" value={personality ? `${personality.slice(0, 60)}…` : "Default"} />
            <Row
              label="Channels"
              value={botToken.trim().length > 20 ? `Web chat + Telegram` : "Web chat"}
            />
          </dl>
          <p className="font-mono text-xs text-faint">
            We&apos;ll provision an isolated micro-VM, boot Hermes, mint a capped spend key, and your
            agent will be ready to chat.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-5 border-2 border-coral bg-coral/20 px-3 py-2 font-mono text-xs text-ink">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="dark" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="primary" onClick={launch} disabled={pending}>
            <Rocket className="h-4 w-4" /> {pending ? "Launching…" : "Launch agent"}
          </Button>
        )}
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-2.5">
      <dt className="font-mono text-xs uppercase tracking-wide text-faint">{label}</dt>
      <dd className="text-right text-sm text-ink">{value}</dd>
    </div>
  );
}

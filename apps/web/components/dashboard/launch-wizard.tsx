"use client";

import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, Field, TextArea } from "@/components/ui";
import { cn } from "@/lib/utils";

const STEPS = ["Name", "Personality", "Connect", "Launch"] as const;

export function LaunchWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext =
    (step === 0 && name.trim().length > 0) ||
    step === 1 ||
    (step === 2 && botToken.trim().length > 20) ||
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
          personality: personality.trim() || undefined,
          telegramBotToken: botToken.trim(),
          telegramRef: botUsername.trim().replace(/^@/, "") || undefined,
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
          <h2 className="text-2xl">What&apos;s your agent called?</h2>
          <Field
            label="Agent name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jarvis"
            autoFocus
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-2xl">Give it a personality</h2>
          <TextArea
            label="Personality & instructions"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="You're a concise, proactive executive assistant. You manage my reminders, summarise emails, and never use corporate jargon."
            hint="Optional — you can refine this any time by talking to your agent."
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-2xl">Connect Telegram</h2>
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
            <Row label="Personality" value={personality ? `${personality.slice(0, 60)}…` : "Default"} />
            <Row label="Channel" value={botUsername ? `Telegram ${botUsername}` : "Telegram"} />
          </dl>
          <p className="font-mono text-xs text-faint">
            We&apos;ll provision an isolated micro-VM, boot Hermes, mint a capped spend key, and your
            agent will message you first.
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

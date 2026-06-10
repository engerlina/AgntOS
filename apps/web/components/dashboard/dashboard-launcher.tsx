"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Interstitial shown when opening an agent's Hermes dashboard. Polls until the
 * dashboard actually responds, then redirects (with credentials) into /chat — so
 * the user sees a branded loading screen instead of a cold/blank page.
 */
export function DashboardLauncher({
  agentId,
  agentName,
  slug,
  cookieKey,
}: {
  agentId: string;
  agentName: string;
  slug: string;
  cookieKey: string;
}) {
  const [message, setMessage] = useState("Waking up your agent…");
  const [tooLong, setTooLong] = useState(false);
  // Set when the agent is in a state that will never become ready on its own
  // (error / paused / stopped) — we stop polling and tell the user what to do.
  const [terminal, setTerminal] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const TERMINAL = new Set(["error", "paused", "stopped"]);
    // Token in the query string (NOT credentials in the URL — that breaks the
    // dashboard's fetches). /__enter validates it, sets a cookie, and 302s to the
    // clean /chat URL, so window.location ends up credential-free.
    const directUrl = `https://${slug}.agntos.net/__enter?key=${encodeURIComponent(cookieKey)}`;

    async function poll() {
      tries += 1;
      if (tries > 6) setTooLong(true);
      try {
        const res = await fetch(`/api/agents/${agentId}/dashboard-ready`, { cache: "no-store" });
        const data = (await res.json()) as { ready: boolean; status?: string };
        if (cancelled) return;
        if (data.ready) {
          setMessage("Opening your dashboard…");
          window.location.replace(directUrl);
          return;
        }
        if (data.status && TERMINAL.has(data.status)) {
          setTerminal(data.status); // stop polling — won't recover on its own
          return;
        }
        setMessage(
          data.status === "provisioning"
            ? "Starting your agent — first boot takes a few minutes…"
            : "Waking up your agent's dashboard…",
        );
      } catch {
        /* transient — keep polling */
      }
      if (!cancelled) setTimeout(poll, 3000);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [agentId, slug, cookieKey]);

  if (terminal) {
    const copy: Record<string, string> = {
      paused: "Your agent is paused. Resume it, then try opening the dashboard again.",
      stopped: "This agent has been stopped.",
      error: "Your agent hit a problem starting up. Check its status, or contact support.",
    };
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-md border-2 border-ink bg-paper p-8 shadow-[6px_6px_0_0_var(--color-ink)]">
          <p className="font-mono text-[10px] uppercase tracking-widest text-faint">Hermes dashboard</p>
          <h1 className="mt-1 text-2xl">{agentName}</h1>
          <p className="mt-6 text-sm text-muted">{copy[terminal] ?? "This agent isn't available right now."}</p>
          <p className="mt-1 font-mono text-xs text-faint">{slug}.agntos.net</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={`/dashboard/agents/${agentId}`} className="btn btn-dark">
              Back to the agent
            </Link>
            <Link href="/support" className="btn btn-ghost">
              Support
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-md border-2 border-ink bg-paper p-8 shadow-[6px_6px_0_0_var(--color-ink)]">
        <p className="font-mono text-[10px] uppercase tracking-widest text-faint">Hermes dashboard</p>
        <h1 className="mt-1 text-2xl">{agentName}</h1>

        {/* Brutalist loading bars */}
        <div className="mt-6 flex justify-center gap-1.5" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-8 w-2.5 animate-pulse bg-lime"
              style={{ animationDelay: `${i * 120}ms`, animationDuration: "900ms" }}
            />
          ))}
        </div>

        <p className="mt-6 text-sm text-muted">{message}</p>
        <p className="mt-1 font-mono text-xs text-faint">{slug}.agntos.net</p>

        <p className="mt-5 text-xs leading-relaxed text-muted">
          Hang tight — your agent runs on its own private machine, so the first load
          can take a minute or two to warm up. Once the dashboard opens, the{" "}
          <span className="text-ink">first message is often slower</span> while the
          model spins up; after that it&apos;s quick.
        </p>

        {tooLong && (
          <p className="mt-5 border-t-2 border-hair pt-4 text-xs text-faint">
            Taking longer than usual.{" "}
            <Link href={`/dashboard/agents/${agentId}`} className="font-semibold text-ink hover:underline">
              Back to the agent
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

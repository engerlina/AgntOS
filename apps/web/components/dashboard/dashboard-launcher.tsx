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
  password,
}: {
  agentId: string;
  agentName: string;
  slug: string;
  password: string;
}) {
  const [message, setMessage] = useState("Waking up your agent…");
  const [tooLong, setTooLong] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    // /__enter authenticates, sets a cookie, and 302s to the clean /chat URL —
    // so there's no auth modal and no credentials left in window.location.
    const directUrl = `https://agent:${encodeURIComponent(password)}@${slug}.agntos.net/__enter`;

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
  }, [agentId, slug, password]);

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

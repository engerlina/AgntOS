"use client";

import { useState } from "react";

import { Button } from "@/components/ui";

const PACKS = [10, 25, 50, 100];

export function AddCredits() {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(amountUsd: number) {
    setError(null);
    setBusy(amountUsd);
    try {
      const res = await fetch("/api/billing/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PACKS.map((usd) => (
          <Button key={usd} variant="primary" disabled={busy !== null} onClick={() => buy(usd)}>
            {busy === usd ? "…" : `Add $${usd}`}
          </Button>
        ))}
      </div>
      {error && <p className="mt-3 font-mono text-xs text-coral">{error}</p>}
    </div>
  );
}

export function ManageBilling({ label = "Manage billing" }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not open portal");
      window.location.href = data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not open portal");
      setBusy(false);
    }
  }
  return (
    <Button variant="ghost" onClick={open} disabled={busy}>
      {busy ? "…" : label}
    </Button>
  );
}

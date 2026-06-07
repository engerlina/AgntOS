"use client";

import { useState } from "react";

import { Button } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export function SubscribeButton({
  plan,
  label,
  variant = "primary",
}: {
  plan: "starter" | "pro";
  label: string;
  variant?: "primary" | "dark" | "ghost";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    setBusy(true);
    try {
      const origin = window.location.origin;
      const { error } = await authClient.subscription.upgrade({
        plan,
        successUrl: `${origin}/dashboard?subscribed=1`,
        cancelUrl: `${origin}/dashboard/billing`,
      });
      // On success the plugin redirects to Stripe Checkout; only errors return here.
      if (error) throw new Error(error.message || "Could not start checkout");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setBusy(false);
    }
  }

  return (
    <div>
      <Button variant={variant} className="w-full" onClick={go} disabled={busy}>
        {busy ? "…" : label}
      </Button>
      {error && <p className="mt-2 font-mono text-xs text-coral">{error}</p>}
    </div>
  );
}

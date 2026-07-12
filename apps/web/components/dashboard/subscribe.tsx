"use client";

import { useState } from "react";

import { Button } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { track } from "@/lib/track";

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
      track("checkout_started", { plan });
      const origin = window.location.origin;
      const { data, error } = await authClient.subscription.upgrade({
        plan,
        successUrl: `${origin}/dashboard?subscribed=1`,
        cancelUrl: `${origin}/dashboard/billing`,
      });
      if (error) throw new Error(error.message || "Could not start checkout");
      // The endpoint returns the Stripe Checkout URL — follow it. (The client
      // doesn't auto-redirect, so without this the button just hangs.)
      const url = (data as { url?: string } | null)?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      throw new Error("Could not start checkout — no URL returned. Try again or contact support.");
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

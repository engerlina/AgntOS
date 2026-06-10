"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Logo } from "@/components/brand";
import { Button, ButtonLink } from "@/components/ui";

/**
 * Branded route-level error boundary. Without this, an uncaught render/server
 * error shows Next's unstyled "Application error" screen to users.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced to Sentry via instrumentation's onRequestError on the server; log
    // here so client-side errors are at least visible in the console.
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-cloud px-5">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <p className="font-mono text-7xl font-bold text-ink">!</p>
        <h1 className="mt-3 text-2xl">Something went wrong.</h1>
        <p className="mt-2 text-sm text-muted">
          A hiccup on our end — try again, and if it keeps happening, let us know.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="dark" onClick={reset}>
            Try again
          </Button>
          <ButtonLink href="/support" variant="ghost">
            Contact support
          </ButtonLink>
        </div>
        {error.digest ? (
          <p className="mt-4 font-mono text-xs text-faint">Reference: {error.digest}</p>
        ) : null}
        <p className="mt-6">
          <Link href="/" className="font-mono text-xs font-semibold text-ink hover:underline">
            ← Back home
          </Link>
        </p>
      </div>
    </div>
  );
}

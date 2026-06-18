"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui";

// Client-side cooldown between resends. Better Auth also enforces 3 per 60s
// server-side, so this is the friendly anti-spam layer on top (with a countdown).
const COOLDOWN_MS = 30_000;
// The verification email's sender — surfaced so users know what to look for.
const FROM = "hello@e.agntos.net";

function storageKey(email: string): string {
  return `agntos:verify-sent:${email.toLowerCase()}`;
}

/**
 * "Check your email" screen with a rate-limited resend. Shown after signup
 * (justSent) and when an unverified user tries to log in (justSent=false — no
 * email was auto-sent, so they resend explicitly). The cooldown is persisted in
 * localStorage so a page reload can't be used to bypass it.
 */
export function VerifyNotice({
  email,
  callbackURL = "/dashboard",
  justSent = false,
}: {
  email: string;
  callbackURL?: string;
  justSent?: boolean;
}) {
  const [remaining, setRemaining] = useState(0);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Seed the cooldown from the last send (signup counts as a send), so the
  // button doesn't immediately allow a duplicate right after the auto-send.
  useEffect(() => {
    if (justSent) localStorage.setItem(storageKey(email), String(Date.now()));
    const last = Number(localStorage.getItem(storageKey(email)) || 0);
    const left = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
    if (left > 0) setRemaining(left);
  }, [email, justSent]);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  async function resend() {
    if (remaining > 0 || sending) return;
    setErr(null);
    setMsg(null);
    setSending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({ email, callbackURL });
      if (error) throw new Error(error.message || "Couldn't resend just now — try again shortly.");
      localStorage.setItem(storageKey(email), String(Date.now()));
      setRemaining(Math.ceil(COOLDOWN_MS / 1000));
      setMsg("Sent — check your inbox and your spam folder.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't resend just now — try again shortly.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center border-2 border-line bg-lime text-ink">
        ✉
      </div>
      <h2 className="mt-4 text-2xl">{justSent ? "Check your email" : "Verify your email"}</h2>
      <p className="mt-2 text-sm text-muted">
        {justSent ? (
          <>
            We sent a verification link to{" "}
            <span className="font-semibold text-ink">{email}</span>. Click it to activate your
            account, then log in.
          </>
        ) : (
          <>
            Your email isn&apos;t verified yet. We need to confirm{" "}
            <span className="font-semibold text-ink">{email}</span> before you can log in — resend
            the link below.
          </>
        )}
      </p>
      <p className="mt-2 text-xs text-faint">
        It can take a minute to arrive. If you don&apos;t see it, check your spam folder — it comes
        from <span className="text-muted">{FROM}</span>.
      </p>

      <Button
        type="button"
        variant="dark"
        className="mt-5 w-full"
        onClick={resend}
        disabled={sending || remaining > 0}
      >
        {sending ? "Sending…" : remaining > 0 ? `Resend in ${remaining}s` : "Resend email"}
      </Button>

      {msg && <p className="mt-2 font-mono text-xs text-fern">{msg}</p>}
      {err && <p className="mt-2 font-mono text-xs text-coral">{err}</p>}

      <Link href="/login" className="mt-6 inline-block font-mono text-sm font-semibold text-ink">
        ← Back to log in
      </Link>
    </div>
  );
}

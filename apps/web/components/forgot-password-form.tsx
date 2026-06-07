"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, Field } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      if (error) throw new Error(error.message || "Could not send reset email");
      // Always show the same confirmation (don't reveal whether the email exists).
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center border-2 border-line bg-lime text-ink">
          ✉
        </div>
        <h2 className="mt-4 text-2xl">Check your email</h2>
        <p className="mt-2 text-sm text-muted">
          If an account exists for <span className="font-semibold text-ink">{email}</span>, we sent a
          link to reset your password. It expires in 1 hour.
        </p>
        <Link href="/login" className="mt-6 inline-block font-mono text-sm font-semibold text-ink">
          ← Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
      />
      {error && (
        <p className="border-2 border-coral bg-coral/20 px-3 py-2 font-mono text-xs text-ink">
          {error}
        </p>
      )}
      <Button type="submit" variant="dark" className="w-full" disabled={pending}>
        {pending ? "…" : "Send reset link"}
      </Button>
      <p className="pt-2 text-center font-mono text-xs text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-ink">
          Log in
        </Link>
      </p>
    </form>
  );
}

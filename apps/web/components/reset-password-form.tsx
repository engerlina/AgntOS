"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button, Field } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const errorParam = params.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Better Auth redirects here with ?token=… (or ?error=… for an invalid/expired link).
  if (!token || errorParam) {
    return (
      <div className="text-center">
        <h2 className="text-2xl">Link invalid or expired</h2>
        <p className="mt-2 text-sm text-muted">
          Reset links are single-use and expire after 1 hour. Request a fresh one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block font-mono text-sm font-semibold text-ink"
        >
          Request a new link →
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setPending(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
      if (error) throw new Error(error.message || "Could not reset password");
      setDone(true);
      setTimeout(() => router.push("/login"), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center border-2 border-line bg-lime text-ink">
          ✓
        </div>
        <h2 className="mt-4 text-2xl">Password updated</h2>
        <p className="mt-2 text-sm text-muted">Taking you to log in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="New password"
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="new-password"
        hint="At least 8 characters."
      />
      <Field
        label="Confirm new password"
        type="password"
        required
        minLength={8}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="••••••••"
        autoComplete="new-password"
      />
      {error && (
        <p className="border-2 border-coral bg-coral/20 px-3 py-2 font-mono text-xs text-ink">
          {error}
        </p>
      )}
      <Button type="submit" variant="dark" className="w-full" disabled={pending}>
        {pending ? "…" : "Reset password"}
      </Button>
    </form>
  );
}

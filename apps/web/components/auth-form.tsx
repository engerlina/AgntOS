"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { Button, Field } from "@/components/ui";
import { VerifyNotice } from "@/components/verify-notice";

export function AuthForm({
  mode,
  googleEnabled = false,
}: {
  mode: "login" | "signup";
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifySent, setVerifySent] = useState(false);
  // Set when a login is blocked because the account's email isn't verified yet —
  // we show the resend screen instead of a dead-end error.
  const [needsVerify, setNeedsVerify] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "signup") {
        const { error } = await authClient.signUp.email({
          name: name || email.split("@")[0]!,
          email,
          password,
          callbackURL: redirectTo,
        });
        if (error) throw new Error(error.message || "Sign-up failed");
        setVerifySent(true);
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) {
          // Unverified accounts can't sign in (Better Auth → 403 EMAIL_NOT_VERIFIED).
          // Route them to the resend screen rather than a generic failure.
          if (error.code === "EMAIL_NOT_VERIFIED" || error.status === 403) {
            setNeedsVerify(true);
            return;
          }
          throw new Error(error.message || "Sign-in failed");
        }
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function onGoogle() {
    setError(null);
    await authClient.signIn.social({ provider: "google", callbackURL: redirectTo });
  }

  if (verifySent || needsVerify) {
    return <VerifyNotice email={email} callbackURL={redirectTo} justSent={verifySent} />;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" && (
        <Field
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ada Lovelace"
          autoComplete="name"
        />
      )}
      <Field
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
      />
      <Field
        label="Password"
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        hint={mode === "signup" ? "At least 8 characters." : undefined}
      />

      {mode === "login" && (
        <div className="-mt-1 text-right">
          <Link
            href="/forgot-password"
            className="font-mono text-xs font-semibold text-ink hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      )}

      {error && (
        <p className="border-2 border-coral bg-coral/20 px-3 py-2 font-mono text-xs text-ink">
          {error}
        </p>
      )}

      <Button type="submit" variant="dark" className="w-full" disabled={pending}>
        {pending ? "…" : mode === "signup" ? "Create account" : "Log in"}
      </Button>

      {mode === "signup" && (
        <p className="text-center font-mono text-xs text-muted">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="font-semibold text-ink hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-ink hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      )}

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-hair" />
            <span className="font-mono text-xs text-faint">or</span>
            <span className="h-px flex-1 bg-hair" />
          </div>

          <Button type="button" variant="ghost" className="w-full" onClick={onGoogle}>
            Continue with Google
          </Button>
        </>
      )}

      <p className="pt-2 text-center font-mono text-xs text-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-ink">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-semibold text-ink">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

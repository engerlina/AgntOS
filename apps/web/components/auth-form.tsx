"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { Button, Field } from "@/components/ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifySent, setVerifySent] = useState(false);

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
        if (error) throw new Error(error.message || "Sign-in failed");
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

  if (verifySent) {
    return (
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center border-2 border-line bg-lime text-ink">
          ✉
        </div>
        <h2 className="mt-4 text-2xl">Check your email</h2>
        <p className="mt-2 text-sm text-muted">
          We sent a verification link to <span className="font-semibold text-ink">{email}</span>.
          Click it to activate your account, then log in.
        </p>
        <Link href="/login" className="mt-6 inline-block font-mono text-sm font-semibold text-ink">
          ← Back to log in
        </Link>
      </div>
    );
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

      {error && (
        <p className="border-2 border-coral bg-coral/20 px-3 py-2 font-mono text-xs text-ink">
          {error}
        </p>
      )}

      <Button type="submit" variant="dark" className="w-full" disabled={pending}>
        {pending ? "…" : mode === "signup" ? "Create account" : "Log in"}
      </Button>

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-hair" />
        <span className="font-mono text-xs text-faint">or</span>
        <span className="h-px flex-1 bg-hair" />
      </div>

      <Button type="button" variant="ghost" className="w-full" onClick={onGoogle}>
        Continue with Google
      </Button>

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

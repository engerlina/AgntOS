import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl">Welcome back</h1>
      <p className="mb-6 text-sm text-muted">Log in to manage your agent.</p>
      <Suspense fallback={null}>
        <AuthForm mode="login" />
      </Suspense>
    </>
  );
}

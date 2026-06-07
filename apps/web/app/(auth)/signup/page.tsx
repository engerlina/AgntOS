import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Get your agent" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl">Create your account</h1>
      <p className="mb-6 text-sm text-muted">Two minutes to a live agent.</p>
      <Suspense fallback={null}>
        <AuthForm mode="signup" />
      </Suspense>
    </>
  );
}

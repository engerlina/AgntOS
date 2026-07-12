import type { Metadata } from "next";
import { Suspense } from "react";

import { hasEnv } from "@agntos/core";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Get your agent",
  description:
    "Create your AgntOS account and launch a personal AI assistant that remembers you — ready in minutes, private to you, with a budget you control.",
  alternates: { canonical: "/signup" },
  openGraph: {
    title: "Get your AgntOS assistant",
    description: "Launch a personal AI assistant that remembers you — ready in minutes.",
  },
};

export default function SignupPage() {
  const googleEnabled = hasEnv("GOOGLE_ID", "GOOGLE_SECRET");
  return (
    <>
      <h1 className="mb-1 text-2xl">Create your account</h1>
      <p className="mb-6 text-sm text-muted">Two minutes to a live agent.</p>
      <Suspense fallback={null}>
        <AuthForm mode="signup" googleEnabled={googleEnabled} />
      </Suspense>
    </>
  );
}

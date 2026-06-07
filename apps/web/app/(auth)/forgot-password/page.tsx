import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl">Forgot your password?</h1>
      <p className="mb-6 text-sm text-muted">
        Enter your email and we&apos;ll send you a link to reset it.
      </p>
      <ForgotPasswordForm />
    </>
  );
}

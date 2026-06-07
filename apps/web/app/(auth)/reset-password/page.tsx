import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl">Choose a new password</h1>
      <p className="mb-6 text-sm text-muted">Set a new password for your account.</p>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}

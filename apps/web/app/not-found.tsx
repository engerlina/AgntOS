import Link from "next/link";

import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-cloud px-5">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <p className="font-mono text-7xl font-bold text-ink">404</p>
        <h1 className="mt-3 text-2xl">This page wandered off.</h1>
        <p className="mt-2 text-sm text-muted">The page you&apos;re after doesn&apos;t exist.</p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/" variant="dark">
            Home
          </ButtonLink>
          <Link href="/dashboard" className="btn btn-ghost">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

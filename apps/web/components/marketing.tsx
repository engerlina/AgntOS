import Link from "next/link";

import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui";

export function SiteHeader() {
  return (
    <header className="border-b-2 border-line bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link
            href="/pricing"
            className="hidden px-3 font-mono text-sm font-semibold text-ink no-underline hover:underline sm:inline"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="px-3 font-mono text-sm font-semibold text-ink no-underline hover:underline"
          >
            Log in
          </Link>
          <ButtonLink href="/signup" variant="primary">
            Get your agent
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-line bg-cloud">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <p className="font-mono text-xs text-faint">
          © {new Date().getFullYear()} AgntOS · Vertial Holdings Pty Ltd. Built on Hermes Agent by
          Nous Research.
        </p>
        <div className="flex gap-4 font-mono text-xs text-ink">
          <Link href="/pricing" className="no-underline hover:underline">
            Pricing
          </Link>
          <Link href="/login" className="no-underline hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </footer>
  );
}

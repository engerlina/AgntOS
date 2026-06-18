import Link from "next/link";

import { Logo } from "@/components/brand";

// Auth-aware + mobile-hamburger header lives in its own client component.
export { SiteHeader } from "@/components/site-header";

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-line bg-cloud">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <p className="font-mono text-xs text-faint">
          © {new Date().getFullYear()} AgntOS · Vertial Holdings Pty Ltd. Built on Hermes Agent by
          Nous Research.
        </p>
        <div className="flex flex-wrap gap-4 font-mono text-xs text-ink">
          <Link href="/pricing" className="no-underline hover:underline">
            Pricing
          </Link>
          <Link href="/support" className="no-underline hover:underline">
            Support
          </Link>
          <Link href="/terms" className="no-underline hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="no-underline hover:underline">
            Privacy
          </Link>
          <Link href="/login" className="no-underline hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

/**
 * Marketing site header. Client component so it can (a) swap "Log in" for
 * "Dashboard" once the visitor is signed in, and (b) collapse into a hamburger
 * menu on small screens. The session is fetched in an effect (browser-only) so
 * the marketing pages stay statically prerendered — visitors are shown the
 * logged-out state until hydration confirms otherwise.
 */
export function SiteHeader() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    authClient
      .getSession()
      .then((res) => {
        if (active) setLoggedIn(!!res?.data?.user);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const linkClass =
    "px-3 font-mono text-sm font-semibold text-ink no-underline hover:underline";

  return (
    <header className="relative border-b-2 border-line bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 sm:flex">
          <Link href="/pricing" className={linkClass}>
            Pricing
          </Link>
          {loggedIn ? (
            <ButtonLink href="/dashboard" variant="primary">
              Dashboard
            </ButtonLink>
          ) : (
            <>
              <Link href="/login" className={linkClass}>
                Log in
              </Link>
              <ButtonLink href="/signup" variant="primary" data-umami-event="cta-header-signup">
                Get your assistant
              </ButtonLink>
            </>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="grid h-9 w-9 place-items-center border-2 border-line bg-paper text-ink sm:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="border-t-2 border-line bg-paper sm:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="py-2 font-mono text-sm font-semibold text-ink no-underline"
            >
              Pricing
            </Link>
            {loggedIn ? (
              <ButtonLink
                href="/dashboard"
                variant="primary"
                className="mt-1"
                onClick={() => setOpen(false)}
              >
                Dashboard
              </ButtonLink>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="py-2 font-mono text-sm font-semibold text-ink no-underline"
                >
                  Log in
                </Link>
                <ButtonLink
                  href="/signup"
                  variant="primary"
                  className="mt-1"
                  onClick={() => setOpen(false)}
                >
                  Get your assistant
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

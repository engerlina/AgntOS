"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Agents" },
  { href: "/dashboard/wallet", label: "Wallet" },
  { href: "/dashboard/billing", label: "Billing" },
];

export function DashNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => {
        const active = l.href === "/dashboard" ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "border-2 px-3 py-1.5 font-mono text-sm font-semibold no-underline transition-transform",
              active
                ? "border-line bg-lime text-ink"
                : "border-transparent text-ink hover:border-line",
            )}
          >
            {l.label}
          </Link>
        );
      })}
      <button
        onClick={signOut}
        className="ml-2 border-2 border-transparent px-3 py-1.5 font-mono text-sm font-semibold text-muted no-underline hover:border-line hover:text-ink"
      >
        Sign out
      </button>
    </nav>
  );
}

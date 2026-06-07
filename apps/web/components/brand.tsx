import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 no-underline", className)}>
      <span className="grid h-7 w-7 place-items-center border-2 border-line bg-lime font-mono text-sm font-bold text-ink">
        A
      </span>
      <span className="font-mono text-lg font-bold tracking-tight text-ink">AgntOS</span>
    </Link>
  );
}

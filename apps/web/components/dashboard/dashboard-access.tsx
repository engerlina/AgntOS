"use client";

import { Check, Copy, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

/**
 * Access panel for an agent's Hermes web dashboard at `<slug>.agntos.net`.
 * Shows the AgntOS-set basic-auth credentials (reveal + copy) to the owner.
 */
export function DashboardAccess({
  slug,
  password,
  running,
}: {
  slug: string;
  password: string | null;
  running: boolean;
}) {
  const url = `https://${slug}.agntos.net/chat`;
  // Deep-link with the credentials so clicking from AgntOS logs the owner straight
  // in (no browser auth modal) and lands on the Chat tab.
  const directUrl = password
    ? `https://agent:${encodeURIComponent(password)}@${slug}.agntos.net/chat`
    : url;
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState<"user" | "pass" | null>(null);

  const copy = async (text: string, which: "user" | "pass") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  if (!running) {
    return (
      <div className="flex items-center justify-between border-2 border-dashed border-hair px-3 py-2 text-faint">
        <span>Hermes dashboard — {slug}.agntos.net</span>
        <span className="font-mono text-xs uppercase tracking-wide">when running</span>
      </div>
    );
  }

  return (
    <div className="border-2 border-line bg-cloud px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          Hermes dashboard — <span className="font-mono text-ink">{slug}.agntos.net</span>
        </span>
        <a
          href={directUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary inline-flex items-center gap-1"
        >
          Open dashboard <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {password ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            user:&nbsp;<span className="text-ink">agent</span>
            <IconBtn onClick={() => copy("agent", "user")} label="Copy username">
              {copied === "user" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </IconBtn>
          </span>
          <span className="inline-flex items-center gap-1">
            pass:&nbsp;
            <span className="text-ink">{reveal ? password : "•".repeat(Math.min(password.length, 12))}</span>
            <IconBtn onClick={() => setReveal((r) => !r)} label={reveal ? "Hide" : "Reveal"}>
              {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </IconBtn>
            <IconBtn onClick={() => copy(password, "pass")} label="Copy password">
              {copied === "pass" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </IconBtn>
          </span>
        </div>
      ) : (
        <div className="mt-2 font-mono text-xs text-faint">
          Issuing TLS certificate… (can take a few minutes after first launch)
        </div>
      )}
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="text-faint transition-colors hover:text-ink"
    >
      {children}
    </button>
  );
}

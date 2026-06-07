/**
 * Comped (no-charge) accounts. Emails in the COMP_EMAILS allow-list (comma-
 * separated) get a usable tier WITHOUT a paid subscription and a one-time grant
 * of free wallet credits — so AgntOS covers their model spend. Used for the
 * founder's own account, demos, and beta testers.
 */
import type { AgentTier } from "@agntos/db";

import { usdToMc } from "../money";

function compSet(): Set<string> {
  return new Set(
    (process.env.COMP_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isCompEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return compSet().has(email.toLowerCase());
}

/** Tier a comped user launches at (no subscription required). */
export const COMP_TIER: AgentTier = "starter";

/** Free credits granted to a comped user on signup (covers model usage). */
export const COMP_CREDITS_MC = usdToMc(25);

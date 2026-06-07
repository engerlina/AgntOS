/**
 * Operator-controlled plan + pricing config. The user only ever sees Starter vs
 * Pro and a dollar wallet — never a model name. Tier maps to (a) the Stripe
 * price, (b) the agent RAM, and (c) the baked model *mode* (Standard/Smart).
 *
 * NOTE (open decision in the plan §17): the included-credit allowance per tier
 * is a launch decision. The values below are sane defaults; adjust freely.
 */
import { env } from "../env";
import { usdToMc } from "../money";
import type { AgentTier, ModelMode } from "@agntos/db";

export interface PlanDef {
  tier: AgentTier;
  /** Marketing name. */
  name: string;
  /** Monthly price in USD (for display; Stripe is the source of truth). */
  monthlyUsd: number;
  /** Agent VM memory for this tier. */
  ramMb: number;
  /** Which baked main-model line runs (config.yaml). */
  modelMode: ModelMode;
  /** Wallet credits granted on first activation (micro-dollars). */
  includedCreditsMc: number;
  /** Stripe price id env var name -> resolved at runtime. */
  priceEnvKey: "STRIPE_PRICE_STARTER" | "STRIPE_PRICE_PRO";
  features: string[];
}

export const PLANS: Record<AgentTier, PlanDef> = {
  starter: {
    tier: "starter",
    name: "Starter",
    monthlyUsd: 29,
    ramMb: 2048,
    modelMode: "standard",
    includedCreditsMc: usdToMc(5),
    priceEnvKey: "STRIPE_PRICE_STARTER",
    features: [
      "1 always-on agent",
      "2 GB memory + skills volume",
      "Standard reasoning model",
      "Telegram channel",
      "Dollar wallet + usage tracking",
    ],
  },
  pro: {
    tier: "pro",
    name: "Pro",
    monthlyUsd: 49,
    ramMb: 4096,
    modelMode: "smart",
    includedCreditsMc: usdToMc(15),
    priceEnvKey: "STRIPE_PRICE_PRO",
    features: [
      "1 always-on agent",
      "4 GB memory + skills volume",
      "Smart reasoning model",
      "Telegram channel",
      "Priority provisioning",
      "Dollar wallet + usage tracking",
    ],
  },
};

export const PLAN_LIST: PlanDef[] = [PLANS.starter, PLANS.pro];

/** Stripe-plugin plan definitions (name + priceId) derived from env. */
export function stripePlanConfig(): { name: string; priceId: string }[] {
  const e = env();
  return PLAN_LIST.map((p) => ({
    name: p.tier, // Better Auth lower-cases plan names; keep them == tier.
    priceId: e[p.priceEnvKey] ?? "",
  })).filter((p) => p.priceId.length > 0);
}

/** Resolve a tier from a Stripe price id (used in webhook handling). */
export function tierForPriceId(priceId: string): AgentTier | null {
  const e = env();
  if (priceId && priceId === e.STRIPE_PRICE_STARTER) return "starter";
  if (priceId && priceId === e.STRIPE_PRICE_PRO) return "pro";
  return null;
}

// ── Credit packs (one-time wallet top-ups) ─────────────────────────────────
export const CREDIT_PACK_USD_OPTIONS = [10, 25, 50, 100] as const;
export type CreditPackUsd = (typeof CREDIT_PACK_USD_OPTIONS)[number];

/** Fraction of remaining balance at which we send the low-balance email. */
export const LOW_BALANCE_THRESHOLD = 0.2;

/** Map a tier to the RAM we provision (single source of truth for resize). */
export function ramForTier(tier: AgentTier): number {
  return PLANS[tier].ramMb;
}

/** Map a tier to the baked model mode. */
export function modelModeForTier(tier: AgentTier): ModelMode {
  return PLANS[tier].modelMode;
}

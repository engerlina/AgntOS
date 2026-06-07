/**
 * Centralised, validated environment access (shared by web + worker).
 *
 * Parsing is **lazy and cached** so importing this module never throws at build
 * time. Only a handful of vars are required to boot; feature integrations
 * (Stripe, Fly, OpenRouter, Resend, R2…) are optional and validated at the point
 * of use via `requireEnv(...)`, which gives a precise error if you try to use a
 * feature before configuring it.
 */
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // ── Core (required to boot) ──────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Railway Postgres)"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),

  // ── OAuth (optional) ─────────────────────────────────────────────────────
  GOOGLE_ID: z.string().optional(),
  GOOGLE_SECRET: z.string().optional(),

  // ── Stripe ───────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),

  // ── Email (Resend) ───────────────────────────────────────────────────────
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("AgntOS <hello@agntos.io>"),

  // ── Data plane (Fly Machines) ────────────────────────────────────────────
  FLY_API_TOKEN: z.string().optional(),
  FLY_ORG: z.string().optional(),
  FLY_REGION: z.string().default("syd"),
  AGENT_IMAGE_REF: z.string().optional(),

  // ── Tokens (OpenRouter) ──────────────────────────────────────────────────
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_PROVISIONING_KEY: z.string().optional(),

  // ── Crypto (BYOK at rest) ────────────────────────────────────────────────
  // 32-byte key, base64 or hex. Used by libsodium secretbox in crypto.ts.
  ENCRYPTION_KEY: z.string().optional(),

  // ── Observability ────────────────────────────────────────────────────────
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().default("https://us.i.posthog.com"),

  // ── Object storage (Cloudflare R2 — add when backups/uploads ship) ───────
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),

  // ── Internal service auth (web -> worker enqueue is via DB, but the worker
  //    exposes a tiny health/trigger endpoint guarded by this shared secret) ─
  WORKER_SHARED_SECRET: z.string().optional(),

  // App-level pricing knobs (micro-dollars). Defaults documented in plans.ts.
  CREDIT_PACK_MIN_USD: z.coerce.number().default(5),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Validate + cache process.env. Throws only for the few required core vars. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Read a feature var that is optional in the schema but required at call site. */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env()[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(
      `Environment variable ${String(key)} is required for this operation but is not set.`,
    );
  }
  return value as NonNullable<Env[K]>;
}

/** True when a feature's env is present — lets callers degrade gracefully. */
export function hasEnv(...keys: (keyof Env)[]): boolean {
  const e = env();
  return keys.every((k) => {
    const v = e[k];
    return v !== undefined && v !== null && v !== "";
  });
}

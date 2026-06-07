/**
 * OpenRouter provisioning client. We mint a per-user runtime key whose **credit
 * limit equals the wallet balance** — OpenRouter enforces the cap, so the agent
 * hard-stops when credits run out with zero custom code. Top-ups raise the limit;
 * the usage-sync cron reads each key's `usage` to meter the dollar wallet.
 *
 * API shape (POST/GET/PATCH/DELETE /api/v1/keys[/{hash}]) is implemented from the
 * documented provisioning-keys surface. ⚠️ Verify field names against the current
 * OpenRouter docs before launch — the public docs page moved while this was built.
 */
import { requireEnv } from "./env";
import { mcToUsd } from "./money";

const BASE = "https://openrouter.ai/api/v1";

export interface RuntimeKey {
  /** Stable identifier used for GET/PATCH/DELETE. Persist this, not the secret. */
  hash: string;
  name: string;
  label?: string;
  /** Spend cap in USD. */
  limit: number | null;
  /** Spend so far in USD. */
  usage: number;
  disabled: boolean;
}

export interface CreatedRuntimeKey extends RuntimeKey {
  /** The actual `sk-or-v1-...` secret — returned ONCE. Inject into Fly secrets. */
  key: string;
}

async function call<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${requireEnv("OPENROUTER_PROVISIONING_KEY")}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${method} ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

/** Mint a capped key for an agent. `limitMc` is the wallet balance in micro-dollars. */
export async function createRuntimeKey(args: {
  userId: string;
  agentId: string;
  limitMc: number;
}): Promise<CreatedRuntimeKey> {
  const payload = {
    name: `agntos-${args.agentId}`,
    label: `user:${args.userId}`,
    limit: mcToUsd(args.limitMc),
  };
  const json = await call<{ key: string; data: ApiKey }>("POST", "/keys", payload);
  return { ...normalize(json.data), key: json.key };
}

/** Read current usage + limit for an agent's key. */
export async function getRuntimeKey(hash: string): Promise<RuntimeKey> {
  const json = await call<{ data: ApiKey }>("GET", `/keys/${hash}`);
  return normalize(json.data);
}

/** Raise/lower the spend cap (e.g. after a top-up). `limitMc` in micro-dollars. */
export async function updateRuntimeKeyLimit(hash: string, limitMc: number): Promise<RuntimeKey> {
  const json = await call<{ data: ApiKey }>("PATCH", `/keys/${hash}`, {
    limit: mcToUsd(limitMc),
  });
  return normalize(json.data);
}

/** Disable a key (suspend) without deleting it. */
export async function setRuntimeKeyDisabled(hash: string, disabled: boolean): Promise<RuntimeKey> {
  const json = await call<{ data: ApiKey }>("PATCH", `/keys/${hash}`, { disabled });
  return normalize(json.data);
}

/** Permanently delete a key (on agent destroy). */
export async function deleteRuntimeKey(hash: string): Promise<void> {
  await call<unknown>("DELETE", `/keys/${hash}`);
}

interface ApiKey {
  hash: string;
  name: string;
  label?: string;
  limit: number | null;
  usage: number;
  disabled: boolean;
}

function normalize(k: ApiKey): RuntimeKey {
  return {
    hash: k.hash,
    name: k.name,
    label: k.label,
    limit: k.limit ?? null,
    usage: k.usage ?? 0,
    disabled: Boolean(k.disabled),
  };
}

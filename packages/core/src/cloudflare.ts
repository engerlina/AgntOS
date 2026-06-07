/**
 * Cloudflare DNS automation for per-agent subdomains (`<slug>.agntos.net`).
 *
 * Records are created **DNS-only** (not proxied) so the agent's Fly app can
 * complete Let's Encrypt HTTP-01 challenges directly — Fly issues a real cert
 * per hostname, no wildcard cert needed. Driven by CLOUDFLARE_API_TOKEN
 * (scope: Zone → DNS → Edit).
 */

const CF_API = "https://api.cloudflare.com/client/v4";

/** Apex domain agents live under. */
export const AGENT_DOMAIN = process.env.AGENT_DOMAIN ?? "agntos.net";

export function isCloudflareConfigured(): boolean {
  return !!process.env.CLOUDFLARE_API_TOKEN;
}

function cfToken(): string {
  const t = process.env.CLOUDFLARE_API_TOKEN;
  if (!t) throw new Error("CLOUDFLARE_API_TOKEN is not set");
  return t;
}

async function cf<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as { success: boolean; result: T; errors?: unknown };
  if (!json.success) throw new Error(`Cloudflare ${path} failed: ${JSON.stringify(json.errors)}`);
  return json.result;
}

let cachedZoneId: string | null = null;
async function zoneId(): Promise<string> {
  if (cachedZoneId) return cachedZoneId;
  const result = await cf<{ id: string }[]>(`/zones?name=${AGENT_DOMAIN}`);
  const id = result?.[0]?.id;
  if (!id) throw new Error(`Cloudflare zone for ${AGENT_DOMAIN} not found (check token scope)`);
  cachedZoneId = id;
  return id;
}

async function findRecordId(zone: string, name: string): Promise<string | null> {
  const result = await cf<{ id: string }[]>(`/zones/${zone}/dns_records?name=${name}`);
  return result?.[0]?.id ?? null;
}

/** Point `<slug>.agntos.net` at `target` (CNAME, DNS-only). Idempotent. */
export async function upsertAgentDns(slug: string, target: string): Promise<void> {
  const zone = await zoneId();
  const name = `${slug}.${AGENT_DOMAIN}`;
  const body = JSON.stringify({
    type: "CNAME",
    name,
    content: target,
    proxied: false,
    ttl: 1,
    comment: "AgntOS agent",
  });
  const existing = await findRecordId(zone, name);
  if (existing) await cf(`/zones/${zone}/dns_records/${existing}`, { method: "PUT", body });
  else await cf(`/zones/${zone}/dns_records`, { method: "POST", body });
}

/** Remove `<slug>.agntos.net`. Idempotent (no-op if absent). */
export async function deleteAgentDns(slug: string): Promise<void> {
  const zone = await zoneId();
  const id = await findRecordId(zone, `${slug}.${AGENT_DOMAIN}`);
  if (id) await cf(`/zones/${zone}/dns_records/${id}`, { method: "DELETE" });
}

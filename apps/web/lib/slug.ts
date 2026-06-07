/**
 * Agent handle (== subdomain). The agent's name becomes `<slug>.agntos.net`.
 */
const RESERVED = new Set([
  "www", "api", "app", "admin", "dashboard", "mail", "ftp", "ns1", "ns2",
  "staging", "dev", "test", "agntos", "support", "help", "blog", "status",
  "cdn", "assets", "static", "auth", "login", "signup", "chat", "billing",
  "account", "settings", "onboarding", "worker",
]);

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/** Returns an error string if the slug is unusable, else null. */
export function slugError(slug: string): string | null {
  if (!slug) return "Pick a name.";
  if (slug.length < 3) return "At least 3 characters.";
  if (slug.length > 32) return "32 characters max.";
  if (!/^[a-z0-9-]+$/.test(slug)) return "Lowercase letters, numbers and hyphens only.";
  if (/^-|-$/.test(slug)) return "Can't start or end with a hyphen.";
  if (RESERVED.has(slug)) return "That handle is reserved.";
  return null;
}

export const AGENT_DOMAIN = "agntos.net";

/** The public address for an agent handle. */
export function agentUrl(slug: string): string {
  return `https://${slug}.${AGENT_DOMAIN}`;
}

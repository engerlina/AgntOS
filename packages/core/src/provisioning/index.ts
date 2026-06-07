import { FlyProvider } from "./fly";
import type { AgentProvider } from "./types";

export * from "./types";
export * from "./fly";

let cached: AgentProvider | null = null;

/**
 * Resolve the active data-plane provider. Swap the implementation here (or branch
 * on an env flag) to migrate Fly → Hetzner without touching the control plane.
 */
export function getProvider(): AgentProvider {
  if (!cached) cached = new FlyProvider();
  return cached;
}

/**
 * The data plane lives behind this interface so the provider (Fly today, Hetzner
 * later) is swappable without touching the control plane. See plan §8 and §16.
 */

/** Stable handle to a provisioned agent's infrastructure. */
export interface AgentRef {
  appId: string;
  machineId: string;
  volumeId?: string;
}

export interface CreateAgentInput {
  userId: string;
  agentId: string;
  /** Fly app name (provider-scoped, DNS-safe). e.g. `agntos-<agentId>`. */
  appName: string;
  region: string;
  ramMb: number;
  /** Pre-baked Hermes image ref (GHCR). */
  imageRef: string;
  /** Encrypted-at-rest secrets injected as env at boot (OpenRouter key, channel tokens…). */
  secrets: Record<string, string>;
  /** Non-secret env (USER_ID, AGENT_ID, model mode…). */
  env?: Record<string, string>;
  /** Persistent volume for Markdown memory + self-written skills. */
  volumeName: string;
  volumeSizeGb: number;
  volumeMountPath: string;
}

export interface CreateAgentResult {
  appId: string;
  machineId: string;
  volumeId: string;
  region: string;
}

export type HealthStatus = "ok" | "starting" | "error";

export interface AgentProvider {
  /** Create app + volume + secrets + machine. Returns provider handles. */
  create(input: CreateAgentInput): Promise<CreateAgentResult>;
  /** Resume a paused agent. */
  start(ref: AgentRef): Promise<void>;
  /** Pause → drops to storage-only billing. */
  stop(ref: AgentRef): Promise<void>;
  /** Delete machine + volume + app. */
  destroy(ref: AgentRef): Promise<void>;
  /** Tier upgrade — resize RAM. */
  resize(ref: AgentRef, ramMb: number): Promise<void>;
  /** Liveness as seen by the provider. */
  health(ref: AgentRef): Promise<HealthStatus>;
}

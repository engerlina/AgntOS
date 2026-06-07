/**
 * FlyProvider — one Firecracker microVM (Fly Machine) per agent, in its own Fly
 * app for clean secret scoping and one-call teardown.
 *
 * Machines REST API: https://api.machines.dev/v1  (Bearer FLY_API_TOKEN)
 * Secrets are set via the Fly GraphQL `setSecrets` mutation (api.fly.io/graphql),
 * then injected as env when the machine boots.
 *
 * All calls that mutate are safe to retry: create is keyed on a deterministic app
 * name, and the worker treats "already exists" as success (see worker handlers).
 */
import { env, requireEnv } from "../env";
import { log } from "../logger";
import type {
  AgentProvider,
  AgentRef,
  CreateAgentInput,
  CreateAgentResult,
  HealthStatus,
} from "./types";

const MACHINES_BASE = "https://api.machines.dev/v1";
const GRAPHQL_URL = "https://api.fly.io/graphql";

interface FlyMachine {
  id: string;
  state: string;
  config?: Record<string, unknown>;
}

interface FlyVolume {
  id: string;
  name: string;
}

function token(): string {
  return requireEnv("FLY_API_TOKEN");
}

async function flyFetch<T>(
  method: string,
  path: string,
  body?: unknown,
  query?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${MACHINES_BASE}${path}`);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FlyError(`Fly ${method} ${path} -> ${res.status}: ${text}`, res.status);
  }
  // Some endpoints (start/stop/delete) return empty bodies.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export class FlyError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "FlyError";
  }
}

function cpusForRam(ramMb: number): number {
  // Fly shared CPUs support up to ~2GB each; scale cpus with memory.
  return Math.max(1, Math.ceil(ramMb / 2048));
}

export class FlyProvider implements AgentProvider {
  private readonly org: string;

  constructor(org?: string) {
    this.org = org ?? requireEnv("FLY_ORG");
  }

  async create(input: CreateAgentInput): Promise<CreateAgentResult> {
    const app = input.appName;

    // 1. App (idempotent — ignore "already exists").
    await this.createApp(app);

    // 1b. Allocate a shared IPv4 + IPv6 so the app is reachable at <app>.fly.dev
    //     (for the exposed Hermes API server). Idempotent.
    await this.allocateSharedIp(app);

    // 2. Volume for memory + skills.
    const volume = await this.createVolume(app, {
      name: input.volumeName,
      size_gb: input.volumeSizeGb,
      region: input.region,
    });

    // 3. Secrets (encrypted by Fly, injected as env at boot).
    await this.setSecrets(app, input.secrets);

    // 4. Machine from the pre-baked image, sized per tier, volume mounted.
    const machine = await flyFetch<FlyMachine>("POST", `/apps/${app}/machines`, {
      region: input.region,
      config: {
        image: input.imageRef,
        // skip_secrets:false (default) so app secrets are injected.
        guest: {
          cpu_kind: "shared",
          cpus: cpusForRam(input.ramMb),
          memory_mb: input.ramMb,
        },
        env: { ...input.env },
        mounts: [{ volume: volume.id, path: input.volumeMountPath }],
        restart: { policy: "always" },
        auto_destroy: false,
        services: [
          // 443 → Caddy basic-auth proxy → Hermes web dashboard (loopback). This
          // is what <name>.agntos.net resolves to (per-agent cert added by worker).
          {
            protocol: "tcp",
            internal_port: 8088,
            ports: [
              { port: 443, handlers: ["tls", "http"] },
              { port: 80, handlers: ["http"], force_https: true },
            ],
          },
          // 8642 → Hermes' OpenAI-compatible API server, for the in-AgntOS chat proxy.
          {
            protocol: "tcp",
            internal_port: 8642,
            ports: [{ port: 8642, handlers: ["tls", "http"] }],
          },
        ],
      },
    });

    log.info("fly: machine created", { app, machineId: machine.id, volumeId: volume.id });
    return { appId: app, machineId: machine.id, volumeId: volume.id, region: input.region };
  }

  async start(ref: AgentRef): Promise<void> {
    await flyFetch("POST", `/apps/${ref.appId}/machines/${ref.machineId}/start`);
  }

  async stop(ref: AgentRef): Promise<void> {
    await flyFetch("POST", `/apps/${ref.appId}/machines/${ref.machineId}/stop`);
  }

  async destroy(ref: AgentRef): Promise<void> {
    // Deleting the app tears down machines + volumes in one call; we also
    // best-effort delete the machine first so a stuck app delete still frees the VM.
    try {
      await flyFetch("DELETE", `/apps/${ref.appId}/machines/${ref.machineId}`, undefined, {
        force: "true",
      });
    } catch (err) {
      if (!(err instanceof FlyError && err.status === 404)) {
        log.warn("fly: machine delete failed (continuing to app delete)", {
          app: ref.appId,
          error: String(err),
        });
      }
    }
    await flyFetch("DELETE", `/apps/${ref.appId}`).catch((err) => {
      if (err instanceof FlyError && err.status === 404) return;
      throw err;
    });
  }

  async resize(ref: AgentRef, ramMb: number): Promise<void> {
    // Fetch current config, bump guest memory/cpus, update in place (machine
    // restarts to apply). Update endpoint is POST /machines/{id}.
    const machine = await flyFetch<FlyMachine>(
      "GET",
      `/apps/${ref.appId}/machines/${ref.machineId}`,
    );
    const config = (machine.config ?? {}) as Record<string, unknown>;
    config.guest = {
      ...(config.guest as Record<string, unknown>),
      cpu_kind: "shared",
      cpus: cpusForRam(ramMb),
      memory_mb: ramMb,
    };
    await flyFetch("POST", `/apps/${ref.appId}/machines/${ref.machineId}`, { config });
  }

  async health(ref: AgentRef): Promise<HealthStatus> {
    try {
      const machine = await flyFetch<FlyMachine>(
        "GET",
        `/apps/${ref.appId}/machines/${ref.machineId}`,
      );
      if (machine.state === "started") return "ok";
      if (["created", "starting", "replacing"].includes(machine.state)) return "starting";
      return "error";
    } catch {
      return "error";
    }
  }

  /** Block until the machine reaches `state` (uses Fly's /wait long-poll). */
  async waitForState(ref: AgentRef, state = "started", timeoutSec = 60): Promise<void> {
    await flyFetch("GET", `/apps/${ref.appId}/machines/${ref.machineId}/wait`, undefined, {
      state,
      timeout: String(timeoutSec),
    });
  }

  // ── low-level helpers ─────────────────────────────────────────────────────

  private async createApp(appName: string): Promise<void> {
    try {
      await flyFetch("POST", "/apps", {
        app_name: appName,
        org_slug: this.org,
      });
    } catch (err) {
      // 422 with "already been taken" means a retry — treat as success.
      if (err instanceof FlyError && (err.status === 422 || err.status === 409)) {
        log.debug("fly: app already exists", { app: appName });
        return;
      }
      throw err;
    }
  }

  private async createVolume(
    appName: string,
    body: { name: string; size_gb: number; region: string },
  ): Promise<FlyVolume> {
    // If a volume with this name already exists (retry), reuse it.
    const existing = await flyFetch<FlyVolume[]>("GET", `/apps/${appName}/volumes`).catch(
      () => [] as FlyVolume[],
    );
    const match = existing.find((v) => v.name === body.name);
    if (match) return match;
    return flyFetch<FlyVolume>("POST", `/apps/${appName}/volumes`, {
      ...body,
      encrypted: true,
    });
  }

  /** Set app secrets via GraphQL. Values are write-only once set. */
  private async setSecrets(appName: string, secrets: Record<string, string>): Promise<void> {
    const entries = Object.entries(secrets).filter(([, v]) => v != null && v !== "");
    if (entries.length === 0) return;
    const mutation = `
      mutation($input: SetSecretsInput!) {
        setSecrets(input: $input) { release { id version } }
      }`;
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            appId: appName,
            secrets: entries.map(([key, value]) => ({ key, value })),
          },
        },
      }),
    });
    const json = (await res.json()) as { errors?: { message: string }[] };
    if (json.errors?.length) {
      throw new Error(`Fly setSecrets failed: ${json.errors.map((e) => e.message).join("; ")}`);
    }
  }

  /** Allocate a shared IPv4 + IPv6 so the app routes at <app>.fly.dev. Idempotent. */
  private async allocateSharedIp(appName: string): Promise<void> {
    const mutation = `
      mutation($input: AllocateIPAddressInput!) {
        allocateIpAddress(input: $input) { ipAddress { address type } }
      }`;
    const alloc = async (type: "shared_v4" | "v6") => {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation, variables: { input: { appId: appName, type } } }),
      });
      const json = (await res.json()) as { errors?: { message: string }[] };
      if (json.errors?.length) {
        const msg = json.errors.map((e) => e.message).join("; ");
        // "already allocated / in use" → fine (idempotent retry); else just warn.
        if (!/already|exists|in use/i.test(msg)) {
          log.warn("fly: allocateIpAddress failed", { app: appName, type, error: msg });
        }
      }
    };
    await alloc("shared_v4");
    await alloc("v6");
  }
}

/** Default Fly app name for an agent (DNS-safe, deterministic for idempotency). */
export function flyAppName(agentId: string): string {
  return `agntos-${agentId}`.toLowerCase();
}

/** Construct the provider configured from env, with a default region. */
export function defaultFlyRegion(): string {
  return env().FLY_REGION;
}

async function flyGraphql(mutation: string, variables: Record<string, unknown>): Promise<string | null> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: mutation, variables }),
  });
  const json = (await res.json()) as { errors?: { message: string }[] };
  return json.errors?.length ? json.errors.map((e) => e.message).join("; ") : null;
}

/** Provision a Let's Encrypt cert for `hostname` on the agent's app (HTTP-01). Idempotent. */
export async function addFlyCertificate(appName: string, hostname: string): Promise<void> {
  const err = await flyGraphql(
    `mutation($appId: ID!, $hostname: String!) {
      addCertificate(appId: $appId, hostname: $hostname) { certificate { hostname } }
    }`,
    { appId: appName, hostname },
  );
  if (err && !/already|exists|has a certificate/i.test(err)) {
    throw new Error(`Fly addCertificate failed: ${err}`);
  }
}

/** Remove a cert for `hostname` from the app. Idempotent (ignores "not found"). */
export async function removeFlyCertificate(appName: string, hostname: string): Promise<void> {
  const err = await flyGraphql(
    `mutation($appId: ID!, $hostname: String!) {
      deleteCertificate(appId: $appId, hostname: $hostname) { app { id } }
    }`,
    { appId: appName, hostname },
  );
  if (err && !/not found|does not exist|no certificate/i.test(err)) {
    log.warn("fly: removeCertificate failed", { app: appName, hostname, error: err });
  }
}

/** Set app secrets (take effect on the next machine start). */
export async function setFlySecrets(appName: string, secrets: Record<string, string>): Promise<void> {
  const entries = Object.entries(secrets).filter(([, v]) => v != null && v !== "");
  if (entries.length === 0) return;
  const err = await flyGraphql(
    `mutation($input: SetSecretsInput!) { setSecrets(input: $input) { release { id } } }`,
    { input: { appId: appName, secrets: entries.map(([key, value]) => ({ key, value })) } },
  );
  if (err) throw new Error(`Fly setSecrets failed: ${err}`);
}

/** Remove app secrets (take effect on the next machine start). Idempotent. */
export async function unsetFlySecrets(appName: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const err = await flyGraphql(
    `mutation($input: UnsetSecretsInput!) { unsetSecrets(input: $input) { release { id } } }`,
    { input: { appId: appName, keys } },
  );
  if (err && !/no.*secret|not.*set|not found/i.test(err)) {
    throw new Error(`Fly unsetSecrets failed: ${err}`);
  }
}

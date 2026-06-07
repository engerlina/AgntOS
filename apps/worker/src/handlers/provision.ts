import { randomBytes } from "node:crypto";

import { log, requireEnv, type ProvisionAgentJob } from "@agntos/core";
import { getBalance } from "@agntos/core/billing";
import { decryptSecret, encryptSecret } from "@agntos/core/crypto";
import { createRuntimeKey, deleteRuntimeKey } from "@agntos/core/openrouter";
import {
  defaultFlyRegion,
  flyAppName,
  getProvider,
  type AgentProvider,
  type AgentRef,
} from "@agntos/core/provisioning";
import { sendEmail } from "@agntos/core/email";
import { agent, auditLog, channel, db, eq, user } from "@agntos/db";

const HERMES_DATA_PATH = "/home/hermes/.hermes";

/** Volume holds Markdown memory + self-written skills — small but persistent. */
function volumeSizeForRam(ramMb: number): number {
  return ramMb >= 4096 ? 5 : 3;
}

export async function handleProvision(data: ProvisionAgentJob): Promise<void> {
  const [row] = await db.select().from(agent).where(eq(agent.id, data.agentId)).limit(1);
  if (!row) {
    log.warn("provision: agent row not found (deleted?)", { agentId: data.agentId });
    return;
  }
  if (row.status === "running") {
    log.info("provision: already running, skipping", { agentId: row.id });
    return;
  }

  const [u] = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, row.userId))
    .limit(1);

  try {
    await setStatus(row.id, "provisioning", "Allocating resources…");

    const region = row.region ?? defaultFlyRegion();
    const imageRef = requireEnv("AGENT_IMAGE_REF");
    const balanceMc = Math.max(await getBalance(row.userId), 0);

    // Mint the per-user capped OpenRouter key. On a retry we can't recover the
    // previous secret, so delete the stale key and mint a fresh one (no leak).
    if (row.openrouterKeyHash) {
      await deleteRuntimeKey(row.openrouterKeyHash).catch((e) =>
        log.warn("provision: stale key delete failed", { agentId: row.id, error: String(e) }),
      );
    }
    const key = await createRuntimeKey({
      userId: row.userId,
      agentId: row.id,
      limitMc: balanceMc,
    });
    await db.update(agent).set({ openrouterKeyHash: key.hash }).where(eq(agent.id, row.id));

    // Per-agent key for Hermes' API server. AgntOS proxies browser chat to the
    // agent using this; stored encrypted so the web proxy can decrypt it.
    const apiKey = `agk_${randomBytes(24).toString("hex")}`;
    const webPasswordCipher = await encryptSecret(apiKey);

    // Decrypt the channel token (never persisted in plaintext anywhere).
    const telegramToken = data.telegram?.tokenCipher
      ? await decryptSecret(data.telegram.tokenCipher)
      : undefined;

    const secrets: Record<string, string> = {
      OPENROUTER_API_KEY: key.key,
      API_SERVER_KEY: apiKey,
      USER_ID: row.userId,
      AGENT_ID: row.id,
      ...(telegramToken ? { TELEGRAM_BOT_TOKEN: telegramToken } : {}),
    };
    const nonSecretEnv: Record<string, string> = {
      AGENT_ID: row.id,
      USER_ID: row.userId,
      AGENT_NAME: row.name,
      MODEL_MODE: row.model,
      ...(row.personality ? { AGENT_PERSONALITY: row.personality } : {}),
      ...(data.telegram ? { CHANNEL: "telegram" } : {}),
    };

    const provider = getProvider();
    const result = await provider.create({
      userId: row.userId,
      agentId: row.id,
      appName: flyAppName(row.id),
      region,
      ramMb: row.ramMb,
      imageRef,
      secrets,
      env: nonSecretEnv,
      volumeName: "data",
      volumeSizeGb: volumeSizeForRam(row.ramMb),
      volumeMountPath: HERMES_DATA_PATH,
    });

    await db
      .update(agent)
      .set({
        flyAppId: result.appId,
        flyMachineId: result.machineId,
        flyVolumeId: result.volumeId,
        region: result.region,
        publicUrl: `https://${flyAppName(row.id)}.fly.dev`,
        webPasswordCipher,
        statusDetail: "Booting Hermes…",
        updatedAt: new Date(),
      })
      .where(eq(agent.id, row.id));

    const ref: AgentRef = {
      appId: result.appId,
      machineId: result.machineId,
      volumeId: result.volumeId,
    };
    const healthy = await pollHealth(provider, ref, 120_000);
    if (!healthy) throw new Error("Agent did not report healthy within 120s");

    // The machine is up, but Hermes takes a few minutes to initialise its API
    // server on first boot. Wait until it actually serves before we say "running"
    // so the dashboard doesn't offer chat before it works.
    await setStatus(row.id, "provisioning", "Starting Hermes (first boot takes a few minutes)…");
    const apiReady = await pollApiReady(`https://${flyAppName(row.id)}.fly.dev`, apiKey, 480_000);
    if (!apiReady) {
      log.warn("provision: API not ready within timeout; marking running anyway", {
        agentId: row.id,
      });
    }

    await setStatus(row.id, "running", null);
    if (data.telegram) {
      await db.update(channel).set({ status: "connected" }).where(eq(channel.agentId, row.id));
    }
    await db.insert(auditLog).values({
      userId: row.userId,
      action: "agent.provisioned",
      meta: { agentId: row.id, appId: result.appId, region: result.region },
    });
    if (u?.email) {
      await sendEmail.agentReady(u.email, {
        agentName: row.name,
        channel: data.telegram ? "Telegram" : "your channel",
      });
    }
    log.info("agent provisioned", { agentId: row.id, appId: result.appId });
  } catch (err) {
    log.error("provision failed", { agentId: data.agentId, error: String(err) });
    await setStatus(data.agentId, "error", String(err).slice(0, 300)).catch(() => {});
    throw err; // surface to pg-boss for retry/backoff
  }
}

async function setStatus(
  agentId: string,
  status: "provisioning" | "running" | "error",
  detail: string | null,
): Promise<void> {
  await db
    .update(agent)
    .set({ status, statusDetail: detail, updatedAt: new Date() })
    .where(eq(agent.id, agentId));
}

async function pollHealth(
  provider: AgentProvider,
  ref: AgentRef,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await provider.health(ref).catch(() => "error" as const);
    if (status === "ok") return true;
    if (status === "error") {
      // brief grace before giving up — early boot can transiently report error
      await sleep(5000);
    } else {
      await sleep(4000);
    }
  }
  return (await provider.health(ref).catch(() => "error")) === "ok";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Poll the agent's Hermes API server until it actually serves (or times out). */
async function pollApiReady(publicUrl: string, apiKey: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${publicUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await sleep(15_000);
  }
  return false;
}

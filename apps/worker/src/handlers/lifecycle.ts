import {
  log,
  type DestroyAgentJob,
  type PauseAgentJob,
  type ReconfigureAgentJob,
  type ResizeAgentJob,
  type ResumeAgentJob,
} from "@agntos/core";
import { deleteAgentDns, isCloudflareConfigured } from "@agntos/core/cloudflare";
import { decryptSecret } from "@agntos/core/crypto";
import { deleteRuntimeKey, setRuntimeKeyDisabled } from "@agntos/core/openrouter";
import {
  getProvider,
  setFlySecrets,
  unsetFlySecrets,
  type AgentRef,
} from "@agntos/core/provisioning";
import { agent, and, auditLog, channel, db, eq } from "@agntos/db";

import { meterKeyUsage } from "./metering";

type AgentRow = typeof agent.$inferSelect;

function refOf(row: AgentRow): AgentRef | null {
  if (!row.flyAppId || !row.flyMachineId) return null;
  return { appId: row.flyAppId, machineId: row.flyMachineId, volumeId: row.flyVolumeId ?? undefined };
}

async function load(agentId: string): Promise<AgentRow | null> {
  const [row] = await db.select().from(agent).where(eq(agent.id, agentId)).limit(1);
  return row ?? null;
}

export async function handlePause(data: PauseAgentJob): Promise<void> {
  const row = await load(data.agentId);
  if (!row) return;
  const ref = refOf(row);
  if (ref) await getProvider().stop(ref);
  // Belt-and-braces: disable the spend key while paused.
  if (row.openrouterKeyHash) {
    await setRuntimeKeyDisabled(row.openrouterKeyHash, true).catch((e) =>
      log.warn("pause: key disable failed", { agentId: row.id, error: String(e) }),
    );
  }
  await db
    .update(agent)
    .set({ status: "paused", statusDetail: data.reason ?? null, updatedAt: new Date() })
    .where(eq(agent.id, row.id));
  await db.insert(auditLog).values({
    userId: row.userId,
    action: "agent.pause",
    meta: { agentId: row.id, reason: data.reason ?? "user" },
  });
  log.info("agent paused", { agentId: row.id, reason: data.reason });
}

export async function handleResume(data: ResumeAgentJob): Promise<void> {
  const row = await load(data.agentId);
  if (!row) return;
  const ref = refOf(row);
  if (!ref) {
    log.warn("resume: no infra ref, re-provisioning needed", { agentId: row.id });
    return;
  }
  await getProvider().start(ref);
  if (row.openrouterKeyHash) {
    await setRuntimeKeyDisabled(row.openrouterKeyHash, false).catch(() => {});
  }
  await db
    .update(agent)
    .set({ status: "running", statusDetail: null, updatedAt: new Date() })
    .where(eq(agent.id, row.id));
  log.info("agent resumed", { agentId: row.id });
}

export async function handleDestroy(data: DestroyAgentJob): Promise<void> {
  const row = await load(data.agentId);
  if (!row) return; // already gone — destroy is idempotent
  const ref = refOf(row);
  // Bill any spend since the last usage sync BEFORE we delete the key, otherwise
  // the final (up to ~2-min) window is free — exploitable as top-up → burn →
  // destroy → recreate. Best-effort: a metering failure must not block teardown.
  if (row.openrouterKeyHash) {
    await meterKeyUsage(row.id, row.userId, row.openrouterKeyHash).catch((e) =>
      log.warn("destroy: final usage meter failed", { agentId: row.id, error: String(e) }),
    );
  }
  if (ref) {
    await getProvider().destroy(ref);
  }
  // Remove the per-agent subdomain DNS record (the Fly cert dies with the app).
  if (row.slug && isCloudflareConfigured()) {
    await deleteAgentDns(row.slug).catch((e) =>
      log.warn("destroy: DNS delete failed", { agentId: row.id, error: String(e) }),
    );
  }
  if (row.openrouterKeyHash) {
    await deleteRuntimeKey(row.openrouterKeyHash).catch((e) =>
      log.warn("destroy: key delete failed", { agentId: row.id, error: String(e) }),
    );
  }
  await db.insert(auditLog).values({
    userId: row.userId,
    action: "agent.destroyed",
    meta: { agentId: row.id, reason: data.reason ?? "user" },
  });
  // Remove the row (cascades channels). Memory/skills are gone with the volume.
  await db.delete(agent).where(eq(agent.id, row.id));
  log.info("agent destroyed", { agentId: row.id });
}

export async function handleResize(data: ResizeAgentJob): Promise<void> {
  const row = await load(data.agentId);
  if (!row) return;
  const ref = refOf(row);
  if (!ref) return;
  await getProvider().resize(ref, data.ramMb);
  await db
    .update(agent)
    .set({ ramMb: data.ramMb, updatedAt: new Date() })
    .where(eq(agent.id, row.id));
  log.info("agent resized", { agentId: row.id, ramMb: data.ramMb });
}

/**
 * Connect or disconnect a messaging channel (Telegram) on a running agent:
 * set/unset the bot-token Fly secret, then restart so it takes effect at boot.
 */
export async function handleReconfigure(data: ReconfigureAgentJob): Promise<void> {
  const row = await load(data.agentId);
  if (!row) return;
  const ref = refOf(row);
  if (!ref) {
    log.warn("reconfigure: no infra ref", { agentId: row.id });
    return;
  }

  if (data.action === "connect" && data.telegram) {
    const token = await decryptSecret(data.telegram.tokenCipher);
    await setFlySecrets(ref.appId, { TELEGRAM_BOT_TOKEN: token, CHANNEL: "telegram" });
  } else if (data.action === "disconnect") {
    await unsetFlySecrets(ref.appId, ["TELEGRAM_BOT_TOKEN"]);
  }

  // Secrets inject at boot — restart to apply.
  await getProvider().stop(ref).catch(() => {});
  await getProvider().start(ref);

  if (data.action === "connect") {
    const [existing] = await db
      .select({ id: channel.id })
      .from(channel)
      .where(and(eq(channel.agentId, row.id), eq(channel.type, "telegram")))
      .limit(1);
    const values = { status: "connected" as const, externalRef: data.telegram?.ref ?? null };
    if (existing) {
      await db.update(channel).set(values).where(eq(channel.id, existing.id));
    } else {
      await db.insert(channel).values({ agentId: row.id, type: "telegram", ...values });
    }
  } else {
    await db
      .delete(channel)
      .where(and(eq(channel.agentId, row.id), eq(channel.type, "telegram")));
  }

  await db.insert(auditLog).values({
    userId: row.userId,
    action: `agent.channel.${data.action}`,
    meta: { agentId: row.id, channel: data.channel },
  });
  log.info("agent reconfigured", { agentId: row.id, action: data.action });
}

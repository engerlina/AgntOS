import {
  log,
  type DestroyAgentJob,
  type PauseAgentJob,
  type ResizeAgentJob,
  type ResumeAgentJob,
} from "@agntos/core";
import { deleteRuntimeKey, setRuntimeKeyDisabled } from "@agntos/core/openrouter";
import { getProvider, type AgentRef } from "@agntos/core/provisioning";
import { agent, auditLog, db, eq } from "@agntos/db";

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
  if (ref) {
    await getProvider().destroy(ref);
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

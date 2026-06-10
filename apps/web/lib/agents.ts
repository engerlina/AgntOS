import { env, log, QUEUE, ramForTier } from "@agntos/core";
import { COMP_TIER, isCompEmail, PLANS } from "@agntos/core/billing";
import { encryptSecret } from "@agntos/core/crypto";
import {
  agent,
  and,
  auditLog,
  channel,
  db,
  desc,
  eq,
  inArray,
  subscription,
  user,
  type AgentTier,
} from "@agntos/db";

import { enqueue } from "./boss";

/**
 * The tier the user is entitled to, from their active subscription. In dev
 * (no Stripe configured) we default to "starter" so the launch flow is testable;
 * in production an active/trialing subscription is required.
 */
export async function getActiveTier(userId: string): Promise<AgentTier | null> {
  // Comped accounts can launch without a paid subscription.
  const [u] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (isCompEmail(u?.email)) return COMP_TIER;

  const [sub] = await db
    .select({ plan: subscription.plan, status: subscription.status })
    .from(subscription)
    .where(eq(subscription.referenceId, userId))
    .orderBy(desc(subscription.periodEnd))
    .limit(1);

  if (sub && (sub.status === "active" || sub.status === "trialing")) {
    return sub.plan === "pro" ? "pro" : "starter";
  }
  if (env().NODE_ENV !== "production") return "starter";
  return null;
}

export async function listAgents(userId: string) {
  return db
    .select()
    .from(agent)
    .where(eq(agent.userId, userId))
    .orderBy(desc(agent.createdAt));
}

export async function getAgentForUser(userId: string, agentId: string) {
  const [row] = await db
    .select()
    .from(agent)
    .where(and(eq(agent.id, agentId), eq(agent.userId, userId)))
    .limit(1);
  return row ?? null;
}

/**
 * Strip server-only / secret columns before an agent row is sent to the browser.
 * The ciphertexts are useless without ENCRYPTION_KEY and the Fly ids are internal,
 * but there's no reason to ship them into browser memory/history/logs.
 */
export function toPublicAgent<
  T extends {
    webPasswordCipher?: unknown;
    dashboardPasswordCipher?: unknown;
    openrouterKeyHash?: unknown;
    flyAppId?: unknown;
    flyMachineId?: unknown;
    flyVolumeId?: unknown;
  },
>(a: T) {
  const {
    webPasswordCipher: _w,
    dashboardPasswordCipher: _d,
    openrouterKeyHash: _k,
    flyAppId: _a,
    flyMachineId: _m,
    flyVolumeId: _v,
    ...pub
  } = a;
  return pub;
}

export interface CreateAgentInput {
  name: string;
  slug: string;
  personality?: string;
  tier: AgentTier;
  telegram?: { botToken: string; ref?: string };
}

/** Whether an agent handle (subdomain) is free. */
export async function slugAvailable(slug: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: agent.id })
    .from(agent)
    .where(eq(agent.slug, slug))
    .limit(1);
  return !existing;
}

/** Resolve an agent by its handle (subdomain), for <slug>.agntos.net routing. */
export async function agentBySlug(slug: string): Promise<{ id: string; userId: string } | null> {
  const [row] = await db
    .select({ id: agent.id, userId: agent.userId })
    .from(agent)
    .where(eq(agent.slug, slug))
    .limit(1);
  return row ?? null;
}

/**
 * Insert the agent row (status=provisioning) and enqueue the provisioning job.
 * The Telegram bot token is NOT stored in our DB — it's passed straight to the
 * worker via the job and ends up in Fly secrets. We persist only a non-secret ref.
 */
export async function createAndProvisionAgent(userId: string, input: CreateAgentInput) {
  const [row] = await db
    .insert(agent)
    .values({
      userId,
      name: input.name,
      slug: input.slug,
      personality: input.personality,
      tier: input.tier,
      model: PLANS[input.tier].modelMode,
      ramMb: ramForTier(input.tier),
      status: "provisioning",
    })
    .returning();

  if (!row) throw new Error("Failed to create agent row");

  if (input.telegram?.ref) {
    await db.insert(channel).values({
      agentId: row.id,
      type: "telegram",
      status: "pending",
      externalRef: input.telegram.ref,
    });
  }

  await db.insert(auditLog).values({
    userId,
    action: "agent.create",
    meta: { agentId: row.id, tier: input.tier },
  });

  // Encrypt the Telegram bot token before it enters the queue; the worker
  // decrypts and writes it to Fly secrets. Plaintext never hits our DB.
  const telegram = input.telegram?.botToken
    ? { tokenCipher: await encryptSecret(input.telegram.botToken), ref: input.telegram.ref }
    : undefined;

  await enqueue(
    QUEUE.provisionAgent,
    { agentId: row.id, userId, telegram },
    { singletonKey: row.id },
  );

  log.info("agent enqueued for provisioning", { agentId: row.id, userId, tier: input.tier });
  return row;
}

export async function pauseAgent(userId: string, agentId: string) {
  const row = await getAgentForUser(userId, agentId);
  if (!row) return null;
  await enqueue(QUEUE.pauseAgent, { agentId, reason: "user" }, { singletonKey: agentId });
  await db.update(agent).set({ status: "paused", updatedAt: new Date() }).where(eq(agent.id, agentId));
  return row;
}

export type ResumeResult =
  | { ok: true; row: Awaited<ReturnType<typeof getAgentForUser>> }
  | { ok: false; reason: "not_found" | "not_entitled" };

export async function resumeAgent(userId: string, agentId: string): Promise<ResumeResult> {
  const row = await getAgentForUser(userId, agentId);
  if (!row) return { ok: false, reason: "not_found" };
  // Don't let a lapsed (or never-subscribed) user restart a Fly machine — they
  // could otherwise re-resume after every hourly reconcile pause for free compute.
  const tier = await getActiveTier(userId);
  if (!tier) return { ok: false, reason: "not_entitled" };
  await enqueue(QUEUE.resumeAgent, { agentId }, { singletonKey: agentId });
  await db
    .update(agent)
    .set({ status: "provisioning", updatedAt: new Date() })
    .where(eq(agent.id, agentId));
  return { ok: true, row };
}

export async function destroyAgent(userId: string, agentId: string) {
  const row = await getAgentForUser(userId, agentId);
  if (!row) return null;
  await enqueue(
    QUEUE.destroyAgent,
    { agentId, reason: "user" },
    { singletonKey: agentId },
  );
  await db.update(agent).set({ status: "stopped", updatedAt: new Date() }).where(eq(agent.id, agentId));
  await db.insert(auditLog).values({ userId, action: "agent.destroy", meta: { agentId } });
  return row;
}

/** Connect a Telegram bot to a running agent (token → Fly secret + restart). */
export async function connectTelegram(
  userId: string,
  agentId: string,
  input: { botToken: string; ref?: string },
) {
  const row = await getAgentForUser(userId, agentId);
  if (!row) return null;
  const tokenCipher = await encryptSecret(input.botToken);
  const [existing] = await db
    .select({ id: channel.id })
    .from(channel)
    .where(and(eq(channel.agentId, agentId), eq(channel.type, "telegram")))
    .limit(1);
  if (existing) {
    await db.update(channel).set({ status: "pending", externalRef: input.ref ?? null }).where(eq(channel.id, existing.id));
  } else {
    await db.insert(channel).values({ agentId, type: "telegram", status: "pending", externalRef: input.ref ?? null });
  }
  await enqueue(
    QUEUE.reconfigureAgent,
    { agentId, action: "connect", channel: "telegram", telegram: { tokenCipher, ref: input.ref } },
    { singletonKey: agentId },
  );
  return row;
}

/** Disconnect Telegram from an agent (unset the secret + restart). */
export async function disconnectTelegram(userId: string, agentId: string) {
  const row = await getAgentForUser(userId, agentId);
  if (!row) return null;
  await db
    .update(channel)
    .set({ status: "pending" })
    .where(and(eq(channel.agentId, agentId), eq(channel.type, "telegram")));
  await enqueue(
    QUEUE.reconfigureAgent,
    { agentId, action: "disconnect", channel: "telegram" },
    { singletonKey: agentId },
  );
  return row;
}

/** Channels for a set of agent ids (for the dashboard). */
export async function channelsForAgents(agentIds: string[]) {
  if (agentIds.length === 0) return [];
  return db.select().from(channel).where(inArray(channel.agentId, agentIds));
}

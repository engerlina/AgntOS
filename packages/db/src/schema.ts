/**
 * AgntOS data model. Money is stored as **micro-dollars** (bigint columns,
 * `mode: "number"` — exact for integers up to 2^53 ≈ $9.0B, well beyond any
 * single wallet) to avoid floating-point drift. $1.00 = 1_000_000 mc.
 *
 * Re-exports the Better Auth + Stripe tables so the whole schema is one object.
 */
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export * from "./auth-schema";

// ── String unions kept in one place so app + worker agree ──────────────────
export type AgentTier = "starter" | "pro";
export type AgentStatus =
  | "provisioning"
  | "running"
  | "paused"
  | "stopped"
  | "error";
export type ChannelType = "telegram" | "whatsapp" | "slack" | "discord";
export type ChannelStatus = "connected" | "pending" | "error";
export type CreditTxnType = "topup" | "usage" | "grant" | "refund";
export type ModelMode = "standard" | "smart";

// ── agents — one row per provisioned agent ─────────────────────────────────
export const agent = pgTable(
  "agent",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    personality: text("personality"),
    // Operator-controlled model *mode* (maps to the baked config.yaml main model).
    // The user never sees a raw model name — only Standard vs Smart.
    model: text("model").$type<ModelMode>().notNull().default("standard"),
    tier: text("tier").$type<AgentTier>().notNull().default("starter"),
    status: text("status").$type<AgentStatus>().notNull().default("provisioning"),
    // Data-plane handles (Fly today; null until provisioned).
    flyAppId: text("fly_app_id"),
    flyMachineId: text("fly_machine_id"),
    flyVolumeId: text("fly_volume_id"),
    region: text("region"),
    ramMb: integer("ram_mb").notNull().default(2048),
    // The per-user OpenRouter key hash (NOT the secret — secret lives in Fly).
    openrouterKeyHash: text("openrouter_key_hash"),
    // Free-form provider/status detail for the dashboard + debugging.
    statusDetail: text("status_detail"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("agent_user_id_idx").on(t.userId), index("agent_status_idx").on(t.status)],
);

// ── channels — messaging surfaces connected to an agent ────────────────────
export const channel = pgTable(
  "channel",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agent.id, { onDelete: "cascade" }),
    type: text("type").$type<ChannelType>().notNull(),
    status: text("status").$type<ChannelStatus>().notNull().default("pending"),
    // Non-secret reference only (e.g. bot username, chat id). Tokens -> Fly secrets.
    externalRef: text("external_ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("channel_agent_id_idx").on(t.agentId)],
);

// ── wallet — prepaid credit balance (managed users) ────────────────────────
export const wallet = pgTable("wallet", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  balanceMc: bigint("balance_mc", { mode: "number" }).notNull().default(0),
  // Optional monthly cap (BYOK users set this); null = no cap.
  budgetMc: bigint("budget_mc", { mode: "number" }),
  // Email threshold bookkeeping so we don't spam low-balance notices.
  lowBalanceNotifiedAt: timestamp("low_balance_notified_at", { withTimezone: true }),
  autoTopupEnabled: text("auto_topup_enabled"),
  autoTopupThresholdMc: bigint("auto_topup_threshold_mc", { mode: "number" }),
  autoTopupAmountMc: bigint("auto_topup_amount_mc", { mode: "number" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── credit_txn — every balance movement (immutable ledger) ─────────────────
export const creditTxn = pgTable(
  "credit_txn",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").$type<CreditTxnType>().notNull(),
    amountMc: bigint("amount_mc", { mode: "number" }).notNull(), // +topup / -usage
    balanceAfterMc: bigint("balance_after_mc", { mode: "number" }).notNull(),
    // For top-ups — also the idempotency key for the Stripe webhook.
    stripePaymentId: text("stripe_payment_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("credit_txn_user_id_idx").on(t.userId),
    // Idempotency: a given Stripe payment credits the wallet at most once.
    // (NULLs don't conflict in Postgres, so non-topup rows are unaffected.)
    uniqueIndex("credit_txn_stripe_payment_id_uniq").on(t.stripePaymentId),
  ],
);

// ── usage_event — per model call, synced from OpenRouter ───────────────────
export const usageEvent = pgTable(
  "usage_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id").references(() => agent.id, { onDelete: "set null" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costMc: bigint("cost_mc", { mode: "number" }).notNull().default(0),
    // OpenRouter generation id — idempotency key for the usage-sync cron.
    externalId: text("external_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("usage_event_user_id_idx").on(t.userId),
    index("usage_event_agent_id_idx").on(t.agentId),
    uniqueIndex("usage_event_external_id_uniq").on(t.externalId),
  ],
);

// ── byok_key — encrypted at rest, never logged ─────────────────────────────
export const byokKey = pgTable(
  "byok_key",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    // libsodium sealed box / KMS ciphertext. See packages/core/crypto.ts.
    cipherText: text("cipher_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("byok_key_user_id_idx").on(t.userId)],
);

// ── audit_log — every provisioning + billing action ────────────────────────
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_user_id_idx").on(t.userId)],
);

// ── relations (used by the relational query API) ───────────────────────────
export const userRelations = relations(user, ({ one, many }) => ({
  agents: many(agent),
  wallet: one(wallet, { fields: [user.id], references: [wallet.userId] }),
}));

export const agentRelations = relations(agent, ({ one, many }) => ({
  user: one(user, { fields: [agent.userId], references: [user.id] }),
  channels: many(channel),
}));

export const channelRelations = relations(channel, ({ one }) => ({
  agent: one(agent, { fields: [channel.agentId], references: [agent.id] }),
}));

// Convenience row types.
export type Agent = typeof agent.$inferSelect;
export type NewAgent = typeof agent.$inferInsert;
export type Channel = typeof channel.$inferSelect;
export type Wallet = typeof wallet.$inferSelect;
export type CreditTxn = typeof creditTxn.$inferSelect;
export type UsageEvent = typeof usageEvent.$inferSelect;

// Re-export sql for callers that build raw fragments against this schema.
export { sql };

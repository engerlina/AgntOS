/**
 * The web app and the worker share this contract. Web enqueues pg-boss jobs; the
 * worker consumes them. Every lifecycle job is keyed on `agentId` and uses that
 * as the pg-boss `singletonKey` so duplicate enqueues collapse (idempotency).
 */
export const QUEUE = {
  provisionAgent: "provision_agent",
  pauseAgent: "pause_agent",
  resumeAgent: "resume_agent",
  destroyAgent: "destroy_agent",
  resizeAgent: "resize_agent",
  reconcileLifecycle: "reconcile_lifecycle",
  syncUsage: "sync_usage",
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];

export interface ProvisionAgentJob {
  agentId: string;
  userId: string;
  /**
   * Channel secret passed through the queue ENCRYPTED (libsodium, ENCRYPTION_KEY).
   * The worker decrypts and writes it to Fly secrets — it is never persisted in
   * plaintext, in our DB, or in the job table.
   */
  telegram?: { tokenCipher: string; ref?: string };
}
export interface PauseAgentJob {
  agentId: string;
  reason?: "user" | "wallet_depleted" | "non_payment";
}
export interface ResumeAgentJob {
  agentId: string;
}
export interface DestroyAgentJob {
  agentId: string;
  reason?: "user" | "subscription_ended";
}
export interface ResizeAgentJob {
  agentId: string;
  ramMb: number;
}
/** Cron jobs carry no payload. */
export type ReconcileLifecycleJob = Record<string, never>;
export type SyncUsageJob = Record<string, never>;

export interface JobPayloads {
  [QUEUE.provisionAgent]: ProvisionAgentJob;
  [QUEUE.pauseAgent]: PauseAgentJob;
  [QUEUE.resumeAgent]: ResumeAgentJob;
  [QUEUE.destroyAgent]: DestroyAgentJob;
  [QUEUE.resizeAgent]: ResizeAgentJob;
  [QUEUE.reconcileLifecycle]: ReconcileLifecycleJob;
  [QUEUE.syncUsage]: SyncUsageJob;
}

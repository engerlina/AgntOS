import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import PgBoss, { type Job } from "pg-boss";

import { env, log, QUEUE, type JobPayloads, type QueueName } from "@agntos/core";

import { handleProvision } from "./handlers/provision";
import {
  handleDestroy,
  handlePause,
  handleReconfigure,
  handleResize,
  handleResume,
} from "./handlers/lifecycle";
import { handleReconcile } from "./handlers/reconcile";
import { handleSyncUsage } from "./handlers/usage";

// Load the repo-root .env (one file drives web + worker + migrations). Safe
// because @agntos/db is lazy — no env is read during the import phase above; the
// first read happens in main(). No-op on Railway, where env is injected.
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

/**
 * The AgntOS worker: a single always-on Railway service that consumes pg-boss
 * jobs (provisioning + lifecycle) and runs the reconcile + usage-sync crons.
 * Shares one Postgres with the control plane (the queue lives in that DB).
 */
async function main() {
  const boss = new PgBoss({
    connectionString: env().DATABASE_URL,
    // Full supervisor here — this process owns maintenance + scheduling.
    application_name: "agntos-worker",
  });

  boss.on("error", (err) => log.error("pg-boss error", { error: String(err) }));

  await boss.start();
  for (const q of Object.values(QUEUE)) await boss.createQueue(q);

  // Register a one-job-at-a-time handler that unwraps the v10 job array.
  async function work<Q extends QueueName>(
    queue: Q,
    handler: (data: JobPayloads[Q]) => Promise<void>,
  ) {
    await boss.work<JobPayloads[Q]>(queue, async (jobs: Job<JobPayloads[Q]>[]) => {
      for (const job of jobs) {
        await handler(job.data);
      }
    });
  }

  await work(QUEUE.provisionAgent, handleProvision);
  await work(QUEUE.pauseAgent, handlePause);
  await work(QUEUE.resumeAgent, handleResume);
  await work(QUEUE.destroyAgent, handleDestroy);
  await work(QUEUE.resizeAgent, handleResize);
  await work(QUEUE.reconfigureAgent, handleReconfigure);
  await work(QUEUE.reconcileLifecycle, async () => handleReconcile());
  await work(QUEUE.syncUsage, async () => handleSyncUsage());

  // Crons. pg-boss dedups schedules by queue name, so these are idempotent.
  await boss.schedule(QUEUE.reconcileLifecycle, "0 * * * *"); // hourly
  await boss.schedule(QUEUE.syncUsage, "*/2 * * * *"); // every 2 minutes

  log.info("worker started", {
    queues: Object.values(QUEUE),
    flyConfigured: Boolean(env().FLY_API_TOKEN),
    openrouterConfigured: Boolean(env().OPENROUTER_PROVISIONING_KEY),
  });

  const shutdown = async (signal: string) => {
    log.info("worker shutting down", { signal });
    try {
      await boss.stop({ graceful: true, timeout: 30_000 });
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  log.error("worker failed to start", { error: String(err) });
  process.exit(1);
});

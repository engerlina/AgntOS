import PgBoss from "pg-boss";

import { env, log, QUEUE, type JobPayloads, type QueueName } from "@agntos/core";

/**
 * Producer-side pg-boss for the web app. We only *enqueue* here (the worker does
 * the heavy lifting), so we disable maintenance/scheduling to keep serverless
 * invocations cheap. The instance is cached on a warm Lambda.
 */
const globalForBoss = globalThis as unknown as { __agntosBoss?: Promise<PgBoss> };

async function startBoss(): Promise<PgBoss> {
  const boss = new PgBoss({
    connectionString: env().DATABASE_URL,
    // Producer only: don't run the maintenance/cron supervisor in the web runtime.
    supervise: false,
    schedule: false,
  });
  boss.on("error", (err) => log.error("pg-boss (web) error", { error: String(err) }));
  await boss.start();
  // Ensure queues exist so the first send() never races the worker's setup.
  await Promise.all(Object.values(QUEUE).map((q) => boss.createQueue(q)));
  return boss;
}

export function getBoss(): Promise<PgBoss> {
  if (!globalForBoss.__agntosBoss) globalForBoss.__agntosBoss = startBoss();
  return globalForBoss.__agntosBoss;
}

/** Enqueue a typed job. Lifecycle jobs are deduped on `singletonKey` = agentId. */
export async function enqueue<Q extends QueueName>(
  queue: Q,
  data: JobPayloads[Q],
  opts: { singletonKey?: string } = {},
): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(queue, data as object, {
    retryLimit: 5,
    retryBackoff: true,
    singletonKey: opts.singletonKey,
  });
}

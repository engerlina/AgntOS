import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { sslConfig } from "./client";

/**
 * Apply any pending Drizzle migrations (the committed SQL in `./drizzle`).
 * Run at worker startup so a deploy can't ship code that expects a schema the
 * database doesn't have yet. Idempotent — drizzle tracks applied migrations in
 * its own table, so re-running is a no-op. Uses a throwaway single-connection
 * pool (closed on completion) so it doesn't touch the app's shared pool.
 */
export async function migrateToLatest(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set; cannot run migrations.");

  const pool = new Pool({ connectionString, ssl: sslConfig(connectionString), max: 1 });
  try {
    const mdb = drizzle(pool);
    const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
    await migrate(mdb, { migrationsFolder });
  } finally {
    await pool.end();
  }
}

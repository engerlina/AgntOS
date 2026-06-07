import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/**
 * Lazy, pooled connection. The pool + drizzle client are created on **first use**,
 * never at import time — so importing `@agntos/db` is side-effect-free. That lets
 * Next prerender pages that transitively import this, and lets the worker load its
 * root `.env` before the first query. Guarded on globalThis so dev hot-reload and
 * serverless warm starts reuse one pool.
 */
const globalForDb = globalThis as unknown as {
  __agntosPool?: Pool;
  __agntosDb?: NodePgDatabase<typeof schema>;
};

function makePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to your .env (Railway Postgres URL).");
  }
  return new Pool({
    connectionString,
    // Managed Postgres (Railway/Supabase/etc.) needs TLS; local doesn't.
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });
}

export function getPool(): Pool {
  if (!globalForDb.__agntosPool) globalForDb.__agntosPool = makePool();
  return globalForDb.__agntosPool;
}

function getDb(): NodePgDatabase<typeof schema> {
  if (!globalForDb.__agntosDb) {
    globalForDb.__agntosDb = drizzle(getPool(), { schema, casing: "snake_case" });
  }
  return globalForDb.__agntosDb;
}

/** Drizzle client. Backed by a Proxy that initialises the pool on first access. */
export const db: NodePgDatabase<typeof schema> = new Proxy(
  {} as NodePgDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      const real = getDb();
      const value = Reflect.get(real as object, prop, receiver);
      return typeof value === "function" ? value.bind(real) : value;
    },
    has(_target, prop) {
      return prop in getDb();
    },
  },
);

export type Database = NodePgDatabase<typeof schema>;

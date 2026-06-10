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

/**
 * TLS config for the Postgres pool.
 *  - localhost → no TLS.
 *  - DATABASE_CA_CERT set → verify the server cert against it (`rejectUnauthorized`).
 *    Set this (the provider's CA PEM, newlines as `\n`) to harden the connection.
 *  - otherwise → encrypted but unverified. Required for providers whose proxy
 *    (e.g. Railway's TCP proxy) presents a cert that doesn't chain to a public CA.
 */
export function sslConfig(connectionString: string): false | { rejectUnauthorized: boolean; ca?: string } {
  if (connectionString.includes("localhost") || connectionString.includes("127.0.0.1")) return false;
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  if (ca) return { ca, rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

function makePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to your .env (Railway Postgres URL).");
  }
  return new Pool({
    connectionString,
    ssl: sslConfig(connectionString),
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

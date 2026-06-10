export { db, getPool, sslConfig } from "./client";
export type { Database } from "./client";
// NOTE: `migrateToLatest` is intentionally NOT re-exported here — it references
// the ./drizzle migrations folder, which a frontend bundler can't resolve. The
// worker imports it directly from "@agntos/db/migrate".
export * as schema from "./schema";
export * from "./schema";

// Re-export the operators callers need so they import from one place.
export {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  like,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";

export { db, getPool } from "./client";
export type { Database } from "./client";
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
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";

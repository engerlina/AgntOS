import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load the repo-root .env so a single env file drives web, worker, and migrations.
config({ path: "../../.env" });

if (!process.env.DATABASE_URL) {
  // drizzle-kit needs a real URL for generate/migrate/push/studio.
  // Generate (diffing the schema) technically works without it, but we fail
  // loudly so a misconfigured environment is obvious during setup.
  // eslint-disable-next-line no-console
  console.warn("[drizzle] DATABASE_URL is not set — set it in the repo-root .env before migrating.");
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/agntos",
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
});

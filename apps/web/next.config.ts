import { config } from "dotenv";
import { resolve } from "node:path";
import type { NextConfig } from "next";

// One root .env drives the whole monorepo. Next only auto-loads env from the app
// dir, so we load the repo-root .env here (runs before any app module). No-op on
// Vercel where the file is absent and env is injected by the platform.
config({ path: resolve(process.cwd(), "../../.env") });

const nextConfig: NextConfig = {
  // Workspace packages ship raw TS — let Next transpile them.
  transpilePackages: ["@agntos/db", "@agntos/core"],
  // Server-only packages kept external (not bundled by webpack). better-auth is
  // here because bundling it pulls in its kysely adapter, whose dialects import
  // kysely internals that aren't present in the resolved version — it must load
  // from node_modules at runtime instead.
  serverExternalPackages: ["pg", "pg-boss", "better-auth", "@better-auth/stripe"],
  eslint: {
    // Lint in CI, don't block production builds on style.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

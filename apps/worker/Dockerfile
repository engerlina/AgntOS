# AgntOS worker — pg-boss consumer + provisioning/lifecycle/usage crons.
# Deployed on Railway. The build context is the repo ROOT (so the pnpm workspace
# packages resolve); set RAILWAY_DOCKERFILE_PATH=apps/worker/Dockerfile on the
# service so Railway uses this file with the root as context.
FROM node:20-slim

# ca-certificates for TLS to Postgres/Fly/OpenRouter; git for any VCS deps.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

# Belt-and-braces: the non-payment suspension + reconcile retention passes are
# gated on NODE_ENV=production. Railway sets this too, but bake it in so the
# enforcement can't silently no-op if the service var is ever missing.
ENV NODE_ENV=production

# Run the worker as `node --import tsx` from the worker dir (cwd resolves `tsx`
# from its own node_modules). This makes node itself PID 1 — going through
# `pnpm`/`tsx` CLI forks a child, so SIGTERM never reaches it and pg-boss's
# graceful stop (drain in-flight jobs) never runs before Railway SIGKILLs.
WORKDIR /app/apps/worker
CMD ["node", "--import", "tsx", "src/index.ts"]

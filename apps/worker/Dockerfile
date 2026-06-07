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

# tsx runs the TypeScript worker directly; all config comes from Railway env vars
# (the dotenv load of ../../.env is a no-op here — there is no .env in the image).
CMD ["pnpm", "--filter", "@agntos/worker", "start"]

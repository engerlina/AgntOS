# AgntOS

One-click hosting for a personal **Hermes Agent** (Nous Research) — always-on, with
memory + self-written skills, reachable on Telegram, paid from a dollar wallet with
a hard spend cap. Built for non-technical users.

This repo implements the [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): a
**control plane** (Next.js on Vercel) kept strictly separate from a **data plane**
(one Fly Firecracker microVM per agent), so you can scale or swap the data plane
without touching the control plane.

> UI uses the brutalist theme (ink `#1d1d1d`, lime `#dcf986`, IBM Plex Mono +
> Montserrat) ported from the AI Never Sleeps site.

---

## Monorepo layout

pnpm workspace. The plan's flat layout maps onto shared packages so the web app
and worker reuse the same DB schema and business logic:

```
packages/
  db/           @agntos/db    Drizzle schema (auth + app tables) + pooled client
  core/         @agntos/core  env, money, plans, wallet ledger, Stripe, Resend,
                              OpenRouter provisioning, libsodium crypto, FlyProvider,
                              job contract, logger
apps/
  web/          @agntos/web   Next.js (App Router): marketing, auth, dashboard,
                              API routes (auth / stripe webhook / agents / billing)
  worker/       @agntos/worker pg-boss consumer + provisioning/lifecycle handlers
                              + reconcile & usage-sync crons  (deploy on Railway)
agent-image/    Hermes Dockerfile + baked model-policy config + entrypoint (→ GHCR)
.github/workflows/  CI typecheck/build + agent-image build/push to GHCR
```

| Plan path | Lives at |
|---|---|
| `/lib/auth.ts` | [apps/web/lib/auth.ts](apps/web/lib/auth.ts) |
| `/lib/db.ts` | [packages/db/src/client.ts](packages/db/src/client.ts) |
| `/lib/provisioning` | [packages/core/src/provisioning](packages/core/src/provisioning) |
| `/lib/billing` | [packages/core/src/billing](packages/core/src/billing) |
| `/db/schema.ts` | [packages/db/src/schema.ts](packages/db/src/schema.ts) |
| `/worker` | [apps/worker](apps/worker) |

---

## Quick start (local)

```bash
# 1. Prereqs: Node 20+, pnpm 9+, a Postgres URL (Railway or local)
corepack enable && corepack prepare pnpm@9 --activate

# 2. Install
pnpm install

# 3. Configure — copy and fill in (only the 3 CORE vars are required to boot)
cp .env.example .env
#   DATABASE_URL, BETTER_AUTH_SECRET (openssl rand -base64 32), BETTER_AUTH_URL

# 4. Create the schema
pnpm db:generate      # emit SQL migration from the Drizzle schema
pnpm db:migrate       # apply it  (or `pnpm db:push` for dev)

# 5. Run
pnpm dev              # web on http://localhost:3000
pnpm dev:worker       # worker (needs Fly/OpenRouter env to actually provision)
```

Without Stripe configured, the launch flow uses a dev `starter` tier so you can
exercise onboarding; without Resend, emails are logged not sent; without Fly/
OpenRouter, provisioning jobs will error (expected) but the rest works.

### Root scripts

| Command | Does |
|---|---|
| `pnpm dev` / `pnpm dev:worker` | run web / worker in watch mode |
| `pnpm build` | build the web app |
| `pnpm typecheck` | typecheck every package |
| `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle |
| `pnpm auth:generate` | regenerate Better Auth tables after auth config changes |

---

## How the pieces talk

```
Browser → Next.js (Vercel) ──enqueue──▶ pg-boss (Railway Postgres) ──▶ Worker (Railway)
   │            │  Better Auth · Stripe · wallet              │  provision/pause/destroy
   │            └─ Resend (email)                             ▼
   └────────────────────────────────────────────  Fly Machines API → microVM (Hermes)
                                                                  └▶ OpenRouter (capped key)
```

- **Provisioning** is async: the web API inserts the `agent` row + enqueues
  `provision_agent`; the worker creates the Fly app/volume/secrets/machine, mints a
  per-user **capped OpenRouter key** (the spend cap = wallet balance), polls health,
  and flips status to `running`. Idempotent + retried by pg-boss.
- **Metering**: the `sync_usage` cron (every ~2 min) reads each key's spend, debits
  the dollar wallet, and re-points the key's limit at the remaining balance (top-ups
  raise it; $0 stops the agent). Low-balance + depletion emails included.
- **Billing**: the `@better-auth/stripe` plugin owns subscriptions and the single
  webhook; credit-pack top-ups + dunning + lapse-suspension are handled in its
  `onEvent` (see [stripe-events.ts](apps/web/lib/stripe-events.ts)). Wallet credits
  are idempotent on the Stripe payment id.

### One webhook, one secret

Stripe sends to **one** endpoint. Point it at the Better Auth plugin
(`/api/auth/stripe/webhook`) and set `STRIPE_WEBHOOK_SECRET`. The standalone
[`/api/stripe/webhook`](apps/web/app/api/stripe/webhook/route.ts) is an optional
alternate (its own endpoint/secret) — fulfilment is idempotent, so it's safe either
way, but you don't need both.

---

## Deploy

- **Web** → Vercel. Set all env vars. `serverExternalPackages` keeps `pg`/`pg-boss`
  off the client bundle.
- **Postgres + worker** → Railway (one project). Worker start command: `pnpm --filter @agntos/worker start`.
- **Agent image** → pushed to GHCR by CI; set `AGENT_IMAGE_REF` to a pinned tag.
- **Stripe** → create Starter/Pro products, set price ids, enable **Stripe Tax**,
  add the webhook.
- **DNS** → Cloudflare (`agntos.io`).

---

## Implemented vs. left to wire

**Done:** monorepo + schema + migrations; Better Auth (email + Google) with
verification email; Stripe subscriptions + credit packs + wallet ledger + tax;
Resend transactional set; `AgentProvider` interface + `FlyProvider`; pg-boss worker
with provision/pause/resume/destroy/resize + reconcile + usage-sync; per-user capped
OpenRouter keys; BYOK crypto; brutalist marketing/auth/dashboard/onboarding/wallet/
billing UI; PostHog wired; Sentry guarded; agent image + GHCR CI.

**Needs your input / external accounts:**
- Fill `.env` with real credentials (you're providing these).
- **Hermes runtime**: align the 3 marked spots in `agent-image/` with the pinned
  Hermes release (install command, launch command, config field names).
- **OpenRouter provisioning API**: the `/api/v1/keys` client shape is implemented
  from the documented surface — verify against current docs before launch
  ([openrouter.ts](packages/core/src/openrouter.ts)).
- Optional: enable Sentry (`pnpm --filter @agntos/web add @sentry/nextjs` + DSN),
  R2 backups, WhatsApp/Slack channels, `HetznerProvider`.

See [IMPLEMENTATION_PLAN.md §17](IMPLEMENTATION_PLAN.md) for open decisions/risks.

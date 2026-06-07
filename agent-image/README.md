# agent-image — hardened Hermes Agent

The container the data plane launches, **one microVM per user**. There is no
official Hermes image, so we build this one and push it to GHCR.

## What's here

| File | Role |
|---|---|
| `Dockerfile` | Python 3.11 + uv + Hermes + headless Chromium, non-root, volume at `~/.hermes` |
| `entrypoint.sh` | Maps tier → main model, then launches `hermes gateway` (serves Telegram) |
| `config.template.yaml` | Reference for the **auxiliary-model policy** (the cost lever) to apply via `hermes config` |

## How Hermes is configured (all by ENV — no wizard)

| Var | Secret | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | ✅ | Selects OpenRouter **and** is the per-user spend-capped key (hard stop) |
| `HERMES_INFERENCE_MODEL` | | Main model — set per tier by `entrypoint.sh` from `MODEL_MODE` |
| `HERMES_HOME` | | Config + memory + skills dir (= the mounted Fly volume) |
| `TELEGRAM_BOT_TOKEN` | ✅ | Telegram channel token |
| `GATEWAY_ALLOWED_USERS` | | Optional allow-list of platform user IDs (recommend setting for abuse control) |

`MODEL_MODE`, `AGENT_ID`, `USER_ID`, `AGENT_NAME`, `AGENT_PERSONALITY`, `CHANNEL`
are also injected by the worker (see `apps/worker/src/handlers/provision.ts`).

## Build & publish

**Via CI (recommended):** push to `main` touching `agent-image/**`, or tag `agent-v*`.
`.github/workflows/agent-image.yml` builds and pushes to
`ghcr.io/<owner>/agntos-hermes`. Then set in `.env`:

```
AGENT_IMAGE_REF=ghcr.io/<owner>/agntos-hermes:v0.1.0
```

**Locally (to test first):**
```bash
# Fly runs amd64 — build for that platform.
docker build --platform linux/amd64 -t ghcr.io/<owner>/agntos-hermes:v0.1.0 ./agent-image
echo "$GHCR_PAT" | docker login ghcr.io -u <owner> --password-stdin
docker push ghcr.io/<owner>/agntos-hermes:v0.1.0
```

## ⚠️ Validate once before launch

Hermes is documented around interactive wizards, so confirm it runs headless from
env alone (it should). Run the image locally with the same env the worker injects:

```bash
docker run --rm -it \
  -e OPENROUTER_API_KEY=sk-or-... \
  -e MODEL_MODE=standard \
  -e CHANNEL=telegram \
  -e TELEGRAM_BOT_TOKEN=123:abc \
  ghcr.io/<owner>/agntos-hermes:v0.1.0
```

Confirm: (1) `hermes` is on PATH after install, (2) `hermes gateway` starts and
connects Telegram without a prior `hermes setup`, (3) the persona mechanism in
`entrypoint.sh` (`hermes config set system_prompt …`) is the right key — adjust if not.
Then tune the auxiliary models (`config.template.yaml`) via `hermes config` for cost.

## Security

- **Non-root** (`uid 10001`), `tini` as PID 1.
- Hermes writes + runs its own skills → **per-agent microVM isolation is mandatory**; never multi-tenant.
- Secrets arrive as env from Fly app secrets — never baked into the image.
- Set `GATEWAY_ALLOWED_USERS` and restrict egress at the Fly machine level where feasible.

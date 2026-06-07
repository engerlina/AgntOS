#!/usr/bin/env bash
# AgntOS agent entrypoint. Hermes is configured entirely by ENV (no wizard), so
# this just maps the tier to a main model and launches the messaging gateway.
# Secrets arrive as env (injected by Fly from app secrets at boot).
#
# Env contract (set by the worker via Fly secrets + machine env):
#   OPENROUTER_API_KEY   (secret)  per-user capped key — selects OpenRouter + caps spend
#   TELEGRAM_BOT_TOKEN   (secret)  present when channel = telegram
#   AGENT_ID, USER_ID              identifiers
#   AGENT_NAME                     display name
#   AGENT_PERSONALITY              optional system prompt
#   MODEL_MODE                     "standard" | "smart"  -> HERMES_INFERENCE_MODEL
#   CHANNEL                        e.g. "telegram"
set -euo pipefail

: "${HERMES_HOME:=/home/hermes/.hermes}"
export HERMES_HOME
mkdir -p "${HERMES_HOME}"

# First boot: the Fly volume mounts EMPTY over ~/.hermes, hiding the baked Hermes
# runtime. Seed it from the image so venv/node/code (+ initial config) are present.
# Later boots already have everything (incl. accumulated memory + skills) → skip.
if [ ! -e "${HERMES_HOME}/hermes-agent" ] && [ -d /opt/hermes-seed ]; then
  echo "[agntos] seeding Hermes home from image (first boot)…"
  cp -a /opt/hermes-seed/. "${HERMES_HOME}/"
fi

# ── Main model per tier (HERMES_INFERENCE_MODEL overrides config.yaml) ─────────
# Swap these OpenRouter slugs for your curated Standard/Smart choices.
if [ -z "${HERMES_INFERENCE_MODEL:-}" ]; then
  case "${MODEL_MODE:-standard}" in
    smart) export HERMES_INFERENCE_MODEL="anthropic/claude-sonnet-4" ;;
    *)     export HERMES_INFERENCE_MODEL="openai/gpt-4o-mini" ;;
  esac
fi

# Cap-and-meter key is OPENROUTER_API_KEY (already in env). Its presence is what
# selects OpenRouter as the provider.
if [ -z "${OPENROUTER_API_KEY:-}" ]; then
  echo "[agntos] ERROR: OPENROUTER_API_KEY not set — cannot start." >&2
  exit 1
fi

# ── Web access: enable Hermes' OpenAI-compatible API server so the AgntOS
#    control plane can proxy browser chat to this agent. Bound to 0.0.0.0 so the
#    exposed Fly service reaches it; API_SERVER_KEY arrives as a Fly secret. ─────
export API_SERVER_ENABLED="${API_SERVER_ENABLED:-true}"
export API_SERVER_HOST="${API_SERVER_HOST:-0.0.0.0}"
export API_SERVER_PORT="${API_SERVER_PORT:-8642}"

echo "[agntos] booting agent ${AGENT_ID:-?} (${AGENT_NAME:-Agent}) model=${HERMES_INFERENCE_MODEL} channel=${CHANNEL:-none}"

# ── Personality / system prompt (best-effort; confirm the real config key) ─────
# TODO(hermes): set the agent's persona via the documented mechanism. Likely one
# of `hermes config set <key> "..."` or a file under $HERMES_HOME. Non-fatal.
if [ -n "${AGENT_PERSONALITY:-}" ]; then
  printf '%s\n' "${AGENT_PERSONALITY}" > "${HERMES_HOME}/system.md" || true
  hermes config set system_prompt "${AGENT_PERSONALITY}" >/dev/null 2>&1 || true
fi

# ── Launch the messaging gateway (serves Telegram from TELEGRAM_BOT_TOKEN) ─────
# `hermes gateway` reads channel tokens from env. If your build needs a one-time
# non-interactive init first, add it here (e.g. `hermes setup --portal` flags).
if command -v hermes >/dev/null 2>&1; then
  exec hermes gateway
else
  echo "[agntos] ERROR: 'hermes' not on PATH. Check the install step in the Dockerfile." >&2
  tail -f /dev/null
fi

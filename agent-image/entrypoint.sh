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

# ── Hermes reads its settings from ~/.hermes/.env (its config file), so write the
#    full config there — provider, model, channel, and the web API server. More
#    reliable than process env alone. Lives on the encrypted Fly volume.
{
  echo "OPENROUTER_API_KEY=${OPENROUTER_API_KEY}"
  echo "HERMES_INFERENCE_MODEL=${HERMES_INFERENCE_MODEL}"
  echo "API_SERVER_ENABLED=true"
  echo "API_SERVER_HOST=0.0.0.0"
  echo "API_SERVER_PORT=8642"
  [ -n "${API_SERVER_KEY:-}" ] && echo "API_SERVER_KEY=${API_SERVER_KEY}"
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && echo "TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}"
} > "${HERMES_HOME}/.env"
chmod 600 "${HERMES_HOME}/.env" 2>/dev/null || true
# Also export (Hermes reads API_SERVER_* from process env via os.getenv).
# PYTHONUNBUFFERED so Hermes' logs flush to `fly logs` for debugging.
export API_SERVER_ENABLED=true API_SERVER_HOST=0.0.0.0 API_SERVER_PORT=8642 API_SERVER_CORS_ORIGINS="*" PYTHONUNBUFFERED=1

echo "[agntos] booting agent ${AGENT_ID:-?} (${AGENT_NAME:-Agent}) model=${HERMES_INFERENCE_MODEL} channel=${CHANNEL:-none}"

# ── Personality / system prompt (best-effort; confirm the real config key) ─────
# TODO(hermes): set the agent's persona via the documented mechanism. Likely one
# of `hermes config set <key> "..."` or a file under $HERMES_HOME. Non-fatal.
if [ -n "${AGENT_PERSONALITY:-}" ]; then
  printf '%s\n' "${AGENT_PERSONALITY}" > "${HERMES_HOME}/system.md" || true
  hermes config set system_prompt "${AGENT_PERSONALITY}" >/dev/null 2>&1 || true
fi

# ── Web dashboard: Hermes' own dashboard refuses to bind to a public address
#    without an auth provider, but binds freely on loopback. So run it on
#    127.0.0.1 and front it with Caddy basic-auth (AgntOS sets DASHBOARD_PASSWORD)
#    on :8088 — that's the port Fly maps to <name>.agntos.net:443. Best-effort:
#    if anything here fails, the agent (gateway) still runs. ─────────────────────
if [ -n "${DASHBOARD_PASSWORD:-}" ] && command -v caddy >/dev/null 2>&1; then
  DASH_HASH="$(caddy hash-password --plaintext "${DASHBOARD_PASSWORD}" 2>/dev/null || true)"
  if [ -n "${DASH_HASH}" ]; then
    {
      echo "{"
      echo "  auto_https off"
      echo "  admin off"
      echo "}"
      echo ":8088 {"
      echo "  basic_auth {"
      echo "    ${DASHBOARD_USER:-agent} ${DASH_HASH}"
      echo "  }"
      # Forward the ORIGINAL Host (do NOT rewrite) so the dashboard scopes its
      # session cookie to <slug>.agntos.net. Do NOT add X-Forwarded-Proto — it
      # breaks uvicorn's WebSocket upgrade (the Chat tab's PTY → 502); the Secure
      # cookie is already handled by HERMES_DASHBOARD_PUBLIC_URL=https://…
      echo "  reverse_proxy 127.0.0.1:9119"
      echo "}"
    } > /tmp/Caddyfile
    echo "[agntos] starting Hermes dashboard (:9119) + Caddy auth proxy (:8088)"
    # Bind 0.0.0.0 + --insecure: the dashboard's own auth gate is OFF because Caddy
    # basic-auth is the real gate and :9119 is NOT exposed by Fly (only :8088→443).
    # HERMES_DASHBOARD_PUBLIC_URL (set by the worker) satisfies the Host guard and
    # scopes cookies to the public domain.
    hermes dashboard --host 0.0.0.0 --port 9119 --no-open --insecure >/tmp/dashboard.log 2>&1 &
    caddy run --config /tmp/Caddyfile --adapter caddyfile >/tmp/caddy.log 2>&1 &
  fi
fi

# ── Launch the messaging gateway — this IS the agent. Foreground so its exit
#    restarts the machine. `gateway run` also starts the OpenAI-compatible API
#    server (port 8642) used by the in-AgntOS chat. ─────────────────────────────
if command -v hermes >/dev/null 2>&1; then
  exec hermes gateway run
else
  echo "[agntos] ERROR: 'hermes' not on PATH. Check the install step in the Dockerfile." >&2
  tail -f /dev/null
fi

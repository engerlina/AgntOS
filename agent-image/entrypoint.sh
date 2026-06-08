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
    # Premium tier: a fixed strong model for predictable behaviour.
    smart) export HERMES_INFERENCE_MODEL="anthropic/claude-sonnet-4" ;;
    # Default tier: OpenRouter's auto-router picks a suitable model per request
    # (spend is capped by the per-agent OpenRouter key).
    *)     export HERMES_INFERENCE_MODEL="openrouter/auto" ;;
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
# Set the inference model in Hermes' CONFIG — HERMES_INFERENCE_MODEL (env) is
# IGNORED by Hermes; it reads `model.default` from config.yaml (which the install
# defaults to claude-opus). This is the setting that actually takes effect.
if command -v hermes >/dev/null 2>&1 && [ -n "${HERMES_INFERENCE_MODEL:-}" ]; then
  hermes config set model.default "${HERMES_INFERENCE_MODEL}" >/dev/null 2>&1 || true
fi

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
  # Per-agent cookie value (derived from the password) for the modal-free gate.
  DASH_CV="$(printf '%s' "${DASHBOARD_PASSWORD}" | sha256sum | cut -c1-32)"
  if [ -n "${DASH_HASH}" ]; then
    {
      echo "{"
      echo "  auto_https off"
      echo "  admin off"
      echo "}"
      echo ":8088 {"
      # Modal-free login: the AgntOS deep-link hits /__enter (basic-auth), which
      # sets a cookie and 302s to the clean URL. Cookie-bearing requests then skip
      # basic-auth — so the dashboard runs on a CLEAN URL (credentials in the URL
      # break its relative fetch() calls) with no repeating auth modal.
      echo "  @authed header Cookie *dash_ok=${DASH_CV}*"
      echo "  handle @authed {"
      echo "    reverse_proxy 127.0.0.1:9119"
      echo "  }"
      # Token-in-query login: AgntOS opens /__enter?key=<token> (NO credentials in
      # the URL — that's what breaks the dashboard's fetch() calls). Caddy validates
      # the token, sets the cookie, and 302s to the clean URL.
      echo "  @enterkey {"
      echo "    path /__enter"
      echo "    query key=${DASH_CV}"
      echo "  }"
      echo "  handle @enterkey {"
      echo "    header +Set-Cookie \"dash_ok=${DASH_CV}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400\""
      echo "    redir https://{host}/chat 302"
      echo "  }"
      echo "  handle {"
      echo "    basic_auth {"
      echo "      ${DASHBOARD_USER:-agent} ${DASH_HASH}"
      echo "    }"
      echo "    handle /__enter {"
      echo "      header +Set-Cookie \"dash_ok=${DASH_CV}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400\""
      echo "      redir https://{host}/chat 302"
      echo "    }"
      echo "    handle {"
      # Forward the ORIGINAL Host (no X-Forwarded-Proto — it breaks the PTY WS).
      echo "      reverse_proxy 127.0.0.1:9119"
      echo "    }"
      echo "  }"
      echo "}"
    } > /tmp/Caddyfile
    echo "[agntos] starting Hermes dashboard (:9119) + Caddy auth proxy (:8088)"
    # Bind 0.0.0.0 + --insecure: the dashboard's own auth gate is OFF because Caddy
    # basic-auth is the real gate and :9119 is NOT exposed by Fly (only :8088→443).
    # HERMES_DASHBOARD_PUBLIC_URL (set by the worker) satisfies the Host guard and
    # scopes cookies to the public domain.
    # Supervise both: a dead dashboard (it can exit while rebuilding its UI) means
    # Caddy 502s and the user "can't connect", so respawn it instead of leaving it
    # dead. The gateway stays foreground (its exit restarts the whole machine).
    ( while true; do
        hermes dashboard --host 0.0.0.0 --port 9119 --no-open --insecure >>/tmp/dashboard.log 2>&1
        echo "[agntos] dashboard exited ($?) — respawning in 3s" >>/tmp/dashboard.log
        sleep 3
      done ) &
    ( while true; do
        caddy run --config /tmp/Caddyfile --adapter caddyfile >>/tmp/caddy.log 2>&1
        echo "[agntos] caddy exited ($?) — respawning in 3s" >>/tmp/caddy.log
        sleep 3
      done ) &
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

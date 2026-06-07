# AgntOS — hardened Hermes Agent image.
#
# There is NO official Hermes Docker image, so we build our own. One Firecracker
# microVM runs ONE of these per user (Fly). Hermes writes and runs its own skills
# (self-modifying code), so this image is only ever run under per-agent VM
# isolation — never multi-tenant.
#
# Hermes is a Python 3.11 + uv app. The official installer installs uv, clones the
# repo, and puts `hermes` on PATH. We configure it entirely by ENV (no wizard):
#   OPENROUTER_API_KEY     selects OpenRouter + is the per-user spend-capped key
#   HERMES_INFERENCE_MODEL main model (set per tier by entrypoint.sh)
#   HERMES_HOME            config + memory + skills dir (the mounted Fly volume)
#   TELEGRAM_BOT_TOKEN     channel token
#
# Build + push is done in CI (.github/workflows/agent-image.yml) to GHCR; the
# control plane launches a pinned tag via AGENT_IMAGE_REF.

FROM python:3.11-slim

# ── OS deps: headless Chromium for browser automation + the installer's needs ──
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      git \
      tini \
      chromium \
      fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Point Hermes/Playwright at the system Chromium (no extra download).
ENV CHROME_BIN=/usr/bin/chromium \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
    HOME=/home/hermes \
    # Hermes data dir == the mounted Fly volume (memory + skills + config persist).
    HERMES_HOME=/home/hermes/.hermes

# ── Entrypoint (copied as root before we drop privileges) ──────────────────────
COPY entrypoint.sh /opt/agntos/entrypoint.sh
RUN chmod +x /opt/agntos/entrypoint.sh

# ── Non-root user ──────────────────────────────────────────────────────────────
RUN useradd --create-home --shell /bin/bash --uid 10001 hermes \
    && mkdir -p /home/hermes/.hermes \
    && chown -R hermes:hermes /home/hermes /opt/agntos
USER hermes
WORKDIR /home/hermes
# uv + Hermes install into ~/.local/bin; make sure it's on PATH for the entrypoint.
ENV PATH="/home/hermes/.local/bin:${PATH}"

# ── Install Hermes (installs uv + Python deps, clones the repo, adds `hermes`) ──
RUN curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash

# Persistent memory + self-written skills (Fly volume mounts over this path).
VOLUME ["/home/hermes/.hermes"]

# Optional in-agent health endpoint (the provider primarily checks VM state).
EXPOSE 8080

# tini = PID 1 for correct signal handling / zombie reaping in the microVM.
ENTRYPOINT ["/usr/bin/tini", "--", "/opt/agntos/entrypoint.sh"]

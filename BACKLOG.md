# AgntOS — backlog

Post-launch / deferred work. Nothing here blocks go-live; each item is either
wired-but-unconfigured or a non-critical polish.

## Observability (wired in code, just needs config)
- [ ] **Sentry** — `@sentry/node` is wired into the worker (all job failures) and
      the web server instrumentation. Inert until `SENTRY_DSN` is set on **both**
      Vercel and Railway. Add a Sentry project DSN to turn on error reporting.
- [ ] **PostHog** — the provider is wired but `NEXT_PUBLIC_POSTHOG_KEY` is unset on
      Vercel (only `_HOST` is set), so analytics is off. Add the key to enable.

## Auth
- [ ] **Google OAuth** — the "Continue with Google" button is hidden because
      `GOOGLE_ID`/`GOOGLE_SECRET` aren't configured. To offer Google sign-in, set
      both on Vercel; the button then shows automatically (gated by `hasEnv`).

## Hardening / polish (from the pre-launch audit)
- [ ] **`/__enter` dashboard token** — currently a permanent password-equivalent
      token in the URL. Proper fix is a short-lived HMAC-with-expiry validated by
      an agent-image validator sidecar / Caddy `forward_auth`. Needs an agent-image
      change + re-provision; mitigated today by TLS-only + Caddy access-logs off.
- [ ] **Chat route `maxDuration`** — 60s; long Hermes tool-use loops can exceed it.
      Raise to ~300s on Vercel Pro.
- [ ] **Persona apply** — `agent-image/entrypoint.sh` sets the persona via two
      guessed mechanisms with `|| true`. Verify against the pinned Hermes version
      that the personality actually takes effect.
- [ ] **`alert()`/`confirm()`** in dashboard components — replace with inline UI
      for a more polished feel (cosmetic).
- [ ] **Pin `AGENT_IMAGE_REF`** — still `:main` (mutable) on Vercel + Railway. Pin
      to a `sha-*` or released `vX.Y.Z` tag (the CI now emits `vX.Y.Z` from an
      `agent-v*` git tag).

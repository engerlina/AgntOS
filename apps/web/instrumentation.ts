/**
 * Server-side observability (Next.js `register` + `onRequestError` hooks).
 *
 * Sentry is OPTIONAL — active only when `SENTRY_DSN` is set. We use `@sentry/node`
 * and load it via a runtime dynamic import (non-literal specifier + webpackIgnore)
 * so the bundler never pulls its Node-only internals (e.g. node:child_process)
 * into the Edge instrumentation bundle. The NEXT_RUNTIME guard means it only ever
 * loads in the Node.js runtime at runtime.
 */
const SENTRY_PKG = ["@sentry", "node"].join("/");

type SentryModule = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (e: unknown) => void;
};

async function loadSentry(): Promise<SentryModule | null> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return null;
  try {
    return (await import(/* webpackIgnore: true */ SENTRY_PKG)) as unknown as SentryModule;
  } catch {
    return null;
  }
}

export async function register() {
  const Sentry = await loadSentry();
  Sentry?.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
  });
}

/** Capture uncaught errors thrown while rendering routes / handling requests. */
export async function onRequestError(error: unknown): Promise<void> {
  const Sentry = await loadSentry();
  Sentry?.captureException(error);
}

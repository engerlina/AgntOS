import * as Sentry from "@sentry/node";

/**
 * Worker error reporting. Without this a crashed provision/billing job is only a
 * JSON line in the Railway logs — nothing alerts. Enabled only when SENTRY_DSN is
 * set; otherwise every function here is a no-op so local/dev runs are unaffected.
 */
let enabled = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || enabled) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // We use Sentry for errors, not tracing/profiling in the worker.
    tracesSampleRate: 0,
  });
  enabled = true;
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

/** Drain pending events before the process exits. Best-effort. */
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!enabled) return;
  try {
    await Sentry.flush(timeoutMs);
  } catch {
    // best-effort
  }
}

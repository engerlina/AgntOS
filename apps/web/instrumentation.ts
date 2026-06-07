/**
 * Server/edge observability bootstrap (Next.js `register` hook).
 *
 * Sentry is OPTIONAL and loaded only when both (a) `@sentry/nextjs` is installed
 * and (b) `SENTRY_DSN` is set — so the scaffold builds without it. To enable:
 *   pnpm --filter @agntos/web add @sentry/nextjs
 *   # set SENTRY_DSN in the environment
 * The dynamic specifier is intentionally non-literal so the bundler doesn't try
 * to resolve the package when it isn't installed.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    const pkg = ["@sentry", "nextjs"].join("/");
    const Sentry = (await import(/* webpackIgnore: true */ pkg)) as {
      init?: (opts: Record<string, unknown>) => void;
    };
    Sentry.init?.({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  } catch {
    // @sentry/nextjs not installed — skip.
  }
}

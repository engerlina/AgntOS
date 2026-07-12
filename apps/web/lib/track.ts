/**
 * Thin wrapper over the Umami tracker for programmatic funnel events. CTA clicks
 * on links/buttons use `data-umami-event` attributes instead (no JS needed);
 * this is for moments that fire in code — form submits, wizard steps, conversions.
 * A no-op on the server and if Umami hasn't loaded (e.g. blocked), so callers
 * never need to guard.
 */
declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
  }
}

export function track(event: string, data?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    window.umami?.track(event, data);
  } catch {
    /* analytics must never break the app */
  }
}

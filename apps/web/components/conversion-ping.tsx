"use client";

import { useEffect } from "react";

import { track } from "@/lib/track";

/**
 * Fires a one-time Umami conversion event when the page loads with a given query
 * param (e.g. Stripe's `?subscribed=1` / `?topup=success` success redirects),
 * then strips the param from the URL so a refresh can't double-count. Rendered on
 * the dashboard/wallet pages — the only place these success redirects land.
 */
export function ConversionPing({
  param,
  value,
  event,
}: {
  param: string;
  value?: string;
  event: string;
}) {
  useEffect(() => {
    const url = new URL(window.location.href);
    const got = url.searchParams.get(param);
    if (got !== null && (value === undefined || got === value)) {
      track(event);
      url.searchParams.delete(param);
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, [param, value, event]);

  return null;
}

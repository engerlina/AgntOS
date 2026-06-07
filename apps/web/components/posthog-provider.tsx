"use client";

import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";
import { useEffect } from "react";

/**
 * PostHog for the onboarding funnel (signup → plan_selected → channel_connected →
 * agent_launched → agent_first_message → credits_topped_up). No-ops without a key,
 * so dev and preview environments are unaffected.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  useEffect(() => {
    if (!key) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: "identified_only",
    });
  }, [key]);

  if (!key) return <>{children}</>;
  return <Provider client={posthog}>{children}</Provider>;
}

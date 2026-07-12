"use client";

import { useEffect } from "react";

/**
 * Captures FIRST-TOUCH marketing attribution (utm_*, ad click ids, external
 * referrer, landing path) into a 90-day cookie on the visitor's first page. The
 * post-signup server hook reads that cookie and writes it to `user.attribution`,
 * so every account carries where it came from (and a stored gclid enables Google
 * Ads offline-conversion upload later). No-op once the cookie exists, and only
 * sets it when there's something worth attributing — organic/direct stays null.
 */
const COOKIE = "agntos_attr";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days
const PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "wbraid",
  "gbraid",
  "fbclid",
  "msclkid",
];

export function AttributionCapture() {
  useEffect(() => {
    try {
      if (document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`))) return; // first-touch only

      const q = new URLSearchParams(window.location.search);
      const attr: Record<string, string> = {};
      for (const k of PARAMS) {
        const v = q.get(k);
        if (v) attr[k] = v.slice(0, 200);
      }

      const ref = document.referrer || "";
      const externalRef = ref && !ref.includes(window.location.host);
      if (Object.keys(attr).length === 0 && !externalRef) return; // organic/direct — nothing to store

      if (externalRef) attr.referrer = ref.slice(0, 300);
      attr.landing = window.location.pathname.slice(0, 200);
      attr.ts = new Date().toISOString();

      document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(attr))}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax`;
    } catch {
      /* never break the page for analytics */
    }
  }, []);

  return null;
}

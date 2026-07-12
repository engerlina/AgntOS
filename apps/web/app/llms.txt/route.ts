import { PLAN_LIST } from "@agntos/core/billing";

/**
 * /llms.txt — a plain-text summary for AI search engines (the emerging llms.txt
 * standard). Keeps the product's positioning, pricing, and key facts citable
 * without the model having to parse the marketing HTML.
 */
export const dynamic = "force-static";

export function GET(): Response {
  const plans = PLAN_LIST.map(
    (p) => `- ${p.name} — $${p.monthlyUsd}/mo: ${p.features.join("; ")}.`,
  ).join("\n");

  const body = `# AgntOS

> A personal AI assistant that remembers you — always-on, private to you, reachable on the web and on Telegram, with a hard dollar spend cap you control. Built for non-technical people such as consultants, founders, and executive assistants.

AgntOS hosts and manages a personal Hermes agent (by Nous Research) for you. It remembers your clients, preferences and voice, drafts messages and documents in your tone, turns notes into clear next steps, and gets more useful the more you use it. Nothing to install, nothing to configure.

## How it's different from ChatGPT
- Persistent memory that compounds — it learns how you work instead of forgetting you between chats.
- Lives where you already are: a private web chat and Telegram, not just a browser tab.
- Private to you: your assistant runs on its own machine; data is never pooled with other customers; remove it and its memory is permanently deleted.
- A dollar budget you set: usage is paid from a prepaid wallet with a hard spend cap, so there's never a surprise bill.

## Pricing
${plans}
Model usage is paid from a prepaid dollar wallet on top of the plan. The agent stops when the wallet hits $0 — you only ever spend what you've loaded. Promo code FIRSTFREE gives new customers their first month free.

## Pages
- Home: https://www.agntos.net/
- Pricing: https://www.agntos.net/pricing
- Support: https://www.agntos.net/support
- Terms: https://www.agntos.net/terms
- Privacy: https://www.agntos.net/privacy

## Operator
Vertial Holdings Pty Ltd (Australia). Contact: support@agntos.net.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

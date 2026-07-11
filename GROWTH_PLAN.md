# AgntOS — Growth, Tracking & SEO Plan

_Audit date: 2026-07-11. Grounded in: production DB, Umami (analytics.vertial.com),
GSC + Google Ads API checks, a codebase tracking inventory, and a live-site SEO audit._

## Where we actually are (the honest baseline)

**Product/DB (ground truth):**

- 3 users total — all founder-owned test accounts. **0 external customers. 0 signups in the last 7 days.**
- 1 subscription row, `incomplete` (founder's own abandoned test checkout). 1 agent, `error`
  ("Provider reports unhealthy", since Jun 15 — the founder's own "Phoenix" agent).
- Historic testing churn: 13 agents created / 12 destroyed. ~$1.42 of model spend against the $25 comp grant.

**Traffic (Umami, Jun 18 → Jul 11):**

- 177 pageviews / 105 visitors / 88% bounce. Launch burst Jun 18–19 (Google, Substack, LinkedIn, t.co),
  then 2–9 pv/day. The Jul 8 "spike" (28 pv) is bot-like (1 page/session, ~0 dwell, no referrers), and
  the last-7-days engaged time is **22 seconds total** — current run-rate is mostly non-human.
- Only 4 visits have ever reached `/signup`. Google organic (22 visits) is the only real channel so far.

**Conclusion that drives everything below:** the funnel isn't leaking — it's empty. Tracking and SEO work
matter, but only as _preparation_ for distribution. The plan is sequenced accordingly.

---

## Q1: "Do we need to link everything up?" — Yes, and two things are actively broken

### Found broken / misdirected (fix before anything else)

1. **Google Search Console: `agntos.net` is NOT a verified property.** The `GSC_REFRESH_TOKEN` works
   (webmasters scope, proven against your other 16 properties) but agntos.net isn't among them — every
   API call 403s, and more importantly Google Search has no owner-submitted sitemap/monitoring for the
   site at all. → **Verify `sc-domain:agntos.net` in Search Console (DNS TXT record in Cloudflare, ~10 min),
   then submit `https://www.agntos.net/sitemap.xml`.** Also add Bing Webmaster Tools (imports from GSC in 2 clicks).
2. **Google Ads creds point at the WRONG business.** Customer `866-912-6474` is **"Trvel - eSIMs"**
   (the Trvel project's live AUD account), and conversion action `7431759317` ("offline (Upload)",
   UPLOAD_CLICKS/PURCHASE, enabled) lives on that account. The developer token IS production-approved and
   the API plumbing works — but wiring AgntOS conversions into Trvel's account would poison both
   businesses' data. → **Decision needed: create an AgntOS-specific Ads account (recommended) + its own
   offline-upload conversion action, then swap `GOOGLE_ADS_CUSTOMER_ID`/`GOOGLE_ADS_CONVERSION_ACTION_ID`.**
3. **Umami counts dev/preview traffic.** The script loads in every environment with a hardcoded
   website-id. → gate to production.
4. **Dogfooding is down.** The founder's own agent has been in `error` for ~4 weeks. Fix/relaunch it —
   it's both QA and the source of authentic marketing content.

### What tracking exists today vs what's missing

| Layer | State |
|---|---|
| Umami | Live, **pageviews only** — zero custom events |
| PostHog | Wired but inert (no key, and zero capture/identify calls even if keyed) |
| Google Ads / gtag / any pixel | Absent |
| UTM / gclid capture & attribution | Absent — every signup is source-anonymous; `user` table has no attribution column |
| Conversion hooks | `?subscribed=1` and `?topup=success` redirect params are **read nowhere** — there is no code path where a conversion event could fire |
| Server records | Good bones: `audit_log` (agent lifecycle), `subscription`, `credit_txn`, `usage_event` — can answer signups/day, plan conversions, revenue, activation. Blind between page-load and first DB write. |

### The instrumentation build (lean — one tool, ~10 events, 1–2 days of code)

Keep **Umami as the single analytics tool** (self-hosted, free, already live). PostHog stays on the
backlog until there's traffic worth session-replaying. Build:

1. **Funnel events (Umami custom events):** `cta_click` (hero/pricing), `signup_submitted`,
   `email_verified`, `wizard_step` (name/role/connect/launch), `checkout_started`, `subscribed`,
   `topup_success`, `agent_launched`. The two conversion events come from finally reading the
   `?subscribed=1` / `?topup=success` params (then cleaning the URL).
2. **Attribution capture:** first-touch `utm_*` + `gclid`/`wbraid` + referrer → cookie/localStorage on
   the marketing pages → submitted with signup → new `user.attribution` jsonb column (one small migration).
   Without this, no paid channel can ever be evaluated.
3. **Server-side timeline completion:** audit_log entries for `user.signup`, `user.verified` (adds the
   missing verification timestamp), `subscription.active`, `wallet.topup` — so the DB alone can
   reconstruct the funnel with timings even if client analytics is blocked.
4. **Google Ads offline conversion upload** (after the account decision): on `onSubscriptionComplete`,
   if the user has a stored `gclid`, upload a click conversion (value = plan price) to the AgntOS
   conversion action. Env vars promoted into `env.ts` + `.env.example` + Vercel.
5. **Weekly stats digest:** small cron (worker) emailing/Telegram-ing: visitors, signups, verified,
   launched, subscribed, MRR, top referrers — the numbers in this audit, automated.

---

## Q2: "Do we need better SEO?" — Foundation is clean; what's missing is content + authority

The technical audit came back unusually good for a 3-week-old site: ~70ms TTFB, correct canonicals and
redirect consolidation (apex→www, no duplicate-content risk), SSR'd content, OG image, Organization/
WebSite/SoftwareApplication JSON-LD with real prices, sane robots.txt + sitemap, nothing blocking
GPTBot/ClaudeBot/Perplexity. **More on-page tinkering will not produce customers.** The real gaps:

1. **Indexable surface is 7 pages / ~1,500 words of marketing copy.** No blog, no comparisons, no
   use-case or help content — the site can only ever rank for its own brand name in the near term.
2. **Zero backlinks/authority** (new domain). Directories, Product Hunt, founder content are the fix.
3. **Not even registered with Google/Bing** (see broken item #1 above).

### SEO workstream (in priority order)

| # | Item | Effort |
|---|---|---|
| 1 | GSC + Bing verification, sitemap submitted (blocker, do first) | 10 min |
| 2 | Hygiene batch (ship with the tracking code): noindex `/login` + drop from sitemap; unique meta + canonical for `/signup`; per-page og:title/description; FAQPage JSON-LD around the homepage FAQ; `/llms.txt`; real sitemap lastmod | S |
| 3 | **Use-case pages ×3** matching the onboarding archetypes: "AI assistant for consultants / executive assistants / solo founders" (reuse archetype copy + scenarios) | M |
| 4 | **Comparison pages ×2:** "AgntOS vs ChatGPT (memory)", "AgntOS vs Lindy/Personal AI" — honest, spec-level | M |
| 5 | `/support` → 8–10 real help articles (setup, Telegram, credits, memory, cancel) — long-tail + the best AI-engine citation source | M |
| 6 | Off-site: Product Hunt launch, AI directories (There's An AI For That, Futurepedia, etc.), founder LinkedIn/Substack repurposing | M, ongoing |

Expectation-setting: on a brand-new domain, items 3–6 compound over 3–6 months. They are worth starting
now precisely because they're slow.

---

## The sequenced plan

### Phase 0 — Unblock (this week; mostly Jonathan, ~1 hour)
- [ ] Verify `sc-domain:agntos.net` in GSC (DNS TXT — the Cloudflare zone is already under our control) → submit sitemap → add Bing
- [ ] **Decide the Google Ads account question** (new AgntOS account recommended) and update the two env IDs
- [ ] Fix/relaunch Phoenix (founder agent) and use it daily — dogfood
- [ ] Claude: gate Umami to production; clean up the `incomplete` test subscription noise

### Phase 1 — Instrument (next; ~1–2 days of code; Claude can execute)
- [ ] Umami funnel events + conversion-param reading (+ URL cleanup)
- [ ] First-touch attribution capture → `user.attribution` column
- [ ] audit_log auth/billing events (incl. verification timestamp)
- [ ] SEO hygiene batch (item 2 above) — same deploy
- [ ] Google Ads offline conversion upload (once account decided)
- [ ] Weekly automated stats digest

### Phase 2 — Distribute (weeks 2–6; the actual growth work)
- [ ] Social proof: 3 comped beta users in the ICP → quotes on homepage
- [ ] Launch moments: Product Hunt + AI directories + Show HN
- [ ] Founder-led: 2–3 LinkedIn posts/week + Substack cross-posts (aineversleeps already referred traffic)
- [ ] Use-case + comparison pages live (SEO items 3–4)
- [ ] Only THEN paid: $10–20/day Google Ads exact-match test ("ai assistant that remembers you",
      "personal ai assistant telegram", competitor terms) — measurable end-to-end because Phase 1 shipped

### Phase 3 — Operate (ongoing weekly loop)
Weekly review against a simple ladder: **visitors → signup rate (target 3–5%) → verify rate (>80%) →
agent launched (>60% of verified) → paid conversion → active paying agents (north star)**. Each channel
gets a kill/scale decision after 2 weeks of attributed data. Revisit PostHog/session-replay only when
there are ≥50 signups/month to watch.

---

## Notes
- Google Ads API access is confirmed production-ready (dev token approved, GAQL reads work) — wiring is
  purely blocked on the account decision.
- New env vars (`GOOGLE_ADS_*`, `GSC_*`, `UMAMI_*`) are currently only in the local `.env` — they get
  promoted to `.env.example` (placeholders), `env.ts`, and Vercel/Railway when Phase 1 wires them.
- Umami API quirks for future automation: use `metrics?type=path` (not `type=url`); login via
  `/api/auth/login` works with the admin creds.
